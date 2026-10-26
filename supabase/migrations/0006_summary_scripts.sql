-- AI-written captions for summary videos, cached per exact set of facts so the paid call runs once.
create table public.summary_scripts (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  student_id uuid references public.students (id) on delete cascade, -- null = class summary
  facts_hash text not null,
  script jsonb not null,
  provider text,
  model text,
  created_at timestamptz not null default now()
);
create unique index summary_scripts_key on public.summary_scripts (lesson_id, coalesce(student_id, '00000000-0000-0000-0000-000000000000'::uuid), facts_hash);
alter table public.summary_scripts enable row level security;
-- No policies: read and written only by the server (service role) after its own ownership checks.
