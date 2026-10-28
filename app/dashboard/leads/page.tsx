"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, MapPin, Building, Star, Phone, Mail, Download, Globe, X, AlertTriangle } from "lucide-react";

interface Business {
  id: string;
  name: string;
  businessType: string;
  location: string;
  rating: string | null;
  reviewCount: number | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  hasWebsite: boolean;
  websiteUrl: string | null;
  socialLinks: { instagram: string | null; facebook: string | null } | null;
  priceRange: string | null;
  openNow: boolean | null;
  sample?: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  noWebsiteCount: number;
  nextPageToken: string | null;
}

interface SearchMeta {
  query: string;
  location: string;
  demo: boolean;
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

function dedupeById(prev: Business[], incoming: Business[]): Business[] {
  const seen = new Set(prev.map((b) => b.id));
  return [...prev, ...incoming.filter((b) => !seen.has(b.id))];
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "leads";
}

export default function LeadsPage() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [results, setResults] = useState<Business[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [searchMeta, setSearchMeta] = useState<SearchMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notConfigured, setNotConfigured] = useState(false);
  const [demoActive, setDemoActive] = useState(false);
  const [exporting, setExporting] = useState(false);

  const demoRef = useRef(false);
  useEffect(() => {
    demoRef.current = demoActive;
  }, [demoActive]);

