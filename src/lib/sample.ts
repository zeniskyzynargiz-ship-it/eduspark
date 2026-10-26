import { demoLesson } from "./ai/demo";
import { buildProfile } from "./profile";

/** Fixed demonstration lesson for the public pages. Never stored, never mixed with real class data. */
export function sampleLesson(objective: string, topic: string) {
  return demoLesson(
    { topic, objective, duration: 45, gradeLevel: "7", sourceMaterial: "", requirements: "" },
    buildProfile([], new Map(), new Map()),
    ["sport", "music", "travel", "technology"],
  );
}
