import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Webhook } from "npm:standardwebhooks@1.0.0";

// ============================================================
// send-email — transactional email via Resend
// ------------------------------------------------------------
// Dual-mode function:
//
// 1. AUTH HOOK MODE (primary) — wired up as the Supabase Auth
//    "Send Email" hook. GoTrue POSTs a signed webhook payload
//    ({ user, email_data }) for EVERY auth email (recovery,
//    signup confirmation, magic link, invite, ...). We forward
//    the pre-rendered subject/html to Resend and return 200 {}
//    so GoTrue treats the email as sent.
//
// 2. DIRECT MODE (legacy) — Body: { email, name?, subject?, html? }
//    kept for backward compatibility with any direct callers.
//
// Secrets (set with `supabase secrets set`, never in code):
//   RESEND_API_KEY          — required
//   SEND_EMAIL_HOOK_SECRET  — "v1,whsec_..." from the hook config;
//                            used to verify hook signatures.
// ============================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const EMAIL_FROM = "StudyShield <hello@studyshield.study>";
const DEFAULT_SUBJECT = "Welcome to StudyShield";
const RESEND_API_URL = "https://api.resend.com/emails";

interface SendEmailRequest {
  email: string;
  name?: string;
  subject?: string;
  html?: string;
}

interface HookEmailData {
  email?: string;
  new_email?: string;
  subject?: string;
  html?: string;
  token?: string;
  token_hash?: string;
  redirect_to?: string;
  email_action_type?: string;
  site_url?: string;
}

