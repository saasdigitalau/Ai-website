"use client";

import { useState } from "react";
import { Palette, Sparkles, RefreshCw, Copy, Check, Building, RotateCcw } from "lucide-react";

interface BrandKit {
  logo: { svg: string; initials: string; style: string; businessType: string };
  colors: { palette: { name: string; mood: string; colors: string[] }; primary: string; secondary: string; accent: string; background: string; dark: string };
  typography: { headingFont: string; bodyFont: string; style: string };
  preview: { heading: string; subtitle: string; body: string };
}

export default function BrandKitPage() {
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("general");
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const generateBrandKit = async () => {
    if (!businessName.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/brand-kit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: businessName.trim(), businessType }),
      });
      const data = await res.json();
      if (res.ok) setBrandKit(data.brandKit);
      else setError(data.error || "Generation failed");
    } catch {
      setError("Failed to generate brand kit");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const BusinessTypes = [
    { value: "restaurant", label: "Restaurant / Cafe", icon: "\u{1F37D}\uFE0F" },
    { value: "gym", label: "Gym / Fitness", icon: "\u{1F4AA}" },
    { value: "salon", label: "Salon / Spa", icon: "\u{1F487}" },
    { value: "dentist", label: "Dentist", icon: "\u{1F9B7}" },
    { value: "yoga", label: "Yoga Studio", icon: "\u{1F9D8}" },
    { value: "general", label: "General / Other", icon: "\u{1F3E9}" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Palette className="h-5 w-5 text-indigo-500" />
        <h1 className="font-heading text-2xl font-extrabold text-gray-900">Brand Kit Generator</h1>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Business Name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generateBrandKit()}
              placeholder="e.g., Lotus & Linen Yoga"
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Type</label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
            >
              {BusinessTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={generateBrandKit}
            disabled={loading || !businessName.trim()}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:brightness-110 transition-all disabled:opacity-50 shadow-md"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-600">{error}</div>
      )}

      {brandKit && (
        <div className="space-y-6">
          {/* Logo Preview */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-bold text-gray-900">Logo</h2>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{brandKit.logo.style}</span>
            </div>
            <div className="flex items-center gap-6 p-6 rounded-2xl" style={{ background: brandKit.colors.background }}>
              <div dangerouslySetInnerHTML={{ __html: brandKit.logo.svg }} className="shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-heading text-2xl font-extrabold text-gray-900">{businessName}</h3>
                <p className="text-sm" style={{ color: brandKit.colors.dark }}>
                  {brandKit.logo.initials} &middot; {brandKit.logo.businessType}
                </p>
              </div>
            </div>
          </div>

          {/* Color Palette */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-bold text-gray-900">Color Palette</h2>
              <div className="text-right">
                <p className="font-heading text-sm font-bold text-gray-900">{brandKit.colors.palette.name}</p>
                <p className="text-[10px] text-gray-400">{brandKit.colors.palette.mood}</p>
              </div>
            </div>
            <div className="flex gap-3 mb-4">
              {brandKit.colors.palette.colors.map((color, i) => (
                <div key={i} className="flex-1">
                  <div
                    className="h-16 rounded-xl mb-1.5 ring-1 ring-black/5 cursor-pointer"
                    style={{ background: color }}
                    onClick={() => copyToClipboard(color)}
                    title="Click to copy"
                  />
                  <p className="text-[9px] font-mono text-gray-400 text-center truncate">{color}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Primary", color: brandKit.colors.primary },
                { label: "Secondary", color: brandKit.colors.secondary },
                { label: "Accent", color: brandKit.colors.accent },
                { label: "Background", color: brandKit.colors.background },
              ].map(({ label, color }) => (
                <button
                  key={label}
                  onClick={() => copyToClipboard(color)}
                  className="flex items-center gap-2 rounded-lg p-2.5 text-[10px] font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-all"
                >
                  <div className="w-4 h-4 rounded ring-1 ring-black/5 shrink-0" style={{ background: color }} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Typography */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-bold text-gray-900">Typography</h2>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{brandKit.typography.style}</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="p-4 rounded-xl bg-gray-50">
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Heading</p>
                <p className="text-2xl font-extrabold text-gray-900" style={{ fontFamily: brandKit.typography.headingFont }}>
                  {brandKit.typography.headingFont}
                </p>
                <p className="text-xs text-gray-500 mt-1">{brandKit.preview.heading}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50">
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Body</p>
                <p className="text-lg font-medium text-gray-900" style={{ fontFamily: brandKit.typography.bodyFont }}>
                  {brandKit.typography.bodyFont}
                </p>
                <p className="text-xs text-gray-500 mt-1">{brandKit.preview.body}</p>
              </div>
            </div>
          </div>

          {/* Preview Card */}
          <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            <div className="p-8" style={{ background: brandKit.colors.background }}>
              <div className="max-w-md mx-auto text-center">
                <div className="flex justify-center mb-4" dangerouslySetInnerHTML={{ __html: brandKit.logo.svg }} />
                <h2 className="font-heading text-3xl font-extrabold mb-2" style={{ fontFamily: brandKit.typography.headingFont, color: brandKit.colors.dark }}>
                  {brandKit.preview.heading}
                </h2>
                <p className="text-sm mb-4" style={{ fontFamily: brandKit.typography.bodyFont, color: brandKit.colors.secondary }}>
                  {brandKit.preview.subtitle}
                </p>
                <p className="text-xs leading-relaxed" style={{ fontFamily: brandKit.typography.bodyFont, color: brandKit.colors.dark }}>
                  {brandKit.preview.body}
                </p>
                <button
                  className="mt-4 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm hover:brightness-110 transition-all"
                  style={{ background: brandKit.colors.primary }}
                >
                  Get Started
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={generateBrandKit}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:brightness-110 transition-all shadow-md"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Regenerate
            </button>
            <button
              onClick={() => copyToClipboard(JSON.stringify(brandKit, null, 2))}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:border-indigo-200 transition-all"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy JSON"}
            </button>
          </div>
        </div>
      )}

      {!brandKit && !loading && !error && (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
          <Palette className="h-12 w-12 text-gray-200 mx-auto mb-4" />
          <p className="text-sm text-gray-500 font-medium">Generate a brand kit to get started</p>
          <p className="text-xs text-gray-400 mt-1">Logo, colors, and typography in one click</p>
        </div>
      )}
    </div>
  );
}