"use client";

import { useState, useEffect } from "react";

interface SnippetResult {
  platform: "instagram" | "twitter" | "linkedin" | "facebook";
  content: string;
  characterCount: number;
  hashtags: string[];
  tips: string;
}

interface ContentPreview {
  title: string;
  description: string;
  serviceCount: number;
  testimonialCount: number;
  hasContact: boolean;
}

interface SocialGeneratorProps {
  websiteId: string;
  html?: string;
  businessName?: string;
}

const PLATFORM_CONFIG = {
  instagram: {
    label: "Instagram",
    icon: "📸",
    color: "from-pink-500 to-purple-600",
    textColor: "text-pink-600",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
    maxChars: 2200,
  },
  twitter: {
    label: "Twitter / X",
    icon: "🐦",
    color: "from-blue-400 to-blue-600",
    textColor: "text-blue-500",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    maxChars: 280,
  },
  linkedin: {
    label: "LinkedIn",
    icon: "💼",
    color: "from-blue-600 to-blue-800",
    textColor: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    maxChars: 3000,
  },
  facebook: {
    label: "Facebook",
    icon: "👍",
    color: "from-blue-500 to-indigo-600",
    textColor: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    maxChars: 63206,
  },
};

export default function SocialSnippetGenerator({ websiteId, html, businessName }: SocialGeneratorProps) {
  const [snippets, setSnippets] = useState<SnippetResult[]>([]);
  const [contentPreview, setContentPreview] = useState<ContentPreview | null>(null);
  const [activePlatform, setActivePlatform] = useState<string>("instagram");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    // Load existing snippets
    fetch(`/api/generate-social?websiteId=${websiteId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.snippets?.length > 0) {
          setSnippets(data.snippets.map((s: any) => ({
            platform: s.platform,
            content: s.content,
            characterCount: s.characterCount,
            hashtags: s.hashtags?.split(", ") || [],
            tips: getDefaultTips(s.platform),
          })));
          setGenerated(true);
        }
      })
      .catch(() => {});
  }, [websiteId]);

  function getDefaultTips(platform: string): string {
    const tips: Record<string, string> = {
      instagram: "Add an eye-catching image. Best time: 9-11am EST.",
      twitter: "Keep it concise. Best time: 8-10am & 6-9pm EST.",
      linkedin: "Add a professional image. Best time: Tue-Thu 8-10am.",
      facebook: "Add a photo. Best time: 9am-1pm weekdays.",
    };
    return tips[platform] || "Post consistently!";
  }

  async function generateSnippets() {
    if (!html) return;
    setLoading(true);
    try {
      const res = await fetch("/api/generate-social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html, websiteId, businessName }),
      });
      if (res.ok) {
        const data = await res.json();
        setSnippets(data.snippets);
        setContentPreview(data.contentPreview);
        setGenerated(true);
        setActivePlatform(data.snippets[0]?.platform || "instagram");
      }
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const activeSnippet = snippets.find((s) => s.platform === activePlatform);
  const config = PLATFORM_CONFIG[activePlatform as keyof typeof PLATFORM_CONFIG];

  const charPercent = activeSnippet
    ? Math.min(100, Math.round((activeSnippet.characterCount / config.maxChars) * 100))
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Social Media Snippets</h2>
          <p className="text-sm text-gray-500 mt-1">
            Repurpose your site content into ready-to-post social media updates
          </p>
        </div>
        <button
          onClick={generateSnippets}
          disabled={loading || !html}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Generating...
            </>
          ) : generated ? (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Regenerate
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate Snippets
            </>
          )}
        </button>
      </div>

      {!generated && !html ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Content Available</h3>
          <p className="text-gray-500">Generate a website first to get social media snippets.</p>
        </div>
      ) : !generated ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Generate</h3>
          <p className="text-gray-500 mb-4">Create social media snippets from your website content</p>
          <button
            onClick={generateSnippets}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Snippets"}
          </button>
        </div>
      ) : (
        <>
          {/* Content Preview */}
          {contentPreview && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Content Detected</h3>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-700 font-medium">{contentPreview.title}</span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-500">{contentPreview.description.substring(0, 100)}...</span>
                <span className="text-gray-400">•</span>
                <span className="text-indigo-600">{contentPreview.serviceCount} services</span>
                {contentPreview.testimonialCount > 0 && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="text-emerald-600">{contentPreview.testimonialCount} testimonials</span>
                  </>
                )}
                {contentPreview.hasContact && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="text-amber-600">📞 Contact info</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Platform Selector */}
          <div className="grid grid-cols-4 gap-2">
            {snippets.map((snippet) => {
              const cfg = PLATFORM_CONFIG[snippet.platform];
              return (
                <button
                  key={snippet.platform}
                  onClick={() => setActivePlatform(snippet.platform)}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    activePlatform === snippet.platform
                      ? "border-indigo-500 bg-indigo-50 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <span className="text-2xl block mb-1">{cfg.icon}</span>
                  <span className={`text-xs font-semibold ${cfg.textColor}`}>{cfg.label}</span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    {snippet.characterCount}/{cfg.maxChars}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Snippet Display */}
          {activeSnippet && config && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Platform Header */}
              <div className={`bg-gradient-to-r ${config.color} p-4 text-white`}>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{config.icon}</span>
                  <div>
                    <h3 className="font-bold">{config.label}</h3>
                    <p className="text-xs opacity-80">{config.tips}</p>
                  </div>
                </div>
              </div>

              {/* Snippet Content */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Preview</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      charPercent > 90 ? "bg-red-100 text-red-700" :
                      charPercent > 70 ? "bg-amber-100 text-amber-700" :
                      "bg-green-100 text-green-700"
                    }`}>
                      {activeSnippet.characterCount} / {config.maxChars} chars
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(activeSnippet.content, activeSnippet.platform)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    {copiedId === activeSnippet.platform ? (
                      <>✅ Copied!</>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>

                {/* Character count bar */}
                <div className="w-full h-1.5 bg-gray-100 rounded-full mb-4 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      charPercent > 90 ? "bg-red-500" :
                      charPercent > 70 ? "bg-amber-500" :
                      "bg-green-500"
                    }`}
                    style={{ width: `${charPercent}%` }}
                  />
                </div>

                {/* The snippet */}
                <div className={`${config.bgColor} ${config.borderColor} border rounded-lg p-4`}>
                  <pre className="whitespace-pre-wrap text-sm font-sans text-gray-800 leading-relaxed">
                    {activeSnippet.content}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* All Snippets Quick View */}
          <details className="bg-white rounded-xl border border-gray-200">
            <summary className="p-4 cursor-pointer text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl">
              View All Snippets ({snippets.length})
            </summary>
            <div className="px-4 pb-4 space-y-3">
              {snippets.map((snippet) => {
                const cfg = PLATFORM_CONFIG[snippet.platform];
                return (
                  <div key={snippet.platform} className={`${cfg.bgColor} border ${cfg.borderColor} rounded-lg p-3`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">{cfg.icon} {cfg.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{snippet.characterCount} chars</span>
                        <button
                          onClick={() => copyToClipboard(snippet.content, `all-${snippet.platform}`)}
                          className="text-xs text-indigo-600 hover:text-indigo-700"
                        >
                          {copiedId === `all-${snippet.platform}` ? "✅ Copied" : "Copy"}
                        </button>
                      </div>
                    </div>
                    <pre className="whitespace-pre-wrap text-xs text-gray-700 font-sans line-clamp-3">
                      {snippet.content}
                    </pre>
                  </div>
                );
              })}
            </div>
          </details>
        </>
      )}
    </div>
  );
}