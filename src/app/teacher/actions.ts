"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/teacher";
import { classCode, personalCode } from "@/lib/codes";
import { LessonContentSchema, validateLesson, type LessonContent, type Task } from "@/lib/lesson";
import { pickVariant, type SurveyRow } from "@/lib/profile";
import { buildAssignmentContent } from "@/lib/assignment";
import { fixLesson } from "@/lib/lesson-fix";
import { SurveyConfigSchema } from "@/lib/survey";

const UUID = /^[0-9a-f-]{36}$/i;
const id = (v: unknown) => {
  const s = String(v ?? "");
  if (!UUID.test(s)) throw new Error("Bad id");
  return s;
};
export type ActionResult = { ok?: boolean; error?: string; detail?: string[]; message?: string } | null;

// ---------- Classes ----------
export async function createClassAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { sb, user } = await requireTeacher();
  const name = String(fd.get("name") ?? "").trim().slice(0, 60);
  const grade = String(fd.get("grade") ?? "").trim().slice(0, 60);
  if (!name) return { error: "required" };
  for (let i = 0; i < 5; i++) {
    const { data, error } = await sb.from("classes").insert({ teacher_id: user.id, name, grade_level: grade, join_code: classCode() }).select("id").single();
    if (!error && data) {
      revalidatePath("/teacher", "layout");
      redirect(`/teacher/c/${data.id}/students`);
    }
    if (error && error.code !== "23505") return { error: "generic" };
  }
  return { error: "generic" };
}

export async function deleteClassAction(fd: FormData) {
  const { sb } = await requireTeacher();
  await sb.from("classes").delete().eq("id", id(fd.get("class_id")));
  revalidatePath("/teacher", "layout");
  redirect("/teacher");
}

export async function updateClassAction(fd: FormData) {
  const { sb } = await requireTeacher();
  const classId = id(fd.get("class_id"));
  const name = String(fd.get("name") ?? "").trim().slice(0, 60);
  const grade = String(fd.get("grade") ?? "").trim().slice(0, 60);
  if (!name) return;
  await sb.from("classes").update({ name, grade_level: grade }).eq("id", classId);
  revalidatePath("/teacher", "layout");
}

// ---------- Students ----------
function splitName(line: string) {
  const parts = line.trim().replace(/\s+/g, " ").split(" ");
  return { first_name: parts[0].slice(0, 40), last_name: parts.slice(1).join(" ").slice(0, 60) };
}

export async function addStudentsAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { sb } = await requireTeacher();
  const classId = id(fd.get("class_id"));
  const single = { first: String(fd.get("first_name") ?? "").trim(), last: String(fd.get("last_name") ?? "").trim() };
  const list = String(fd.get("list") ?? "");
  const rows = single.first
    ? [{ first_name: single.first.slice(0, 40), last_name: single.last.slice(0, 60) }]
    : list.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 80).map(splitName);
  if (!rows.length) return { error: "required" };
  const { error } = await sb.from("students").insert(rows.map((r) => ({ ...r, class_id: classId, personal_code: personalCode() })));
  if (error) return { error: "generic" };
  revalidatePath(`/teacher/c/${classId}`, "layout");
  return { ok: true, message: String(rows.length) };
}

export async function resetCodeAction(fd: FormData) {
  const { sb } = await requireTeacher();
  const sid = id(fd.get("student_id"));
  const { data: st } = await sb.from("students").select("code_version, class_id").eq("id", sid).single();
  if (!st) return;
  // New code and new version: every old student session stops working.
  await sb.from("students").update({ personal_code: personalCode(), code_version: st.code_version + 1 }).eq("id", sid);
  revalidatePath(`/teacher/c/${st.class_id}/students`);
}

export async function removeStudentAction(fd: FormData) {
  const { sb } = await requireTeacher();
  const sid = id(fd.get("student_id"));
  const { data: st } = await sb.from("students").select("class_id").eq("id", sid).single();
  await sb.from("students").delete().eq("id", sid);
  if (st) revalidatePath(`/teacher/c/${st.class_id}`, "layout");
}

