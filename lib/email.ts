// ---------------------------------------------------------------------------
// Outbound email, through Resend's HTTP API (no SDK, no new dependency).
//
// Nothing else in this app sends mail yet, so this is deliberately small: one
// function that either sends or explains why it did not, and never throws into a
// request that has already done its real work (a stored call must not be lost
// because a mail provider is down).
//
// Environment:
//   RESEND_API_KEY — unset means "not configured": nothing is sent and the
//                    caller records that honestly instead of pretending.
//   EMAIL_FROM     — the From header. Defaults to Resend's own test sender,
//                    which can only deliver to the account's own address.
// ---------------------------------------------------------------------------

export type SendEmailResult = {
  status: "sent" | "not_configured" | "failed";
  id?: string;
  error?: string;
};

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export function emailFromAddress(): string {
  return process.env.EMAIL_FROM?.trim() || "SiteLaunch AI <onboarding@resend.dev>";
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { status: "not_configured" };

  const to = input.to.trim();
  if (!to) return { status: "failed", error: "no recipient address" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailFromAddress(),
        to: [to],
        subject: input.subject,
        text: input.text,
        ...(input.html ? { html: input.html } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        status: "failed",
        error: `Resend answered ${res.status}${body ? `: ${body.slice(0, 300)}` : ""}`,
      };
    }

    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { status: "sent", id: data?.id };
  } catch (err) {
    return {
      status: "failed",
      error: err instanceof Error ? err.message : "email request failed",
    };
  }
}
