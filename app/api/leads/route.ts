import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Lead Finder API
//
// Live results are looked up from the Google Places API (Text Search), behind
// the GOOGLE_PLACES_API_KEY env var. When that key is not configured we return
// an explicit "not_configured" response (503) — we never invent businesses,
// phone numbers, emails, addresses, ratings or review counts.
//
// Demo mode is strictly opt-in: the client must pass demo=1 (the dashboard
// only sends it after the user clicks a clearly labelled "Preview with sample
// data" button). Every demo payload carries { demo: true } with each lead
// marked sample: true, and the UI is required to show a persistent
// "Sample data — not real businesses" banner while demo results are visible.
//
// Google Places does not provide email addresses or social links. Those fields
// are returned as null and the UI renders "Not listed" — nothing is fabricated
// to fill them in.
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";

const PLACES_API = "https://places.googleapis.com/v1/places:searchText";

const PLACES_FIELDS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.currentOpeningHours",
  "places.types",
  "places.businessStatus",
  "nextPageToken",
].join(",");

interface PlacesResult {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  currentOpeningHours?: { openNow?: boolean };
  types?: string[];
  businessStatus?: string;
}

export interface Lead {
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
  socialLinks: { instagram: null; facebook: null };
  priceRange: string | null;
  openNow: boolean | null;
  sample: boolean;
}

const PRICE_LEVELS: Record<string, string> = {
  PRICE_LEVEL_FREE: "Free",
  PRICE_LEVEL_INEXPENSIVE: "$",
  PRICE_LEVEL_MODERATE: "$$",
  PRICE_LEVEL_EXPENSIVE: "$$$",
  PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
};

