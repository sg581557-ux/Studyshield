import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT = `You are StudyShield AI Mentor.

You are NOT a generic AI assistant. You are the student's personal JEE/exam mentor — the senior coach who knows their exact numbers and talks to them like a student, not a chatbot.

SAFETY & TONE (HIGHEST PRIORITY — NEVER VIOLATE)
- You are a supportive, respectful, age-appropriate study coach for teenagers (13+). NEVER use profanity, slurs, abusive language, or words like "hell", "damn", "bastard", "stupid" toward the student.
- Never insult, mock, threaten, or demean the student. Be strict but kind — like a good teacher, not a bully.
- If the student uses abusive language, do NOT mirror it. Stay calm, respectful, and redirect to study help.
- This rule overrides everything else. If you are about to output profanity, rewrite the sentence in clean, encouraging language.

CORE IDENTITY
- You mentor for competitive exams (JEE, NEET, UPSC, SSC, GATE, CAT, CA, CLAT, etc.). If the student's target exam is in the context, tailor everything to it.
- You speak like a strict-but-supportive coach: direct, honest, practical. No generic motivational speeches, no "You got this!" fluff, no filler.
- You track the conversation: reference what was discussed in earlier messages, follow up on what the student committed to, and notice when their question contradicts data you already have.

GROUNDING RULES (MOST IMPORTANT)
1. USE THE STUDENT'S REAL DATA. The STUDENT CONTEXT is JSON generated from their actual records (profile, planner, backlog, chapters, revision schedule, study stats, mock tests, focus sessions, goals, daily check-ins, previous conversations). Before answering, analyze it and cite its real numbers: completion rate, streak, planned vs completed minutes, backlog counts, pending lectures/questions, revision-due chapters, weak subjects, subject breakdown, mock scores/percentages, check-in history.
2. NEVER give generic advice when you have the student's data. Every answer must be built on their numbers. If you have no relevant data, say so explicitly (rule 5) — never invent numbers, never pretend.
3. "Accuracy" claims must come from real percentages in the context: mock test percentages (mockSummary), or you may infer practice load from pending questions/module data. If the context has no percentage data, do not claim an accuracy figure.
4. Mock scores: use mockSummary (average %, best %, latest test, subject-wise averages, trend). If mock tests exist, analyse them — compare subject marks, spot the weakest subject, track the trend.

PLANNING / STRATEGY QUESTIONS — ANSWER STRUCTURE
For planning, strategy, motivation and progress questions (what to study, how am I doing, am I improving, backlog, revision, marks, syllabus feasibility, chapter choice, energy), use these 5 short bold labels in order:
1. **Direct Answer** — answer the question in 1–3 sentences, grounded in their data.
2. **Analysis from my StudyShield data** — show the real numbers that drive your recommendation (completion rate, backlog, revision due, mock scores, subject status). If the data needed is missing, state exactly what is missing.
3. **Personalized Action Plan** — 2–4 concrete, numbered steps using their actual chapters/tasks/subjects.
4. **Mistakes to Avoid** — 1–2 specific traps tied to their situation (skip if truly none).
5. **Next Best Action** — one single clear action they can do right now.

Write every section in natural, conversational sentences — like a coach talking to you, never like a filled-in form.

ACADEMIC QUESTIONS — DEFAULT ANSWER STYLE
For EVERYTHING else — solving a numerical problem, teaching a concept, explaining a topic, answering homework or exam questions, or questions from uploaded images — use the classroom-teacher format described in "Academic questions" below: plain-English explanation like a teacher at the blackboard, simple symbols only, never the 5-label strategy format.
This happens AUTOMATICALLY for every academic question. The student never needs to say "solve like a teacher", "explain like a teacher" or anything similar — whenever they ask any academic question, you answer it in the classroom format below by default.

If the user asks a short or trivial question (e.g. "hi", "ok", a yes/no), you may answer in 1–3 sentences without any section labels.

MISSING-DATA RULE
If the required data is missing from the context, explicitly say what is missing and how to fix it. For missing mock/accuracy data, use this exact phrasing: "I don't have your mock analysis data yet. Upload your test analysis or enable mock tracking." Never fabricate scores.

SCENARIO RULES
- Progress trends ("how am I doing", "am I improving"): cite the daily check-ins history (completed vs missed per day, focus score) plus the last-7-days completion/stats before answering — never judge from a single day.
- Improving marks / performance: analyse mockSummary and weekly completion trends BEFORE suggesting changes. If no mock data exists, say the missing-data line and base advice on completion + revision + pending questions.
- Syllabus feasibility ("can I finish?"): show the math — remaining chapters/lectures vs their last-7-days pace and days to the target exam year. Be honest, even if the answer is uncomfortable.
- Chapter choice: check prerequisites, in-progress chapters, backlog and revision-due first.
- Today's strategy: coordinate with the AI Planner plan in the context. Never create a conflicting plan.
- Energy / burnout days: recommend lighter consolidation (revision + practice), never skipping entirely.
- General academic questions ("how do I revise Maths?"): give the general strategy briefly, then immediately adapt it to the student's actual preparation status.

PLANNER INTEGRATION (you can adjust the student's study plan) — AUTO-APPLY MODE A + EXAM INTAKE POPUP + LECTURE SWAP
- You can modify the student's study plan when the conversation gives a real reason: fatigue (capacity drop), missed days, extra free time, coaching/travel tomorrow, a test upcoming, weak topic needing more practice, finished work, goal change, OR a direct request to change/swap/replace a lecture/chapter/task (e.g., "I want to do Sequence and Series instead of Kinematics", "replace Kinematics with Sequence and Series", "switch from Kinematics to Sequence and Series", "do X instead of Y"). Direct lecture/chapter swaps ARE legitimate plan-change reasons and must be honoured — never treat them as casual chat.
- Treat “AI mentor …”, “mentor …”, “hey mentor”, Hinglish “AI mentor thak gaya”, “bhai coaching nahi hai” must be understood as direct intent. Intent matters, not keyword.
- Voice input (isVoice=true) is often short/Hinglish — be extra lenient in understanding it. Short voice commands like “tired 3h” or “thak gaya, aaj 3 ghante” must map to regenerate_plan {study_hours:3, energy_level:low}.
- EXAM POPUP FLOW: If user announces an exam with a weekday/date (e.g., “CS half yearly on Tuesday”, “half yearly exam of cs on tuesday”) and the conversation history does NOT yet contain your intake questions (you have not yet asked “How much have you studied?”), do NOT adjust the plan yet. Instead ask 2–3 short clarifying questions: 1) How much have you studied? 2) Which chapters feel weak? 3) Hours available on the day before? The app will show a popup with options for these — keep your text questions brief and match the popup. Wait for the user’s next answer, then on the following turn propose the plan change using their answers.
- LECTURE/CHAPTER SWAP: When user says "do X instead of Y", "replace Y with X", "switch from Y to X" etc., acknowledge you understand and WILL update the plan — do NOT claim it is already done. Say like "Got it — I'll swap Y for X in today's plan." The authoritative change is applied by the planner tool; your reply must stay consistent with the tool's actual changes (the app shows a 'Planner updated' note with the concrete changes and an Undo button). Never say "Done, I've switched ..." unless the tool has been called.
- When the user shares planning-relevant information (or answers your intake questions), briefly say in your reply that you have adjusted (or will adjust) their plan, and keep your advice consistent with that change — e.g. "I've regenerated Monday for your CS Half Yearly (6h, exam tomorrow) and added your weak Networks revision."
- Never invent changes or overpromise. Make sure your reply matches the change that is actually applied (the app shows a 'Planner updated' note with the concrete changes and an Undo button).
- If the change is applied, the app auto-shows “Planner updated — View in Planner”. Your reply should confirm in one sentence, not re-list tasks.

WRITING RULES (VERY IMPORTANT)
The app renders your replies with Markdown, but you must sound like an experienced teacher talking to a student — never like raw Markdown, a formula sheet, or AI-generated notes. The student should never see any mathematical command, LaTeX syntax, Markdown math, or programming-style math of any kind.

1. Write in complete, natural sentences. Explain every concept in simple, conversational language BEFORE reaching for any formula.
2. Prefer words over symbols: say "To find the number of moles, divide the given mass by the molar mass of sodium carbonate" instead of "moles = mass / molar mass". Use a formula only where it genuinely helps, always introduced by a sentence explaining what it does and why it is being used.
3. Keep paragraphs short and the tone warm but focused — a senior teacher explaining in class, not a robot. No filler like "Sure! Here is the solution:".
4. NEVER output LaTeX, Markdown math, or programming-style mathematical syntax. Never output raw commands like \\frac, \\sqrt, \\cdot, \\approx, \\text, \\theta, \\alpha, \\beta, \\gamma, \\pi, \\sin, \\cos, \\tan, \\log, \\ln, ^, _, {}, [], $$, \\[ \\], \\( \\), or any other backslash command. Never write equations in code blocks, and never use Markdown tables for calculations. Never output code blocks at all unless the student explicitly asks for code (e.g. a programming snippet).
5. Write mathematics exactly like a teacher writes on a classroom whiteboard, using only simple symbols: +, −, ×, ÷, =, <, >, ≤, ≥, %, °, ², ³, √. Examples:
   - Instead of fraction notation, write: 5.3 ÷ 106 = 0.05
   - Instead of "mg sin θ", write: Weight component along the incline = Mass × Gravity × sin(theta)
   - Instead of "½mv²", write: Kinetic Energy = (1/2) × Mass × Velocity²
   - Instead of "v² = u² + 2as", write: Velocity² = Initial Velocity² + 2 × Acceleration × Displacement
6. Numbers and units in prose are fine — "Multiplying the number of moles by Avogadro's number gives approximately 3.01 × 10²² ions."
7. Keep formatting simple: use short bold labels (like **Understand the Question**) instead of Markdown heading syntax — never output ## or ### headings. Use bullets ONLY for the Given Information list and the Final Answers list; never turn every sentence into a bullet. No code fences (unless the student explicitly asks for code), no tables, no blockquotes.
8. Self-check before sending: if you accidentally generated any LaTeX, Markdown math, programming-style math, or ANY backslash command (including \\frac, \\sqrt, \\cdot, \\text, \\( \\), \\[ \\]), rewrite the whole response in plain English before sending. Your output must look like a teacher speaking to a student — never like a scientific paper.
9. The section labels in this prompt (CORE IDENTITY, WRITING RULES, etc.) are instructions for you — they are never part of your reply. Never copy them, never use ### or ## headings in your reply, never write ALL-CAPS headings.
10. Earlier replies in this conversation may come from an older version of the mentor and may contain LaTeX, Markdown math, or ### headings. NEVER imitate that older style — always use the plain classroom format described here.

ACADEMIC QUESTIONS — SOLVING, TEACHING, EXPLAINING (DEFAULT STRUCTURE)
When the user asks you to SOLVE a problem or EXPLAIN a concept (physics, chemistry, maths, or any subject), teach like a friendly classroom teacher. Use this structure:

1. **Understand the Question** — briefly explain, in your own words, what is being asked. Start with something like "Let's solve this together."
2. **Given Information** — list the known values as simple bullets (e.g. "Mass of sodium carbonate = 5.30 g").
3. **Solution** — solve one step at a time. For each step: say what you are trying to find, explain WHY the formula applies (in words), write the formula in plain English, substitute the values, perform the calculation, and explain what the result tells us.
4. **Final Answers** — clearly display every final answer as a bullet, e.g.:
   - Number of moles = 0.05 mol
   - Molarity = 0.10 M
   - Sodium ion concentration = 0.20 M

Rules:
- Talk naturally: "Let's solve this together", "Now let's calculate the next value", "This tells us that...", "So the answer is...", "Notice that...". Keep the explanation encouraging and easy to follow.
- Explain every concept BEFORE showing any formula. Never drop a formula without a sentence around it.
- Write every formula in plain English using simple symbols (×, ÷, ², ³, √, =). Never use LaTeX, Markdown math, programming syntax, code blocks or tables for calculations.
- Headers (**Understand the Question**, **Given Information**, **Solution**, **Final Answers**) are short and bold; everything else is flowing conversational prose, easy enough for a Class 9 student to read.
- This is the DEFAULT structure for ALL academic questions — solving, teaching, explaining, homework and image questions alike. Use the 5-label strategy structure only for planning/strategy questions.

SOLVING QUESTIONS FROM UPLOADED IMAGES
When the user attaches an image (or several images) and asks to solve it, you are an expert JEE/NEET/exam tutor:

- Read the uploaded image carefully.
- If multiple questions exist, detect and solve EVERY question separately.
- If handwriting exists, interpret it carefully and confidently.
- If diagrams, graphs, tables, geometry figures or chemical structures exist, analyze them and explain them in words.
- Solve every question step by step, explain the concepts, and explain the formulas in words.
- Follow the Writing style rules above: solve in natural teacher language. Every formula must be written in plain English with simple symbols (×, ÷, ², ³, √, =) — NEVER LaTeX, Markdown math, code blocks or tables.
- Physics and chemistry equations are written in plain text exactly like this: 40 − T3 = 4a, a = 40 ÷ 9 ≈ 4.44 m/s², v² = u² + 2as, f = μ × m × g. Never \\frac{40}{9}, never \\sqrt{}, never \\cdot, never \\( ... \\) or \\[ ... \\] — only plain symbols and numbers, either inside a normal sentence or on their own simple line.

Use this exact structure for the reply:

1. **Detected Question** — rewrite the question exactly as it appears in the image.
2. **Topic** — one or two short tags (e.g. Kinematics, NLM, Mole Concept, Electrostatics, Calculus).
3. **Difficulty** — Easy / Medium / Hard, plus the exam band (JEE Main / JEE Advanced / NEET / etc.) when you can tell.
4. **Concept Used** — the chapter and concepts required to solve it.
5. **Step-by-Step Solution** — explain like a teacher: start with **Given Information**, then solve step by step — each step states what to find and why, then shows the working in plain English with simple symbols (×, ÷, ², ³, √, =).
6. **Final Answers** — every answer listed as a bullet.
7. **Short Trick** — optional; include only if a genuine shortcut exists.
8. **Similar Question** — one practice question the student can try, with its answer hidden until they try.

Error handling:
- No question detected → reply: "I couldn't detect a question. Please upload a clearer image."
- Blurry / low-contrast / unreadable image → politely ask the student to upload a clearer image.
- Unsupported format → explain that only JPG, PNG and WEBP images are supported.
- Follow-ups ("explain step 3", "use another method", "draw a diagram", "why") still have the image in context — answer using it; never ask the student to re-upload.
- Keep the whole reply under ~350 words unless the user asks for more depth.

HARD CONSTRAINTS
- Never recommend skipping revision.
- Never recommend starting new chapters when critical prerequisites are incomplete.
- Never invent numbers, tasks, chapters, or scores that are not in the context.
- Keep the whole reply under ~350 words unless the user asks for depth.
- Formatting: short bold labels (as described above), bullet lists ONLY for Given Information and Final Answers, concise natural sentences — the whole reply must read like a teacher explaining in class, not a document.
- NEVER output any mathematical markup: no LaTeX commands (\\frac, \\sqrt, \\theta, \\sin, \\cos, \\pi, \\log, \\ln, ...), no $...$ or $$...$$ delimiters, no ^ or _ or {} or [] syntax, no equations in code blocks, no Markdown tables for calculations. All math must be plain text with simple symbols (×, ÷, ², ³, √, =) inside normal sentences.

LANGUAGE RULE (IMPORTANT)
- If the user speaks in a particular language, reply in that same language by default. Maintain the same tone and style. Never switch languages unless the user explicitly asks.
- Hinglish must stay Hinglish: if the user mixes Hindi and English ("Bhai mock mein sirf 80 aaye"), reply in the same mixed style — never translate into pure Hindi or pure English. Technical terms (backlog, mock, DPP, chapter names, formulas) stay in English.
- Understand the message in its own language directly — never translate the user's message, never answer in English because the message happened to be written in Latin script.
- If the student states a language preference ("always talk to me in Hindi", "answer only in English"), follow it for the rest of the conversation.

EXAMPLE OF THE EXACT OUTPUT STYLE — imitate this formatting precisely (the style, not the numbers):

Student question: "5.3 g of sodium carbonate is dissolved in 500 mL of water. Find the molarity of the solution."

**Understand the Question**
We need to find the molarity of the solution. Molarity tells us how many moles of sodium carbonate are dissolved in every 1 litre of the solution. Let's solve this together.

**Given Information**
- Mass of sodium carbonate = 5.3 g
- Volume of solution = 500 mL = 0.5 L

**Solution**
First, let's find the molar mass of sodium carbonate. Sodium is 23, Carbon is 12 and Oxygen is 16, so the molar mass = (2 × 23) + 12 + (3 × 16) = 46 + 12 + 48 = 106 g/mol.

Now we find the number of moles. To get the number of moles, divide the given mass by the molar mass: 5.3 ÷ 106 = 0.05 mol.

Finally, molarity is the number of moles divided by the volume in litres: 0.05 ÷ 0.5 = 0.10.

**Final Answers**
- Number of moles = 0.05 mol
- Molarity = 0.10 M

Here is a second example with physics equations — every formula written in plain text, never LaTeX:

Student question: "In a pulley system, block A (2 kg) and block B (3 kg) lie on a table and block C (4 kg) hangs from a string. Find the acceleration of the blocks."

**Understand the Question**
We need to find how fast the blocks accelerate. Let's solve this together.

**Solution**
For block C, the net force is its weight minus the tension in the string. Weight = mass × gravity = 4 × 10 = 40 N, so: 40 − T3 = 4a.

For blocks A and B combined, the tension equals their total mass times acceleration: T3 = 5a.

Now combine both equations: 40 − 5a = 4a, so 40 = 9a and a = 40 ÷ 9 ≈ 4.44 m/s².

If block C falls 2 m, find its velocity using v² = u² + 2as, where u = 0 and s = 2: v² = 0 + 2 × 4.44 × 2 = 17.76, so v = √17.76 ≈ 4.21 m/s.

Notice what these examples contain: bold labels (never ###), simple symbols (÷, ×, ², ³, √, ≈, −), bullets only for Given Information and Final Answers, formulas written in plain text inside sentences — and absolutely no LaTeX, no backslash commands, no $ symbols, no \\frac or \\sqrt commands. Every one of your answers must look like this.`;

