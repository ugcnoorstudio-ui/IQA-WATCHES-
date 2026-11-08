-- Reject malformed direct RPC payloads before any idempotency or order rows are created.
-- Safe to replay when the provider migration ledger has a different version ID.
do $migration$
declare
  v_def text;
  v_old text := $old$
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 20 then
    raise exception 'Cart must contain between 1 and 20 distinct items';
  end if;
$old$;
  v_new text := $new$
  if p_items is null or jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 20 then
    raise exception 'Cart must contain between 1 and 20 distinct items';
  end if;
  if exists (
    select 1
      from jsonb_array_elements(p_items) as item(value)
     where jsonb_typeof(item.value) is distinct from 'object'
  ) then
    raise exception 'Each cart item must be a JSON object';
  end if;
  if exists (
    select 1
      from jsonb_array_elements(p_items) as item(value)
     where item.value ? 'variant_id'
     group by item.value->>'variant_id'
    having count(*) > 1
  ) then
    raise exception 'Cart must not contain duplicate variant lines';
  end if;
$new$;
begin
  select pg_get_functiondef(
    'public.iqa_create_customer_order(uuid,text,uuid,jsonb,numeric,jsonb)'::regprocedure
  ) into v_def;

  -- If the exact hardening has already been applied out-of-band, do not fail or
  -- rewrite the function a second time when the repository migration later runs.
  if position('Cart must not contain duplicate variant lines' in v_def) > 0
     and position('Each cart item must be a JSON object' in v_def) > 0
     and position('p_items is null' in v_def) > 0 then
    raise notice 'Checkout RPC payload hardening is already present; skipping replay.';
    return;
  end if;

  if position(v_old in v_def) = 0 then
    raise exception 'Checkout RPC definition did not match the expected baseline; refusing to alter it';
  end if;

  v_def := replace(v_def, v_old, v_new);
  execute v_def;
end
$migration$;
