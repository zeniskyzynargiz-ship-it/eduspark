# EduSpark

**Қызығушылықтан — білімге.** Ағылшын тілі сабағына арналған екі тілді (қазақша / English) білім беру платформасы.

Мұғалім тіркеледі → сынып ашады → оқушыларды қосады → QR-код жасалады → оқушылар кіріп, сауалнама мен бастапқы тапсырманы орындайды → мұғалім талдауды көреді → тақырып пен оқу мақсатын енгізеді → ЖИ (немесе «Демо» үлгі) бейімделген сабақ дайындайды → мұғалім өңдеп, бекітеді, жариялайды → оқушылар телефонмен немесе қағазда орындайды → бағалау, кері байланыс, PDF және қорытынды видео.

---

## 1. Технологиялар және неге солар

| Бөлік | Таңдау | Себебі |
|---|---|---|
| Фреймворк | **Next.js 15 (App Router) + TypeScript** | Бір жобада бет те, сервер API да бар; Vercel-ге бір батырмамен шығады. |
| Дерекқор және кіру | **Supabase** (Postgres + Auth + Storage) | Тұрақты дерекқор, email растауы бар тіркелу, Row Level Security. |
| Стиль | **Tailwind CSS 4** | Жылдам, телефонға бейімдеу оңай. |
| Қаріп | **Noto Serif / Noto Sans** | Қазақ әріптерінің бәрін (Ә Ғ Қ Ң Ө Ұ Ү Һ І) толық қолдайды. |
| Белгішелер | **lucide-react** | Бір стильдегі SVG белгішелер. |
| QR | **qrcode** | QR браузерде жасалады, ішінде тек сынып сілтемесі бар. |
| Тексеру | **zod** | ЖИ жауабының құрылымы, уақыт пен балл тексеріледі. |

## 2. Беттер мен деректер байланысы

```
Басты бет / Ғылыми негіз / ADDIE / Сабақ үлгісі (демо)   ← ашық беттер, демо деректер дерекқорға жазылмайды
/auth/register, /auth/login, /auth/forgot, /auth/reset    ← мұғалім (Supabase Auth, email растау міндетті)
/teacher                                                  ← Менің сыныптарым
/teacher/c/<сынып>/students | analysis | create | lessons | grading | results | addie | exports
/teacher/settings
/print/...                                                ← A4 баспа беттері (PDF ретінде сақтауға болады)
/join  →  /join/<СЫНЫП_КОДЫ>  →  аты  →  жеке код         ← оқушы (email керек емес)
/student, /student/survey, /student/baseline, /student/lesson/<id>, /student/summary/<id>
```

Дерекқор кестелері: `teachers`, `classes`, `students`, `survey_responses` (әр жіберу жаңа нұсқа), `baseline_attempts`, `observations`, `lessons`, `lesson_versions`, `ai_requests`, `assignments` (жариялау кезіндегі оқушы нұсқасының көшірмесі), `responses`, `reflections`, `login_attempts`. Схема: `supabase/migrations/`.

## 3. Не жұмыс істейді, не сыртқы баптауды қажет етеді