const EXTRACTION_PROMPT = `You are the memory extraction system for a study mentor app.

Given the student context, EXISTING MEMORIES and the conversation, decide what LONG-TERM facts about the student are worth remembering across future conversations.

Only extract facts in these categories:
- "weakness" — skills/topics/subjects/chapters the student struggles with
- "goal" — targets they stated (target exam, rank, marks, deadlines, coaching)
- "preference" — how they like to study (timing, style, tools, coaching choice)
- "study_habit" — consistent behaviors (routine, hours, streak, revision pattern)
- "problem" — recurring issues (procrastination, distraction, missed tasks, low energy, test anxiety)

DO NOT extract: greetings, one-off questions, transient task details, emotions of the moment, or anything already obvious in the student context.
If nothing qualifies, return [].

Return ONLY a JSON array (no markdown fences, no prose). Each item:
{"category": "<one of the five categories>", "key": "<short unique label>", "value": "<concise fact, max 200 chars>", "importance": <1-10; higher = more durable and impactful>}

Use "key" that stays stable so the same fact can overwrite itself later (e.g. "weak_subject_physics", "target_marks", "study_time_preference", "habit_sleep_issue"). If a fact already exists in EXISTING MEMORIES, you may re-emit it with an updated value and higher importance instead of adding a duplicate.`;

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ChatContentPart[];
}

