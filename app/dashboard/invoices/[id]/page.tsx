"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, Download, ExternalLink, Trash2, Copy, Check, CreditCard } from "lucide-react";

// Minimal shape of the Razorpay Checkout instance we use.
interface RazorpayCheckoutInstance {
  open: () => void;
  on: (event: string, handler: (payload: unknown) => void) => void;
}
type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayCheckoutInstance;

const RAZORPAY_CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpayCheckout(): Promise<RazorpayConstructor> {
  return new Promise((resolve, reject) => {
    const existing = (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay;
    if (existing) return resolve(existing);

    const script = document.createElement("script");
    script.src = RAZORPAY_CHECKOUT_SRC;
    script.async = true;
    script.onload = () => {
      const ctor = (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay;
      if (ctor) resolve(ctor);
      else reject(new Error("Razorpay Checkout did not load"));
    };
    script.onerror = () => reject(new Error("Razorpay Checkout failed to load"));
    document.body.appendChild(script);
  });
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  amount: number;
  status: string;
  lineItems: { description: string; quantity: number; unitPrice: number }[];
  dueDate: string | null;
  notes: string | null;
  pdfUrl: string | null;
  stripePaymentLink: string | null;
  createdAt: string;
}

const STATUS_BADGES: Record<string, { color: string; bg: string }> = {
  pending: { color: "text-yellow-700", bg: "bg-yellow-50" },
  sent: { color: "text-blue-700", bg: "bg-blue-50" },
  paid: { color: "text-emerald-700", bg: "bg-emerald-50" },
  overdue: { color: "text-red-700", bg: "bg-red-50" },
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [cardPaymentsConnected, setCardPaymentsConnected] = useState<boolean | null>(null);
  const [startingCardPayment, setStartingCardPayment] = useState(false);
  // Set once Razorpay Checkout reports a completed payment. The invoice stays
  // unpaid here on purpose — only the signed webhook can mark it paid.
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const checkCardPayments = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/razorpay`);
      const data = await res.json();
      setCardPaymentsConnected(Boolean(data?.connected));
    } catch {
      setCardPaymentsConnected(false);
    }
  };

  const fetchInvoice = async () => {
    try {
      const res = await fetch(`/api/invoices/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setInvoice(data);
        checkCardPayments(data.id);
      } else {
        toast.error("Invoice not found");
        router.push("/dashboard/invoices");
      }
    } catch {
      toast.error("Failed to load invoice");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) fetchInvoice();
  }, [params.id]);

  const markAsPaid = async () => {
    if (!invoice) return;
    try {
      await fetch(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      });
      fetchInvoice();
    } catch {}
  };

  const handlePayWithCard = async () => {
    if (!invoice) return;
    setStartingCardPayment(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/razorpay`, { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (res.status === 503 || data?.connected === false) {
        setCardPaymentsConnected(false);
        return;
      }
      if (!res.ok) {
        toast.error(data?.error || "Could not start the card payment");
        if (res.status === 409) fetchInvoice();
        return;
      }

      setCardPaymentsConnected(true);

      const Razorpay = await loadRazorpayCheckout();
      const checkout = new Razorpay({
        key: data.keyId,
        order_id: data.orderId,
        amount: data.amount,
        currency: data.currency || "AUD",
        name: "SiteLaunch AI",
        description: `Invoice ${invoice.invoiceNumber}`,
        prefill: {
          name: invoice.clientName,
          email: invoice.clientEmail,
        },
        theme: { color: "#10b981" },
        handler: () => {
          // Razorpay Checkout has taken the payment, but nothing here marks the
          // invoice paid — the signature-verified webhook does that.
          setAwaitingConfirmation(true);
          toast.success("Payment submitted — waiting for confirmation");
          setTimeout(fetchInvoice, 5000);
        },
        modal: {
          ondismiss: () => toast("Card payment cancelled", { icon: "ℹ️" }),
        },
      });
      checkout.on("payment.failed", () => {
        toast.error("The card payment did not go through. Nothing has been charged to this invoice.");
      });
      checkout.open();
    } catch {
      toast.error("Could not open card payment");
    } finally {
      setStartingCardPayment(false);
    }
  };

  const handleCopyLink = () => {
    if (!invoice?.stripePaymentLink) return;
    navigator.clipboard.writeText(invoice.stripePaymentLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Payment link copied!");
  };

  const handleDelete = async () => {
    if (!invoice || !confirm("Delete this invoice?")) return;
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Invoice deleted");
        router.push("/dashboard/invoices");
      }
    } catch {
      toast.error("Failed to delete invoice");
    }
  };

  const formatCurrency = (cents: number) => `A$${(cents / 100).toFixed(2)}`;
  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm text-gray-400">Loading invoice...</p>
      </div>
    );
  }

  if (!invoice) return null;

  const badge = STATUS_BADGES[invoice.status] || STATUS_BADGES.pending;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/dashboard/invoices"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          All Invoices
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDelete}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-all inline-flex items-center gap-1"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>

      {/* Invoice Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Invoice Header */}
        <div className="p-6 sm:p-8 border-b border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="font-heading text-2xl font-extrabold text-gray-900">
                {invoice.invoiceNumber}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Created {formatDate(invoice.createdAt)}
              </div>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${badge.bg} ${badge.color}`}
            >
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
                Bill To
              </div>
              <div className="font-heading text-base font-bold text-gray-900">
                {invoice.clientName}
              </div>
              <div className="text-sm text-gray-500">{invoice.clientEmail}</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
                Amount Due
              </div>
              <div className="font-heading text-3xl font-extrabold text-gray-900">
                {formatCurrency(invoice.amount)}
              </div>
              {invoice.dueDate && (
                <div className="text-xs text-gray-500 mt-1">
                  Due by {formatDate(invoice.dueDate)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="p-6 sm:p-8">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left pb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
                  Description
                </th>
                <th className="text-center pb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
                  Qty
                </th>
                <th className="text-right pb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
                  Price
                </th>
                <th className="text-right pb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems?.map((item, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-3 text-sm font-semibold text-gray-900">
                    {item.description}
                  </td>
                  <td className="py-3 text-sm text-gray-500 text-center">
                    {item.quantity}
                  </td>
                  <td className="py-3 text-sm text-gray-500 text-right">
                    A${item.unitPrice.toFixed(2)}
                  </td>
                  <td className="py-3 text-sm font-bold text-gray-900 text-right">
                    A${(item.quantity * item.unitPrice).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="pt-4 text-base font-bold text-gray-900 text-right">
                  Total
                </td>
                <td className="pt-4 font-heading text-xl font-extrabold text-gray-900 text-right">
                  {formatCurrency(invoice.amount)}
                </td>
              </tr>
            </tfoot>
          </table>

          {invoice.notes && (
            <div className="mt-6 p-4 rounded-xl bg-gray-50">
              <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
                Notes
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Card payment status */}
      {invoice.status !== "paid" && cardPaymentsConnected === false && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="text-sm font-bold text-amber-900">Card payments are not connected yet</div>
          <p className="text-sm text-amber-800 mt-1">
            No card payments can be taken on this invoice yet. You can still record a payment manually
            once you have been paid another way.
          </p>
        </div>
      )}

      {awaitingConfirmation && invoice.status !== "paid" && (
        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4">
          <div className="text-sm font-bold text-blue-900">Payment submitted — being confirmed</div>
          <p className="text-sm text-blue-800 mt-1">
            Your card payment has gone through to the payment provider. This invoice will show as paid
            once the payment is confirmed, which usually takes a moment. It is not marked paid yet.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {invoice.status !== "paid" && cardPaymentsConnected !== false && (
          <button
            onClick={handlePayWithCard}
            disabled={startingCardPayment}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 shadow-md hover:brightness-110 transition-all disabled:opacity-50"
          >
            {startingCardPayment ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            Pay with card
          </button>
        )}

        {invoice.stripePaymentLink && (
          <>
            <a
              href={invoice.stripePaymentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all"
            >
              <ExternalLink className="h-4 w-4" />
              Open Payment Link
            </a>
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:border-gray-300 transition-all"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </>
        )}

        {invoice.status !== "paid" && (
          <button
            onClick={markAsPaid}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:border-emerald-300 hover:text-emerald-700 transition-all"
          >
            <Check className="h-4 w-4" />
            Mark as Paid
          </button>
        )}
      </div>
    </div>
  );
}