-- Cover the order_id foreign key on checkout idempotency records.
-- This supports order lookups and avoids an unindexed foreign-key warning.
CREATE INDEX IF NOT EXISTS checkout_idempotency_order_id_idx
  ON public.checkout_idempotency (order_id);
