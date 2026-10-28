-- Questions students ask the "Explain it to me" AI tutor, with the answer.
-- Written by the server (service role); the teacher can read their own students' questions.
create table if not exists public.explain_questions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  question text not null,
  answer text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists explain_questions_student_idx on public.explain_questions (student_id, created_at desc);
create index if not exists explain_questions_assignment_idx on public.explain_questions (assignment_id);
alter table public.explain_questions enable row level security;
create policy "own explain questions read" on public.explain_questions for select to authenticated using (private.owns_student(student_id));
