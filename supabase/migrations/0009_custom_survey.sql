-- Teacher-built survey: extra interest options, optional standard blocks and own questions per class.
alter table public.classes add column if not exists survey_config jsonb not null default '{}'::jsonb;
-- Answers to the teacher's own questions, with the question text kept as it was when answered.
alter table public.survey_responses add column if not exists custom_answers jsonb not null default '{}'::jsonb;
