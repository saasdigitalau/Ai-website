"use client";

import { useState, useEffect } from "react";

interface SeoCheck {
  name: string;
  category: string;
  passed: boolean;
  weight: number;
  suggestion: string;
}

interface SeoData {
  score: number;
  checks: SeoCheck[];
  suggestions: string[];
  categoryScores: Record<string, number>;
  createdAt?: string;
}

interface SeoAnalyzerProps {
  websiteId: string;
  html?: string;
  autoAnalyze?: boolean;
}

export default function SeoAnalyzer({ websiteId, html, autoAnalyze }: SeoAnalyzerProps) {
  const [seoData, setSeoData] = useState<SeoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzingFromHtml, setAnalyzingFromHtml] = useState(false);
  const [customHtml, setCustomHtml] = useState("");

  useEffect(() => {
    // Load existing results
    fetch(`/api/analyze-seo?websiteId=${websiteId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) setSeoData(data);
      })
      .catch(() => {});
  }, [websiteId]);

  useEffect(() => {
    if (autoAnalyze && html && !seoData) {
      runAnalysis(html);
    }
  }, [autoAnalyze, html]);

  async function runAnalysis(htmlToAnalyze?: string) {
    const content = htmlToAnalyze || customHtml;
    if (!content) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: content, websiteId }),
      });
      if (res.ok) {
        const data = await res.json();
        setSeoData(data);
      } else {
        const err = await res.json();
        setError(err.error || "Analysis failed");
      }
    } catch {
      setError("Failed to connect to SEO analyzer");
    }
    setLoading(false);
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 50) return "text-amber-600";
    return "text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  const getCategoryIcon = (cat: string) => {
    const icons: Record<string, string> = {
      meta: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
      structure: "M4 6h16M4 10h16M4 14h16M4 18h16",
      images: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
      mobile: "M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z",
      speed: "M13 10V3L4 14h7v7l9-11h-7z",
      keywords: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    };
    return icons[cat] || icons.meta;
  };

  const formatCategoryName = (cat: string) => {
    const names: Record<string, string> = {
      meta: "Meta Tags",
      structure: "Headings",
      images: "Images",
      mobile: "Mobile",
      speed: "Speed",
      keywords: "Content",
    };
    return names[cat] || cat;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">SEO Analysis</h2>
        {seoData && !autoAnalyze && (
          <button
            onClick={() => runAnalysis()}
            disabled={loading || !customHtml}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Analyzing..." : "Run Analysis"}
          </button>
        )}
      </div>

      {/* Score Display */}
      {seoData ? (
        <>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-6">
              {/* Overall Score Circle */}
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="45" fill="none"
                    stroke="currentColor" strokeWidth="8"
                    strokeDasharray={`${seoData.score * 2.83} 283`}
                    className={getScoreColor(seoData.score)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-2xl font-bold ${getScoreColor(seoData.score)}`}>
                    {seoData.score}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  {seoData.score >= 80 ? "Great SEO! 🎉" : seoData.score >= 50 ? "Room for Improvement" : "Needs Work"}
                </p>
                <p className="text-sm text-gray-500">
                  {seoData.checks.filter(c => c.passed).length}/{seoData.checks.length} checks passed
                  {seoData.createdAt && ` • ${new Date(seoData.createdAt).toLocaleDateString()}`}
                </p>
              </div>
            </div>
          </div>

          {/* Category Scores */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(seoData.categoryScores).map(([cat, score]) => (
              <div key={cat} className="bg-white rounded-xl border border-gray-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getCategoryIcon(cat)} />
                  </svg>
                  <span className="text-xs font-medium text-gray-600">{formatCategoryName(cat)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden mr-2">
                    <div
                      className={`h-full rounded-full transition-all ${getScoreBg(score)}`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <span className={`text-sm font-bold ${getScoreColor(score)}`}>{score}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* Checklist */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">SEO Checklist</h3>
            <div className="space-y-3">
              {seoData.checks.map((check, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border ${
                    check.passed ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      check.passed ? "bg-green-500" : "bg-amber-500"
                    }`}>
                      {check.passed ? (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className={`font-medium text-sm ${check.passed ? "text-green-800" : "text-amber-800"}`}>
                        {check.name}
                        <span className="ml-2 text-xs font-normal opacity-75">
                          {check.passed ? "Passed" : "Needs attention"}
                        </span>
                      </p>
                      <p className="text-xs text-gray-600 mt-1">{check.suggestion}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Suggestions */}
          {seoData.suggestions.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Improvement Suggestions</h3>
              <ul className="space-y-2">
                {seoData.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          {html ? (
            <div className="py-8">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Analyze</h3>
              <p className="text-gray-500 mb-4">Click below to run an SEO analysis on this site</p>
              <button
                onClick={() => runAnalysis(html)}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Run SEO Analysis
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="py-8">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No SEO Data</h3>
              <p className="text-gray-500 mb-4">No previous analysis found. Paste HTML below and analyze.</p>
              <textarea
                value={customHtml}
                onChange={(e) => setCustomHtml(e.target.value)}
                placeholder="Paste HTML content to analyze..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 text-sm"
              />
              <button
                onClick={() => runAnalysis()}
                disabled={loading || !customHtml}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? "Analyzing..." : "Analyze HTML"}
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}