export async function updateStudentAction(fd: FormData) {
  const { sb } = await requireTeacher();
  const sid = id(fd.get("student_id"));
  const first_name = String(fd.get("first_name") ?? "").trim().slice(0, 40);
  const last_name = String(fd.get("last_name") ?? "").trim().slice(0, 60);
  if (!first_name) return;
  const { data: st } = await sb.from("students").update({ first_name, last_name }).eq("id", sid).select("class_id").single();
  if (st) revalidatePath(`/teacher/c/${st.class_id}`, "layout");
}

export async function deleteObservationAction(fd: FormData) {
  const { sb } = await requireTeacher();
  await sb.from("observations").delete().eq("id", id(fd.get("observation_id")));
  revalidatePath(`/teacher`, "layout");
}

export async function addObservationAction(fd: FormData) {
  const { sb } = await requireTeacher();
  const sid = id(fd.get("student_id"));
  const note = String(fd.get("note") ?? "").trim().slice(0, 1000);
  if (!note) return;
  await sb.from("observations").insert({ student_id: sid, note });
  revalidatePath(`/teacher`, "layout");
}

export async function resetBaselineAction(fd: FormData) {
  const { sb } = await requireTeacher();
  await sb.from("baseline_attempts").delete().eq("student_id", id(fd.get("student_id")));
  revalidatePath(`/teacher`, "layout");
}

// ---------- Lessons ----------
async function ownLesson(lessonId: string) {
  const { sb, user } = await requireTeacher();
  const { data: lesson } = await sb.from("lessons").select("*").eq("id", lessonId).single();
  if (!lesson) throw new Error("Not found");
  return { sb, user, lesson };
}

function lessonPath(l: { class_id: string; id: string }) {
  return `/teacher/c/${l.class_id}/lessons/${l.id}`;
}

export async function setLessonStatusAction(fd: FormData) {
  const lessonId = id(fd.get("lesson_id"));
  const to = String(fd.get("to"));
  const { sb, lesson } = await ownLesson(lessonId);
  const allowed: Record<string, string[]> = { draft: ["approved"], approved: ["draft"], published: ["completed"] };
  if (!allowed[lesson.status]?.includes(to)) return;
  // A lesson that fails the time/points checks cannot be approved.
  if (to === "approved" && (!lesson.content || validateLesson(lesson.content as LessonContent, lesson.duration_min).length)) return;
  await sb.from("lessons").update({ status: to, updated_at: new Date().toISOString() }).eq("id", lessonId);
  revalidatePath(lessonPath(lesson));
}

