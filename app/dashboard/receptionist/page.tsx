import { Phone, PhoneIncoming, Mail, AlertTriangle, Clock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isEmailConfigured } from "@/lib/email";
import {
  RECEPTIONIST_WEBHOOK_PATH,
  isReceptionistConfigured,
  isWebhookSecretConfigured,
} from "@/lib/receptionist";

export const dynamic = "force-dynamic";

const EMAIL_LABELS: Record<string, string> = {
  sent: "Emailed to you",
  pending: "Not emailed yet",
  not_configured: "Email not configured",
  no_owner: "No account to email",
  failed: "Email failed",
};

function when(date: Date | null): string {
  if (!date) return "time not recorded";
  return date.toLocaleString("en-AU", {
    timeZone: "Australia/Sydney",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function ReceptionistPage() {
  const user = await getCurrentUser();
  const connected = isReceptionistConfigured();
  const secretSet = isWebhookSecretConfigured();
  const emailReady = isEmailConfigured();

  const enquiries = user
    ? await prisma.callEnquiry
        .findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
        .catch(() => [])
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-gray-900">Phone Receptionist</h1>
        <p className="mt-1 text-sm text-gray-500">
          Calls answered for your business are listed here with the caller&apos;s name, number and reason, and each
          one is emailed to you. The assistant answers as your business, says up front that it is an automated
          assistant, and never quotes a price.
        </p>
      </div>

      {!connected && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-heading text-sm font-bold text-amber-900">Not connected yet</h2>
              <p className="mt-1 text-sm text-amber-700 leading-relaxed">
                No phone number is linked to this account, so nothing is answering calls and no enquiries can
                arrive. This page is empty because there is nothing behind it yet — it is not sample data.
              </p>
              <p className="mt-2 text-sm text-amber-700 leading-relaxed">
                Once a number is connected, every finished call is delivered to{" "}
                <code className="rounded bg-amber-100 px-1 py-0.5 text-[12px]">{RECEPTIONIST_WEBHOOK_PATH}</code>{" "}
                and the caller&apos;s details appear in the list below.
              </p>
            </div>
          </div>
        </div>
      )}

      {connected && !secretSet && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            The webhook secret is missing, so call deliveries are refused and nothing will be saved until it is set.
          </span>
        </div>
      )}

      {connected && secretSet && !emailReady && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 text-sm text-gray-600 flex items-start gap-2">
          <Mail className="h-4 w-4 shrink-0 mt-0.5 text-gray-400" />
          <span>
            Email delivery is not configured, so calls are saved on this page but no email is sent. Nothing else is
            affected.
          </span>
        </div>
      )}

      {enquiries.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
          <Phone className="h-12 w-12 text-gray-200 mx-auto mb-4" />
          <p className="text-sm text-gray-500 font-medium">No calls yet</p>
          <p className="text-xs text-gray-400 mt-1">
            {connected
              ? "Calls appear here as soon as the receptionist finishes one."
              : "Nothing can arrive until a phone number is connected to this account."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {enquiries.map((enquiry) => (
            <div key={enquiry.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                    <PhoneIncoming className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-heading text-sm font-bold text-gray-900 truncate">
                      {enquiry.callerName || enquiry.fromNumber || "Caller not identified"}
                    </h2>
                    <p className="text-[11px] text-gray-500">
                      {enquiry.callerNumber || enquiry.fromNumber || "Number not given"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10.5px]">
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold bg-gray-50 text-gray-500 ring-1 ring-gray-200">
                    <Clock className="h-3 w-3" />
                    {when(enquiry.startedAt ?? enquiry.createdAt)}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 font-bold ring-1 ${
                      enquiry.emailStatus === "sent"
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        : "bg-amber-50 text-amber-700 ring-amber-200"
                    }`}
                  >
                    {EMAIL_LABELS[enquiry.emailStatus] ?? enquiry.emailStatus}
                  </span>
                </div>
              </div>

              <p className="mt-3 text-sm text-gray-700">
                <span className="font-semibold text-gray-900">Reason: </span>
                {enquiry.reason || "not captured"}
              </p>

              {enquiry.summary && enquiry.summary !== enquiry.reason && (
                <p className="mt-1 text-[12.5px] text-gray-500 leading-relaxed">{enquiry.summary}</p>
              )}

              {enquiry.transcript && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-widest text-indigo-600">
                    Transcript
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words rounded-xl bg-gray-50 p-3 text-[12px] text-gray-600">
                    {enquiry.transcript}
                  </pre>
                </details>
              )}

              {enquiry.recordingUrl && (
                <a
                  href={enquiry.recordingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-[11px] font-bold text-indigo-600 hover:text-indigo-700"
                >
                  Listen to the recording
                </a>
              )}

              {enquiry.emailError && (
                <p className="mt-2 text-[11px] text-gray-400">{enquiry.emailError}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-gray-400">
        Enquiries are stored from the call itself. Nothing on this page is generated or filled in later.
      </p>
    </div>
  );
}
