import crypto from "node:crypto";

// Razorpay server-side client. Talks to the Razorpay REST API directly with
// global fetch (Node 18+) so we do not add a runtime dependency. Everything
// here is server-only: the key SECRET and webhook secret must never leave the
// server. The key ID is public and is the only credential exposed to the
// browser (returned by the pay route so Razorpay Checkout can open).

export const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

export interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
  webhookSecret: string | null;
}

export interface RazorpayOrderInput {
  /** Amount in the smallest currency unit (paise for INR, cents for USD). */
  amount: number;
  /** ISO currency code, e.g. "INR" or "USD". */
  currency: string;
  /** Your unique receipt id for reconciliation. */
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string | null;
  status: string;
  notes: Record<string, string> | null;
}

export interface RazorpaySubscription {
  id: string;
  short_url: string | null;
  status: string;
}

/** Thrown for upstream/configuration failures with a safe, non-leaking message. */
export class RazorpayError extends Error {
  status: number;
  code: string | null;
  constructor(message: string, status = 500, code: string | null = null) {
    super(message);
    this.name = "RazorpayError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Read credentials from env only. Returns null (not a throw) when the account
 * is not configured, so callers can render a clean "not configured" state.
 */
export function getRazorpayCredentials(): RazorpayCredentials | null {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return {
    keyId,
    keySecret,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || null,
  };
}

export function razorpayIsConfigured(): boolean {
  return getRazorpayCredentials() !== null;
}

/** Public key id, safe to expose to the browser. */
export function getRazorpayKeyId(): string | null {
  return process.env.RAZORPAY_KEY_ID || null;
}

async function razorpayRequest<T>(
  method: "GET" | "POST",
  path: string,
  body: unknown,
  creds: RazorpayCredentials
): Promise<T> {
  const auth = Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString(
    "base64"
  );

  let res: Response;
  try {
    res = await fetch(`${RAZORPAY_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    // Network/DNS failure — never echo credentials or upstream internals.
    throw new RazorpayError(
      "Razorpay is unreachable.",
      502,
      "network_error"
    );
  }

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const code = data?.error?.code || null;
    const description =
      data?.error?.description || `Razorpay request failed (${res.status})`;
    throw new RazorpayError(description, res.status, code);
  }

  return data as T;
}

export async function createRazorpayOrder(
  input: RazorpayOrderInput
): Promise<RazorpayOrder> {
  const creds = getRazorpayCredentials();
  if (!creds) throw new RazorpayError("Razorpay is not configured.", 503, "not_configured");
  return razorpayRequest<RazorpayOrder>("POST", "/orders", input, creds);
}

/**
 * Read-only fetch of an order by id. Used by the webhook to resolve an
 * order's notes (which carry the invoice id) without creating anything.
 */
export async function fetchRazorpayOrder(orderId: string): Promise<RazorpayOrder> {
  const creds = getRazorpayCredentials();
  if (!creds) throw new RazorpayError("Razorpay is not configured.", 503, "not_configured");
  return razorpayRequest<RazorpayOrder>("GET", `/orders/${encodeURIComponent(orderId)}`, undefined, creds);
}

/**
 * Read-only fetch of a payment by id. Used to confirm a payment's captured
 * state without ever creating a charge.
 */
export async function fetchRazorpayPayment(paymentId: string): Promise<{
  id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  status: string;
  captured: boolean;
}> {
  const creds = getRazorpayCredentials();
  if (!creds) throw new RazorpayError("Razorpay is not configured.", 503, "not_configured");
  return razorpayRequest("GET", `/payments/${encodeURIComponent(paymentId)}`, undefined, creds);
}

/**
 * Create a Razorpay customer (needed before a subscription can be created).
 * The subscription path is only exercised when a plan id is configured.
 */
export async function createRazorpayCustomer(input: {
  name: string;
  email: string;
  contact?: string;
}): Promise<{ id: string }> {
  const creds = getRazorpayCredentials();
  if (!creds) throw new RazorpayError("Razorpay is not configured.", 503, "not_configured");
  return razorpayRequest<{ id: string }>("POST", "/customers", {
    name: input.name,
    email: input.email,
    contact: input.contact,
  }, creds);
}

/**
 * Create a Razorpay subscription. Requires a Plan created in the Razorpay
 * dashboard (its id is supplied by config) and an existing Razorpay customer.
 */
export async function createRazorpaySubscription(input: {
  planId: string;
  customerId: string;
  /** Number of billing cycles; must be >= 1. */
  totalCount: number;
  notes?: Record<string, string>;
}): Promise<RazorpaySubscription> {
  const creds = getRazorpayCredentials();
  if (!creds) throw new RazorpayError("Razorpay is not configured.", 503, "not_configured");
  return razorpayRequest<RazorpaySubscription>(
    "POST",
    "/subscriptions",
    {
      plan_id: input.planId,
      customer_id: input.customerId,
      total_count: input.totalCount,
      notes: input.notes,
    },
    creds
  );
}

/**
 * Verify a Razorpay webhook signature. Razorpay signs the raw request body
 * with HMAC-SHA256 keyed by the webhook secret and sends the hex digest in the
 * X-Razorpay-Signature header. Comparison is constant-time.
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string | null
): boolean {
  if (!signature || !secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
