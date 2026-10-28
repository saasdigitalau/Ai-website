"use client";

// Client-side loader for Razorpay Checkout. The key id, order id, amount and
// currency all arrive from our server (the /pay route) — the secret never
// touches the browser. The `handler` is the UNTRUSTED browser callback: it must
// only inform the user; our server marks an invoice paid on the signed webhook.

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayCheckoutParams {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  onSuccess: (response: RazorpaySuccessResponse) => void;
  onDismiss?: () => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

let checkoutPromise: Promise<any> | null = null;

export function loadRazorpayCheckout(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay checkout requires a browser"));
  }
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (checkoutPromise) return checkoutPromise;

  checkoutPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) resolve(window.Razorpay);
      else {
        checkoutPromise = null;
        reject(new Error("Razorpay checkout failed to initialize"));
      }
    };
    script.onerror = () => {
      checkoutPromise = null;
      reject(new Error("Failed to load Razorpay checkout"));
    };
    document.body.appendChild(script);
  });

  return checkoutPromise;
}

export async function openRazorpayCheckout(params: RazorpayCheckoutParams) {
  const Razorpay = await loadRazorpayCheckout();
  const rzp = new Razorpay({
    key: params.keyId,
    amount: params.amount,
    currency: params.currency.toUpperCase(),
    order_id: params.orderId,
    name: params.name,
    description: params.description,
    theme: { color: "#4f46e5" },
    handler: params.onSuccess,
    modal: {
      ondismiss: params.onDismiss || (() => {}),
    },
  });
  rzp.open();
}