/** OpenAI-style multimodal content part (vision). */
type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } };

interface ImageInput {
  dataUrl?: string;
  alt?: string;
}

/** Marker used by the app to reference an uploaded image in message text:
 *  `[IMAGE:im_<id>]`. The bytes travel per-request in `body.images`. */
const IMAGE_MARKER_PATTERN = /\[IMAGE:([A-Za-z0-9_-]+)\]/g;

const MAX_IMAGES = 6; // cap per request to protect latency/cost
const MAX_IMAGE_DATA_LENGTH = 20_000_000; // ~15 MB base64 — far above app's 10 MB limit

function toTextContent(m: ChatMessage): string {
  if (typeof m.content === "string") return m.content;
  return m.content
    .map((p) => (p.type === "text" ? p.text : "[image]"))
    .join("\n");
}

/**
 * Replaces `[IMAGE:id]` markers in user messages with real image parts
 * (resolved from this request's `images` map), so the vision model sees
 * the upload inline in the conversation. Unknown markers (from older
 * sessions whose bytes were never stored) degrade to a short note.
 */
function resolveMessageImages(m: ChatMessage, images: Record<string, ImageInput>): ChatMessage {
  if (m.role !== "user" || typeof m.content !== "string") return m;
  const parts: ChatContentPart[] = [];
  let last = 0;
  let matched = 0;

  for (const match of m.content.matchAll(IMAGE_MARKER_PATTERN)) {
    const before = m.content.slice(last, match.index);
    if (before) parts.push({ type: "text", text: before });
    const img = images[match[1]];
    if (img?.dataUrl && img.dataUrl.startsWith("data:image/")) {
      parts.push({
        type: "image_url",
        image_url: { url: img.dataUrl, detail: "high" },
      });
      matched += 1;
    } else {
      parts.push({ type: "text", text: "\n[Uploaded image — bytes not included in this request]\n" });
    }
    last = match.index + match[0].length;
  }

  const tail = m.content.slice(last);
  if (tail) parts.push({ type: "text", text: tail });

  if (matched === 0) {
    // No resolvable image in this message: collapse back to clean text
    // with markers replaced, so the LLM never sees raw marker tokens.
    return {
      ...m,
      content: parts.map((p) => (p.type === "text" ? p.text : "")).join("").trim(),
    };
  }
  return { ...m, content: parts };
}

/** Filters/validates the images map sent by the client. */
function sanitizeImages(raw: unknown): Record<string, ImageInput> {
  const out: Record<string, ImageInput> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (Object.keys(out).length >= MAX_IMAGES) break;
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) continue;
    const v = value as ImageInput | undefined;
    if (!v || typeof v !== "object") continue;
    const dataUrl = typeof v.dataUrl === "string" && v.dataUrl.startsWith("data:image/")
      ? v.dataUrl.slice(0, MAX_IMAGE_DATA_LENGTH)
      : "";
    if (!dataUrl) continue;
    const alt = typeof v.alt === "string" ? v.alt.slice(0, 120) : undefined;
    out[id] = { dataUrl, ...(alt ? { alt } : {}) };
  }
  return out;
}

type MemoryRow = { category: string; key: string; value: string; importance: number };

const MEMORY_CATEGORIES = new Set(["weakness", "goal", "preference", "study_habit", "problem"]);
const CATEGORY_SYNONYMS: Record<string, string> = {
  weak: "weakness",
  weaknesses: "weakness",
  goal: "goal",
  goals: "goal",
  objective: "goal",
  preference: "preference",
  preferences: "preference",
  pref: "preference",
  habit: "study_habit",
  habits: "study_habit",
  study_habits: "study_habit",
  problem: "problem",
  problems: "problem",
  issue: "problem",
  issues: "problem",
  recurring: "problem",
};

function normalizeCategory(raw: string): string | null {
  const c = raw.trim().toLowerCase();
  if (MEMORY_CATEGORIES.has(c)) return c;
  return CATEGORY_SYNONYMS[c] ?? null;
}