interface HookPayload {
  user?: { id?: string; email?: string; new_email?: string; user_metadata?: Record<string, unknown> };
  email_data?: HookEmailData;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Default welcome email — StudyShield branding, personalised with the
// recipient's name, and styled to match the app (indigo header, white card).
function buildWelcomeEmail(name: string): string {
  const displayName = escapeHtml(name);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>Welcome to StudyShield</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    table { border-collapse: collapse; width: 100%; }
    .wrapper { width: 100%; background-color: #f1f5f9; padding: 40px 0; }
    .container { width: 100%; max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
    .header { background-color: #4f46e5; padding: 28px 32px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 20px; font-weight: 600; }
    .body { padding: 32px; }
    .body p { color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0; }
    .button-wrap { text-align: center; padding: 8px 0 24px 0; }
    .button { display: inline-block; background-color: #4f46e5; color: #ffffff !important; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 8px; }
    .features { margin: 0 0 16px 0; padding: 0; list-style: none; }
    .features li { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 8px; font-size: 14px; color: #334155; }
    .footer { padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center; }
    .footer p { margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5; }
    a { color: #4f46e5; }
  </style>
</head>
<body>
  <div class="wrapper">
    <table role="presentation">
      <tr>
        <td align="center">
          <div class="container">
            <div class="header">
              <h1>StudyShield</h1>
            </div>
            <div class="body">
              <p>Hi ${displayName},</p>
              <p>Welcome to StudyShield — your personal AI-powered study companion.</p>
              <p>Your <strong>AI study planner is ready</strong>. It builds a personalised schedule for your target exam, tracks your progress, and keeps revision on track so you study smarter, not longer.</p>
              <div class="button-wrap">
                <a class="button" href="https://studyshield.study/dashboard" target="_blank">Go to your dashboard</a>
              </div>
              <ul class="features">
                <li><strong>AI Planner</strong> — a personalised daily plan for your target exam</li>
                <li><strong>Smart revision</strong> — spaced repetition tuned to your strengths and gaps</li>
                <li><strong>Progress tracking</strong> — streaks, analytics, and study insights</li>
              </ul>
              <p>If you have any questions, just reply to this email — we are happy to help.</p>
            </div>
            <div class="footer">
              <p>You are receiving this email because you created a StudyShield account.</p>
              <p>StudyShield &middot; Smarter studying, less stress</p>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Sends via the Resend HTTP API. Returns the raw outcome — the caller decides
// the response status. Never include the API key in any returned detail.
async function sendViaResend(
  to: string,
  subject: string,
  html: string,
): Promise<{ ok: boolean; status?: number; detail?: unknown; id?: string | null }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.error("[send-email] RESEND_API_KEY secret is not set");
    return { ok: false, status: 500, detail: "RESEND_API_KEY secret is not set" };
  }

  try {
    const resendRes = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [to],
        subject,
        html,
      }),
    });

    const resendBody = await resendRes.json().catch(() => null);

    if (!resendRes.ok) {
      console.error("[send-email] Resend API error", resendRes.status, JSON.stringify(resendBody));
      return { ok: false, status: resendRes.status, detail: resendBody ?? "Unknown Resend error" };
    }

    return { ok: true, id: (resendBody as { id?: string } | null)?.id ?? null };
  } catch (err) {
    console.error("[send-email] unexpected error calling Resend", err);
    return { ok: false, status: 500, detail: "Internal error while calling Resend" };
  }
}

Deno.serve(async (req: Request) => {
  console.log(`[send-email] ${req.method} ${req.url}`);

  // CORS preflight — the React frontend (studyshield.study / localhost) calls
  // this via supabase.functions.invoke().
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed — use POST" }, 405);
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return jsonResponse({ error: "Invalid request body" }, 400);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const isAuthHook = !!parsed && typeof parsed === "object" &&
    "email_data" in (parsed as Record<string, unknown>);

  // ------------------------------------------------------------
  // AUTH HOOK MODE — called by GoTrue for every auth email.
  // ------------------------------------------------------------
  if (isAuthHook) {
    const hookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET")?.replace("v1,whsec_", "") ?? "";
    if (hookSecret) {
      try {
        const wh = new Webhook(hookSecret);
        parsed = wh.verify(rawBody, Object.fromEntries(req.headers)) as unknown;
      } catch (err) {
        // Invalid signature — never process the email, fail loudly.
        console.error("[send-email] hook signature verification FAILED", err);
        return jsonResponse({ error: "Invalid hook signature" }, 401);
      }
    } else {
      console.warn("[send-email] SEND_EMAIL_HOOK_SECRET not set — skipping signature verification");
    }

    const { user, email_data: emailData } = parsed as HookPayload;
    const to = (emailData?.email ?? user?.email ?? "").trim();
    if (!to) {
      return jsonResponse({ error: "email is required" }, 400);
    }
    const subject = (emailData?.subject ?? "").trim() || DEFAULT_SUBJECT;
    const html = (emailData?.html ?? "").trim();
    const action = emailData?.email_action_type ?? emailData?.template ?? "unknown";

    // Log every incoming hook request so delivery failures are traceable from
    // the function logs (never log the API key or the HTML body).
    console.log(
      `[send-email] auth-hook request action=${action} from=${EMAIL_FROM} to=${to} subject="${subject}"` +
      ` redirectTo=${emailData?.redirect_to ?? ""} bodyBytes=${new TextEncoder().encode(html).byteLength}`,
    );

    const { ok, status, detail, id } = await sendViaResend(to, subject, html);
    if (!ok) {
      // Return 401 so GoTrue surfaces this as an internal error (500) — the
      // exact Resend failure is visible in the function logs and in the
      // returned error payload.
      console.error(`[send-email] auth-hook FAILED action=${action} to=${to} status=${status}`);
      return jsonResponse({ error: { http_code: status, message: detail } }, 401);
    }

    console.log(`[send-email] auth-hook sent OK action=${action} to=${to} status=200 resendId=${id}`);
    return jsonResponse({}, 200);
  }

  // ------------------------------------------------------------
  // DIRECT MODE — { email, name?, subject?, html? }
  // ------------------------------------------------------------
  const body = parsed as SendEmailRequest;

  if (typeof body.email !== "string" || !body.email.trim()) {
    return jsonResponse({ error: "email is required and must be a string" }, 400);
  }
  const email = body.email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ error: "email must be a valid email address" }, 400);
  }

  const name = (typeof body.name === "string" ? body.name : "").trim() || "there";
  const subject = (typeof body.subject === "string" ? body.subject : "").trim() || DEFAULT_SUBJECT;
  const html = (typeof body.html === "string" ? body.html : "").trim() || buildWelcomeEmail(name);

  // Log every incoming request so delivery failures are traceable from the
  // function logs (never log the API key or the HTML body).
  console.log(
    `[send-email] direct request from=${EMAIL_FROM} to=${email} subject="${subject}"` +
    ` bodyBytes=${new TextEncoder().encode(html).byteLength}`,
  );

  const { ok, status, detail, id } = await sendViaResend(email, subject, html);
  if (!ok) {
    return jsonResponse(
      {
        error: "Resend API failed",
        status,
        detail: detail ?? "Unknown Resend error",
      },
      502,
    );
  }

  console.log(`[send-email] direct sent OK to=${email} status=200 resendId=${id}`);
  return jsonResponse(
    {
      success: true,
      message: "Email sent",
      id,
    },
    200,
  );
});
