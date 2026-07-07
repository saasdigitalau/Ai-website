"use client";

import { useState, useCallback } from "react";
import { Search, MapPin, Building, Star, Phone, Mail, Download, Camera, Globe, X } from "lucide-react";

interface Business {
  id: string;
  name: string;
  businessType: string;
  location: string;
  rating: string;
  reviewCount: number;
  phone: string;
  email: string;
  address: string;
  hasWebsite: boolean;
  websiteUrl: string | null;
  socialLinks: { instagram: string | null; facebook: string | null };
  priceRange: string;
  openNow: boolean;
}

interface SearchResult {
  results: Business[];
  pagination: { page: number; limit: number; total: number; totalPages: number; noWebsiteCount: number };
  query: string;
  location: string;
}

const SUGGESTIONS = [
  { label: "Restaurants", icon: "restaurant" },
  { label: "Gyms & Fitness", icon: "gym" },
  { label: "Salons & Spas", icon: "salon" },
  { label: "Dentists", icon: "dentist" },
  { label: "Yoga Studios", icon: "yoga" },
  { label: "Boutiques", icon: "shop" },
  { label: "Cafes & Bakeries", icon: "cafe" },
  { label: "Pet Services", icon: "pet" },
];

const LOCATIONS = [
  "Austin, TX", "Los Angeles, CA", "New York, NY", "San Francisco, CA", "Miami, FL",
  "Chicago, IL", "Denver, CO", "Seattle, WA", "Portland, OR", "Nashville, TN",
];

