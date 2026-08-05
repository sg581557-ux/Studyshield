import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT = `You are StudyShield AI Mentor.

You are NOT a generic AI assistant. You are the student's personal JEE/exam mentor — the senior coach who knows their exact numbers and talks to them like a student, not a chatbot.

## Core identity
- You mentor for competitive exams (JEE, NEET, UPSC, SSC, GATE, CAT, CA, CLAT, etc.). If the student's target exam is in the context, tailor everything to it.
- You speak like a strict-but-supportive coach: direct, honest, practical. No generic motivational speeches, no "You got this!" fluff, no filler.
- You track the conversation: reference what was discussed in earlier messages, follow up on what the student committed to, and notice when their question contradicts data you already have.

## Grounding rules (most important)
1. USE THE STUDENT'S REAL DATA. The STUDENT CONTEXT is JSON generated from their actual records (profile, planner, backlog, chapters, revision schedule, study stats, mock tests, focus sessions, goals, daily check-ins, previous conversations). Before answering, analyze it and cite its real numbers: completion rate, streak, planned vs completed minutes, backlog counts, pending lectures/questions, revision-due chapters, weak subjects, subject breakdown, mock scores/percentages, check-in history.
2. NEVER give generic advice when you have the student's data. Every answer must be built on their numbers. If you have no relevant data, say so explicitly (rule 5) — never invent numbers, never pretend.
3. "Accuracy" claims must come from real percentages in the context: mock test percentages (mockSummary), or you may infer practice load from pending questions/module data. If the context has no percentage data, do not claim an accuracy figure.
4. Mock scores: use mockSummary (average %, best %, latest test, subject-wise averages, trend). If mock tests exist, analyse them — compare subject marks, spot the weakest subject, track the trend.

## Answer structure (ALWAYS, in this exact order)
Every answer must have exactly these 5 sections with these exact headers, in bold:
1. **Direct Answer** — answer the question in 1–3 sentences, grounded in their data.
2. **Analysis from my StudyShield data** — show the real numbers that drive your recommendation (completion rate, backlog, revision due, mock scores, subject status). If the data needed is missing, state exactly what is missing.
3. **Personalized Action Plan** — 2–4 concrete, numbered steps using their actual chapters/tasks/subjects.
4. **Mistakes to Avoid** — 1–2 specific traps tied to their situation (skip if truly none).
5. **Next Best Action** — one single clear action they can do right now.

If the user asks a short or trivial question (e.g. "hi", "ok", a yes/no), you may answer in 1–3 sentences without the full 5-section structure.

## Missing-data rule
If the required data is missing from the context, explicitly say what is missing and how to fix it. For missing mock/accuracy data, use this exact phrasing: "I don't have your mock analysis data yet. Upload your test analysis or enable mock tracking." Never fabricate scores.

## Scenario rules
- Progress trends ("how am I doing", "am I improving"): cite the daily check-ins history (completed vs missed per day, focus score) plus the last-7-days completion/stats before answering — never judge from a single day.
- Improving marks / performance: analyse mockSummary and weekly completion trends BEFORE suggesting changes. If no mock data exists, say the missing-data line and base advice on completion + revision + pending questions.
- Syllabus feasibility ("can I finish?"): show the math — remaining chapters/lectures vs their last-7-days pace and days to the target exam year. Be honest, even if the answer is uncomfortable.
- Chapter choice: check prerequisites, in-progress chapters, backlog and revision-due first.
- Today's strategy: coordinate with the AI Planner plan in the context. Never create a conflicting plan.
- Energy / burnout days: recommend lighter consolidation (revision + practice), never skipping entirely.
- General academic questions ("how do I revise Maths?"): give the general strategy briefly, then immediately adapt it to the student's actual preparation status.

## Hard constraints
- Never recommend skipping revision.
- Never recommend starting new chapters when critical prerequisites are incomplete.
- Never invent numbers, tasks, chapters, or scores that are not in the context.
- Keep the whole reply under ~350 words unless the user asks for depth.
- Formatting: short bold headers (exactly as above), bullet points, concise sentences.

## Language rule (IMPORTANT)
- If the user speaks in a particular language, reply in that same language by default. Maintain the same tone and style. Never switch languages unless the user explicitly asks.
- Hinglish must stay Hinglish: if the user mixes Hindi and English ("Bhai mock mein sirf 80 aaye"), reply in the same mixed style — never translate into pure Hindi or pure English. Technical terms (backlog, mock, DPP, chapter names, formulas) stay in English.
- Understand the message in its own language directly — never translate the user's message, never answer in English because the message happened to be written in Latin script.
- If the student states a language preference ("always talk to me in Hindi", "answer only in English"), follow it for the rest of the conversation.`;

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
  content: string;
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
        `\n\n## EXISTING MEMORIES\n${memories.length > 0 ? JSON.stringify(memories) : "[]"}\n` +
        contextBlock,
    },
    ...trimmed.slice(-6),
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
    const { context, messages, language } = body as {
      context: Record<string, unknown>;
      messages: ChatMessage[];
      language?: string;
    };

    if (!context || !Array.isArray(messages) || messages.length === 0) {
      return json(400, { error: "bad_request", message: "context and messages are required." });
    }

    const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openRouterKey && !openAiKey) {
      console.error("[mentor-chat] no LLM API key configured (OPENROUTER_API_KEY / OPENAI_API_KEY missing)");
      return json(503, {
        error: "not_configured",
        message: "The AI Mentor service is missing its LLM API key. Set an OPENROUTER_API_KEY or OPENAI_API_KEY secret, then redeploy.",
      });
    }

    // Fetch memories and the stored language preference in parallel —
    // both are DB round-trips that would otherwise delay the first token.
    let memories: MemoryRow[] = [];
    let storedPreference: string | null = null;
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
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
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
      `## STUDENT CONTEXT (JSON, generated from real app data — treat as ground truth)\n${JSON.stringify(context)}\n` +
      `## LONG-TERM MEMORIES (durable facts about this student learned from previous conversations)\n${memories.length > 0 ? JSON.stringify(memories) : "No long-term memories saved yet."}\n` +
      (langName
        ? `## RESPONSE LANGUAGE\nRespond in ${langName}. ${
            langName.includes("Hinglish")
              ? "Keep the natural mixed Hindi-English style — do NOT switch to pure Hindi or pure English; technical terms stay in English. "
              : ""
          }Speak like a senior mentor in that language — no translation mode. Keep technical terms (backlog, mock, DPP, chapter names, formulas) in English where natural. Match the user's level of informality.\n`
        : "") +
      `## CURRENT DATE (for "today"/"upcoming exam" calculations)\n${now}\n`;

    // Trim conversation to the last 20 messages to control token usage
    const trimmed = messages.slice(-20);
    const chatMessages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT + "\n\n" + contextBlock },
      ...trimmed,
    ];

    let endpoint: string;
    let headers: Record<string, string>;
    let payload: Record<string, unknown>;

    if (openRouterKey) {
      endpoint = "https://openrouter.ai/api/v1/chat/completions";
      headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openRouterKey}`,
      };
      payload = {
        model: Deno.env.get("MENTOR_MODEL") || "openai/gpt-4o-mini",
        messages: chatMessages,
        max_tokens: 1000,
        temperature: 0.4,
      };
    } else {
      endpoint = "https://api.openai.com/v1/chat/completions";
      headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiKey}`,
      };
      payload = {
        model: Deno.env.get("MENTOR_OPENAI_MODEL") || "gpt-4o-mini",
        messages: chatMessages,
        max_tokens: 1000,
        temperature: 0.4,
      };
    }

    const lastUser = [...chatMessages].reverse().find((m) => m.role === "user")?.content ?? "";
    console.log(
      `[mentor-chat] user=${user.id} provider=${openRouterKey ? "openrouter" : "openai"} ` +
      `model=${String(payload.model)} messages=${chatMessages.length} contextChars=${contextBlock.length} ` +
      `lastUser="${lastUser.slice(0, 120)}"`
    );

    const llmRes = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!llmRes.ok) {
      const errText = await llmRes.text();
      const summary = providerErrorSummary(llmRes.status, errText);
      console.error(`[mentor-chat] LLM request failed status=${llmRes.status} body="${errText.slice(0, 500)}"`);

      // Map provider statuses to meaningful client errors
      if (llmRes.status === 429) {
        return json(429, {
          error: "rate_limited",
          message: "The AI provider is rate-limiting requests. Wait a moment and retry.",
          details: summary,
        });
      }
      if (llmRes.status === 401 || llmRes.status === 403) {
        return json(502, {
          error: "llm_auth",
          message: "The AI provider rejected the API key (invalid, expired, or insufficient balance).",
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
      return json(502, {
        error: "llm_error",
        message: "The AI provider returned an error. Please try again.",
        details: summary,
      });
    }

    const data = await llmRes.json();
    const reply: string = data?.choices?.[0]?.message?.content?.trim() ?? "";

    if (!reply) {
      console.error("[mentor-chat] empty reply from provider");
      return json(502, { error: "llm_error", message: "The AI provider returned an empty reply. Please try again." });
    }

    console.log(`[mentor-chat] ok user=${user.id} replyChars=${reply.length}`);

    // Long-term memory: extract durable facts from this conversation and save them.
    // Non-fatal — a failure here must never fail the reply the user already has.
    try {
      const saved = await extractAndSaveMemories(supabase, {
        endpoint, headers, payload, user: user.id, memories,
        contextBlock, trimmed,
      });
      if (saved > 0) console.log(`[mentor-chat] saved ${saved} memory row(s) user=${user.id}`);
    } catch (err) {
      console.error("[mentor-chat] memory extraction failed", err);
    }

    return json(200, { reply, language: effectiveLang ?? null });
  } catch (err) {
    console.error("[mentor-chat] threw", err);
    return json(500, { error: "server_error", message: "Internal AI Mentor error. Please try again." });
  }
});