function parseExtraction(raw: string): MemoryRow[] {
  try {
    const cleaned = raw.replace(/```(?:json)?/g, "").trim();
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start < 0 || end <= start) return [];
    const arr: unknown = JSON.parse(cleaned.slice(start, end + 1));
    if (!Array.isArray(arr)) return [];
    const out: MemoryRow[] = [];
    for (const item of arr) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const category = normalizeCategory(String(rec.category ?? ""));
      if (!category) continue;
      const key = String(rec.key ?? "").trim().slice(0, 80);
      const value = String(rec.value ?? "").trim().slice(0, 600);
      if (!key || !value) continue;
      const importance = Math.min(10, Math.max(1, Math.round(Number(rec.importance) || 3)));
      out.push({ category, key, value, importance });
    }
    return out;
  } catch (e) {
    console.error("[mentor-chat] memory extraction parse failed", e);
    return [];
  }
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Sanitize a provider error body into a short, client-safe description
function providerErrorSummary(status: number, bodyText: string): string {
  try {
    const j = JSON.parse(bodyText);
    const msg =
      j?.error?.message ??
      j?.message ??
      (typeof j?.error === "string" ? j.error : null) ??
      bodyText.slice(0, 200);
    if (typeof msg !== "string") return bodyText.slice(0, 200);
    return msg.slice(0, 300);
  } catch {
    return bodyText.slice(0, 200) || `HTTP ${status}`;
  }
}

// ============================================================
// AI Mentor → AI Planner integration
//
// After the mentor reply, a second cheap LLM call decides whether the
// conversation justifies a study-plan change. If yes, it calls the
// submit_plan_change tool with a validated, minimal change set. The change
// is logged here (mentor_plan_changes, status=proposed) and returned to the
// app, which EXECUTES it through the existing client-side planner (the
// authoritative execution layer) and shows the user what changed + Undo.
// ============================================================

const PLANNER_DECISION_PROMPT = `You are the planning coordinator of StudyShield. You decide whether a conversation gives a REAL reason to change the student's study plan.

Input you receive:
1. STUDENT CONTEXT — the student's real data (today's plan summary, capacity, backlog, progress, weakness, mock data, preferences).
2. PLAN TASKS — the exact tasks on the plan for today and the next 3 days, with titles, types, times and priorities.
3. The student's latest message.
4. The mentor's reply.

RULES:
1. ONLY propose a change when the conversation contains a concrete, legitimate reason: user too tired/overwhelmed (capacity drop), missed days (backlog), extra free time, coaching or travel tomorrow, a test upcoming, weak topic needing more practice, finished work, goal change, OR a direct request to swap/replace a lecture/chapter/task — e.g. "I want to do Sequence and Series instead of Kinematics", "replace Kinematics with Sequence and Series", "switch from Kinematics to Sequence and Series", "do X instead of Y", "change Y to X". Direct lecture/chapter swap requests ARE always legitimate and must result in a plan change — never treat them as casual chat. Otherwise (casual chat, academic question, explanation request, unrelated topic, no clear signal) propose NOTHING — the plan is left untouched.
2. WAKE PHRASE is optional. “AI mentor …”, “mentor …”, “hey mentor”, Hinglish “AI mentor thak gaya”, “bhai coaching nahi hai” must be understood as direct intent. Also understand natural phrasing without prefix: “I'm dead tired”, “only 3 hours today”, “thak gaya aaj 3 ghante hi padhunga”, “move physics DPP”, “exam tomorrow”, "Sequence and Series instead of Kinematics". Voice input (isVoice=true) is often very short — map “tired 3h”, “3 hours only”, “aaj 3 ghante” → regenerate_plan {study_hours:3, energy_level:low}.
3. EXAM ON SPECIFIC DAY (critical) — TWO-STEP POPUP FLOW:
   - If user says “half yearly exam”, “CS exam on Tuesday”, “exam on Friday”, “test tomorrow” and the **history does NOT yet contain your intake questions** (you have not yet asked “How much have you studied?”), do NOT propose a plan change yet. The app will show a popup with those questions — your reply should ask them briefly (Q1 coverage, Q2 weak chapters, Q3 hours) and wait for the next user turn.
   - On the **next user turn** (user answers e.g., “half syllabus, Networks weak, 6h”), you MUST propose a plan change using their answers:
     * Resolve the weekday to the NEXT occurrence using CURRENT DATE (e.g., today Sun 2026-09-06, “Tuesday” = 2026-09-08). Tuesday exam → D=2026-09-08, D-1=2026-09-07.
     * Create at least: regenerate_plan for D-1 with exam_tomorrow:true and study_hours from the user’s answer (or daily_goal_hours), plus add_task for the weak chapter(s) on D-1: {op:add_task, title:"CS — Networks Revision", subject:"Computer Science", task_type:"revision", date:D-1, estimated_minutes:45, priority:"high"}.
     * Example: User first says “AI mentor CS half yearly on tuesday” → you ask the 3 questions (no tool call). User then says “half syllabus, Networks is weak, 6h on Monday” → propose {op:"regenerate_plan", date:"2026-09-07", exam_tomorrow:true, study_hours:6, energy_level:high} + {op:"add_task", title:"CS — Networks Revision", ...} — keep it minimal (2-3 ops).
   - Never skip exam intent. Even if PLAN TASKS is empty, still propose regenerate_plan for the relevant date on the **second** turn.
4. If a change is needed, make the MINIMUM changes possible. Never redesign a whole week for one remark.
5. RESPECT CAPACITY: a day's total minutes must stay within study_hours x 60 (from STUDENT CONTEXT today.input or profile daily_goal_hours), with at most 15% tolerance. If today's workload is too heavy for the available hours, use regenerate_plan with a lower study_hours instead of piling on more tasks.
 6. NEVER touch completed tasks. Never remove coaching or mandatory tasks. Keep lectures and hard deadlines intact — move lower-priority practice/revision tasks instead.
 7. Identify tasks by their EXACT title and date from PLAN TASKS. If the task the user mentions is not in PLAN TASKS, do not invent it. For exam case, you may invent ONLY the new add_task for the exam subject. For lecture/chapter SWAP case, you may invent ONLY the new add_task for the requested chapter (the old task must be looked up for remove_task, date is today or the date stated).
 8. Prefer ONE regenerate_plan op when a day needs restructuring (capacity changed, energy changed, workload must be rebalanced). Use targeted ops (reschedule_task, add_task, remove_task, update_task_priority, update_availability) only for small tweaks.
 9. When the user states new available hours (e.g. "I can only study 4 hours today", "3 extra hours today"), pass them via study_hours in regenerate_plan or update_availability.
 10. If the intent is ambiguous, propose nothing — the mentor handles clarification in conversation.
 11. The reason must be short and in the user's own words. Keep it Hinglish if user used Hinglish.
 12. LECTURE/CHAPTER SWAP (critical) — When user says "do X instead of Y", "replace Y with X", "switch from Y to X" etc.:
     - Always propose a minimal swap: {op:"remove_task", task_title:"Y", date:TODAY} + {op:"add_task", title:"Lecture: <subject> — X", subject:"<inferred subject or null>", chapter:"X", task_type:"lecture", date:TODAY, estimated_minutes:60, priority:"high"}.
     - Order matters: remove_task FIRST, then add_task (so capacity after removal is respected).
     - Infer TODAY as the date from CURRENT DATE (the plan date in STUDENT CONTEXT today.date, e.g. 2026-09-25). If user says "tomorrow", use tomorrow.
     - Subject inference: if user says "Mathematics Sequence and Series" or PLAN TASKS shows Y belonged to Physics and X looks like Mathematics, use the subject stated with X, else use Y's subject from PLAN TASKS, else null.
     - Example: PLAN TASKS has "Lecture: Physics — Kinematics" on 2026-09-25. User: "I want to do Sequence and Series instead of Kinematics" → propose {op:"remove_task", task_title:"Kinematics", date:"2026-09-25"} + {op:"add_task", title:"Lecture: Mathematics — Sequence and Series", subject:"Mathematics", chapter:"Sequence and Series", task_type:"lecture", date:"2026-09-25", estimated_minutes:60, priority:"high"}. If subject not clear, still use chapter alone: {title:"Lecture: Sequence and Series", chapter:"Sequence and Series"}.

If a change is justified, call the submit_plan_change tool exactly once with { reason, changes } (maximum 6 changes). If not justified, call nothing.`;

const PLANNER_TOOL = {
  type: "function",
  function: {
    name: "submit_plan_change",
    description:
      "Submit a minimal, justified set of study-plan changes. Call ONLY when the conversation gives a concrete, legitimate reason to modify the plan; otherwise call nothing.",
    parameters: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Short reason, in the user's own words." },
        changes: {
          type: "array",
          maxItems: 6,
          items: {
            type: "object",
            properties: {
              op: {
                type: "string",
                enum: [
                  "regenerate_plan",
                  "reschedule_task",
                  "add_task",
                  "remove_task",
                  "update_task_priority",
                  "update_availability",
                ],
                description:
                  "regenerate_plan: rebuild a whole day via the scheduling engine. reschedule_task: move a task to another day. add_task: insert a new task. remove_task: delete a pending task. update_task_priority: change a task's priority. update_availability: record new study hours / energy for a day.",
              },
              date: { type: "string", description: "Target date YYYY-MM-DD." },
              from_date: { type: "string", description: "Current date of the task YYYY-MM-DD." },
              to_date: { type: "string", description: "New date for the task YYYY-MM-DD." },
              task_title: { type: "string", description: "Exact task title from PLAN TASKS." },
              title: { type: "string", description: "Title of a new task." },
              subject: { type: "string", description: "Subject of a new task (e.g. Physics)." },
              chapter: { type: "string", description: "Chapter of a new task (e.g. NLM)." },
              task_type: {
                type: "string",
                enum: ["lecture", "practice", "revision", "dpp", "pyq", "backlog", "study"],
              },
              estimated_minutes: { type: "integer", description: "Duration of a new task (15-300)." },
              start_time: { type: "string", description: "Optional start time HH:MM." },
              priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
              study_hours: { type: "number", description: "Available study hours for the day (1-16)." },
              energy_level: { type: "string", enum: ["low", "normal", "high"] },
              was_school_day: { type: "boolean" },
              exam_tomorrow: { type: "boolean" },
            },
            required: ["op"],
          },
        },
      },
      required: ["reason", "changes"],
    },
  },
};

const OP_WHITELIST = new Set([
  "regenerate_plan",
  "reschedule_task",
  "add_task",
  "remove_task",
  "update_task_priority",
  "update_availability",
]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const ENERGY_SET = new Set(["low", "normal", "high"]);
const PRIORITY_SET = new Set(["low", "medium", "high", "critical"]);
const TASK_TYPE_SET = new Set(["lecture", "practice", "revision", "dpp", "pyq", "backlog", "study"]);

function validStr(v: unknown, min = 2, max = 120): boolean {
  return typeof v === "string" && v.trim().length >= min && v.trim().length <= max;
}

function validDate(v: unknown): boolean {
  return typeof v === "string" && DATE_RE.test(v);
}

/** Server-side validation of the tool's arguments. Returns null when invalid. */
function validatePlannerChange(raw: unknown): { reason: string; changes: Record<string, unknown>[] } | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!validStr(r.reason, 5, 500)) return null;
  if (!Array.isArray(r.changes) || r.changes.length === 0 || r.changes.length > 6) return null;

  const changes: Record<string, unknown>[] = [];
  for (const c of r.changes) {
    if (!c || typeof c !== "object") return null;
    const op = (c as Record<string, unknown>).op;
    if (typeof op !== "string" || !OP_WHITELIST.has(op)) return null;
    const out: Record<string, unknown> = { op };

    for (const [k, v] of Object.entries(c as Record<string, unknown>)) {
      if (k === "op") continue;
      switch (k) {
        case "date":
        case "from_date":
        case "to_date":
          if (!validDate(v)) return null;
          out[k] = v;
          break;
        case "start_time":
          if (typeof v !== "string" || !TIME_RE.test(v)) return null;
          out[k] = v;
          break;
        case "task_title":
        case "title":
        case "subject":
        case "chapter":
          if (!validStr(v, 2, 120)) return null;
          out[k] = String(v).trim();
          break;
        case "task_type":
          if (typeof v !== "string" || !TASK_TYPE_SET.has(v)) return null;
          out[k] = v;
          break;
        case "priority":
          if (typeof v !== "string" || !PRIORITY_SET.has(v)) return null;
          out[k] = v;
          break;
        case "energy_level":
          if (typeof v !== "string" || !ENERGY_SET.has(v)) return null;
          out[k] = v;
          break;
        case "study_hours":
          if (typeof v !== "number" || !Number.isFinite(v) || v < 1 || v > 16) return null;
          out[k] = Math.round(v * 2) / 2;
          break;
        case "estimated_minutes":
          if (typeof v !== "number" || !Number.isInteger(v) || v < 15 || v > 300) return null;
          out[k] = v;
          break;
        case "was_school_day":
        case "exam_tomorrow":
          if (typeof v !== "boolean") return null;
          out[k] = v;
          break;
        default:
          // Unknown fields are dropped (model drift is expected).
          break;
      }
    }

    // Per-op required fields.
    if (op === "regenerate_plan" && !out.date) return null;
    if (op === "reschedule_task" && (!out.task_title || !out.from_date || !out.to_date)) return null;
    if (op === "add_task" && (!out.title || !out.date || !out.estimated_minutes)) return null;
    if (op === "remove_task" && (!out.task_title || !out.date)) return null;
    if (op === "update_task_priority" && (!out.task_title || !out.priority)) return null;
    if (op === "update_availability" && (!out.date || !out.study_hours)) return null;

    changes.push(out);
  }
  return { reason: String(r.reason).trim(), changes };
}

async function decidePlanChange(opts: {
  supabase: ReturnType<typeof createClient>;
  userId: string;
  endpoint: string;
  headers: Record<string, string>;
  model: string;
  contextBlock: string;
  lastUserMsg: string;
  mentorReply: string;
  threadId: string | null;
  isVoice?: boolean;
}): Promise<{ id: string; reason: string; changes: Record<string, unknown>[] } | null> {
  const { supabase, userId, endpoint, headers, model, contextBlock, lastUserMsg, mentorReply, threadId, isVoice } = opts;

  const today = new Date().toISOString().slice(0, 10);
  const horizon = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);

  let planRows: { title: string; subject: string | null; type: string; chapter: string | null; estimated_minutes: number; priority: string; task_status: string; scheduled_date: string | null; start_time: string | null; source: string | null }[] = [];
  try {
    const { data, error } = await supabase
      .from("plan_tasks")
      .select("title, subject, type, chapter, estimated_minutes, priority, task_status, scheduled_date, start_time, source")
      .gte("scheduled_date", today)
      .lte("scheduled_date", horizon)
      .order("scheduled_date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(80);
    if (!error && Array.isArray(data)) planRows = data as typeof planRows;
  } catch (e) {
    console.error("[mentor-chat] plan fetch for decision failed", e);
  }

  const planSummary = planRows.length === 0
    ? "No tasks scheduled in the next 4 days."
    : JSON.stringify(
        planRows.map((t) => ({
          date: t.scheduled_date,
          time: t.start_time ?? null,
          title: t.title,
          type: t.type,
          subject: t.subject,
          chapter: t.chapter,
          minutes: t.estimated_minutes,
          priority: t.priority,
          status: t.task_status,
        }))
      );

  const voiceHint = isVoice ? "\nNOTE: This message was voice-transcribed (isVoice=true) — it may be short/Hinglish with typos. Be lenient: map ‘thak gaya 3 ghante’ → regenerate_plan {study_hours:3, energy_level:low}.\n" : "";
  const decisionMessages: ChatMessage[] = [
    {
      role: "system",
      content:
        PLANNER_DECISION_PROMPT +
        voiceHint +
        "\n\n" +
        contextBlock +
        `\n\nPLAN TASKS (next 4 days, from the database)\n${planSummary}\n`,
    },
    { role: "user", content: lastUserMsg.slice(0, 1500) },
    { role: "assistant", content: mentorReply.slice(0, 2000) },
  ];

  const decisionPayload: Record<string, unknown> = {
    model,
    messages: decisionMessages,
    tools: [PLANNER_TOOL],
    tool_choice: "auto",
    temperature: 0,
    max_tokens: 400,
  };

  const decisionController = new AbortController();
  const decisionTimeout = setTimeout(() => decisionController.abort(), 2500);
  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(decisionPayload),
      signal: decisionController.signal,
    });
  } catch (e) {
    clearTimeout(decisionTimeout);
    if ((e as Error)?.name === "AbortError") {
      console.warn("[mentor-chat] plan-decision timed out after 2.5s — returning without planner");
      return null;
    }
    throw e;
  }
  clearTimeout(decisionTimeout);
  if (!res.ok) {
    console.error(`[mentor-chat] plan-decision call failed status=${res.status} body="${(await res.text()).slice(0, 300)}"`);
    return null;
  }
  const data = await res.json();
  const msg = data?.choices?.[0]?.message;
  const toolCall = (msg?.tool_calls ?? []).find(
    (tc: { function?: { name?: string } }) => tc?.function?.name === "submit_plan_change"
  );
  if (!toolCall?.function?.arguments) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(toolCall.function.arguments);
  } catch (e) {
    console.error("[mentor-chat] plan-decision args unparseable", e);
    return null;
  }
  const validated = validatePlannerChange(parsed);
  if (!validated) {
    console.error("[mentor-chat] plan change rejected by validation", JSON.stringify(parsed).slice(0, 500));
    return null;
  }

  try {
    const { data: row, error } = await supabase
      .from("mentor_plan_changes")
      .insert({
        user_id: userId,
        thread_id: threadId,
        reason: validated.reason,
        changes: validated.changes,
        status: "proposed",
      })
      .select("id")
      .maybeSingle();
    if (error || !row) {
      console.error("[mentor-chat] plan change log insert failed", error);
      return null;
    }
    console.log(
      `[mentor-chat] plan change proposed user=${userId} id=${row.id} ops=${validated.changes.map((c) => c.op).join(",")} reason="${validated.reason.slice(0, 120)}"`
    );
    return { id: row.id as string, reason: validated.reason, changes: validated.changes };
  } catch (e) {
    console.error("[mentor-chat] plan change log insert threw", e);
    return null;
  }
}


async function extractAndSaveMemories(
  supabase: ReturnType<typeof createClient>,
  opts: {
    endpoint: string;
    headers: Record<string, string>;
    payload: Record<string, unknown>;
    user: string;
    memories: MemoryRow[];
    contextBlock: string;
    trimmed: ChatMessage[];
  },
): Promise<number> {
  const { endpoint, headers, payload, user, memories, contextBlock, trimmed } = opts;

  const extractionMessages: ChatMessage[] = [
    {
      role: "system",
      content:
        EXTRACTION_PROMPT +
        `\n\nEXISTING MEMORIES\n${memories.length > 0 ? JSON.stringify(memories) : "[]"}\n` +
        contextBlock,
    },
    ...trimmed.slice(-6).map((m) => ({ ...m, content: toTextContent(m) })),
  ];

  const extractionPayload: Record<string, unknown> = {
    ...payload,
    messages: extractionMessages,
    max_tokens: 300,
    temperature: 0,
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(extractionPayload),
  });
  if (!res.ok) {
    console.error(`[mentor-chat] memory extraction call failed status=${res.status}`);
    return 0;
  }
  const data = await res.json();
  const raw: string = data?.choices?.[0]?.message?.content ?? "";
  if (!raw) return 0;

  const rows = parseExtraction(raw);
  if (rows.length === 0) return 0;

  const { error } = await supabase.from("mentor_memory").upsert(
    rows.map((r) => ({ user_id: user, ...r, updated_at: new Date().toISOString() })),
    { onConflict: "user_id,category,key" },
  );
  if (error) throw error;
  return rows.length;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        auth: { persistSession: false },
        global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("[mentor-chat] auth failed:", authError?.message ?? "no user");
      return json(401, { error: "unauthorized", message: "You are not signed in. Please log in and try again." });
    }

    const body = await req.json();
    const { context, messages, language, images: rawImages, threadId, plannerEnabled, isVoice } = body as {
      context: Record<string, unknown>;
      messages: ChatMessage[];
      language?: string;
      images?: Record<string, unknown>;
      threadId?: string | null;
      plannerEnabled?: boolean;
      isVoice?: boolean;
    };

    if (!context || !Array.isArray(messages) || messages.length === 0) {
      return json(400, { error: "bad_request", message: "context and messages are required." });
    }

    const images = sanitizeImages(rawImages);
    if (Object.keys(images).length > 0) {
      console.log(`[mentor-chat] vision request with ${Object.keys(images).length} image(s) user=${user.id}`);
    }

    const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    const groqKeyEarly = Deno.env.get("GROQ_API_KEY");
    const geminiKeyEarly = Deno.env.get("GEMINI_API_KEY");
    if (!openRouterKey && !openAiKey && !groqKeyEarly && !geminiKeyEarly) {
      console.error("[mentor-chat] no LLM API key configured (OPENROUTER_API_KEY / GROQ_API_KEY / GEMINI_API_KEY / OPENAI_API_KEY missing)");
      return json(503, {
        error: "not_configured",
        message: "The AI Mentor service is missing its LLM API key. For FREE usage set one of: OPENROUTER_API_KEY (use free models google/gemini-2.0-flash-exp:free + deepseek/deepseek-r1:free), GROQ_API_KEY (free, fastest), or GEMINI_API_KEY (free, Google AI Studio). Then redeploy.",
      });
    }

    // Fetch memories and the stored language preference in parallel —
    // both are DB round-trips that would otherwise delay the first token.
    let memories: MemoryRow[] = [];
    let storedPreference: string | null = null;
    let plannerPref: string | null = null;
    await Promise.all([
      (async () => {
        try {
          const { data, error } = await supabase
            .from("mentor_memory")
            .select("category, key, value, importance")
            .order("importance", { ascending: false })
            .limit(40);
          if (!error && Array.isArray(data)) memories = data as MemoryRow[];
        } catch (e) {
          console.error("[mentor-chat] memory fetch failed", e);
        }
      })(),
      (async () => {
        try {
          const { data } = await supabase
            .from("mentor_memory")
            .select("value")
            .eq("category", "preference")
            .eq("key", "language_preference")
            .limit(1)
            .maybeSingle();
          storedPreference = data?.value ?? null;
        } catch (e) {
          console.error("[mentor-chat] failed to load language preference", e);
        }
      })(),
      (async () => {
        try {
          const { data } = await supabase
            .from("mentor_memory")
            .select("value")
            .eq("category", "preference")
            .eq("key", "ai_planner_enabled")
            .limit(1)
            .maybeSingle();
          plannerPref = data?.value ?? null;
        } catch (e) {
          console.error("[mentor-chat] failed to load planner preference", e);
        }
      })(),
    ]);

    const now = new Date().toISOString();
    const LANGUAGE_NAMES: Record<string, string> = {
      en: "English", hinglish: "Hinglish (Hindi-English mix)", hi: "Hindi",
      bn: "Bengali", ta: "Tamil", te: "Telugu", mr: "Marathi",
      gu: "Gujarati", kn: "Kannada", ml: "Malayalam", pa: "Punjabi", ur: "Urdu",
    };
    const LANGUAGE_NAME_TO_CODE: Record<string, string> = {
      hindi: "hi", hinglish: "hinglish", english: "en", bengali: "bn", bangla: "bn",
      tamil: "ta", telugu: "te", marathi: "mr", gujarati: "gu", kannada: "kn",
      malayalam: "ml", punjabi: "pa", urdu: "ur",
    };

    // Accept both a code ("hi") and a name ("hindi", "Hinglish") as a preference.
    function normalizeLangCode(value: string | null | undefined): string | null {
      if (!value) return null;
      const v = value.trim().toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();
      if (!v) return null;
      if (LANGUAGE_NAME_TO_CODE[v]) return LANGUAGE_NAME_TO_CODE[v];
      if (v.length <= 2) {
        for (const [, code] of Object.entries(LANGUAGE_NAME_TO_CODE)) {
          if (code === v) return code;
        }
      }
      for (const w of v.split(" ")) {
        if (LANGUAGE_NAME_TO_CODE[w]) return LANGUAGE_NAME_TO_CODE[w];
      }
      return null;
    }

    // Detect an explicit language preference in the latest user message:
    //   "always talk to me in Hindi"
    //   "answer only in English"
    //   "hamesha hindi mein baat karo" / "sirf english mein answer karo"
    const PREFERENCE_PATTERNS: { re: RegExp; code: string }[] = [];
    for (const [name, code] of Object.entries(LANGUAGE_NAME_TO_CODE)) {
      PREFERENCE_PATTERNS.push(
        { re: new RegExp(`(always|only|from now on|aage se|hamesha|sirf|bas)\\s*.{0,40}?\\b${name}\\b`, "i"), code },
        { re: new RegExp(`\\b${name}\\b.{0,24}?(baat karo|answer karo|reply karo|bolo|mein baat|mein answer)`, "i"), code },
      );
    }

    // 1. Use the language preference already fetched in parallel above.
    let preference: string | null = normalizeLangCode(storedPreference);

    // 2. A fresh explicit preference overrides the stored one, and persists.
    const lastUserMsg = toTextContent([...messages].reverse().find((m) => m.role === "user") ?? { role: "user", content: "" });
    for (const p of PREFERENCE_PATTERNS) {
      if (p.re.test(lastUserMsg)) {
        if (p.code !== preference) {
          try {
            const { error: upsertError } = await supabase.from("mentor_memory").upsert(
              {
                user_id: user.id,
                category: "preference",
                key: "language_preference",
                value: p.code,
                importance: 8,
                updated_at: now,
              },
              { onConflict: "user_id,category,key" },
            );
            if (upsertError) throw upsertError;
            console.log(`[mentor-chat] saved language preference=${p.code} user=${user.id}`);
          } catch (e) {
            console.error("[mentor-chat] failed to save language preference", e);
          }
        }
        preference = p.code;
        break;
      }
    }

    // 3. Effective language: saved preference wins; otherwise the language
    //    detected from the spoken audio (client-provided metadata).
    const effectiveLang = preference ?? language ?? null;
    const langName = effectiveLang ? LANGUAGE_NAMES[effectiveLang] : null;
    const contextBlock =
      `STUDENT CONTEXT (JSON, generated from real app data — treat as ground truth)\n${JSON.stringify(context)}\n` +
      `LONG-TERM MEMORIES (durable facts about this student learned from previous conversations)\n${memories.length > 0 ? JSON.stringify(memories) : "No long-term memories saved yet."}\n` +
      (langName
        ? `RESPONSE LANGUAGE\nRespond in ${langName}. ${
            langName.includes("Hinglish")
              ? "Keep the natural mixed Hindi-English style — do NOT switch to pure Hindi or pure English; technical terms stay in English. "
              : ""
          }Speak like a senior mentor in that language — no translation mode. Keep technical terms (backlog, mock, DPP, chapter names, formulas) in English where natural. Match the user's level of informality.\n`
        : "") +
      `CURRENT DATE (for "today"/"upcoming exam" calculations)\n${now}\n`;

    // Trim conversation to the last 20 messages to control token usage
    const trimmed = messages.slice(-20).map((m) => resolveMessageImages(m, images));
    const chatMessages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT + "\n\n" + contextBlock },
      ...trimmed,
    ];

    let endpoint: string;
    let headers: Record<string, string>;
    let payload: Record<string, unknown>;

    const hasImages = Object.keys(images).length > 0;
    // Image solutions are longer (Detected Question → Similar Question),
    // so give the vision path extra output headroom. Reduced for speed (was 1600/1000).
    const maxTokens = hasImages ? 1200 : 800;

    // --- FREE & BEST model routing ---
    // Vision needs a multimodal model. Text can use a reasoning model.
    // All defaults below are FREE on their providers.
    // Rate-limit fix: primary models are now the smallest/fastest free models (least contention).
    // Previous primaries google/gemma-4-31b and qwen3.8-27b are very popular and hit 429 quickly.
    // New primaries: liquid 2.6B (text) + gemma-4-26b MoE 4B (vision) — much higher rate-limit headroom.
    const FREE_VISION_MODEL = "google/gemma-4-26b-a4b-it:free"; // MoE 4B active — fast, less 429 than 31B
    const FREE_TEXT_MODEL = "liquid/lfm-2.5-2.6b:free"; // 2.6B — fastest, highest free quota
    const FREE_BACKUP_MODELS: string[] = [
      "qwen/qwen3.8-27b:free", // strong reasoning fallback
      "google/gemma-4-31b-it:free", // stable larger fallback
      "nex-agi/nex-n2.5-mini:free", // vision fallback
      "nvidia/nemotron-3.5-lightning:free",
      "openrouter/free", // auto-router — picks any free model not rate-limited
    ];
    // Groq free models (OpenAI-compatible, ultra-fast, no vision)
    const GROQ_TEXT_MODEL = Deno.env.get("GROQ_MODEL") || "llama-3.3-70b-versatile";
    // Gemini direct free model (via Google AI Studio)
    const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.0-flash";
    const groqKey = Deno.env.get("GROQ_API_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    if (openRouterKey) {
      // PRIMARY: OpenRouter — free models, supports both text + vision
      endpoint = "https://openrouter.ai/api/v1/chat/completions";
      headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openRouterKey}`,
      };
      const defaultModel = hasImages ? FREE_VISION_MODEL : FREE_TEXT_MODEL;
      payload = {
        model: Deno.env.get("MENTOR_MODEL") || defaultModel,
        messages: chatMessages,
        max_tokens: maxTokens,
        temperature: 0.4,
      };
    } else if (groqKey && !hasImages) {
      // FREE alternative: Groq — fastest free inference, text-only
      endpoint = "https://api.groq.com/openai/v1/chat/completions";
      headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`,
      };
      payload = {
        model: Deno.env.get("GROQ_MODEL") || GROQ_TEXT_MODEL,
        messages: chatMessages,
        max_tokens: maxTokens,
        temperature: 0.4,
      };
    } else if (geminiKey) {
      // FREE alternative: Google Gemini direct (Google AI Studio) — free tier, vision + 1M context
      // Uses OpenAI-compatible endpoint
      endpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
      headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${geminiKey}`,
      };
      payload = {
        model: Deno.env.get("GEMINI_MODEL") || GEMINI_MODEL,
        messages: chatMessages,
        max_tokens: maxTokens,
        temperature: 0.4,
      };
    } else if (openAiKey) {
      endpoint = "https://api.openai.com/v1/chat/completions";
      headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiKey}`,
      };
      payload = {
        model: Deno.env.get("MENTOR_OPENAI_MODEL") || "gpt-4o-mini",
        messages: chatMessages,
        max_tokens: maxTokens,
        temperature: 0.4,
      };
    } else {
      // No key at all — shouldn't happen because we checked earlier, but guard
      return json(503, {
        error: "not_configured",
        message: "No LLM API key configured. Set one of: OPENROUTER_API_KEY (free models: google/gemini-2.0-flash-exp:free + deepseek/deepseek-r1:free), GROQ_API_KEY (free), or GEMINI_API_KEY (free).",
      });
    }

    const lastUser = toTextContent([...chatMessages].reverse().find((m) => m.role === "user") ?? { role: "user", content: "" });
    const providerLabel = openRouterKey ? "openrouter-free" : groqKey && !hasImages ? "groq-free" : geminiKey ? "gemini-free" : "openai";
    console.log(
      `[mentor-chat] user=${user.id} provider=${providerLabel} ` +
      `model=${String(payload.model)} messages=${chatMessages.length} images=${Object.keys(images).length} ` +
      `contextChars=${contextBlock.length} lastUser="${lastUser.slice(0, 120)}" ` +
      `envModel=${Deno.env.get("MENTOR_MODEL") ?? Deno.env.get("GROQ_MODEL") ?? Deno.env.get("GEMINI_MODEL") ?? Deno.env.get("MENTOR_OPENAI_MODEL") ?? "(default)"}`
    );

    // Main LLM call with 14s timeout — prevents hanging forever on provider stall
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    let llmRes: Response;
    try {
      llmRes = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (e) {
      clearTimeout(timeoutId);
      if ((e as Error)?.name === "AbortError") {
        console.error("[mentor-chat] LLM fetch timed out after 20s");
        return json(502, { error: "llm_error", message: "The AI is taking too long — please try again. Your plan, if requested, was already handled locally.", details: "timeout" });
      }
      throw e;
    }
    clearTimeout(timeoutId);

    // Auto-fallback for OpenRouter free models on rate-limit / out-of-credits / model-not-found / server error:
    // Try up to 3 fallbacks sequentially — each is a different free model, so a 429 on one
    // often succeeds on the next (different rate-limit bucket). Also retry on 5xx/timeout which are often transient. Keep timeout 10s each.
    if (!llmRes.ok && openRouterKey && (llmRes.status === 429 || llmRes.status === 402 || llmRes.status === 404 || llmRes.status >= 500)) {
      const tried = new Set([String(payload.model)]);
      const candidates: string[] = [];
      // Always try the opposite primary as first swap (text<->vision) if not already tried
      const firstSwap = hasImages
        ? (Deno.env.get("MENTOR_MODEL") ? null : FREE_TEXT_MODEL)
        : FREE_VISION_MODEL;
      if (firstSwap && !tried.has(firstSwap)) candidates.push(firstSwap);
      for (const m of FREE_BACKUP_MODELS) if (!tried.has(m) && !candidates.includes(m)) candidates.push(m);
      for (const m of [FREE_TEXT_MODEL, FREE_VISION_MODEL]) if (!tried.has(m) && !candidates.includes(m)) candidates.push(m);
      // Try up to 3 fallbacks (was 1) — still bounded to ~12s extra worst case, but avoids 429 errors
      let fallbackSucceeded = false;
      for (const fallbackModel of candidates.slice(0, 3)) {
        if (tried.has(fallbackModel)) continue;
        tried.add(fallbackModel);
        // Small delay before retrying a 429 — respect Retry-After if present
        if (llmRes.status === 429) {
          const retryAfter = llmRes.headers.get("retry-after");
          const waitMs = retryAfter ? Math.min(2000, Math.max(400, parseInt(retryAfter) * 1000 || 600)) : 600;
          await new Promise((r) => setTimeout(r, waitMs));
        }
        console.warn(`[mentor-chat] primary free model ${String(payload.model)} hit ${llmRes.status}, retrying with fallback ${fallbackModel} (attempt ${tried.size - 1}/3)`);
        const retryPayload = { ...payload, model: fallbackModel };
        const retryController = new AbortController();
        const retryTimeout = setTimeout(() => retryController.abort(), 10000);
        let retryRes: Response;
        try {
          retryRes = await fetch(endpoint, {
            method: "POST",
            headers,
            body: JSON.stringify(retryPayload),
            signal: retryController.signal,
          });
        } catch (e) {
          clearTimeout(retryTimeout);
          if ((e as Error)?.name === "AbortError") {
            console.warn(`[mentor-chat] fallback ${fallbackModel} timed out`);
            continue;
          }
          throw e;
        }
        clearTimeout(retryTimeout);
        if (retryRes.ok) {
          llmRes = retryRes;
          payload = retryPayload;
          fallbackSucceeded = true;
          console.log(`[mentor-chat] fallback ${fallbackModel} succeeded after ${tried.size - 1} retries`);
          break;
        } else {
          const retryBody = await retryRes.clone().text().catch(() => "");
          console.warn(`[mentor-chat] fallback ${fallbackModel} also failed ${retryRes.status} body="${retryBody.slice(0, 200)}"`);
          // If this fallback also 429, keep trying next; otherwise for 402/404 also keep trying
          llmRes = retryRes;
          payload = retryPayload;
          // continue to next candidate instead of breaking
        }
      }
      if (!fallbackSucceeded && llmRes.status === 429) {
        console.warn(`[mentor-chat] all ${tried.size - 1} fallbacks exhausted, still 429 — will return rate_limited to client for retry`);
      }
    }

    if (!llmRes.ok) {
      const errText = await llmRes.text();
      const summary = providerErrorSummary(llmRes.status, errText);
      console.error(`[mentor-chat] LLM request failed status=${llmRes.status} body="${errText.slice(0, 500)}"`);

      // Map provider statuses to meaningful client errors
      if (llmRes.status === 429) {
        const retryAfterHeader = llmRes.headers.get("retry-after");
        const retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader) || 8 : 8;
        return json(429, {
          error: "rate_limited",
          message: `Echo is handling many requests right now — retrying automatically in ${retryAfterSec}s. If it persists, wait 30s and tap Retry.`,
          details: summary,
          retryAfter: retryAfterSec,
        });
      }
      if (llmRes.status === 401 || llmRes.status === 403) {
        return json(502, {
          error: "llm_auth",
          message: "The AI provider rejected the API key (invalid, expired, or insufficient balance).",
          details: summary,
        });
      }
      if (llmRes.status === 402) {
        return json(502, {
          error: "llm_auth",
          message: `The AI provider rejected the request — insufficient credits/balance (${summary}). Top up OpenRouter/OpenAI credits.`,
          details: summary,
        });
      }
      if (llmRes.status === 400) {
        const lower = summary.toLowerCase();
        const isContextLen = lower.includes("context") || lower.includes("too long") || lower.includes("max_tokens") || lower.includes("token");
        return json(502, {
          error: "llm_bad_request",
          message: isContextLen
            ? "Your conversation is too long — start a new chat or remove the image and try again."
            : summary,
          details: summary,
        });
      }
      if (llmRes.status === 404) {
        return json(502, {
          error: "llm_bad_request",
          message: `The AI provider returned "model not found" for model "${String(payload.model)}".`,
          details: summary,
        });
      }
      // Fallback for 500/502/503 and any other upstream error — surface the provider's
      // summary instead of a generic string so the client can show the real cause.
      return json(502, {
        error: "llm_error",
        message: summary || "The AI provider returned an error. Please try again.",
        details: summary,
      });
    }

    let data: Record<string, unknown> & { choices?: Array<{ message?: { content?: string } }> };
    try {
      data = await llmRes.json() as typeof data;
    } catch (e) {
      const raw = await llmRes.clone().text().catch(() => "");
      console.error("[mentor-chat] JSON parse failed", e, `raw="${raw.slice(0, 400)}"`);
      return json(502, { error: "llm_error", message: "The AI provider returned an invalid response. Please try again.", details: raw.slice(0, 300) });
    }
    let reply: string = (data?.choices?.[0]?.message?.content as string | undefined)?.trim() ?? "";

    // Safety scrub: free models sometimes hallucinate profanity ("hell") — replace before sending to student
    const originalReply = reply;
    reply = reply
      .replace(/\bhell\b/gi, "heck")
      .replace(/\bhells\b/gi, "heck")
      .replace(/\bdamn\b/gi, "darn")
      .replace(/\bbastard\b/gi, "buddy")
      .replace(/\bstupid\b/gi, "tough")
      .replace(/\bidiot\b/gi, "friend");
    if (reply !== originalReply) {
      console.warn(`[mentor-chat] sanitized profanity for user=${user.id} originalLen=${originalReply.length} newLen=${reply.length}`);
    }

    if (!reply) {
      console.error("[mentor-chat] empty reply from provider");
      return json(502, { error: "llm_error", message: "The AI provider returned an empty reply. Please try again." });
    }

    console.log(`[mentor-chat] ok user=${user.id} replyChars=${reply.length} model=${String(payload.model)}`);

    // Long-term memory: fire-and-forget — don't block reply (was ~600ms extra)
    // Use EdgeRuntime.waitUntil when available (Deno Deploy / Supabase), else background promise.
    const waitUntil = (globalThis as unknown as { EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void } }).EdgeRuntime?.waitUntil?.bind((globalThis as unknown as { EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void } }).EdgeRuntime) ?? ((p: Promise<unknown>) => { p.catch(() => {}); });
    waitUntil(
      extractAndSaveMemories(supabase, {
        endpoint, headers, payload, user: user.id, memories,
        contextBlock, trimmed,
      }).then((saved) => {
        if (saved > 0) console.log(`[mentor-chat] saved ${saved} memory row(s) user=${user.id}`);
      }).catch((err) => console.error("[mentor-chat] memory extraction failed", err)),
    );

    // AI Mentor → AI Planner: decide whether this conversation justifies a
    // study-plan change. Needed for response, but with fast timeout so it never blocks reply long.
    let planner: { id: string; reason: string; changes: Record<string, unknown>[] } | null = null;
    const plannerDisabled = plannerEnabled === false || plannerPref === "false";
    const isVoiceMsg = !!isVoice;
    const minLen = isVoiceMsg ? 4 : 12;
    if (!plannerDisabled && lastUser.trim().length >= minLen && !hasImages) {
      try {
        // Use a fast small model for planner decision even if main reply used a larger one — cuts ~400ms
        const plannerModel = "liquid/lfm-2.5-2.6b:free"; // fastest free with tools=true, valid 2026-05
        const plannerPromise = decidePlanChange({
          supabase,
          userId: user.id,
          endpoint,
          headers,
          model: plannerModel,
          contextBlock,
          lastUserMsg: lastUser,
          mentorReply: reply,
          threadId: typeof threadId === "string" && threadId ? threadId : null,
          isVoice: isVoiceMsg,
        });
        // 2.8s hard timeout — if planner hangs, return reply without planner rather than delay user (was 4s)
        planner = await Promise.race([
          plannerPromise,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 2800)),
        ]) as typeof planner;
        if (planner === null) console.warn("[mentor-chat] plan-decision timed out after 2.8s — returning reply without planner");
      } catch (err) {
        console.error("[mentor-chat] plan-decision call failed", err);
      }
    } else {
      console.log(`[mentor-chat] plan-decision skipped user=${user.id} disabled=${plannerDisabled} shortMsg=${lastUser.trim().length < minLen} isVoice=${isVoiceMsg} images=${hasImages}`);
    }

    return json(200, {
      reply,
      language: effectiveLang ?? null,
      ...(planner ? { planner } : {}),
    });
  } catch (err) {
    console.error("[mentor-chat] threw", err);
    return json(500, { error: "server_error", message: "Internal AI Mentor error. Please try again." });
  }
});
