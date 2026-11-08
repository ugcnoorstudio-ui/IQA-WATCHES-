-- Keep the inventory movement ledger aligned with available stock:
-- available = stock_on_hand - stock_reserved.
-- This migration records existing balances without changing stock quantities.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.orders
    WHERE state IN ('shipped', 'delivered')
  ) THEN
    RAISE EXCEPTION
      'Inventory ledger migration requires manual review when shipped/delivered orders already exist.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.product_variants v
    LEFT JOIN (
      SELECT oi.variant_id, sum(oi.quantity)::integer AS reserved_quantity
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE o.state IN ('pending', 'confirmed', 'processing', 'packed', 'ready_for_pickup')
      GROUP BY oi.variant_id
    ) active_orders ON active_orders.variant_id = v.id
    WHERE v.stock_reserved <> coalesce(active_orders.reserved_quantity, 0)
  ) THEN
    RAISE EXCEPTION
      'Inventory ledger migration stopped: stock_reserved does not match active order items.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.product_variants v
    WHERE
      (
        EXISTS (
          SELECT 1 FROM public.inventory_movements m
          WHERE m.variant_id = v.id
            AND m.movement_type IN ('reservation', 'release')
        )
        AND coalesce((
          SELECT sum(m.quantity_delta)
          FROM public.inventory_movements m
          WHERE m.variant_id = v.id
        ), 0) <> v.stock_on_hand - v.stock_reserved
      )
      OR
      (
        NOT EXISTS (
          SELECT 1 FROM public.inventory_movements m
          WHERE m.variant_id = v.id
            AND m.movement_type IN ('reservation', 'release')
        )
        AND EXISTS (
          SELECT 1 FROM public.inventory_movements m
          WHERE m.variant_id = v.id
        )
        AND coalesce((
          SELECT sum(m.quantity_delta)
          FROM public.inventory_movements m
          WHERE m.variant_id = v.id
        ), 0) <> v.stock_on_hand
      )
  ) THEN
    RAISE EXCEPTION
      'Inventory ledger migration stopped: existing movement history does not reconcile to current stock.';
  END IF;
END;
$$;

-- Add a one-time opening balance only for variants with no movement history.
-- This is an audit baseline, not a stock quantity update.
INSERT INTO public.inventory_movements
  (variant_id, movement_type, quantity_delta, reason, reference)
SELECT
  v.id,
  'adjustment',
  v.stock_on_hand,
  'Opening stock baseline recorded during inventory ledger reconciliation',
  'opening-balance:' || v.id::text
FROM public.product_variants v
WHERE v.stock_on_hand > 0
  AND NOT EXISTS (
    SELECT 1
    FROM public.inventory_movements m
    WHERE m.variant_id = v.id
  );

-- Reconstruct reservations for currently active, not-yet-shipped orders.
-- References make this backfill safe to rerun.
WITH active_reservations AS (
  SELECT
    o.id AS order_id,
    oi.variant_id,
    sum(oi.quantity)::integer AS quantity
  FROM public.orders o
  JOIN public.order_items oi ON oi.order_id = o.id
  WHERE o.state IN ('pending', 'confirmed', 'processing', 'packed', 'ready_for_pickup')
  GROUP BY o.id, oi.variant_id
)
INSERT INTO public.inventory_movements
  (variant_id, movement_type, quantity_delta, reason, reference)
SELECT
  ar.variant_id,
  'reservation',
  -ar.quantity,
  'Existing order reservation reconstructed during inventory ledger reconciliation',
  'order:' || ar.order_id::text || ':reservation:' || ar.variant_id::text
FROM active_reservations ar
WHERE ar.quantity > 0
  AND NOT EXISTS (
    SELECT 1
    FROM public.inventory_movements m
    WHERE m.variant_id = ar.variant_id
      AND m.movement_type = 'reservation'
      AND m.reference = 'order:' || ar.order_id::text || ':reservation:' || ar.variant_id::text
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.product_variants v
    WHERE coalesce((
      SELECT sum(m.quantity_delta)
      FROM public.inventory_movements m
      WHERE m.variant_id = v.id
    ), 0) <> v.stock_on_hand - v.stock_reserved
  ) THEN
    RAISE EXCEPTION
      'Inventory ledger reconciliation failed: movement net does not equal available stock.';
  END IF;
END;
$$;

-- Set a transaction-local order reference when checkout inserts its order items.
CREATE OR REPLACE FUNCTION private.iqa_set_inventory_order_reference()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  PERFORM pg_catalog.set_config(
    'iqa.inventory_reference',
    'order:' || NEW.order_id::text,
    true
  );
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.iqa_set_inventory_order_reference() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_iqa_inventory_order_reference ON public.order_items;
CREATE TRIGGER trg_iqa_inventory_order_reference
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION private.iqa_set_inventory_order_reference();

