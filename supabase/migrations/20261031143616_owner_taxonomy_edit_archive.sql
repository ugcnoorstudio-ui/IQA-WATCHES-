create or replace function private.iqa_manage_taxonomy(p_actor uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare v_request uuid; v_action text; v_kind text; v_id uuid; v_reason text; v_name text; v_slug text; v_existing jsonb; v_before jsonb; v_after jsonb; v_result jsonb; v_refs integer;
begin
 if p_actor is null or p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'Invalid taxonomy request.'; end if;
 if not exists(select 1 from public.staff_profiles s where s.user_id=p_actor and s.active=true and s.role='owner') then raise exception 'Active Owner authorization required.'; end if;
 v_action:=p_payload->>'action'; v_kind:=p_payload->>'kind';
 if v_action not in ('update','archive') or v_kind not in ('category','brand') then raise exception 'Unsupported taxonomy action.'; end if;
 begin v_request:=(p_payload->>'request_id')::uuid; v_id:=(p_payload->>'id')::uuid; exception when others then raise exception 'Valid request_id and taxonomy id are required.'; end;
 v_reason:=nullif(btrim(p_payload->>'reason'),'');
 if v_reason is null or length(v_reason)<8 or length(v_reason)>500 then raise exception 'A reason (8–500 characters) is required.'; end if;
 if v_action='update' then
  if exists(select 1 from jsonb_object_keys(p_payload) k where k<>all(array['action','kind','request_id','id','name','slug','reason'])) then raise exception 'Unsupported taxonomy field.'; end if;
  v_name:=nullif(btrim(p_payload->>'name'),''); v_slug:=lower(nullif(btrim(p_payload->>'slug'),''));
  if v_name is null or length(v_name)<2 or length(v_name)>80 then raise exception 'Name must be 2–80 characters.'; end if;
  if v_slug is null or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'Invalid slug.'; end if;
 elsif exists(select 1 from jsonb_object_keys(p_payload) k where k<>all(array['action','kind','request_id','id','reason'])) then raise exception 'Unsupported archive field.';
 end if;
 insert into private.admin_mutation_requests(request_id,actor,action) values(v_request,p_actor,'taxonomy_'||v_action||'_'||v_kind) on conflict(request_id) do nothing;
 if not found then select response into v_existing from private.admin_mutation_requests where request_id=v_request and actor=p_actor and action='taxonomy_'||v_action||'_'||v_kind; if not found then raise exception 'Request ID already used for a different operation.'; end if; if v_existing is null then raise exception 'This request is already being processed.'; end if; return v_existing; end if;
 if v_kind='category' then
  select jsonb_build_object('id',id,'name',name,'slug',slug,'state',state::text) into v_before from public.categories where id=v_id for update;
  if not found then raise exception 'Category not found.'; end if;
  if v_action='archive' then select count(*) into v_refs from public.products where category_id=v_id; if v_refs>0 then raise exception 'Reassign all products from this category before archiving it.'; end if; update public.categories set state='archived',updated_at=now() where id=v_id;
  else if exists(select 1 from public.categories where slug=v_slug and id<>v_id) then raise exception 'Category slug already exists.'; end if; update public.categories set name=v_name,slug=v_slug,updated_at=now() where id=v_id; end if;
  select jsonb_build_object('id',id,'name',name,'slug',slug,'state',state::text) into v_after from public.categories where id=v_id;
 else
  select jsonb_build_object('id',id,'name',name,'slug',slug,'state',state::text) into v_before from public.brands where id=v_id for update;
  if not found then raise exception 'Brand not found.'; end if;
  if v_action='archive' then select count(*) into v_refs from public.products where brand_id=v_id; if v_refs>0 then raise exception 'Reassign all products from this brand before archiving it.'; end if; update public.brands set state='archived',updated_at=now() where id=v_id;
  else if exists(select 1 from public.brands where slug=v_slug and id<>v_id) then raise exception 'Brand slug already exists.'; end if; update public.brands set name=v_name,slug=v_slug,updated_at=now() where id=v_id; end if;
  select jsonb_build_object('id',id,'name',name,'slug',slug,'state',state::text) into v_after from public.brands where id=v_id;
 end if;
 insert into public.activity_logs(actor,actor_role,action,entity_type,entity_id,outcome,reason,before_safe,after_safe) values(p_actor,'owner','taxonomy_'||v_action,'taxonomy_'||v_kind,v_id::text,'success',v_reason,v_before,v_after);
 v_result:=jsonb_build_object('ok',true,'action',v_action,'kind',v_kind,'id',v_id,'state',v_after->>'state');
 update private.admin_mutation_requests set response=v_result where request_id=v_request;
 return v_result;
end;
$fn$;
revoke all on function private.iqa_manage_taxonomy(uuid,jsonb) from public,anon,authenticated,service_role;
create or replace function public.iqa_manage_taxonomy(p_actor uuid,p_payload jsonb) returns jsonb language sql security definer set search_path='' as $fn$ select private.iqa_manage_taxonomy(p_actor,p_payload) $fn$;
revoke all on function public.iqa_manage_taxonomy(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.iqa_manage_taxonomy(uuid,jsonb) to service_role;