  const performSearch = useCallback(
    async (q: string, loc: string, isDemo: boolean, token?: string, append?: boolean) => {
      if (!q.trim()) return;
      setLoading(true);
      setError("");
      setNotConfigured(false);
      const searchLocation = loc.trim() || "Austin, TX";
      try {
        const params = new URLSearchParams({
          query: q.trim(),
          location: searchLocation,
          limit: "20",
        });
        if (isDemo) params.set("demo", "1");
        if (token) params.set("pageToken", token);

        const res = await fetch(`/api/leads?${params}`);
        const data = await res.json();

        if (res.status === 503 && data?.status === "not_configured") {
          setNotConfigured(true);
          setResults([]);
          setPagination(null);
          setSearchMeta(null);
          return;
        }
        if (!res.ok) throw new Error(data?.error || "Failed to fetch leads");

        const demo = Boolean(data.demo);
        setDemoActive(demo);
        demoRef.current = demo;
        setResults((prev) => (append ? dedupeById(prev, data.results) : data.results));
        setPagination(data.pagination);
        setSearchMeta({ query: q.trim(), location: searchLocation, demo });
      } catch (e: any) {
        setError(e.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const searchWith = useCallback(
    (q: string, loc: string) => performSearch(q, loc, demoRef.current),
    [performSearch]
  );

  const demoPreview = useCallback(() => {
    if (!query.trim()) return;
    setDemoActive(true);
    demoRef.current = true;
    performSearch(query.trim(), location, true);
  }, [query, location, performSearch]);

  const exitDemo = useCallback(() => {
    setDemoActive(false);
    demoRef.current = false;
    setResults([]);
    setPagination(null);
    setSearchMeta(null);
    setNotConfigured(false);
  }, []);

  const loadMore = useCallback(() => {
    if (!searchMeta || !pagination?.nextPageToken) return;
    performSearch(searchMeta.query, searchMeta.location, searchMeta.demo, pagination.nextPageToken, true);
  }, [searchMeta, pagination?.nextPageToken, performSearch]);

  const exportCSV = useCallback(async () => {
    if (!searchMeta?.query.trim() || results.length === 0) return;
    setExporting(true);
    try {
      const params = new URLSearchParams({
        query: searchMeta.query,
        location: searchMeta.location,
        format: "csv",
      });
      if (searchMeta.demo) params.set("demo", "1");
      const res = await fetch(`/api/leads?${params}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${searchMeta.demo ? "sample-" : ""}leads-${slugify(searchMeta.query)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message || "Export failed");
    } finally {
      setExporting(false);
    }
  }, [searchMeta, results.length]);

  const noWebsiteCount = results.filter((b) => !b.hasWebsite).length;
  const showingDemo = searchMeta?.demo && results.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-gray-900">Lead Finder</h1>
        <p className="mt-1 text-sm text-gray-500">
          Find local businesses without websites. Real results are looked up live from Google Places and filtered to
          the ones showing no website.
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
              onKeyDown={(e) => e.key === "Enter" && searchWith(query, location)}
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
              onKeyDown={(e) => e.key === "Enter" && searchWith(query, location)}
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
            onClick={() => searchWith(query, location)}
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
                  onClick={() => {
                    setQuery(s.label);
                    performSearch(s.label, location, demoRef.current);
                  }}
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
                  onClick={() => {
                    setLocation(loc);
                    if (query.trim()) performSearch(query.trim(), loc, demoRef.current);
                  }}
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

      {notConfigured && !loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-heading text-sm font-bold text-amber-900">Lead search is not connected yet</h3>
              <p className="mt-1 text-sm text-amber-700 leading-relaxed">
                Live results are looked up from Google Places in real time. The search key hasn&apos;t been added yet, so
                no real searches can run. You can preview the layout with clearly labelled sample data below.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={demoPreview}
                  disabled={loading || !query.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 ring-1 ring-amber-300 transition-all disabled:opacity-50"
                >
                  <Building className="h-3.5 w-3.5" />
                  Preview with sample data
                </button>
                <span className="text-xs text-amber-600">Results will be labelled &quot;Sample data — not real businesses&quot;.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showingDemo && (
        <div className="bg-amber-100 border border-amber-300 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Sample data — not real businesses
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-amber-700">Live results will appear once Google Places is connected.</span>
            <button
              onClick={exitDemo}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold text-amber-800 bg-amber-200 hover:bg-amber-300 transition-all"
            >
              <X className="h-3 w-3" /> Exit sample preview
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
          <div className="animate-spin h-8 w-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4" />
          <p className="text-sm text-gray-500 font-medium">Searching for leads...</p>
          <p className="text-xs text-gray-400 mt-1">Looking up real businesses near you</p>
        </div>
      )}

      {results.length > 0 && !loading && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-50 rounded-xl px-4 py-2">
                <p className="text-xs text-gray-500">Total results</p>
                <p className="font-heading text-xl font-extrabold text-gray-900">{results.length}</p>
              </div>
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl px-4 py-2">
                <p className="text-xs text-gray-500">No website</p>
                <p className="font-heading text-xl font-extrabold text-indigo-600">{noWebsiteCount}</p>
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
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((b) => (
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
                  <div className="flex shrink-0 items-center gap-1.5">
                    {!b.hasWebsite && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold bg-indigo-50 text-indigo-600">
                        No website
                      </span>
                    )}
                    {b.sample && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9.5px] font-bold bg-amber-50 text-amber-600 ring-1 ring-amber-200">
                        Sample
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <div className="flex items-center gap-1 text-[11px]">
                    <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                    <span className="font-bold text-gray-700">{b.rating ?? "—"}</span>
                    {b.reviewCount !== null && <span className="text-gray-400">({b.reviewCount})</span>}
                  </div>
                  <span className="text-gray-200">.</span>
                  <span className="text-[11px] text-gray-500">{b.priceRange ?? "—"}</span>
                  {b.openNow === true && (
                    <>
                      <span className="text-gray-200">.</span>
                      <span className="text-[10px] font-bold text-emerald-600">Open now</span>
                    </>
                  )}
                </div>

                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-[11px]">
                    <Phone className={`h-3 w-3 shrink-0 ${b.phone ? "text-gray-400" : "text-gray-200"}`} />
                    <span className={b.phone ? "text-gray-500" : "text-gray-300 italic"}>{b.phone ?? "Not listed"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <Mail className={`h-3 w-3 shrink-0 ${b.email ? "text-gray-400" : "text-gray-200"}`} />
                    <span className={`truncate ${b.email ? "text-gray-500" : "text-gray-300 italic"}`}>
                      {b.email ?? "Not listed"}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-[11px]">
                    <MapPin className={`h-3 w-3 shrink-0 mt-0.5 ${b.address ? "text-gray-400" : "text-gray-200"}`} />
                    <span className={`line-clamp-1 ${b.address ? "text-gray-500" : "text-gray-300 italic"}`}>
                      {b.address ?? "Not listed"}
                    </span>
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
                  {b.socialLinks?.instagram && (
                    <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-pink-600 bg-pink-50">
                      <Globe className="h-2.5 w-2.5" /> Insta
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {pagination?.nextPageToken && (
            <div className="flex items-center justify-center bg-white rounded-2xl p-4 border border-gray-100">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:brightness-110 transition-all disabled:opacity-50"
              >
                {loading ? "Loading..." : "Load more results"}
              </button>
            </div>
          )}
        </>
      )}

      {!results.length && !loading && !error && !notConfigured && (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
          <Building className="h-12 w-12 text-gray-200 mx-auto mb-4" />
          <p className="text-sm text-gray-500 font-medium">Search for leads to get started</p>
          <p className="text-xs text-gray-400 mt-1">Enter a business type and location above</p>
        </div>
      )}
    </div>
  );
}