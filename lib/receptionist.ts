import crypto from "crypto";

// ---------------------------------------------------------------------------
// Phone receptionist (Retell) — shared pieces for the post-call webhook and the
// dashboard page.
//
// Retell's documented post-call webhook POSTs JSON of the shape
//   { "event": "call_analyzed", "call": { ...call fields... } }
// and signs it with an `x-retell-signature` header formatted
//   v={timestamp_ms},d={hex_digest}
// where the digest is HMAC-SHA256 of (raw request body + timestamp) keyed with
// the secret, and the timestamp must be within five minutes of now.
// https://docs.retellai.com/features/secure-webhook
//
// The secret here is RETELL_WEBHOOK_SECRET. Retell's own examples key the HMAC
// with the Retell API key, so when the agent is wired up that variable is set to
// the same value the Retell dashboard signs with — the route needs no other
// credential to prove a delivery is genuine.
// ---------------------------------------------------------------------------

export const RECEPTIONIST_WEBHOOK_PATH = "/api/receptionist/webhook";

/** How far out of date a signed delivery may be before it is refused. */
export const SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000;

/** Events whose payload we store. Everything else is acknowledged and ignored. */
export const STORED_EVENTS = ["call_analyzed", "call_ended"] as const;

/** The event that carries the caller's name and reason, and so the one that emails. */
export const EMAIL_EVENT = "call_analyzed";

export function isReceptionistConfigured(): boolean {
  return Boolean(process.env.RETELL_API_KEY);
}

export function isWebhookSecretConfigured(): boolean {
  return Boolean(process.env.RETELL_WEBHOOK_SECRET);
}

/**
 * True when the delivery carries a valid Retell signature over this exact body.
 *
 * The raw body string is required: re-serialising parsed JSON changes whitespace
 * and key order and breaks the digest. Missing secret, missing header, a
 * malformed header, a stale timestamp or a wrong digest all return false.
 */
export function verifyRetellSignature(
  rawBody: string,
  signature: string | null | undefined,
  nowMs: number = Date.now()
): boolean {
  const secret = process.env.RETELL_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const match = /^v=(\d+),d=(.*)$/.exec(signature.trim());
  if (!match) return false;

  const timestamp = match[1];
  const digest = match[2].trim().toLowerCase();
  if (!/^[0-9a-f]+$/.test(digest)) return false;

  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt) || Math.abs(nowMs - sentAt) > SIGNATURE_MAX_AGE_MS) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody + timestamp)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(digest, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export type RetellCallAnalysis = {
  call_summary?: string;
  call_successful?: boolean;
  user_sentiment?: string;
  custom_analysis_data?: Record<string, unknown>;
};

export type RetellCall = {
  call_id?: string;
  agent_id?: string;
  call_type?: string;
  call_status?: string;
  direction?: string;
  from_number?: string;
  to_number?: string;
  start_timestamp?: number;
  end_timestamp?: number;
  duration_ms?: number;
  transcript?: string;
  recording_url?: string;
  metadata?: Record<string, unknown>;
  retell_llm_dynamic_variables?: Record<string, unknown>;
  call_analysis?: RetellCallAnalysis;
};

export type RetellWebhookEvent = {
  event?: string;
  call?: RetellCall;
};

export type ParsedCall = {
  callId: string;
  agentId: string | null;
  direction: string | null;
  fromNumber: string | null;
  toNumber: string | null;
  callerName: string | null;
  callerNumber: string | null;
  reason: string | null;
  summary: string | null;
  transcript: string | null;
  recordingUrl: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
  durationSeconds: number | null;
  /** The account id the agent was provisioned with, if the payload carries one. */
  ownerRef: string | null;
};

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || /^(null|undefined|unknown|n\/a|none)$/i.test(trimmed)) return null;
  return trimmed;
}

function firstText(source: Record<string, unknown> | undefined, keys: string[]): string | null {
  if (!source) return null;
  for (const key of keys) {
    const value = text(source[key]);
    if (value) return value;
  }
  return null;
}

function toDate(ms: unknown): Date | null {
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms <= 0) return null;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Turns a verified webhook payload into the columns of a CallEnquiry row.
 *
 * The caller's name, number and reason come from the agent's post-call analysis
 * custom fields (see docs/receptionist-agent-prompt.md). When the analysis has
 * not been written yet — the call_ended delivery usually arrives first — those
 * stay null and the later call_analyzed delivery fills them in. Nothing is
 * invented: a missing field stays null rather than being guessed from the
 * transcript.
 */
export function parseCallEvent(event: RetellWebhookEvent): ParsedCall | null {
  const call = event?.call;
  const callId = text(call?.call_id);
  if (!call || !callId) return null;

  const custom = call.call_analysis?.custom_analysis_data;
  const variables = call.retell_llm_dynamic_variables;
  const metadata = call.metadata;

  const startedAt = toDate(call.start_timestamp);
  const endedAt = toDate(call.end_timestamp);
  const durationSeconds =
    startedAt && endedAt ? Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)) : null;

  return {
    callId,
    agentId: text(call.agent_id),
    direction: text(call.direction),
    fromNumber: text(call.from_number),
    toNumber: text(call.to_number),
    callerName:
      firstText(custom, ["caller_name", "callerName", "customer_name", "customerName", "name"]) ??
      firstText(variables, ["caller_name", "customer_name"]),
    callerNumber:
      firstText(custom, ["caller_phone", "callerPhone", "caller_number", "callerNumber", "phone", "phone_number"]) ??
      null,
    reason:
      firstText(custom, ["reason_for_call", "reasonForCall", "call_reason", "reason", "purpose", "enquiry", "inquiry"]) ??
      text(call.call_analysis?.call_summary),
    summary: text(call.call_analysis?.call_summary),
    transcript: text(call.transcript),
    recordingUrl: text(call.recording_url),
    startedAt,
    endedAt,
    durationSeconds,
    ownerRef:
      firstText(metadata, ["userId", "user_id", "accountId", "account_id", "clerkId"]) ??
      firstText(variables, ["userId", "user_id", "account_id"]),
  };
}
