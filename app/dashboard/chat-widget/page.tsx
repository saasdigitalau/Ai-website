"use client";

import { useState, useEffect } from "react";
import { MessageCircle, Globe, Copy, Check, ChevronDown, ChevronUp, Settings, Palette, ArrowLeft } from "lucide-react";

interface Language {
  code: string;
  name: string;
  native: string;
}

interface WidgetConfig {
  primaryColor: string;
  position: string;
  greeting: string;
  language: string;
}

export default function ChatWidgetPage() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLang, setSelectedLang] = useState("en");
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [showTranslations, setShowTranslations] = useState(false);
  const [copied, setCopied] = useState(false);
  const [embedCode, setEmbedCode] = useState("");
  const [config, setConfig] = useState<WidgetConfig>({
    primaryColor: "#6366f1",
    position: "right",
    greeting: "Hi! Thanks for visiting. How can I help?",
    language: "en",
  });

  useEffect(() => {
    fetch("/api/chat-widget?type=languages")
      .then((r) => r.json())
      .then((data) => setLanguages(data.languages))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadTranslations = async (lang: string) => {
    try {
      const res = await fetch("/api/chat-widget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang }),
      });
      const data = await res.json();
      if (res.ok) setTranslations(data.translations);
    } catch {}
  };

  const handleLanguageChange = (code: string) => {
    setSelectedLang(code);
    setConfig((prev) => ({ ...prev, language: code }));
    loadTranslations(code);
  };

  const generateEmbed = async () => {
    // For demo purposes, use a placeholder website ID
    const demoWebsiteId = "demo-site";
    try {
      const res = await fetch("/api/chat-widget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteId: demoWebsiteId,
          widgetConfig: config,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setEmbedCode(data.embedCode);
        setTranslations(data.preview?.widget || {});
      }
    } catch {}
  };

  const copyEmbed = () => {
    if (embedCode) {
      navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currentLang = languages.find((l) => l.code === selectedLang);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-indigo-500" />
        <h1 className="font-heading text-2xl font-extrabold text-gray-900">Chat Widget & Languages</h1>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Widget Configuration */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-heading text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="h-4 w-4 text-indigo-500" /> Widget Settings
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) => setConfig((prev) => ({ ...prev, primaryColor: e.target.value }))}
                    className="h-10 w-16 rounded-xl border border-gray-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.primaryColor}
                    onChange={(e) => setConfig((prev) => ({ ...prev, primaryColor: e.target.value }))}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-mono outline-none focus:border-indigo-300"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Position</label>
                <div className="flex gap-2">
                  {["right", "left"].map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setConfig((prev) => ({ ...prev, position: pos }))}
                      className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        config.position === pos
                          ? "bg-indigo-50 text-indigo-600 ring-2 ring-indigo-200"
                          : "bg-gray-50 text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {pos === "right" ? "Right" : "Left"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Greeting Message</label>
                <input
                  type="text"
                  value={config.greeting}
                  onChange={(e) => setConfig((prev) => ({ ...prev, greeting: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm outline-none focus:border-indigo-300"
                />
              </div>
              <button
                onClick={generateEmbed}
                className="w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:brightness-110 transition-all shadow-md"
              >
                Generate Embed Code
              </button>
            </div>
          </div>

          {embedCode && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading text-sm font-bold text-gray-900">Embed Code</h3>
                <button
                  onClick={copyEmbed}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-all"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 text-[10px] font-mono leading-relaxed overflow-x-auto max-h-40 overflow-y-auto">
                {embedCode}
              </pre>
              <p className="mt-2 text-[10px] text-gray-400">
                Add this code to your website's &lt;head&gt; section before the closing &lt;/head&gt; tag.
              </p>
            </div>
          )}
        </div>

        {/* Language & Translation */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-heading text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Globe className="h-4 w-4 text-indigo-500" /> Multi-Language Support
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Widget Language</label>
                <select
                  value={selectedLang}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm outline-none focus:border-indigo-300"
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.native} ({lang.name})
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setShowTranslations(!showTranslations)}
                className="self-end px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-50 ring-1 ring-gray-200 hover:bg-gray-100 transition-all"
              >
                {showTranslations ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>

            {currentLang && (
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50">
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 mb-1">Selected</p>
                <p className="font-heading text-lg font-extrabold text-gray-900">{currentLang.native}</p>
                <p className="text-xs text-gray-500">{currentLang.name}</p>
              </div>
            )}

            {showTranslations && Object.keys(translations).length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Preview Translations</p>
                {Object.entries(translations).slice(0, 4).map(([en, translated]) => (
                  <div key={en} className="rounded-xl bg-gray-50 p-3">
                    <p className="text-[10px] text-gray-400 mb-0.5">{en}</p>
                    <p className="text-sm font-medium text-gray-900">{translated}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Widget Preview */}
          {embedCode && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-heading text-sm font-bold text-gray-900 mb-3">Widget Preview</h3>
              <div className="rounded-xl p-6" style={{ background: "#f8fafc" }}>
                <div className="max-w-sm mx-auto space-y-3">
                  <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ borderBottomLeftRadius: "4px" }}>
                    <p className="text-sm text-gray-700">{translations["Hi! Thanks for visiting. How can I help?"] || config.greeting}</p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={translations["Type your message here..."] || "Type your message here..."}
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm"
                      disabled
                    />
                    <button
                      className="px-4 py-2 rounded-xl text-sm font-bold text-white"
                      style={{ background: config.primaryColor }}
                    >
                      {translations["Send"] || "Send"}
                    </button>
                  </div>
                  <p className="text-[9px] text-center text-gray-400">{translations["Powered by SiteLaunch"] || "Powered by SiteLaunch"}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
          <Globe className="h-12 w-12 text-gray-200 mx-auto mb-4" />
          <p className="text-sm text-gray-500">Loading languages...</p>
        </div>
      )}
    </div>
  );
}