export async function publishLessonAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const lessonId = id(fd.get("lesson_id"));
  const { sb, lesson } = await ownLesson(lessonId);
  if (lesson.status !== "approved" || !lesson.content) return { error: "approveFirst" };
  const content = lesson.content as LessonContent;
  const { data: students } = await sb.from("students").select("id").eq("class_id", lesson.class_id).eq("active", true);
  const ids = (students ?? []).map((s) => s.id);
  const { data: surveys } = ids.length
    ? await sb.from("survey_responses").select("student_id, interests, version").in("student_id", ids).order("version", { ascending: false })
    : { data: [] as Pick<SurveyRow, "student_id" | "interests" | "version">[] };
  const latest = new Map<string, string[]>();
  for (const s of surveys ?? []) if (!latest.has(s.student_id)) latest.set(s.student_id, s.interests);
  const available = content.variants.map((v) => v.interest);
  const rows = await Promise.all(
    ids.map(async (sid) => {
      const key = pickVariant(latest.get(sid), available);
      return { lesson_id: lessonId, student_id: sid, variant_key: key, content: buildAssignmentContent(content, key, lesson) };
    }),
  );
  if (rows.length) {
    // ignoreDuplicates: publishing twice never creates a second copy of a student's work.
    const { error } = await sb.from("assignments").upsert(rows, { onConflict: "lesson_id,student_id", ignoreDuplicates: true });
    if (error) return { error: "generic" };
  }
  await rematchVariants(sb, lessonId, content, lesson, latest);
  await sb.from("lessons").update({ status: "published", published_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", lessonId);
  revalidatePath(lessonPath(lesson));
  return { ok: true };
}

/** Moves every not-yet-started assignment to the variant that matches the student's latest survey. */
async function rematchVariants(
  sb: Awaited<ReturnType<typeof requireTeacher>>["sb"],
  lessonId: string,
  content: LessonContent,
  lesson: { topic: string; objective: string },
  latest: Map<string, string[]>,
  includeStarted = false,
) {
  const available = content.variants.map((v) => v.interest);
  const statuses = includeStarted ? ["assigned", "in_progress"] : ["assigned"];
  const { data: rows } = await sb.from("assignments").select("id, student_id, variant_key, status").eq("lesson_id", lessonId).in("status", statuses);
  let moved = 0;
  for (const r of rows ?? []) {
    const key = pickVariant(latest.get(r.student_id), available);
    if (key === r.variant_key) continue;
    const { data: done } = await sb.from("assignments").update({ variant_key: key, content: buildAssignmentContent(content, key, lesson), status: "assigned" }).eq("id", r.id).in("status", statuses).select("id");
    // Answers written for another variant's texts no longer fit, so a moved, unsent work starts fresh.
    if (done?.length && r.status === "in_progress") await sb.from("responses").delete().eq("assignment_id", r.id);
    moved++;
  }
  return moved;
}

export async function rematchVariantsAction(fd: FormData) {
  const lessonId = id(fd.get("lesson_id"));
  const { sb, lesson } = await ownLesson(lessonId);
  if (!lesson.content) return;
  const { data: as } = await sb.from("assignments").select("student_id").eq("lesson_id", lessonId);
  const ids = (as ?? []).map((a) => a.student_id);
  const { data: surveys } = ids.length
    ? await sb.from("survey_responses").select("student_id, interests, version").in("student_id", ids).order("version", { ascending: false })
    : { data: [] as Pick<SurveyRow, "student_id" | "interests" | "version">[] };
  const latest = new Map<string, string[]>();
  for (const s of surveys ?? []) if (!latest.has(s.student_id)) latest.set(s.student_id, s.interests);
  await rematchVariants(sb, lessonId, lesson.content as LessonContent, lesson, latest, true);
  revalidatePath(lessonPath(lesson));
}

export async function saveLessonContentAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const lessonId = id(fd.get("lesson_id"));
  const { sb, lesson } = await ownLesson(lessonId);
  if (lesson.status === "published" || lesson.status === "completed") return { error: "regenBlocked" };
  let raw: unknown;
  try {
    raw = JSON.parse(String(fd.get("content") ?? ""));
  } catch {
    return { error: "invalid", detail: ["JSON"] };
  }
  const parsed = LessonContentSchema.safeParse(raw);
  if (!parsed.success) return { error: "invalid", detail: parsed.error.issues.slice(0, 10).map((i) => `${i.path.join(".")}: ${i.message}`) };
  // Minutes, points and descriptor sums are re-balanced automatically, so a removed or added task does not block saving.
  const content = fixLesson(parsed.data, lesson.duration_min);
  const problems = validateLesson(content, lesson.duration_min);
  if (problems.length) return { error: "invalid", detail: problems };
  const version = lesson.version + 1;
  await sb.from("lesson_versions").insert({ lesson_id: lessonId, version, content, note: "teacher edit" });
  // Any edit needs a fresh approval before publishing.
  await sb.from("lessons").update({ content, version, status: "draft", updated_at: new Date().toISOString() }).eq("id", lessonId);
  revalidatePath(lessonPath(lesson));
  return { ok: true };
}

