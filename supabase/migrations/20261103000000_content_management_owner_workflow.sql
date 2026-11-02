create or replace function public.iqa_manage_content(p_actor uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_id uuid;
  v_request_id uuid;
  v_content_type text;
  v_slug text;
  v_title text;
  v_text text;
  v_state text;
  v_publish_at timestamptz;
  v_reason text;
  v_before jsonb;
  v_after jsonb;
  v_existing jsonb;
  v_result jsonb;
begin
  if p_actor is null or not exists (
    select 1 from public.staff_profiles
    where user_id = p_actor and active = true and role = 'owner'
  ) then
    raise exception 'Active Owner authorization required.';
  end if;

  begin
    v_request_id := (p_payload->>'request_id')::uuid;
  exception when others then
    raise exception 'A valid request_id is required.';
  end;

  insert into private.admin_mutation_requests(request_id, actor, action)
  values (v_request_id, p_actor, 'manage_content')
  on conflict (request_id) do nothing;

  if not found then
    select response into v_existing
    from private.admin_mutation_requests
    where request_id = v_request_id and actor = p_actor and action = 'manage_content';
    if not found then raise exception 'Request ID already used for a different operation.'; end if;
    if v_existing is null then raise exception 'This request is already being processed.'; end if;
    return v_existing;
  end if;

  v_content_type := nullif(btrim(p_payload->>'content_type'), '');
  v_slug := lower(nullif(btrim(p_payload->>'slug'), ''));
  v_title := nullif(btrim(p_payload->>'title'), '');
  v_text := nullif(btrim(p_payload->>'body_text'), '');
  v_state := coalesce(nullif(p_payload->>'state', ''), 'draft');
  v_reason := nullif(btrim(p_payload->>'reason'), '');

  if v_content_type not in ('homepage_hero','collection','story','journal','faq','policy','seo') then
    raise exception 'Unsupported content type.';
  end if;
  if v_slug is null or length(v_slug) > 120 or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Enter a valid lowercase URL slug.';
  end if;
  if v_title is null or length(v_title) > 160 then
    raise exception 'Content title is required and must be 160 characters or fewer.';
  end if;
  if v_text is null or length(v_text) > 12000 then
    raise exception 'Content text is required and must be 12,000 characters or fewer.';
  end if;
  if v_state not in ('draft','published','scheduled') then
    raise exception 'Choose Draft, Published or Scheduled.';
  end if;
  if v_reason is null or length(v_reason) < 8 or length(v_reason) > 500 then
    raise exception 'A change reason (8–500 characters) is required for the audit log.';
  end if;
  if v_state = 'scheduled' then
    begin v_publish_at := (p_payload->>'publish_at')::timestamptz;
    exception when others then raise exception 'Choose a valid scheduled publication date and time.'; end;
    if v_publish_at is null or v_publish_at <= pg_catalog.now() then
      raise exception 'Scheduled publication must be in the future.';
    end if;
  else
    v_publish_at := null;
  end if;

  if nullif(p_payload->>'id','') is not null then
    begin v_id := (p_payload->>'id')::uuid;
    exception when others then raise exception 'Invalid content record ID.'; end;
    select pg_catalog.jsonb_build_object(
      'content_type',content_type,'slug',slug,'title',title,'body',body,'state',state::text,'publish_at',publish_at
    ) into v_before
    from public.content_entries where id = v_id for update;
    if not found then raise exception 'Content record not found.'; end if;

    update public.content_entries
    set content_type=v_content_type, slug=v_slug, title=v_title,
        body=pg_catalog.jsonb_build_object('text',v_text),
        state=v_state::public.record_state, publish_at=v_publish_at,
        updated_by=p_actor, updated_at=pg_catalog.now()
    where id=v_id;
  else
    insert into public.content_entries(content_type,slug,title,body,state,publish_at,updated_by)
    values(v_content_type,v_slug,v_title,pg_catalog.jsonb_build_object('text',v_text),
           v_state::public.record_state,v_publish_at,p_actor)
    returning id into v_id;
    v_before := null;
  end if;

  v_after := pg_catalog.jsonb_build_object(
    'content_type',v_content_type,'slug',v_slug,'title',v_title,
    'body',pg_catalog.jsonb_build_object('text',v_text),'state',v_state,'publish_at',v_publish_at
  );

  insert into public.activity_logs(actor,action,entity_type,entity_id,outcome,reason,before_safe,after_safe)
  values(p_actor,'manage_content','content_entry',v_id::text,'success',v_reason,v_before,v_after);

  v_result := pg_catalog.jsonb_build_object('ok',true,'content_id',v_id,'state',v_state,'publish_at',v_publish_at);
  update private.admin_mutation_requests set response=v_result where request_id=v_request_id;
  return v_result;
end;
$function$;

revoke all on function public.iqa_manage_content(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.iqa_manage_content(uuid,jsonb) to service_role;