-- Record every reservation/release that changes available stock without changing
-- physical on-hand stock. Fulfilment updates both columns together and is handled
-- explicitly by the admin status RPC below to avoid double-counting.
CREATE OR REPLACE FUNCTION private.iqa_record_reserved_stock_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_delta integer := OLD.stock_reserved - NEW.stock_reserved;
  v_reference text := nullif(
    pg_catalog.current_setting('iqa.inventory_reference', true),
    ''
  );
BEGIN
  IF NEW.stock_on_hand IS DISTINCT FROM OLD.stock_on_hand OR v_delta = 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.inventory_movements
    (variant_id, movement_type, quantity_delta, reason, reference, actor)
  VALUES (
    NEW.id,
    CASE WHEN v_delta < 0 THEN 'reservation' ELSE 'release' END,
    v_delta,
    CASE
      WHEN v_delta < 0 THEN 'Reserved stock for an order'
      ELSE 'Released reserved stock from an order'
    END,
    v_reference,
    auth.uid()
  );

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.iqa_record_reserved_stock_movement() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_iqa_reserved_stock_movement ON public.product_variants;
CREATE TRIGGER trg_iqa_reserved_stock_movement
AFTER UPDATE OF stock_reserved ON public.product_variants
FOR EACH ROW
WHEN (OLD.stock_reserved IS DISTINCT FROM NEW.stock_reserved)
EXECUTE FUNCTION private.iqa_record_reserved_stock_movement();