export async function restoreVersionAction(fd: FormData) {
  const lessonId = id(fd.get("lesson_id"));
  const v = Number(fd.get("version"));
  const { sb, lesson } = await ownLesson(lessonId);
  if (lesson.status === "published" || lesson.status === "completed") return;
  const { data: row } = await sb.from("lesson_versions").select("content").eq("lesson_id", lessonId).eq("version", v).single();
  if (!row) return;
  const version = lesson.version + 1;
  await sb.from("lesson_versions").insert({ lesson_id: lessonId, version, content: row.content, note: `restored ${v}` });
  await sb.from("lessons").update({ content: row.content, version, status: "draft", updated_at: new Date().toISOString() }).eq("id", lessonId);
  revalidatePath(lessonPath(lesson));
}

/** Deletes a lesson with all its student work. */
export async function deleteLessonAction(fd: FormData) {
  const lessonId = id(fd.get("lesson_id"));
  const { sb, lesson } = await ownLesson(lessonId);
  await sb.from("lessons").delete().eq("id", lessonId);
  revalidatePath(`/teacher/c/${lesson.class_id}`, "layout");
  redirect(`/teacher/c/${lesson.class_id}/lessons`);
}

/** A published lesson cannot change (students already have it), so the teacher edits a draft copy. */
export async function duplicateLessonAction(fd: FormData) {
  const lessonId = id(fd.get("lesson_id"));
  const { sb, user, lesson } = await ownLesson(lessonId);
  const { data: copy } = await sb
    .from("lessons")
    .insert({
      class_id: lesson.class_id,
      teacher_id: user.id,
      topic: lesson.topic,
      objective: lesson.objective,
      duration_min: lesson.duration_min,
      source_material: lesson.source_material,
      requirements: lesson.requirements,
      content: lesson.content,
      addie: lesson.addie,
      is_demo: lesson.is_demo,
      ai_provider: lesson.ai_provider,
      ai_model: lesson.ai_model,
    })
    .select("id")
    .single();
  if (!copy) return;
  await sb.from("lesson_versions").insert({ lesson_id: copy.id, version: 1, content: lesson.content, note: "copy" });
  revalidatePath(`/teacher/c/${lesson.class_id}`, "layout");
  redirect(`/teacher/c/${lesson.class_id}/lessons/${copy.id}`);
}

/** Sends submitted work back to the student so they can change their answers and submit again. */
export async function returnWorkAction(fd: FormData) {
  const { sb } = await requireTeacher();
  const aid = id(fd.get("assignment_id"));
  await sb.from("assignments").update({ status: "in_progress", submitted_at: null }).eq("id", aid);
  revalidatePath(`/teacher`, "layout");
}

export async function stageControlAction(fd: FormData) {
  const lessonId = id(fd.get("lesson_id"));
  const op = String(fd.get("op"));
  const { sb, lesson } = await ownLesson(lessonId);
  const stages = (lesson.content as LessonContent | null)?.stages ?? [];
  if (op === "start") {
    const idx = Math.max(0, Math.min(stages.length - 1, Number(fd.get("index") ?? 0)));
    await sb.from("lessons").update({ current_stage: idx, stage_started_at: new Date().toISOString(), stage_extra_min: 0 }).eq("id", lessonId);
  } else if (op === "extend") {
    const add = Math.max(1, Math.min(15, Number(fd.get("minutes") ?? 2)));
    await sb.from("lessons").update({ stage_extra_min: lesson.stage_extra_min + add }).eq("id", lessonId);
  }
  revalidatePath(lessonPath(lesson));
}

export async function releaseFeedbackAction(fd: FormData) {
  const lessonId = id(fd.get("lesson_id"));
  const { sb, lesson } = await ownLesson(lessonId);
  await sb.from("lessons").update({ feedback_released: fd.get("release") === "1" }).eq("id", lessonId);
  revalidatePath(`/teacher/c/${lesson.class_id}`, "layout");
}

/** Sends (or takes back) the grades of one student. */
export async function releaseStudentFeedbackAction(fd: FormData) {
  const { sb } = await requireTeacher();
  const aid = id(fd.get("assignment_id"));
  await sb.from("assignments").update({ feedback_released: fd.get("release") === "1" }).eq("id", aid);
  revalidatePath(`/teacher`, "layout");
}

