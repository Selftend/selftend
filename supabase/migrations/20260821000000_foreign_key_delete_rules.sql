-- A read-only view of the public schema's foreign keys and their delete rules,
-- so a test can assert the cascades the demo seed's teardown contract depends
-- on (#1280).
--
-- The seed wipes parents and standalone tables only and lets the cascades
-- reclaim the chain children. Nothing else protects that: a later migration
-- that adds a child with a non-cascading delete rule, or re-creates a key
-- without `on delete cascade`, would orphan demo rows silently and forever.
--
-- Why a function rather than a direct catalogue query from the test: the REST
-- surface is the only connection the integration suite has (see
-- test/integration/helpers.ts), and PostgREST exposes no catalogue.
--
-- SECURITY INVOKER (the default), not definer: pg_catalog is world-readable, so
-- the function grants no privilege its caller lacks. The grant is narrowed to
-- service_role purely as least privilege - no app code has any use for this.
create or replace function public.app_foreign_key_delete_rules()
returns table (
  child_table text,
  constraint_name text,
  parent_table text,
  delete_rule text
)
language sql
stable
set search_path = pg_catalog, public
as $$
  select
    child.relname::text,
    con.conname::text,
    (parent_ns.nspname || '.' || parent.relname)::text,
    case con.confdeltype
      when 'c' then 'CASCADE'
      when 'r' then 'RESTRICT'
      when 'n' then 'SET NULL'
      when 'd' then 'SET DEFAULT'
      else 'NO ACTION'
    end
  from pg_constraint con
  join pg_class child on child.oid = con.conrelid
  join pg_namespace child_ns on child_ns.oid = child.relnamespace
  join pg_class parent on parent.oid = con.confrelid
  join pg_namespace parent_ns on parent_ns.oid = parent.relnamespace
  where con.contype = 'f'
    and child_ns.nspname = 'public';
$$;

comment on function public.app_foreign_key_delete_rules() is
  'Foreign keys declared on public tables, with their ON DELETE rule. Schema-shape metadata only, no user data. Used by the CBT/ACT cascade guard (#1280).';

revoke execute on function public.app_foreign_key_delete_rules() from public, anon, authenticated;
grant execute on function public.app_foreign_key_delete_rules() to service_role;

notify pgrst, 'reload schema';
