"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, FileText, Search, Filter, MoreHorizontal, Download, Trash2, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  amount: number;
  status: string;
  dueDate: string | null;
  stripePaymentLink: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
  sent: "bg-blue-50 text-blue-700 ring-blue-600/20",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  overdue: "bg-red-50 text-red-700 ring-red-600/20",
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/invoices?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInvoices();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this invoice?")) return;
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Invoice deleted");
        fetchInvoices();
      }
    } catch {
      toast.error("Failed to delete invoice");
    }
  };

  const handleGeneratePaymentLink = async (id: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}/pay`, { method: "POST" });
      if (res.ok) {
        const invoice = await res.json();
        toast.success("Payment link created!");
        fetchInvoices();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to create payment link");
      }
    } catch {
      toast.error("Failed to create payment link");
    }
  };

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatDate = (date: string) => new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-1">Create, send, and track invoices</p>
        </div>
        <Link
          href="/dashboard/invoices/create"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 shadow-md hover:brightness-110 transition-all"
        >
          <Plus className="h-4 w-4" />
          New Invoice
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px] max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoices..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        </form>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          {["", "pending", "sent", "paid", "overdue"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === s
                  ? "bg-emerald-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-sm text-gray-400">Loading invoices...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && invoices.length === 0 && (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white mx-auto mb-4">
            <FileText className="h-8 w-8" />
          </div>
          <h2 className="font-heading text-xl font-bold text-gray-900 mb-2">
            {statusFilter ? "No matching invoices" : "No invoices yet"}
          </h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
            {statusFilter
              ? `No invoices with status "${statusFilter}"`
              : "Create your first invoice to get started"}
          </p>
          {!statusFilter && (
            <Link
              href="/dashboard/invoices/create"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 shadow-md hover:brightness-110 transition-all"
            >
              <Plus className="h-4 w-4" />
              Create Invoice
            </Link>
          )}
        </div>
      )}

      {/* Invoice list */}
      {!loading && invoices.length > 0 && (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-sm font-bold text-gray-900">
                      {inv.invoiceNumber}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                        STATUS_COLORS[inv.status] || "bg-gray-50 text-gray-700"
                      }`}
                    >
                      {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                    </span>
                  </div>
                  <h3 className="font-heading text-base font-bold text-gray-900 truncate">
                    {inv.clientName}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">{inv.clientEmail}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>Created {formatDate(inv.createdAt)}</span>
                    {inv.dueDate && <span>Due {formatDate(inv.dueDate)}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-heading text-xl font-extrabold text-gray-900">
                    {formatCurrency(inv.amount)}
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    {inv.status === "pending" && (
                      <button
                        onClick={() => handleGeneratePaymentLink(inv.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 transition-all"
                      >
                        Generate Payment Link
                      </button>
                    )}
                    {inv.stripePaymentLink && (
                      <a
                        href={inv.stripePaymentLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all inline-flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Pay Link
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(inv.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}