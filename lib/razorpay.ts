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
const PLANS_API = "https://api.razorpay.com/v1/plans";
const SUBSCRIPTIONS_API = "https://api.razorpay.com/v1/subscriptions";

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

function razorpayAuthorization(): string {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new RazorpayNotConnectedError();
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

/**
 * POST to a Razorpay resource endpoint with Basic auth and turn every failure
 * into a typed error. `what` names the resource in the error message ("order",
 * "plan", "subscription").
 */
async function razorpayPost(url: string, body: unknown, what: string): Promise<any> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: razorpayAuthorization(),
      },
      body: JSON.stringify(body),
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
      `Razorpay refused the ${what} (${res.status}): ${detail}`,
      res.status >= 400 && res.status < 500 ? 502 : res.status
    );
  }

  return data;
}

/**
 * Create a Razorpay order for `amount` minor units (cents) in AUD.
 * Throws RazorpayNotConnectedError when no keys are configured.
 */
export async function createRazorpayOrder(params: {
  amount: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  const amount = Math.round(params.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new RazorpayRequestError("Order amount must be greater than 0", 400);
  }

  const data = await razorpayPost(
    ORDERS_API,
    {
      amount,
      currency: RAZORPAY_CURRENCY,
      // Razorpay caps receipt at 40 characters; invoice numbers are INV-0001.
      receipt: params.receipt.slice(0, 40),
      notes: params.notes ?? {},
    },
    "order"
  );

  return {
    id: String(data.id),
    amount: Number(data.amount),
    currency: String(data.currency || RAZORPAY_CURRENCY),
    status: String(data.status || "created"),
    receipt: data.receipt ?? null,
  };
}

// ---------------------------------------------------------------------------
// Subscriptions
//
// Razorpay subscriptions are built from a *plan*: a plan fixes the amount,
// currency and billing period, and a subscription is a customer's enrolment in
// that plan. A plan id must exist at Razorpay before a subscription can be
// created, so the tier catalogue lives in lib/razorpay-subscriptions.ts and
// resolves (or creates) one plan id per tier.
// ---------------------------------------------------------------------------

export type RazorpayPlanEntity = {
  id: string;
  period: string;
  interval: number;
  item?: { name?: string; amount?: number; currency?: string };
};

export type RazorpaySubscriptionEntity = {
  id: string;
  plan_id?: string;
  status?: string;
  quantity?: number;
  total_count?: number;
  paid_count?: number;
  current_start?: number | null;
  current_end?: number | null;
  charge_at?: number | null;
  customer_id?: string | null;
  short_url?: string | null;
  notes?: Record<string, string>;
};

/** A monthly plan for `amount` minor units (cents) in AUD. */
export async function createRazorpayPlan(params: {
  name: string;
  amount: number;
  description?: string;
  notes?: Record<string, string>;
}): Promise<RazorpayPlanEntity> {
  const amount = Math.round(params.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new RazorpayRequestError("Plan amount must be greater than 0", 400);
  }

  const data = await razorpayPost(
    PLANS_API,
    {
      period: "monthly",
      interval: 1,
      item: {
        name: params.name,
        amount,
        currency: RAZORPAY_CURRENCY,
        description: params.description ?? "",
      },
      notes: params.notes ?? {},
    },
    "plan"
  );

  return {
    id: String(data.id),
    period: String(data.period || "monthly"),
    interval: Number(data.interval || 1),
    item: data.item,
  };
}

/**
 * Enrol a customer in `planId`. `totalCount` is the number of monthly cycles
 * Razorpay is authorised to charge (its maximum is 100, i.e. just over eight
 * years); it is required, so it is always sent explicitly.
 */
export async function createRazorpaySubscription(params: {
  planId: string;
  totalCount: number;
  notes?: Record<string, string>;
}): Promise<RazorpaySubscriptionEntity> {
  if (!params.planId) {
    throw new RazorpayRequestError("A plan id is required to start a subscription", 400);
  }
  const totalCount = Math.round(params.totalCount);
  if (!Number.isFinite(totalCount) || totalCount <= 0) {
    throw new RazorpayRequestError("A subscription needs at least one billing cycle", 400);
  }

  const data = await razorpayPost(
    SUBSCRIPTIONS_API,
    {
      plan_id: params.planId,
      total_count: totalCount,
      quantity: 1,
      customer_notify: 1,
      notes: params.notes ?? {},
    },
    "subscription"
  );

  return {
    id: String(data.id),
    plan_id: data.plan_id ? String(data.plan_id) : params.planId,
    status: data.status ? String(data.status) : "created",
    quantity: Number(data.quantity || 1),
    total_count: Number(data.total_count || totalCount),
    paid_count: Number(data.paid_count || 0),
    current_start: data.current_start ?? null,
    current_end: data.current_end ?? null,
    charge_at: data.charge_at ?? null,
    customer_id: data.customer_id ?? null,
    short_url: data.short_url ?? null,
    notes: data.notes ?? {},
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
    subscription?: { entity?: RazorpaySubscriptionEntity };
  };
};

/** Events that can mean "this order was actually paid". */
export const PAID_EVENTS = ["payment.captured", "order.paid"] as const;

export function isPaidEvent(event: string | undefined): boolean {
  return typeof event === "string" && (PAID_EVENTS as readonly string[]).includes(event);
}
