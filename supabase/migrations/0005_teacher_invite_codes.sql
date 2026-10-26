-- Teacher sign-up requires an invite code, so strangers cannot sign up and spend the AI budget.
-- Checked inside the auth.users trigger, so calling the Supabase sign-up API directly cannot skip it.
create table public.invite_codes (
  code text primary key,
  active boolean not null default true,
  max_uses int,               -- null = unlimited
  uses int not null default 0,
  note text not null default '',
  created_at timestamptz not null default now()
);
alter table public.invite_codes enable row level security;
-- No policies: only the service role and the trigger below can read it.

create or replace function public.handle_new_teacher()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  given text := upper(trim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')));
  ok boolean;
begin
  update public.invite_codes
     set uses = uses + 1
   where code = given and active and (max_uses is null or uses < max_uses)
  returning true into ok;
  if ok is null then
    raise exception 'invalid_invite_code' using errcode = 'P0001';
  end if;

  insert into public.teachers (id, full_name, lang)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when new.raw_user_meta_data ->> 'lang' = 'en' then 'en' else 'kk' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke execute on function public.handle_new_teacher() from public, anon, authenticated;
