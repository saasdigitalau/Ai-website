"use client";

import { useState } from "react";

interface WhiteLabelSettingsProps {
  initialWhiteLabel: boolean;
  initialLogo: string | null;
  initialDomain: string | null;
}

export default function WhiteLabelSettings({
  initialWhiteLabel,
  initialLogo,
  initialDomain,
}: WhiteLabelSettingsProps) {
  const [whiteLabel, setWhiteLabel] = useState(initialWhiteLabel);
  const [whiteLabelLogo, setWhiteLabelLogo] = useState(initialLogo || "");
  const [whiteLabelDomain, setWhiteLabelDomain] = useState(initialDomain || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/clients", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        whiteLabel,
        whiteLabelLogo: whiteLabelLogo || null,
        whiteLabelDomain: whiteLabelDomain || null,
      }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h2 className="font-heading text-lg font-bold text-gray-900 mb-4">
        White-Label Portal
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Remove SiteLaunch branding from the client portal and use your own.
      </p>

      <div className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={whiteLabel}
              onChange={(e) => setWhiteLabel(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-6 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 transition-colors" />
            <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-4 transition-transform" />
          </div>
          <div>
            <span className="font-medium text-gray-900">Enable white-label</span>
            <p className="text-xs text-gray-500">
              Show your brand instead of SiteLaunch in the client portal
            </p>
          </div>
        </label>

        {whiteLabel && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Logo URL
              </label>
              <input
                type="url"
                value={whiteLabelLogo}
                onChange={(e) => setWhiteLabelLogo(e.target.value)}
                placeholder="https://your-logo-url.com/logo.png"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Optional. If not set, your business name will be shown.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Domain
              </label>
              <input
                type="text"
                value={whiteLabelDomain}
                onChange={(e) => setWhiteLabelDomain(e.target.value)}
                placeholder="portal.yourdomain.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Optional. Custom domain for your client portal.
              </p>
            </div>
          </>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : saved ? "Saved! ✅" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}