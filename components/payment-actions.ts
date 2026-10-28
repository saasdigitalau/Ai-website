"use client";

import toast from "react-hot-toast";
import { openRazorpayCheckout } from "@/components/razorpay-checkout";

// Shared client flow for invoice payments. The browser callback is untrusted:
// on a successful checkout we only poll the server for the invoice to become
// "paid" (flipped by the signed webhook) — we never mark it paid ourselves.

interface PayInvoiceResponse {
  provider: "razorpay" | "stripe" | "none";
  orderId?: string;
  amount?: number;
  currency?: string;
  keyId?: string;
  url?: string;
  invoiceId?: string;
}

export async function startInvoicePayment(
  invoiceId: string,
  opts: { onPaid?: () => void } = {}
): Promise<"redirect" | "checkout"> {
  const res = await fetch(`/api/invoices/${invoiceId}/pay`, { method: "POST" });

  if (!res.ok) {
    let message = "Failed to start payment";
    try {
      const body = await res.json();
      if (body.error) message = body.error;
    } catch {
      /* keep default */
    }
    throw new Error(message);
  }

  const data: PayInvoiceResponse = await res.json();

  if (data.provider === "stripe" && data.url) {
    window.location.href = data.url;
    return "redirect";
  }

  if (data.provider === "razorpay" && data.orderId && data.keyId) {
    await openRazorpayCheckout({
      keyId: data.keyId,
      orderId: data.orderId,
      amount: data.amount ?? 0,
      currency: data.currency ?? "usd",
      name: "SiteLaunch AI",
      description: `Invoice payment`,
      onSuccess: () => {
        toast.success("Payment received — confirming…");
        void pollInvoiceStatus(invoiceId, opts.onPaid);
      },
      onDismiss: () => {
        toast("Payment window closed. The invoice updates once payment is confirmed.");
      },
    });
    return "checkout";
  }

  throw new Error("Payments are not configured.");
}

async function pollInvoiceStatus(invoiceId: string, onPaid?: () => void) {
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const r = await fetch(`/api/invoices/${invoiceId}`);
      if (r.ok) {
        const invoice = await r.json();
        if (invoice.status === "paid") {
          toast.success("Payment confirmed!");
          onPaid?.();
          return;
        }
      }
    } catch {
      /* retry */
    }
  }
  toast("Still confirming payment — refresh in a moment.");
}
