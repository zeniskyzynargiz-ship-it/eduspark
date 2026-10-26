-- The teacher can send grades to one student, not only to the whole class.
alter table public.assignments add column if not exists feedback_released boolean not null default false;
