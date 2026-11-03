import crypto from "node:crypto";

// ---------------------------------------------------------------------------
// Razorpay provider layer
//
// Razorpay is the live card-payment provider (owner decision, Nov 2); Stripe is
// dormant and untouched in lib/stripe.ts. Nothing is charged until the owner
// saves the three env vars below, so this module must load and every caller
// must behave sensibly with no keys at all: a missing key is a "not connected"
// state, never a throw at module load and never an invented success.
//
//   RAZORPAY_KEY_ID          — public key id (safe to hand to the browser)
//   RAZORPAY_KEY_SECRET      — server-only, Basic auth for the Orders API
//   RAZORPAY_WEBHOOK_SECRET  — server-only, HMAC key for webhook signatures
//
// Billing currency is AUD (owner decision, Oct 28). Razorpay amounts are in the
// smallest unit of the currency, which for AUD is cents — and Invoice.amount is
// already stored in cents, so no conversion is applied anywhere.
//
// There is no "mark this invoice paid" helper in this file on purpose: an
// invoice becomes paid only through the signature-verified webhook in
// app/api/webhook/razorpay/route.ts. The old ?paid=true shortcut stays gone.
// ---------------------------------------------------------------------------

export const RAZORPAY_CURRENCY = "AUD";

const ORDERS_API = "https://api.razorpay.com/v1/orders";

export const NOT_CONNECTED_MESSAGE =
  "Card payments are not connected yet. Add RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET to switch them on.";

export const WEBHOOK_NOT_CONNECTED_MESSAGE =
  "Card payments are not connected yet. Add RAZORPAY_WEBHOOK_SECRET to accept payment notifications.";

/** Raised when a Razorpay call is attempted with no credentials configured. */
export class RazorpayNotConnectedError extends Error {
  code = "not_connected" as const;
  constructor(message: string = NOT_CONNECTED_MESSAGE) {
    super(message);
    this.name = "RazorpayNotConnectedError";
  }
}

/** Raised when Razorpay accepts the request but rejects it (or answers oddly). */
export class RazorpayRequestError extends Error {
  code = "razorpay_error" as const;
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "RazorpayRequestError";
    this.status = status;
  }
}

// Env is read at call time, not at module load, so a restarted deployment picks
// up newly saved keys without a rebuild — and so this module can never throw
// during `next build` on an environment that has no Razorpay account yet.
export function razorpayKeyId(): string | undefined {
  return process.env.RAZORPAY_KEY_ID || undefined;
}

export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function isRazorpayWebhookConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_WEBHOOK_SECRET);
}

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt?: string | null;
};

/**
 * Create a Razorpay order for `amount` minor units (cents) in AUD.
 * Throws RazorpayNotConnectedError when no keys are configured.
 */
export async function createRazorpayOrder(params: {
  amount: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new RazorpayNotConnectedError();

  const amount = Math.round(params.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new RazorpayRequestError("Order amount must be greater than 0", 400);
  }

  const authorization = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;

  let res: Response;
  try {
    res = await fetch(ORDERS_API, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization,
      },
      body: JSON.stringify({
        amount,
        currency: RAZORPAY_CURRENCY,
        // Razorpay caps receipt at 40 characters; invoice numbers are INV-0001.
        receipt: params.receipt.slice(0, 40),
        notes: params.notes ?? {},
      }),
    });
  } catch (err: any) {
    throw new RazorpayRequestError(
      `Could not reach Razorpay: ${err?.message || "network error"}`,
      502
    );
  }

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok || !data?.id) {
    const detail =
      data?.error?.description || data?.error?.reason || text?.slice(0, 200) || "no response body";
    throw new RazorpayRequestError(
      `Razorpay refused the order (${res.status}): ${detail}`,
      res.status >= 400 && res.status < 500 ? 502 : res.status
    );
  }

  return {
    id: String(data.id),
    amount: Number(data.amount),
    currency: String(data.currency || RAZORPAY_CURRENCY),
    status: String(data.status || "created"),
    receipt: data.receipt ?? null,
  };
}

/**
 * Verify a Razorpay webhook signature: HMAC-SHA256 of the raw request body
 * keyed with RAZORPAY_WEBHOOK_SECRET, hex-encoded, sent as
 * `x-razorpay-signature`. Compared in constant time.
 *
 * Returns false (never throws) when the secret or signature is missing, so the
 * caller can answer "not connected" or "invalid signature" without an exception.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null | undefined
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature.trim().toLowerCase(), "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export type RazorpayPaymentEntity = {
  id?: string;
  order_id?: string;
  status?: string;
  amount?: number;
  currency?: string;
  captured?: boolean;
};

export type RazorpayWebhookEvent = {
  event?: string;
  payload?: {
    payment?: { entity?: RazorpayPaymentEntity };
    order?: { entity?: { id?: string; amount?: number; currency?: string; status?: string } };
  };
};

/** Events that can mean "this order was actually paid". */
export const PAID_EVENTS = ["payment.captured", "order.paid"] as const;

export function isPaidEvent(event: string | undefined): boolean {
  return typeof event === "string" && (PAID_EVENTS as readonly string[]).includes(event);
}
