-- AI and teacher feedback can be bilingual.
alter table public.responses alter column ai_feedback type jsonb using case when ai_feedback is null then null else to_jsonb(ai_feedback) end;
alter table public.responses add column if not exists ai_flagged boolean not null default false;
alter table public.observations add column if not exists created_by uuid default auth.uid();
