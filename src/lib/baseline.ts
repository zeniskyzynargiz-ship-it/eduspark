import type { Task } from "./lesson";

/**
 * Short starting tasks (about 5 minutes). They give a first picture of the student's
 * English, together with the teacher's own observation. They are not a placement test.
 */
export const BASELINE_TASKS: Task[] = [
  {
    id: "b1",
    type: "choice",
    criterion_id: "vocabulary",
    points: 1,
    prompt: "Which word is a hobby?",
    instruction: { kk: "Дұрыс жауапты таңда.", en: "Choose the correct answer." },
    options: ["painting", "kitchen", "Monday", "yellow"],
    correct: [0],
  },
  {
    id: "b2",
    type: "gap",
    criterion_id: "grammar",
    points: 2,
    prompt: "",
    instruction: { kk: "Бос орынға етістіктің дұрыс түрін жаз.", en: "Write the correct form of the verb." },
    text: "My brother ___ (play) football every Saturday. We ___ (go) to school by bus.",
    answers: [["plays"], ["go"]],
  },
  {
    id: "b3",
    type: "match",
    criterion_id: "vocabulary",
    points: 2,
    prompt: "",
    instruction: { kk: "Сөзді мағынасымен сәйкестендір.", en: "Match each word with its meaning." },
    pairs: [
      { left: "travel", right: "go to other places" },
      { left: "song", right: "music with words" },
      { left: "team", right: "a group of players" },
      { left: "robot", right: "a machine that can move and work" },
    ],
  },
  {
    id: "b4",
    type: "choice",
    criterion_id: "reading",
    points: 1,
    prompt:
      "Read: \"Dana likes animals. After school she helps at a small animal shelter. She wants to be a vet.\" Why does Dana help at the shelter?",
    instruction: { kk: "Мәтінді оқып, сұраққа жауап бер.", en: "Read the text and answer the question." },
    options: ["She likes animals", "She has no homework", "Her teacher told her", "She lives there"],
    correct: [0],
  },
  {
    id: "b5",
    type: "short",
    criterion_id: "writing",
    points: 2,
    prompt: "Write 1–2 sentences about what you like doing in your free time.",
    instruction: {
      kk: "1–2 сөйлем жаз. Қате жіберуден қорықпа: бұл тек бастапқы көрініс.",
      en: "Write 1–2 sentences. Don't worry about mistakes: this is only a starting picture.",
    },
    sample_answer: "I like playing football with my friends.",
  },
];