**Бірден жұмыс істейді (Supabase және Vercel айнымалылары қойылса):**
- Толық екі тіл, ҚАЗ/ENG ауыстырғышы (таңдау cookie мен браузерде сақталады, жауаптар өзгермейді).
- Мұғалімнің тіркелуі: аты-жөні, нақты email (растау хаты), құпиясөз екі рет, «Көрсету/Жасыру».
- Құпиясөзді қалпына келтіру.
- Сынып, оқушыларды жеке немесе тізіммен қосу, жеке кодтар, кодты ауыстыру, QR (PNG жүктеу, басып шығару), код карточкалары.
- Оқушының кіруі: QR → аты (тек аты және тегінің бірінші әрпі көрінеді) → жеке код. Әрекеттерге лимит бар (15 минутта 5 қате).
- Сауалнама (нұсқалары мен күні сақталады, бағаланбайды), 5 бастапқы тапсырма, мұғалім бақылауы.
- Сынып талдауы, жетіспейтін деректер ашық көрсетіледі.
- Сабақ жасау: ЖИ бапталмаса — **«Демо» белгісі бар** дайын үлгі. Уақыт пен балл бағдарламамен тексеріледі.
- Өңдеу, бөлігін қайта жасату (ЖИ болса), нұсқалар тарихы, күйлер: жоба → бекітілген → жарияланған → аяқталған.
- Телефонмен орындау: 6 тапсырма түрі, автосақтау, желі үзілсе құрылғыда сақтап қайта жіберу, дауыс жазу, қолдау батырмасы, таймер (жұмысты жоймайды).
- Бағалау: жабық тапсырмалар кілтпен, еркін жазылымға ЖИ ұсынысы (мұғалім бекітеді), айтылымды тыңдап бағалау, қағаз нәтижесін енгізу, кері байланысты ашу/жабу.
- Нәтижелер: оқу мақсаты, қатысу, рефлексия бөлек. Өсім пайызы ойдан шығарылмайды.
- PDF / басып шығару: ҚМЖ, оқушы нұсқасы, бүкіл сынып, жауаптар нұсқасы, бағалау парағы.
- Қорытынды видео: браузерде canvas + MediaRecorder арқылы. Браузер MP4 жазса — MP4, тек WebM жазса — WebM деп аталады. Қолдау жоқ болса — анимация мен PDF нұсқасы.

**Сыртқы баптауды қажет етеді:**
- **ЖИ провайдері** (міндетті емес): `AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`. Әр сұраныс провайдердің ақылы шығыны болуы мүмкін.
- **Email жіберу (SMTP)**: Supabase-тің әдепкі поштасы тек жоба командасының мекенжайларына және сағатына бірнеше хат қана жібереді. Нақты мұғалімдер тіркелуі үшін өз SMTP қосыңыз (төменде 5-қадам).
- **Автоматты транскрипция қосылмаған**: дауыс жазбаларын мұғалім тыңдайды.

## 4. Орта айнымалылары

`.env.example` файлын қараңыз. Құпия кілттер ешқашан GitHub-қа салынбайды, браузерге берілмейді.

| Айнымалы | Қайдан алу |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API Keys → Publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys → Secret key (`sb_secret_…`) немесе Legacy `service_role` кілті. Тек серверде! |
| `NEXT_PUBLIC_SITE_URL` | Vercel берген сайт мекенжайы, мысалы `https://eduspark.vercel.app` |
| `STUDENT_SESSION_SECRET` | Кез келген 32+ таңбалы кездейсоқ жол (`openssl rand -hex 32`) |
| `AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`, `AI_BASE_URL`, `AI_TIMEOUT_SECONDS` | Міндетті емес. `anthropic` немесе `openai` (OpenAI-үйлесімді API үшін `AI_BASE_URL`). |

## 5. Дерекқорды дайындау (Supabase)

> Бұл репозиторийге арналған Supabase жобасы (`eduspark`) ашылып, барлық миграция қолданылған. Жаңа жоба ашсаңыз ғана 1-қадамды орындаңыз.

1. Supabase → SQL Editor → `supabase/migrations/` ішіндегі файлдарды ретімен (0001, 0002, 0003, 0004) іске қосыңыз.
2. **Authentication → Sign In / Providers → Email**: «Confirm email» қосулы болсын (әдепкі қалпы).
3. **Authentication → URL Configuration**:
   - Site URL: `https://<сіздің-сайтыңыз>.vercel.app`
   - Redirect URLs: `https://<сіздің-сайтыңыз>.vercel.app/auth/callback`
