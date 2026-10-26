-- Teachers write their own AI request log rows (idempotency keys) through RLS.
create policy "own ai requests insert" on public.ai_requests for insert to authenticated with check (teacher_id = (select auth.uid()));
create policy "own ai requests update" on public.ai_requests for update to authenticated using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));
