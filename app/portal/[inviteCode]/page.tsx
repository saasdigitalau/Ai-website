"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface PortalData {
  clientName: string;
  clientEmail: string;
  inviteCode: string;
  approved: boolean;
  viewedAt: string | null;
  createdAt: string;
  freelancerName: string;
  whiteLabel: boolean;
  whiteLabelLogo: string | null;
  website: {
    id: string;
    name: string;
    description: string;
    businessType: string;
    html: string;
    published: boolean;
    approved: boolean;
    updatedAt: string;
  } | null;
  feedback: {
    id: string;
    message: string;
    type: string;
    createdAt: string;
    read: boolean;
  }[];
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  status: string;
  dueDate: string | null;
  notes: string | null;
  lineItems: any;
  stripePaymentLink: string | null;
  createdAt: string;
}

export default function ClientPortalPage() {
  const params = useParams();
  const inviteCode = params.inviteCode as string;

  const [portal, setPortal] = useState<PortalData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackType, setFeedbackType] = useState<"comment" | "revision">("comment");
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [approving, setApproving] = useState(false);
  const [activeTab, setActiveTab] = useState<"preview" | "feedback" | "invoices">("preview");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  useEffect(() => {
    async function loadPortal() {
      try {
        const res = await fetch(`/api/portal/${inviteCode}`);
        if (!res.ok) {
          const err = await res.json();
          setError(err.error || "Failed to load portal");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setPortal(data.portal);
        setLoading(false);
      } catch {
        setError("Failed to load portal. Please check your invite link.");
        setLoading(false);
      }
    }
    loadPortal();
  }, [inviteCode]);

  useEffect(() => {
    if (portal) {
      fetch(`/api/portal/${inviteCode}/invoices`)
        .then((r) => r.json())
        .then((data) => setInvoices(data.invoices || []))
        .catch(() => {});
    }
  }, [portal, inviteCode]);

  async function handleSubmitFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    setSendingFeedback(true);
    try {
      const res = await fetch(`/api/portal/${inviteCode}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: feedbackText, type: feedbackType }),
      });
      if (res.ok) {
        const data = await res.json();
        setPortal((prev) =>
          prev
            ? { ...prev, feedback: [data.feedback, ...prev.feedback] }
            : prev
        );
        setFeedbackText("");
        setFeedbackSubmitted(true);
        setTimeout(() => setFeedbackSubmitted(false), 3000);
      }
    } finally {
      setSendingFeedback(false);
    }
  }

  async function handleApprove() {
    setApproving(true);
    try {
      const res = await fetch(`/api/portal/${inviteCode}/approve`, {
        method: "POST",
      });
      if (res.ok) {
        setPortal((prev) => (prev ? { ...prev, approved: true } : prev));
      }
    } finally {
      setApproving(false);
    }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

  const statusColors: Record<string, string> = {
    paid: "bg-green-100 text-green-800",
    sent: "bg-blue-100 text-blue-800",
    pending: "bg-yellow-100 text-yellow-800",
    overdue: "bg-red-100 text-red-800",
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link Not Found</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!portal || !portal.website) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <h1 className="text-xl font-bold text-gray-900 mb-2">No Website Yet</h1>
          <p className="text-gray-500">Your freelancer hasn&apos;t shared a website with you yet. Check back soon!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {portal.whiteLabel && portal.whiteLabelLogo ? (
              <img src={portal.whiteLabelLogo} alt="Logo" className="h-8 w-auto" />
            ) : portal.whiteLabel ? (
              <span className="font-bold text-xl text-gray-900">{portal.freelancerName}</span>
            ) : (
              <span className="font-bold text-xl text-indigo-600">SiteLaunch AI</span>
            )}
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-500">Client Portal</span>
          </div>
          <div className="flex items-center gap-3">
            {portal.approved ? (
              <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Approved
              </span>
            ) : (
              <button
                onClick={handleApprove}
                disabled={approving}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {approving ? "Approving..." : "Approve Design"}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Hi {portal.clientName}! 👋
          </h1>
          <p className="text-gray-500 mt-1">
            Your website &quot;{portal.website.name}&quot; is ready for review
            {portal.freelancerName ? ` by ${portal.freelancerName}` : ""}.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-lg border border-gray-200 p-1">
          {[
            { id: "preview" as const, label: "Website Preview", icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" },
            { id: "feedback" as const, label: "Feedback", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
            { id: "invoices" as const, label: "Invoices", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "preview" && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">{portal.website.name}</h2>
                <p className="text-sm text-gray-500">{portal.website.businessType} • Updated {formatDate(portal.website.updatedAt)}</p>
              </div>
              <a
                href={`/api/portal/${inviteCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                Open in new tab
              </a>
            </div>
            <div className="bg-white">
              <iframe
                srcDoc={portal.website.html}
                className="w-full border-0"
                style={{ height: "70vh", minHeight: "500px" }}
                title="Website Preview"
                sandbox="allow-scripts"
              />
            </div>
          </div>
        )}

        {activeTab === "feedback" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Submit Feedback */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Send Feedback</h2>
              <p className="text-sm text-gray-500 mb-4">Let your freelancer know what you think</p>

              {feedbackSubmitted ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-sm">
                  Feedback sent! Your freelancer will see it.
                </div>
              ) : (
                <form onSubmit={handleSubmitFeedback} className="space-y-4">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFeedbackType("comment")}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                        feedbackType === "comment"
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      💬 Comment
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedbackType("revision")}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                        feedbackType === "revision"
                          ? "bg-amber-600 text-white border-amber-600"
                          : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      🔧 Revision Request
                    </button>
                  </div>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Type your feedback here..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={sendingFeedback || !feedbackText.trim()}
                    className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
                  >
                    {sendingFeedback ? "Sending..." : "Send Feedback"}
                  </button>
                </form>
              )}
            </div>

            {/* Feedback History */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Feedback History</h2>
              {portal.feedback.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p>No feedback yet</p>
                  <p className="text-sm">Send your first feedback above!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {portal.feedback.map((fb) => (
                    <div
                      key={fb.id}
                      className={`p-3 rounded-lg border ${
                        fb.type === "approval"
                          ? "bg-green-50 border-green-200"
                          : fb.type === "revision"
                          ? "bg-amber-50 border-amber-200"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          fb.type === "approval"
                            ? "bg-green-200 text-green-800"
                            : fb.type === "revision"
                            ? "bg-amber-200 text-amber-800"
                            : "bg-gray-200 text-gray-800"
                        }`}>
                          {fb.type === "approval" ? "✅ Approved" : fb.type === "revision" ? "🔧 Revision" : "💬 Comment"}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(fb.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-700">{fb.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "invoices" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Invoices</h2>
            {invoices.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>No invoices yet</p>
                <p className="text-sm">Your freelancer hasn&apos;t sent you any invoices yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {invoices.map((inv) => (
                  <div key={inv.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-semibold text-gray-900">{inv.invoiceNumber}</span>
                        <span className="text-gray-400 mx-2">•</span>
                        <span className="text-gray-600">{formatDate(inv.createdAt)}</span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[inv.status] || "bg-gray-100 text-gray-800"}`}>
                        {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500">
                        Due: {inv.dueDate ? formatDate(inv.dueDate) : "Not set"}
                      </p>
                      <span className="text-xl font-bold text-gray-900">{formatPrice(inv.amount)}</span>
                    </div>
                    {inv.stripePaymentLink && inv.status !== "paid" && (
                      <a
                        href={inv.stripePaymentLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        Pay Now
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Approve Bar */}
        {!portal.approved && (
          <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 text-center">
            <h3 className="text-lg font-bold text-green-900 mb-2">Happy with your website?</h3>
            <p className="text-green-700 mb-4">Approve the design so your freelancer can proceed.</p>
            <button
              onClick={handleApprove}
              disabled={approving}
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
            >
              {approving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Approving...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Yes, Approve My Website!
                </>
              )}
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-center">
          {portal.whiteLabel ? (
            <p className="text-sm text-gray-400">
              Powered by {portal.freelancerName}
            </p>
          ) : (
            <p className="text-sm text-gray-400">
              Powered by <span className="text-indigo-500">SiteLaunch AI</span>
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}