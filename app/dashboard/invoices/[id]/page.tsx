"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, Download, ExternalLink, Send, Trash2, Copy, Check } from "lucide-react";

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
  const searchParams = useSearchParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [generatingPaymentLink, setGeneratingPaymentLink] = useState(false);

  useEffect(() => {
    if (searchParams.get("paid") === "true") {
      toast.success("Payment received! Invoice marked as paid.");
      markAsPaid();
    }
  }, [searchParams]);

  const fetchInvoice = async () => {
    try {
      const res = await fetch(`/api/invoices/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setInvoice(data);
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

  const handleGeneratePaymentLink = async () => {
    if (!invoice) return;
    setGeneratingPaymentLink(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/pay`, { method: "POST" });
      if (res.ok) {
        const updated = await res.json();
        setInvoice(updated);
        toast.success("Payment link created!");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to create payment link");
      }
    } catch {
      toast.error("Failed to create payment link");
    } finally {
      setGeneratingPaymentLink(false);
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

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;
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
                    ${item.unitPrice.toFixed(2)}
                  </td>
                  <td className="py-3 text-sm font-bold text-gray-900 text-right">
                    ${(item.quantity * item.unitPrice).toFixed(2)}
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

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {invoice.status === "pending" && (
          <button
            onClick={handleGeneratePaymentLink}
            disabled={generatingPaymentLink}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 shadow-md hover:brightness-110 transition-all disabled:opacity-50"
          >
            {generatingPaymentLink ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Generate Payment Link
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