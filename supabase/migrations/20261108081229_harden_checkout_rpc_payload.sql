-- Reject malformed direct RPC payloads before any idempotency or order rows are created.
-- The Edge Function validates these conditions too; this repeats the contract at the
-- database transaction boundary so service-role callers cannot bypass it accidentally.
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

  if position(v_old in v_def) = 0 then
    raise exception 'Checkout RPC definition did not match the expected baseline; refusing to alter it';
  end if;

  v_def := replace(v_def, v_old, v_new);
  execute v_def;
end
$migration$;
