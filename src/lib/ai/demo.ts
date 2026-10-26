import type { LessonContent, Variant, Interest } from "../lesson";
import type { LessonInput } from "./prompts";
import type { ClassProfile } from "../profile";

/**
 * Rule-based DEMO lesson used when no AI provider is configured.
 * It is always saved with is_demo = true and shown with a "Demo" label.
 * Contexts are fixed sample texts; they are not written for the teacher's topic.
 */
type Ctx = { kk: string; en: string; text: string; q: string; options: string[]; match: [string, string][]; gap: string; gapAns: string[][]; write: string };

const CTX: Record<Interest, Ctx> = {
  sport: {
    kk: "Спорт: команда, жарыс, жаттығу", en: "Sport: teams, matches, training",
    text: "Arman is in the school football team. They train on Tuesdays and Thursdays. Last week they lost a match, but the coach said they played as a real team.",
    q: "Why was the coach happy?", options: ["They played as a team", "They won the match", "They trained every day", "Arman scored three goals"],
    match: [["coach", "a person who trains a team"], ["match", "a game between two teams"], ["train", "practise a sport"], ["score", "get a goal or a point"]],
    gap: "Arman ___ (train) on Tuesdays. Last week the team ___ (lose) a match.", gapAns: [["trains"], ["lost"]],
    write: "Write 2–3 sentences about a sport you like or want to try. Say why.",
  },
  music: {
    kk: "Музыка: ән, аспап, концерт", en: "Music: songs, instruments, concerts",
    text: "Aliya plays the dombyra. Every evening she practises for thirty minutes. Next month she will play at the school concert with her friends.",
    q: "What will Aliya do next month?", options: ["Play at the school concert", "Buy a new dombyra", "Stop practising", "Write a book"],
    match: [["instrument", "a thing you play music on"], ["concert", "a music show for people"], ["practise", "do something again to get better"], ["band", "a group of musicians"]],
    gap: "Aliya ___ (practise) every evening. Next month she ___ (play) at the concert.", gapAns: [["practises", "practices"], ["will play", "is going to play"]],
    write: "Write 2–3 sentences about a song or a musician you like. Say why.",
  },
  travel: {
    kk: "Саяхат: қалалар, көлік, жаңа орындар", en: "Travel: cities, transport, new places",
    text: "Last summer Dias travelled to Turkistan with his family. They went by train. He liked the old buildings and tried new food at the market.",
    q: "How did Dias travel to Turkistan?", options: ["By train", "By plane", "By bus", "By car"],
    match: [["journey", "a trip from one place to another"], ["market", "a place where people buy and sell things"], ["ticket", "a paper you need to travel"], ["map", "a picture that shows places"]],
    gap: "Last summer Dias ___ (travel) to Turkistan. He ___ (try) new food.", gapAns: [["travelled", "traveled"], ["tried"]],
    write: "Write 2–3 sentences about a place you want to visit. Say why.",
  },
  technology: {
    kk: "Технология: роботтар, қосымшалар, ойлап табу", en: "Technology: robots, apps, inventions",
    text: "Madina's class made a small robot for a science fair. The robot can follow a black line on the floor. Next, they want to teach it to avoid walls.",
    q: "What can the robot do now?", options: ["Follow a black line", "Avoid walls", "Speak English", "Clean the classroom"],
    match: [["robot", "a machine that can move and work"], ["app", "a program on a phone"], ["invent", "make something new for the first time"], ["screen", "the part of a device that shows pictures"]],
    gap: "The robot ___ (can / follow) a line. Next, they ___ (want) to teach it more.", gapAns: [["can follow"], ["want"]],
    write: "Write 2–3 sentences about a gadget or app you use. Say how it helps you.",
  },
  games: {
    kk: "Ойындар: ережелер, команда, стратегия", en: "Games: rules, teams, strategy",
    text: "Timur likes board games. On Fridays he plays chess with his grandfather. His grandfather says chess teaches you to think before you move.",
    q: "What does chess teach, according to the grandfather?", options: ["To think before you move", "To play fast", "To win every game", "To play alone"],
    match: [["rule", "what you must or must not do in a game"], ["player", "a person who plays"], ["win", "be the best in a game"], ["turn", "your time to play"]],
    gap: "Timur ___ (play) chess on Fridays. His grandfather ___ (say) it is useful.", gapAns: [["plays"], ["says"]],
    write: "Write 2–3 sentences about your favourite game. Explain one rule.",
  },
  animals: {
    kk: "Жануарлар: үй жануарлары, табиғат, күтім", en: "Animals: pets, nature, care",
    text: "Aru has a dog called Bars. She walks him every morning before school. Last week Bars was ill, so Aru took him to the vet.",
    q: "Why did Aru take Bars to the vet?", options: ["He was ill", "He was hungry", "It was his birthday", "He was lost"],
    match: [["vet", "an animal doctor"], ["pet", "an animal that lives with people"], ["feed", "give food to"], ["wild", "living free in nature"]],
    gap: "Aru ___ (walk) her dog every morning. Last week he ___ (be) ill.", gapAns: [["walks"], ["was"]],
    write: "Write 2–3 sentences about an animal you like. Say why.",
  },
  art: {
    kk: "Өнер: сурет, түс, шығармашылық", en: "Art: drawing, colours, creativity",
    text: "Erlan draws comics in his notebook. His characters are superheroes from Almaty. He wants to show his comics at the school art exhibition.",
    q: "Where are Erlan's superheroes from?", options: ["Almaty", "London", "Astana", "Space"],
    match: [["draw", "make a picture with a pencil"], ["exhibition", "a show of art for people"], ["character", "a person in a story"], ["colour", "red, blue or green, for example"]],
    gap: "Erlan ___ (draw) comics. He ___ (want) to show them at the exhibition.", gapAns: [["draws"], ["wants"]],
    write: "Write 2–3 sentences about a picture, film or comic you like. Describe it.",
  },
  other: {
    kk: "Күнделікті өмір: мектеп, достар, демалыс", en: "Everyday life: school, friends, free time",
    text: "Saule and her friends meet after school on Wednesdays. They do homework together and then go for a walk in the park.",
    q: "What do the friends do first?", options: ["They do homework", "They go to the park", "They watch a film", "They play football"],
    match: [["homework", "school work you do at home"], ["park", "a green place in a city"], ["meet", "come together"], ["free time", "time when you are not busy"]],
    gap: "Saule ___ (meet) her friends on Wednesdays. They ___ (do) homework together.", gapAns: [["meets"], ["do"]],
    write: "Write 2–3 sentences about what you do after school.",
  },
};