4. **Authentication → Emails → SMTP Settings**: өз SMTP қосыңыз (мысалы Resend, Brevo, Gmail SMTP). Онсыз растау хаттары тек командаңыздың мекенжайына барады.
5. Storage: `voice` бумасы миграциямен жасалады (жабық, тек сервер арқылы).

## 6. GitHub → Vercel арқылы орналастыру

1. https://vercel.com → **Add New → Project** → GitHub-тан `eduspark` репозиторийін таңдаңыз.
2. Framework: Next.js (өзі анықтайды). Build command мен output өзгертпеңіз.
3. **Environment Variables** бөліміне 4-тармақтағы айнымалыларды қосыңыз.
4. **Deploy** басыңыз. Дайын болғанда сайт мекенжайын көшіріп, `NEXT_PUBLIC_SITE_URL` мәніне қойып, Supabase-тегі Site URL / Redirect URLs-ке жазыңыз, содан кейін **Redeploy** жасаңыз.

## 7. Жергілікті іске қосу

```bash
npm install
cp .env.example .env.local   # мәндерді толтырыңыз
npm run dev                  # http://localhost:3000
npm test                     # логика тесттері
npm run typecheck
```

## 8. Қауіпсіздік

- Мұғалім тек өз сыныптарын көреді: Postgres Row Level Security (тексерілген).
- Оқушы дерекқорға тікелей кірмейді: барлық сұраныс серверде қол қойылған cookie арқылы тексеріледі. Жеке код ауысса, ескі сессия жабылады.
- QR-кодта құпиясөз жоқ. Расталмаған адамға тек аты және тегінің әрпі көрінеді.
- Жарияланбаған жауап кілттері оқушыға жіберілмейді.
- ЖИ-ге оқушы аты жіберілмейді (S1, S2 және оқу профилі ғана).
- Қайта басу қосарланған нәтиже бермейді: ЖИ сұраныстарында idempotency кілті, жауаптарда `unique (assignment_id, task_id)`.

## 9. Суреттер

`public/images/README.md` — суреттердің атаулары, мөлдірлігін тексеру нәтижесі және жасалған өңдеу.

## 10. Толық жолды тексеру тізімі

1. Мұғалім тіркеледі → растау хатын ашады → кіреді.
2. Сынып ашады → оқушыларды тізіммен қосады → QR-ды телефонмен сканерлейді.
3. Оқушы атын таңдап, жеке кодпен кіреді → сауалнама және бастапқы тапсырма.
4. Мұғалім «Сауалнама және бастапқы талдау» бетін ашады.
5. «Сабақ жасау» → сабақты қарайды → «Бекіту» → «Оқушыларға жариялау».
6. Оқушы телефонмен орындайды (интернетті өшіріп-қосып көріңіз: жауап жоғалмайды) → «Жұмысты жіберу».
7. Мұғалім бағалайды → «Кері байланысты ашу».
8. «Материалдарды шығару» → PDF; «Нәтижелер» → сынып қорытындысы; оқушы → «Менің оқу қорытындым».
9. Тілді ауыстырыңыз: жауаптар мен балдар өзгермейді.
10. Екінші мұғалім аккаунтымен бірінші мұғалімнің сынып сілтемесін ашып көріңіз: «Бет табылмады».

---

## English summary

EduSpark is a bilingual (Kazakh/English) web platform for English lessons. Stack: Next.js 15 + TypeScript, Supabase (Postgres, Auth with email confirmation, Storage), Tailwind 4. Teachers sign up with full name, a confirmed email and a password typed twice; they create classes, add students, print QR codes; students join without email using the class code and a personal code. Lessons are generated by a configurable server-side AI provider (or a clearly labelled demo template), validated (stage minutes = duration, equal points across interest variants, descriptor sums), approved and published. Students work on phones with autosave and offline retry; teachers grade, release feedback, export A4/PDF materials and produce a rule-based summary video recorded in the browser (MP4 or WebM, whichever the browser really supports). See sections 4–6 for environment variables, Supabase setup and Vercel deployment.