-- Customer COD cancellation releases stock and the trigger records the release.
CREATE OR REPLACE FUNCTION public.iqa_cancel_customer_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_customer_id uuid;
  v_order public.orders%rowtype;
  v_item record;
  v_variant public.product_variants%rowtype;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Sign in to cancel an order';
  END IF;

  SELECT id INTO v_customer_id
  FROM public.customers
  WHERE auth_user_id = v_user_id;

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Customer account could not be verified';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id AND customer_id = v_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This order was not found in your account';
  END IF;

  IF v_order.state NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Only confirmed or pending Cash on Delivery orders can be cancelled before processing';
  END IF;

  IF v_order.payment_state <> 'pending'
     OR coalesce(v_order.delivery_snapshot->>'payment_method', '') <> 'cash_on_delivery' THEN
    RAISE EXCEPTION 'This order cannot be cancelled through the COD cancellation flow';
  END IF;

  PERFORM pg_catalog.set_config(
    'iqa.inventory_reference',
    'order:' || v_order.id::text,
    true
  );

  FOR v_item IN
    SELECT variant_id, sum(quantity)::integer AS quantity
    FROM public.order_items
    WHERE order_id = v_order.id
    GROUP BY variant_id
    ORDER BY variant_id
  LOOP
    SELECT * INTO v_variant
    FROM public.product_variants
    WHERE id = v_item.variant_id
    FOR UPDATE;

    IF NOT FOUND OR v_variant.stock_reserved < v_item.quantity THEN
      RAISE EXCEPTION 'Reserved stock could not be safely released; please contact support';
    END IF;

    UPDATE public.product_variants
    SET stock_reserved = stock_reserved - v_item.quantity
    WHERE id = v_item.variant_id;
  END LOOP;

  UPDATE public.orders
  SET state = 'cancelled', updated_at = now()
  WHERE id = v_order.id;

  INSERT INTO public.order_status_events
    (order_id, previous_state, new_state, reason, actor)
  VALUES (
    v_order.id,
    v_order.state,
    'cancelled',
    'Customer cancelled the pending Cash on Delivery order',
    v_user_id
  );

  RETURN jsonb_build_object(
    'ok', true,
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'state', 'cancelled'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.iqa_cancel_customer_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.iqa_cancel_customer_order(uuid) TO authenticated;

-- Admin cancellation releases reservations. Shipment/delivery consumes the
-- reservation and physical stock exactly once.
CREATE OR REPLACE FUNCTION public.iqa_admin_update_order_status(
  p_actor uuid,
  p_order_id uuid,
  p_new_state public.order_state,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_staff public.staff_profiles%rowtype;
  v_order public.orders%rowtype;
  v_item record;
  v_variant public.product_variants%rowtype;
  v_reason text := nullif(btrim(p_reason), '');
  v_reference text;
BEGIN
  IF p_actor IS NULL OR p_order_id IS NULL OR p_new_state IS NULL
     OR v_reason IS NULL OR length(v_reason) < 5 OR length(v_reason) > 500 THEN
    RAISE EXCEPTION 'A valid order, staff actor and reason (5–500 characters) are required';
  END IF;

  SELECT * INTO v_staff
  FROM public.staff_profiles
  WHERE user_id = p_actor AND active = true;

  IF NOT FOUND OR v_staff.role <> 'owner' THEN
    RAISE EXCEPTION 'Active IQA WATCHES owner role required';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF p_new_state NOT IN ('confirmed', 'processing', 'packed', 'ready_for_pickup', 'shipped', 'delivered', 'cancelled') THEN
    RAISE EXCEPTION 'This order status is not available in the admin workflow';
  END IF;

  IF v_order.state = p_new_state THEN
    RAISE EXCEPTION 'Order already has this status';
  END IF;

  IF NOT (
    (v_order.state = 'confirmed' AND p_new_state IN ('processing', 'packed', 'cancelled')) OR
    (v_order.state = 'processing' AND p_new_state IN ('packed', 'shipped', 'cancelled')) OR
    (v_order.state = 'packed' AND p_new_state IN ('ready_for_pickup', 'shipped', 'cancelled')) OR
    (v_order.state = 'ready_for_pickup' AND p_new_state = 'delivered') OR
    (v_order.state = 'shipped' AND p_new_state = 'delivered')
  ) THEN
    RAISE EXCEPTION 'This status transition is not allowed from the current order state';
  END IF;

  v_reference := 'order:' || v_order.id::text;

  IF p_new_state = 'cancelled' THEN
    PERFORM pg_catalog.set_config('iqa.inventory_reference', v_reference, true);

    FOR v_item IN
      SELECT variant_id, sum(quantity)::integer AS quantity
      FROM public.order_items
      WHERE order_id = v_order.id
      GROUP BY variant_id
      ORDER BY variant_id
    LOOP
      SELECT * INTO v_variant
      FROM public.product_variants
      WHERE id = v_item.variant_id
      FOR UPDATE;

      IF NOT FOUND OR v_variant.stock_reserved < v_item.quantity THEN
        RAISE EXCEPTION 'Reserved stock could not be safely released for this order';
      END IF;

      UPDATE public.product_variants
      SET stock_reserved = stock_reserved - v_item.quantity
      WHERE id = v_item.variant_id;
    END LOOP;

  ELSIF p_new_state IN ('shipped', 'delivered')
        AND v_order.state IN ('processing', 'packed', 'ready_for_pickup') THEN
    PERFORM pg_catalog.set_config('iqa.inventory_reference', v_reference, true);

    FOR v_item IN
      SELECT variant_id, sum(quantity)::integer AS quantity
      FROM public.order_items
      WHERE order_id = v_order.id
      GROUP BY variant_id
      ORDER BY variant_id
    LOOP
      SELECT * INTO v_variant
      FROM public.product_variants
      WHERE id = v_item.variant_id
      FOR UPDATE;

      IF NOT FOUND
         OR v_variant.stock_reserved < v_item.quantity
         OR v_variant.stock_on_hand < v_item.quantity THEN
        RAISE EXCEPTION 'Reserved stock could not be safely fulfilled for this order';
      END IF;

      UPDATE public.product_variants
      SET stock_on_hand = stock_on_hand - v_item.quantity,
          stock_reserved = stock_reserved - v_item.quantity
      WHERE id = v_item.variant_id;

      -- Releasing the reservation increases availability; stock-out consumes
      -- the same quantity. Their net effect is the actual fulfilment decrease.
      INSERT INTO public.inventory_movements
        (variant_id, movement_type, quantity_delta, reason, reference, actor)
      VALUES
        (
          v_item.variant_id,
          'release',
          v_item.quantity,
          'Order reservation consumed at fulfilment',
          v_reference || ':fulfilled:' || v_item.variant_id::text,
          p_actor
        ),
        (
          v_item.variant_id,
          'stock_out',
          -v_item.quantity,
          'Stock dispatched for order fulfilment',
          v_reference || ':fulfilled:' || v_item.variant_id::text,
          p_actor
        );
    END LOOP;
  END IF;

  UPDATE public.orders
  SET state = p_new_state, updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO public.order_status_events
    (order_id, previous_state, new_state, reason, actor)
  VALUES (p_order_id, v_order.state, p_new_state, v_reason, p_actor);

  INSERT INTO public.activity_logs
    (actor, actor_role, action, entity_type, entity_id, outcome, reason, before_safe, after_safe)
  VALUES (
    p_actor,
    'owner',
    'update_order_status',
    'order',
    p_order_id::text,
    'success',
    v_reason,
    jsonb_build_object('state', v_order.state),
    jsonb_build_object('state', p_new_state)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'order_id', p_order_id,
    'order_number', v_order.order_number,
    'state', p_new_state
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.iqa_admin_update_order_status(uuid, uuid, public.order_state, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.iqa_admin_update_order_status(uuid, uuid, public.order_state, text)
  TO service_role;