const T = (kk: string, en: string) => ({ kk, en });

function variant(interest: Interest): Variant {
  const c = CTX[interest];
  return {
    interest,
    context: T(c.kk, c.en),
    tasks: [
      { id: "t1", type: "choice", criterion_id: "c1", points: 2, prompt: `${c.text}\n\n${c.q}`, instruction: T("Мәтінді оқып, дұрыс жауапты таңда.", "Read the text and choose the correct answer."), options: c.options, correct: [0], hint: T("Мәтіннің соңғы сөйлемін қайта оқы.", "Read the last sentence again.") },
      { id: "t2", type: "match", criterion_id: "c2", points: 2, prompt: "", instruction: T("Сөзді мағынасымен сәйкестендір.", "Match each word with its meaning."), pairs: c.match.map(([left, right]) => ({ left, right })) },
      { id: "t3", type: "gap", criterion_id: "c2", points: 2, prompt: "", instruction: T("Жақшадағы етістіктің дұрыс түрін жаз.", "Write the correct form of the verb in brackets."), text: c.gap, answers: c.gapAns, hint: T("Уақытты көрсететін сөздерге қара: every, last week, next.", "Look at the time words: every, last week, next.") },
      { id: "t4", type: "short", criterion_id: "c3", points: 3, prompt: c.write, instruction: T("Қысқа жаз. Сөйлем үлгілерін қолдануға болады.", "Write a short answer. You can use the sentence frames."), sample_answer: "" },
    ],
  };
}

