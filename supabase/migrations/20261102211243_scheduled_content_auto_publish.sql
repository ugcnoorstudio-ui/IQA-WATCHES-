
create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;

create or replace function private.iqa_publish_due_content()
returns integer
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_published integer := 0;
begin
  with due as (
    update public.content_entries
       set state = 'published'::public.record_state,
           updated_at = pg_catalog.clock_timestamp()
     where state = 'scheduled'::public.record_state
       and publish_at is not null
       and publish_at <= pg_catalog.clock_timestamp()
    returning id, content_type, slug, title, publish_at
  ),
  logged as (
    insert into public.activity_logs(
      actor, actor_role, action, entity_type, entity_id, outcome, reason, before_safe, after_safe
    )
    select
      null, null, 'scheduled_publish', 'content_entry', id::text, 'success',
      'Automatically published when its scheduled time was reached.',
      pg_catalog.jsonb_build_object(
        'content_type', content_type, 'slug', slug, 'title', title,
        'state', 'scheduled', 'publish_at', publish_at
      ),
      pg_catalog.jsonb_build_object(
        'content_type', content_type, 'slug', slug, 'title', title,
        'state', 'published', 'publish_at', publish_at
      )
    from due
    returning id
  )
  select pg_catalog.count(*)::integer into v_published from logged;

  return v_published;
end;
$function$;

revoke all on function private.iqa_publish_due_content() from public, anon, authenticated, service_role;
grant execute on function private.iqa_publish_due_content() to postgres;

select cron.schedule(
  'iqa-publish-scheduled-content',
  '* * * * *',
  'select private.iqa_publish_due_content();'
);