export default function LeadsPage() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);

  const searchLeads = useCallback(async (p: number = 1) => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setPage(p);
    try {
      const params = new URLSearchParams({
        query: query.trim(),
        location: location.trim() || "Austin, TX",
        page: String(p),
        limit: "20",
      });
      const res = await fetch(`/api/leads?${params}`);
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to fetch leads");
      }
      setResults(await res.json());
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [query, location]);

  const exportCSV = useCallback(async () => {
    if (!query.trim() || !results) return;
    setExporting(true);
    try {
      const params = new URLSearchParams({
        query: query.trim(),
        location: location.trim() || "Austin, TX",
        format: "csv",
      });
      const res = await fetch(`/api/leads?${params}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-${query.trim().toLowerCase().replace(/\s+/g, "-")}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message || "Export failed");
    } finally {
      setExporting(false);
    }
  }, [query, location, results]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-gray-900">Lead Finder</h1>
        <p className="mt-1 text-sm text-gray-500">
          Find local businesses without websites. Search by business type and location to discover your next client.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3">
          <div className="relative">
            <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchLeads(1)}
              placeholder="Business type (e.g., Yoga studios, Dentists...)"
              className="w-full pl-10 pr-10 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-gray-300"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchLeads(1)}
              placeholder="Location (e.g., Austin, TX)"
              className="w-full pl-10 pr-10 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-gray-300"
            />
            {location && (
              <button onClick={() => setLocation("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => searchLeads(1)}
            disabled={loading || !query.trim()}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            <Search className="h-4 w-4" />
            Search
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Popular Searches</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => { setQuery(s.label); setTimeout(() => searchLeads(1), 100); }}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold text-gray-600 bg-gray-50 ring-1 ring-gray-200 hover:bg-indigo-50 hover:text-indigo-600 hover:ring-indigo-200 transition-all"
                >
                  <Building className="h-3 w-3" />
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Common Locations</p>
            <div className="flex flex-wrap gap-1.5">
              {LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  onClick={() => { setLocation(loc); if (query.trim()) setTimeout(() => searchLeads(1), 100); }}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
                    location === loc
                      ? "bg-indigo-100 text-indigo-600 ring-1 ring-indigo-200"
                      : "text-gray-600 bg-gray-50 ring-1 ring-gray-200 hover:bg-indigo-50 hover:text-indigo-600 hover:ring-indigo-200"
                  }`}
                >
                  <MapPin className="h-2.5 w-2.5" />
                  {loc}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-600 flex items-center gap-2">
          <X className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
          <div className="animate-spin h-8 w-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4" />
          <p className="text-sm text-gray-500 font-medium">Searching for leads...</p>
          <p className="text-xs text-gray-400 mt-1">Scanning business profiles near you</p>
        </div>
      )}

      {results && !loading && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-50 rounded-xl px-4 py-2">
                <p className="text-xs text-gray-500">Total results</p>
                <p className="font-heading text-xl font-extrabold text-gray-900">{results.pagination.total}</p>
              </div>
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl px-4 py-2">
                <p className="text-xs text-gray-500">No website</p>
                <p className="font-heading text-xl font-extrabold text-indigo-600">{results.pagination.noWebsiteCount}</p>
              </div>
              <button
                onClick={exportCSV}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:border-indigo-200 hover:text-indigo-600 transition-all disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                {exporting ? "Exporting..." : "Export CSV"}
              </button>
            </div>
            <div className="text-xs text-gray-400">{results.results.length} of {results.pagination.total} shown</div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.results.map((b) => (
              <div
                key={b.id}
                className={`bg-white rounded-2xl p-5 border transition-all hover:shadow-md ${
                  !b.hasWebsite ? "ring-2 ring-indigo-200 shadow-sm shadow-indigo-100/50" : "ring-1 ring-gray-100"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold shadow-sm">
                      {b.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-heading text-sm font-bold text-gray-900 truncate">{b.name}</h3>
                      <p className="text-[10.5px] text-gray-500">{b.businessType}</p>
                    </div>
                  </div>
                  {!b.hasWebsite && (
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold bg-indigo-50 text-indigo-600">
                      No website
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <div className="flex items-center gap-1 text-[11px]">
                    <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                    <span className="font-bold text-gray-700">{b.rating}</span>
                    <span className="text-gray-400">({b.reviewCount})</span>
                  </div>
                  <span className="text-gray-200">.</span>
                  <span className="text-[11px] text-gray-500">{b.priceRange}</span>
                  {b.openNow && (
                    <>
                      <span className="text-gray-200">.</span>
                      <span className="text-[10px] font-bold text-emerald-600">Open now</span>
                    </>
                  )}
                </div>

                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-[11px] text-gray-500">
                    <Phone className="h-3 w-3 shrink-0 text-gray-400" />
                    {b.phone}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-gray-500">
                    <Mail className="h-3 w-3 shrink-0 text-gray-400" />
                    <span className="truncate">{b.email}</span>
                  </div>
                  <div className="flex items-start gap-2 text-[11px] text-gray-500">
                    <MapPin className="h-3 w-3 shrink-0 mt-0.5 text-gray-400" />
                    <span className="line-clamp-1">{b.address}</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  {b.websiteUrl ? (
                    <a href={b.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-all">
                      <Globe className="h-2.5 w-2.5" /> Website
                    </a>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-gray-400 bg-gray-50 ring-1 ring-gray-100">
                      <Globe className="h-2.5 w-2.5" /> No site
                    </span>
                  )}
                  {b.socialLinks.instagram && (
                    <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-pink-600 bg-pink-50">
                      <Camera className="h-2.5 w-2.5" /> Insta
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {results.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-gray-100">
              <p className="text-xs text-gray-500">
                Page {results.pagination.page} of {results.pagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => searchLeads(page - 1)}
                  disabled={page <= 1}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:border-indigo-200 transition-all disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => searchLeads(page + 1)}
                  disabled={page >= results.pagination.totalPages}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:brightness-110 transition-all disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {!results && !loading && !error && (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
          <Building className="h-12 w-12 text-gray-200 mx-auto mb-4" />
          <p className="text-sm text-gray-500 font-medium">Search for leads to get started</p>
          <p className="text-xs text-gray-400 mt-1">Enter a business type and location above</p>
        </div>
      )}
    </div>
  );
}