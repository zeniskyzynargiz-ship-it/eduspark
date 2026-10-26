-- Keep ownership helpers out of the public API schema (no /rpc access) and
-- stop anyone from calling the signup trigger function directly.
create schema if not exists private;
grant usage on schema private to authenticated;
alter function public.owns_class(uuid) set schema private;
alter function public.owns_student(uuid) set schema private;
alter function public.owns_lesson(uuid) set schema private;
alter function public.owns_assignment(uuid) set schema private;
revoke execute on function private.owns_class(uuid), private.owns_student(uuid), private.owns_lesson(uuid), private.owns_assignment(uuid) from public, anon;
grant execute on function private.owns_class(uuid), private.owns_student(uuid), private.owns_lesson(uuid), private.owns_assignment(uuid) to authenticated;
revoke execute on function public.handle_new_teacher() from public, anon, authenticated;