function prettifyType(raw: string): string {
  return raw
    .split("_")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

function mapPlace(place: PlacesResult, location: string): Lead {
  const name = place.displayName?.text?.trim() || "Unnamed business";
  const websiteUrl = place.websiteUri || null;
  return {
    id: place.id || `place-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name,
    businessType: place.types && place.types.length > 0 ? prettifyType(place.types[0]) : "Local business",
    location,
    rating: typeof place.rating === "number" ? place.rating.toFixed(1) : null,
    reviewCount: typeof place.userRatingCount === "number" ? place.userRatingCount : null,
    phone: place.internationalPhoneNumber || null,
    email: null, // Google Places does not provide email addresses.
    address: place.formattedAddress || null,
    hasWebsite: Boolean(websiteUrl),
    websiteUrl,
    socialLinks: { instagram: null, facebook: null }, // Not available from Google Places — never invented.
    priceRange: PRICE_LEVELS[place.priceLevel ?? ""] ?? null,
    openNow: typeof place.currentOpeningHours?.openNow === "boolean" ? place.currentOpeningHours.openNow : null,
    sample: false,
  };
}

class NotConfiguredError extends Error {
  constructor() {
    super("Lead search is not configured yet.");
    this.name = "NotConfiguredError";
  }
}

// A failed call to the Google Places API. Kept as a distinct type so the
// handler can return a short, user-safe error instead of leaking Google's
// raw response body (which can contain keys/scope details) to the client.
class PlacesApiError extends Error {
  status: number;
  constructor(status: number) {
    super(`Google Places lookup failed (${status}).`);
    this.name = "PlacesApiError";
    this.status = status;
  }
}

function isPlacesConfigError(status: number): boolean {
  // 401/403 mean the API key is missing, invalid, not enabled, or out of
  // quota — a configuration problem, so we surface the "not connected" state.
  return status === 401 || status === 403;
}

async function fetchFromGooglePlaces(
  textQuery: string,
  location: string,
  pageToken?: string
): Promise<{ leads: Lead[]; nextPageToken: string | null }> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new NotConfiguredError();

  const body: Record<string, unknown> = { textQuery, pageSize: 20 };
  if (pageToken) body.pageToken = pageToken;

  const res = await fetch(PLACES_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": PLACES_FIELDS,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    // Log the full response server-side for debugging; never send it to the browser.
    console.error(`Google Places API error ${res.status}: ${detail.slice(0, 500) || res.statusText}`);
    throw new PlacesApiError(res.status);
  }

  const data = await res.json();
  const leads: Lead[] = (Array.isArray(data.places) ? data.places : []).map((p: PlacesResult) =>
    mapPlace(p, location)
  );
  const nextPageToken: string | null = typeof data.nextPageToken === "string" ? data.nextPageToken : null;
  return { leads, nextPageToken };
}

// ---------------------------------------------------------------------------
// Opt-in sample data. Served ONLY when the client explicitly requests demo=1.
// Every lead is sample: true, and the UI shows a persistent
// "Sample data — not real businesses" banner while these are visible. Demo
// rows use clearly fictional details (555 phone numbers, example.com email
// domains) so they can never be mistaken for real businesses.
// ---------------------------------------------------------------------------

const DEMO_LEADS: Omit<Lead, "sample">[] = [
  {
    id: "sample-1",
    name: "Example Coffee Shop",
    businessType: "Cafe",
    location: "Austin, TX",
    rating: "4.6",
    reviewCount: 212,
    phone: "(555) 010-1201",
    email: "hello@example-coffee.com",
    address: "123 Sample St, Austin, TX",
    hasWebsite: false,
    websiteUrl: null,
    socialLinks: { instagram: null, facebook: null },
    priceRange: "$",
    openNow: true,
  },
  {
    id: "sample-2",
    name: "Example Yoga Studio",
    businessType: "Yoga Studio",
    location: "Austin, TX",
    rating: "4.8",
    reviewCount: 96,
    phone: "(555) 010-1202",
    email: "hello@example-yoga.com",
    address: "456 Sample Ave, Austin, TX",
    hasWebsite: false,
    websiteUrl: null,
    socialLinks: { instagram: null, facebook: null },
    priceRange: "$$",
    openNow: null,
  },
  {
    id: "sample-3",
    name: "Example Hair Salon",
    businessType: "Hair Salon",
    location: "Austin, TX",
    rating: "4.3",
    reviewCount: 150,
    phone: "(555) 010-1203",
    email: "hello@example-salon.com",
    address: "789 Sample Blvd, Austin, TX",
    hasWebsite: false,
    websiteUrl: null,
    socialLinks: { instagram: null, facebook: null },
    priceRange: "$$",
    openNow: false,
  },
  {
    id: "sample-4",
    name: "Example Dental Clinic",
    businessType: "Dentist",
    location: "Austin, TX",
    rating: "4.9",
    reviewCount: 310,
    phone: "(555) 010-1204",
    email: "hello@example-dental.com",
    address: "101 Sample Rd, Austin, TX",
    hasWebsite: true,
    websiteUrl: "https://example-dental.com",
    socialLinks: { instagram: null, facebook: null },
    priceRange: "$$$",
    openNow: null,
  },
  {
    id: "sample-5",
    name: "Example Gym",
    businessType: "Gym",
    location: "Austin, TX",
    rating: "4.5",
    reviewCount: 278,
    phone: "(555) 010-1205",
    email: "hello@example-gym.com",
    address: "222 Sample Dr, Austin, TX",
    hasWebsite: false,
    websiteUrl: null,
    socialLinks: { instagram: null, facebook: null },
    priceRange: "$$",
    openNow: true,
  },
  {
    id: "sample-6",
    name: "Example Pet Services",
    businessType: "Pet Services",
    location: "Austin, TX",
    rating: "4.7",
    reviewCount: 64,
    phone: "(555) 010-1206",
    email: "hello@example-pets.com",
    address: "333 Sample Ln, Austin, TX",
    hasWebsite: true,
    websiteUrl: "https://example-pets.com",
    socialLinks: { instagram: null, facebook: null },
    priceRange: "$",
    openNow: null,
  },
];

function demoLeads(query: string, location: string): Lead[] {
  return DEMO_LEADS.map((l) => ({ ...l, location: location || l.location, sample: true })).filter((l) => {
    const q = query.toLowerCase();
    if (!q) return true;
    return l.name.toLowerCase().includes(q) || l.businessType.toLowerCase().includes(q);
  });
}

function toCSV(leads: Lead[], demo: boolean): string {
  const header =
    "Name,Business Type,Location,Rating,Reviews,Phone,Email,Address,Has Website,Website URL,Price Range,Open Now";
  const rows = leads.map((b) =>
    [
      `"${b.name}"`,
      `"${b.businessType}"`,
      `"${b.location}"`,
      b.rating ?? "",
      b.reviewCount ?? "",
      `"${b.phone ?? ""}"`,
      `"${b.email ?? ""}"`,
      `"${b.address ?? ""}"`,
      b.hasWebsite ? "Yes" : "No",
      b.websiteUrl ?? "",
      b.priceRange ?? "",
      b.openNow === null ? "" : b.openNow ? "Yes" : "No",
    ].join(",")
  );
  const sampleMarker = demo ? "# SAMPLE DATA - NOT REAL BUSINESSES\n" : "";
  return sampleMarker + header + "\n" + rows.join("\n");
}

function sanitizeSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "leads";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim() || "";
    const location = searchParams.get("location")?.trim() || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10) || 20, 20);
    const pageToken = searchParams.get("pageToken") || undefined;
    const format = searchParams.get("format");
    const demo = searchParams.get("demo") === "1";

    if (!query) {
      return NextResponse.json({ status: "error", error: "Enter a business type to search." }, { status: 400 });
    }

    // ---- Opt-in demo mode (explicit demo=1 from the labelled UI button) ----
    if (demo) {
      const leads = demoLeads(query, location).slice(0, limit);
      const noWebsiteCount = leads.filter((b) => !b.hasWebsite).length;
      if (format === "csv") {
        return new NextResponse(toCSV(leads, true), {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="sample-leads-${sanitizeSlug(query)}.csv"`,
          },
        });
      }
      return NextResponse.json({
        status: "ok",
        demo: true,
        results: leads,
        pagination: {
          page: 1,
          limit,
          total: leads.length,
          totalPages: 1,
          noWebsiteCount,
          nextPageToken: null,
        },
        query,
        location: location || "Austin, TX",
      });
    }

    // ---- Live provider: Google Places (GOOGLE_PLACES_API_KEY) ----
    let leads: Lead[] = [];
    let nextPageToken: string | null = null;
    try {
      const textQuery = location ? `${query} in ${location}` : query;
      const fetched = await fetchFromGooglePlaces(textQuery, location || "Austin, TX", pageToken);
      leads = fetched.leads;
      nextPageToken = fetched.nextPageToken;
    } catch (err) {
      if (err instanceof NotConfiguredError) {
        return NextResponse.json(
          {
            status: "not_configured",
            error:
              "Lead search is not connected yet. Live results are looked up from Google Places once the search key is configured.",
          },
          { status: 503 }
        );
      }
      if (err instanceof PlacesApiError) {
        if (isPlacesConfigError(err.status)) {
          return NextResponse.json(
            {
              status: "not_configured",
              error:
                "Lead search is not connected yet. The Google Places search key is missing, invalid, or has run out of quota — check the configured key and try again.",
            },
            { status: 503 }
          );
        }
        return NextResponse.json({ status: "error", error: err.message }, { status: 502 });
      }
      throw err;
    }

    // Businesses showing no website first — that is the point of the tool.
    leads.sort((a, b) => Number(a.hasWebsite) - Number(b.hasWebsite));
    const pageLeads = leads.slice(0, limit);
    const noWebsiteCount = pageLeads.filter((b) => !b.hasWebsite).length;

    if (format === "csv") {
      return new NextResponse(toCSV(pageLeads, false), {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="leads-${sanitizeSlug(query)}-${sanitizeSlug(location || "local")}.csv"`,
        },
      });
    }

    // Best-effort: record the search for future CRM use when auth + DB exist.
    try {
      const { userId } = await auth();
      if (userId) {
        const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } });
        if (dbUser) {
          await prisma.leadSearch.create({
            data: {
              userId: dbUser.id,
              query,
              location: location || null,
              results: pageLeads as unknown as Prisma.InputJsonValue,
              count: pageLeads.length,
            },
          });
        }
      }
    } catch {
      /* auth or DB not configured — searching still works */
    }

    return NextResponse.json({
      status: "ok",
      demo: false,
      results: pageLeads,
      pagination: {
        page: 1,
        limit,
        total: pageLeads.length,
        totalPages: 1,
        noWebsiteCount,
        nextPageToken,
      },
      query,
      location: location || "Austin, TX",
    });
  } catch (error) {
    console.error("Leads API error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch leads.";
    return NextResponse.json({ status: "error", error: `Failed to fetch leads: ${message}` }, { status: 502 });
  }
}