export async function setModeAction(fd: FormData) {
  const { sb } = await requireTeacher();
  const aid = id(fd.get("assignment_id"));
  const mode = fd.get("mode") === "paper" ? "paper" : "phone";
  await sb.from("assignments").update({ mode }).eq("id", aid);
  revalidatePath(`/teacher`, "layout");
}

/** Teacher score for one task. Checked against the task's points from the student's own snapshot. */
export async function gradeAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { sb } = await requireTeacher();
  const aid = id(fd.get("assignment_id"));
  const taskId = String(fd.get("task_id") ?? "");
  const rawScore = String(fd.get("score") ?? "").trim();
  const comment = String(fd.get("comment") ?? "").trim().slice(0, 1000);
  const { data: a } = await sb.from("assignments").select("id, content, status, lesson_id").eq("id", aid).single();
  if (!a) return { error: "generic" };
  const task = (a.content.tasks as Task[]).find((t) => t.id === taskId);
  if (!task) return { error: "generic" };
  const score = rawScore === "" ? null : Number(rawScore.replace(",", "."));
  if (score !== null && (!Number.isFinite(score) || score < 0 || score > task.points)) return { error: "range", message: String(task.points) };
  const { error } = await sb.from("responses").upsert(
    { assignment_id: aid, task_id: taskId, teacher_score: score === null ? null : Math.round(score * 2) / 2, teacher_comment: comment || null, updated_at: new Date().toISOString() },
    { onConflict: "assignment_id,task_id" },
  );
  if (error) return { error: "generic" };
  await refreshGradedStatus(sb, aid, a.content.tasks as Task[]);
  revalidatePath(`/teacher`, "layout");
  return { ok: true };
}

async function refreshGradedStatus(sb: Awaited<ReturnType<typeof requireTeacher>>["sb"], aid: string, tasks: Task[]) {
  const { data: rs } = await sb.from("responses").select("task_id, teacher_score, auto_score").eq("assignment_id", aid);
  const scored = new Set((rs ?? []).filter((r) => r.teacher_score !== null || r.auto_score !== null).map((r) => r.task_id));
  if (tasks.every((t) => scored.has(t.id))) await sb.from("assignments").update({ status: "graded" }).eq("id", aid);
}

export async function saveAddieAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const lessonId = id(fd.get("lesson_id"));
  const { sb, lesson } = await ownLesson(lessonId);
  const lang = fd.get("lang") === "en" ? "en" : "kk";
  const keys = ["analyze", "design", "develop", "implement", "evaluate"];
  const current = (lesson.addie ?? {}) as Record<string, { kk?: string; en?: string }>;
  // Only the text of the language being edited changes.
  const addie = Object.fromEntries(keys.map((k) => [k, { ...(current[k] ?? {}), [lang]: String(fd.get(k) ?? "").slice(0, 4000) }]));
  await sb.from("lessons").update({ addie }).eq("id", lessonId);
  revalidatePath(`/teacher/c/${lesson.class_id}/addie`);
  return { ok: true };
}

export async function updateProfileAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { sb, user } = await requireTeacher();
  const full_name = String(fd.get("full_name") ?? "").trim().slice(0, 100);
  if (full_name.length < 3) return { error: "nameShort" };
  await sb.from("teachers").update({ full_name }).eq("id", user.id);
  revalidatePath("/teacher", "layout");
  return { ok: true };
}

// ---------- Survey builder ----------
export async function saveSurveyConfigAction(classId: string, raw: unknown): Promise<ActionResult> {
  const { sb } = await requireTeacher();
  const cid = id(classId);
  const parsed = SurveyConfigSchema.safeParse(raw);
  if (!parsed.success) return { error: "invalid" };
  const { error } = await sb.from("classes").update({ survey_config: parsed.data }).eq("id", cid);
  if (error) return { error: "generic" };
  revalidatePath(`/teacher/c/${cid}`, "layout");
  return { ok: true };
}
