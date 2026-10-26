-- EduSpark: initial schema
-- Teachers use Supabase Auth. Students never touch the database directly:
-- every student request goes through Next.js server routes that verify the
-- signed student session and use the service role key.

create extension if not exists pgcrypto;

-- ---------- Teachers ----------
create table public.teachers (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  lang text not null default 'kk' check (lang in ('kk', 'en')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_teacher()
returns trigger language plpgsql security definer set search_path = public as $$
begin
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_teacher();

-- ---------- Classes & students ----------
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  name text not null,
  grade_level text not null default '',
  join_code text not null unique,
  created_at timestamptz not null default now()
);
create index on public.classes (teacher_id);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  first_name text not null,
  last_name text not null default '',
  personal_code text not null,
  code_version int not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.students (class_id);

-- ---------- Survey (versioned: every submission is kept) ----------
create table public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  version int not null,
  interests text[] not null default '{}',
  other_interest text not null default '',
  difficulties text[] not null default '{}',
  interest_scale int check (interest_scale between 1 and 5),
  confidence_scale int check (confidence_scale between 1 and 5),
  meaning_scale int check (meaning_scale between 1 and 5),
  support text[] not null default '{}',
  support_other text not null default '',
  created_at timestamptz not null default now(),
  unique (student_id, version)
);

-- ---------- Baseline tasks & teacher observation ----------
create table public.baseline_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.students (id) on delete cascade,
  answers jsonb not null default '{}',
  results jsonb not null default '{}',
  score numeric not null default 0,
  max_score numeric not null default 0,
  created_at timestamptz not null default now()
);

create table public.observations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

-- ---------- Lessons ----------
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  topic text not null,
  objective text not null,
  duration_min int not null check (duration_min between 10 and 180),
  source_material text not null default '',
  requirements text not null default '',
  status text not null default 'draft' check (status in ('draft', 'approved', 'published', 'completed')),
  content jsonb,
  addie jsonb,
  is_demo boolean not null default false,
  ai_provider text,
  ai_model text,
  version int not null default 1,
  feedback_released boolean not null default false,
  current_stage int not null default 0,
  stage_started_at timestamptz,
  stage_extra_min int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create index on public.lessons (class_id);

create table public.lesson_versions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  version int not null,
  content jsonb not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (lesson_id, version)
);

-- One row per paid AI call. The unique key makes double clicks harmless.
create table public.ai_requests (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  idempotency_key text not null unique,
  lesson_id uuid references public.lessons (id) on delete cascade,
  kind text not null,
  status text not null default 'pending' check (status in ('pending', 'done', 'error')),
  error text,
  created_at timestamptz not null default now()
);

-- ---------- Student work (snapshot at publish time) ----------
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  variant_key text not null,
  content jsonb not null,
  mode text not null default 'phone' check (mode in ('phone', 'paper')),
  status text not null default 'assigned' check (status in ('assigned', 'in_progress', 'submitted', 'graded')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (lesson_id, student_id)
);

create table public.responses (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  task_id text not null,
  answer jsonb,
  auto_score numeric,
  ai_suggested_score numeric,
  ai_feedback text,
  teacher_score numeric,
  teacher_comment text,
  updated_at timestamptz not null default now(),
  unique (assignment_id, task_id)
);

create table public.reflections (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.assignments (id) on delete cascade,
  interest int check (interest between 1 and 5),
  confidence int check (confidence between 1 and 5),
  learned text not null default '',
  difficult text not null default '',
  created_at timestamptz not null default now()
);

-- ---------- Rate limiting for student logins ----------
create table public.login_attempts (
  id bigint generated always as identity primary key,
  key text not null,
  success boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.login_attempts (key, created_at desc);

-- ---------- Row level security ----------
alter table public.teachers enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.survey_responses enable row level security;
alter table public.baseline_attempts enable row level security;
alter table public.observations enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_versions enable row level security;
alter table public.ai_requests enable row level security;
alter table public.assignments enable row level security;
alter table public.responses enable row level security;
alter table public.reflections enable row level security;
alter table public.login_attempts enable row level security; -- no policies: service role only

create or replace function public.owns_class(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.classes c where c.id = cid and c.teacher_id = (select auth.uid()));
$$;

create or replace function public.owns_student(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.students s join public.classes c on c.id = s.class_id
    where s.id = sid and c.teacher_id = (select auth.uid())
  );
$$;

create or replace function public.owns_lesson(lid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.lessons l where l.id = lid and l.teacher_id = (select auth.uid()));
$$;

create or replace function public.owns_assignment(aid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.assignments a join public.lessons l on l.id = a.lesson_id
    where a.id = aid and l.teacher_id = (select auth.uid())
  );
$$;

revoke execute on function public.owns_class(uuid), public.owns_student(uuid), public.owns_lesson(uuid), public.owns_assignment(uuid) from anon;

create policy "teacher reads self" on public.teachers for select to authenticated using (id = (select auth.uid()));
create policy "teacher updates self" on public.teachers for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "own classes" on public.classes for all to authenticated
  using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));

create policy "own students" on public.students for all to authenticated
  using (public.owns_class(class_id)) with check (public.owns_class(class_id));

create policy "own surveys read" on public.survey_responses for select to authenticated using (public.owns_student(student_id));
create policy "own baseline read" on public.baseline_attempts for select to authenticated using (public.owns_student(student_id));
create policy "own baseline delete" on public.baseline_attempts for delete to authenticated using (public.owns_student(student_id));
create policy "own observations" on public.observations for all to authenticated
  using (public.owns_student(student_id)) with check (public.owns_student(student_id));

create policy "own lessons" on public.lessons for all to authenticated
  using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()) and public.owns_class(class_id));
create policy "own lesson versions" on public.lesson_versions for all to authenticated
  using (public.owns_lesson(lesson_id)) with check (public.owns_lesson(lesson_id));
create policy "own ai requests read" on public.ai_requests for select to authenticated using (teacher_id = (select auth.uid()));

create policy "own assignments" on public.assignments for all to authenticated
  using (public.owns_lesson(lesson_id)) with check (public.owns_lesson(lesson_id));
create policy "own responses" on public.responses for all to authenticated
  using (public.owns_assignment(assignment_id)) with check (public.owns_assignment(assignment_id));
create policy "own reflections read" on public.reflections for select to authenticated using (public.owns_assignment(assignment_id));

-- ---------- Storage: private bucket for voice answers ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('voice', 'voice', false, 10485760, array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'])
on conflict (id) do nothing;
-- No storage policies: uploads and signed URLs are made on the server with the service role.
