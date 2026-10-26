-- Short technical reason for a failed AI request (no prompts, no student data), for debugging.
alter table public.ai_requests add column if not exists error_detail text;
