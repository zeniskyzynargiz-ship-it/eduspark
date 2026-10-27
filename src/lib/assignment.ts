import { variantTasks, type LessonContent, type Task, type Bi, type Criterion } from "./lesson";

/** Snapshot of what one student gets. Answer keys stay on the server; the student API removes them. */
export function buildAssignmentContent(c: LessonContent, interest: string, lesson: { topic: string; objective: string }) {
  const v = c.variants.find((x) => x.interest === interest) ?? c.variants[0];
  return {
    topic: lesson.topic,
    objective: lesson.objective,
    interest: v.interest,
    context: v.context,
    theory: v.theory ?? null,
    tasks: variantTasks(c, v),
    criteria: c.criteria,
    support: c.support,
    expected_outcomes: c.expected_outcomes,
    reflection_questions: c.reflection_questions,
    homework: c.homework,
  };
}


export type AssignmentContent = ReturnType<typeof buildAssignmentContent>;
export type { Task, Bi, Criterion };