function splitMinutes(total: number, weights: number[]) {
  const sum = weights.reduce((a, b) => a + b, 0);
  const mins = weights.map((w) => Math.max(1, Math.floor((total * w) / sum)));
  let diff = total - mins.reduce((a, b) => a + b, 0);
  let i = 2; // put spare minutes into the main practice stage first
  while (diff !== 0) {
    const step = diff > 0 ? 1 : -1;
    if (mins[i] + step >= 1) {
      mins[i] += step;
      diff -= step;
    }
    i = (i + 1) % mins.length;
  }
  return mins;
}

export function demoLesson(input: LessonInput, profile: ClassProfile, interests: string[]): LessonContent {
  const valid = interests.filter((i): i is Interest => i in CTX);
  const list: Interest[] = valid.length ? valid : ["sport", "music", "travel", "technology"];
  const m = splitMinutes(input.duration, [1, 1.5, 3.5, 2, 1, 1]);
  const missingKk: string[] = [];
  const missingEn: string[] = [];
  if (profile.missing.includes("no_survey")) { missingKk.push("сауалнама әлі толтырылмаған"); missingEn.push("no survey answers yet"); }
  if (profile.missing.includes("no_baseline")) { missingKk.push("бастапқы тапсырма әлі орындалмаған"); missingEn.push("baseline tasks not done yet"); }

  return {
    expected_outcomes: [
      T(`Оқушылар оқу мақсатына сай: ${input.objective}`, `Students work towards the objective: ${input.objective}`),
      T("Таңдаған бағыты бойынша мәтінді түсініп, негізгі ақпаратты табады.", "Understand a short text in their chosen context and find key information."),
      T("Жаңа сөздер мен грамматиканы сөйлемде қолданады.", "Use new words and grammar in sentences."),
    ],
    addie_rationale: {
      analyze: T(
        `Сыныпта ${profile.studentCount} оқушы, сауалнама: ${profile.surveyCount}, бастапқы тапсырма: ${profile.baselineCount}.` + (missingKk.length ? ` Дерек жетіспейді: ${missingKk.join(", ")}.` : ""),
        `${profile.studentCount} students, surveys: ${profile.surveyCount}, baseline: ${profile.baselineCount}.` + (missingEn.length ? ` Missing data: ${missingEn.join(", ")}.` : ""),
      ),
      design: T(`Мақсат: ${input.objective}. Бағалау критерийлері мақсатпен тікелей байланысты.`, `Objective: ${input.objective}. Criteria link directly to the objective.`),
      develop: T("Әр қызығушылыққа бір мәтін, сөздік, сөйлем үлгілері, жауап кілті.", "One text per interest, word list, sentence frames, answer key."),
      implement: T("Жеке жұмыс телефонмен немесе қағазда, содан кейін жұптық жұмыс.", "Individual work on phone or paper, then pair work."),
      evaluate: T("Критерий бойынша балл, қатысу және рефлексия бөлек қаралады.", "Criterion scores, participation and reflection are reviewed separately."),
    },
    stages: [
      { title: T("Ұйымдастыру және мақсат", "Warm-up and objective"), minutes: m[0], teacher_activity: T("Тақырыпты таныстырып, мақсат пен критерийді көрсетеді.", "Introduces the topic, shows the objective and criteria."), student_activity: T("Мақсатты өз сөзімен айтады.", "Say the objective in their own words."), resources: "Slide / board", evidence: T("Оқушылардың мақсатты түсіндіруі", "Students can explain the objective") },
      { title: T("Жаңа сөздер", "New words"), minutes: m[1], teacher_activity: T("Сөздікті көрнекі түрде түсіндіреді.", "Presents the word list with pictures."), student_activity: T("Сөздерді қайталап, мысал айтады.", "Repeat words and give examples."), resources: "Word cards", evidence: T("Сөздерді дұрыс қолдану", "Correct use of words") },
      { title: T("Жеке тапсырмалар (қызығушылық бойынша)", "Individual tasks (by interest)"), minutes: m[2], teacher_activity: T("Қиналған оқушыға қолдау көрсетеді.", "Supports students who need help."), student_activity: T("Өз бағыты бойынша 1–4 тапсырманы орындайды.", "Complete tasks 1–4 in their own context."), resources: "Phone or printed worksheet", evidence: T("Тапсырма жауаптары", "Task answers") },
      { title: T("Жұптық жұмыс", "Pair work"), minutes: m[3], teacher_activity: T("Жұптарды бақылап, дескриптор бойынша белгілейді.", "Monitors pairs and marks with the descriptor."), student_activity: T("Бір-бірінен сұрап, жауап береді.", "Ask and answer questions in pairs."), resources: "Pair card", evidence: T("Жұптық диалог", "Pair dialogue") },
      { title: T("Ортақ қорытынды", "Shared final task"), minutes: m[4], teacher_activity: T("Ортақ тапсырманы ұйымдастырады.", "Leads the shared task."), student_activity: T("Бір сөйлеммен өз ойын айтады.", "Each says one sentence."), resources: "Board", evidence: T("Ауызша жауап", "Spoken answer") },
      { title: T("Рефлексия және үй тапсырмасы", "Reflection and homework"), minutes: m[5], teacher_activity: T("Рефлексия сұрақтарын қояды.", "Asks reflection questions."), student_activity: T("Рефлексия жазады.", "Write a reflection."), resources: "Phone / paper", evidence: T("Рефлексия жауаптары", "Reflection answers") },
    ],
    criteria: [
      { id: "c1", name: T("Мәтінді түсіну", "Understanding the text"), descriptors: [{ text: T("Негізгі ақпаратты дұрыс табады", "Finds the key information"), points: 2 }] },
      { id: "c2", name: T("Тілді қолдану", "Using language"), descriptors: [{ text: T("Сөздерді мағынасымен дұрыс сәйкестендіреді", "Matches words with meanings"), points: 2 }, { text: T("Етістіктің дұрыс түрін қолданады", "Uses the correct verb form"), points: 2 }] },
      { id: "c3", name: T("Қарым-қатынас", "Communication"), descriptors: [{ text: T("2–3 түсінікті сөйлем жазады", "Writes 2–3 clear sentences"), points: 3 }, { text: T("Жұбымен сұрақ қойып, жауап береді", "Asks and answers with a partner"), points: 2 }, { text: T("Өз ойын бір сөйлеммен айтады", "Says one clear sentence about their idea"), points: 2 }] },
    ],
    variants: list.map(variant),
    common_tasks: [
      { id: "p1", type: "pair", criterion_id: "c3", points: 2, prompt: "Ask your partner: What do you like doing? Why? How often do you do it?", instruction: T("Жұбыңмен кезекпен сұрақ қойып, жауап бер.", "Take turns to ask and answer with your partner."), roles: ["Student A asks, Student B answers", "Then swap"] },
      { id: "f1", type: "voice", criterion_id: "c3", points: 2, prompt: "Say one sentence: “My interest helps me learn English because …”", instruction: T("Бір сөйлем айтып, дауысыңды жазып ал.", "Say one sentence and record your voice."), sample_answer: "" },
    ],
    support: {
      vocabulary: [{ en: "because", kk: "себебі" }, { en: "usually", kk: "әдетте" }, { en: "last week", kk: "өткен аптада" }, { en: "I want to", kk: "мен ... келемін" }],
      sentence_frames: ["I like … because …", "Last week I …", "I usually … on …", "I want to … because …"],
      explanation: T("Present Simple: he/she/it + -s (plays). Past Simple: -ed (played) немесе ерекше түр (went).", "Present Simple: he/she/it + -s (plays). Past Simple: -ed (played) or irregular form (went)."),
    },
    reflection_questions: [T("Бүгін не үйрендім?", "What did I learn today?"), T("Қай жері қиын болды?", "What was difficult?"), T("Келесі жолы не істеймін?", "What will I do next time?")],
    homework: T(`«${input.topic}» тақырыбы бойынша өз қызығушылығыңа байланысты 4–5 сөйлем жаз.`, `Write 4–5 sentences about "${input.topic}" connected to your interest.`),
  };
}
