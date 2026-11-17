import type { Lead } from "@/lib/lead-finder-types";

// ---------------------------------------------------------------------------
// OpenStreetMap lead provider — no API key, no billing.
//
// Two public services, both free and keyless:
//   1. Nominatim turns the typed location ("Bondi, NSW") into coordinates.
//   2. Overpass returns the businesses OpenStreetMap has around those
//      coordinates, matched by the tags that describe the searched business
//      type (amenity/shop/craft/office/leisure).
//
// Everything returned here is a real OpenStreetMap entry. OpenStreetMap has no
// ratings or review counts, so those fields are null — nothing is invented.
// `hasWebsite` comes straight from the OSM website tag, which is exactly the
// signal this tool is looking for.
//
// OVERPASS_API_URL can point at a self-hosted or mirror Overpass instance; the
// default is the public one. NOMINATIM_URL is overridable for the same reason.
// ---------------------------------------------------------------------------

const OVERPASS_URL = process.env.OVERPASS_API_URL || "https://overpass-api.de/api/interpreter";
const NOMINATIM_URL = process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org/search";

// Both services ask for a descriptive User-Agent.
const USER_AGENT = "SiteLaunchAI/1.0 (local business lead finder)";

const SEARCH_RADIUS_METRES = 10_000;
const MAX_RESULTS = 60;
const GEOCODE_TTL_MS = 24 * 60 * 60 * 1000;

export class LocationNotFoundError extends Error {
  constructor(location: string) {
    super(`Couldn't find "${location}". Try a city or suburb name, like "Bondi, NSW" or "Austin, TX".`);
    this.name = "LocationNotFoundError";
  }
}

export class OpenStreetMapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenStreetMapError";
  }
}

// --- query → OSM tags ------------------------------------------------------

interface TagRule {
  keywords: string[];
  filters: string[];
}

// A searched business type mapped to the OpenStreetMap tags that describe it.
// The first rule with a keyword hit wins, so order matters.
const TAG_RULES: TagRule[] = [
  { keywords: ["restaurant", "bistro", "diner", "eatery"], filters: ['["amenity"="restaurant"]', '["amenity"="fast_food"]'] },
  { keywords: ["cafe", "coffee", "espresso"], filters: ['["amenity"="cafe"]'] },
  { keywords: ["bakery", "baker", "patisserie"], filters: ['["shop"="bakery"]', '["amenity"="cafe"]'] },
  { keywords: ["bar", "pub", "brewery", "tavern"], filters: ['["amenity"="bar"]', '["amenity"="pub"]'] },
  { keywords: ["takeaway", "takeout", "fastfood"], filters: ['["amenity"="fast_food"]'] },
  { keywords: ["gym", "fitness", "pilates", "crossfit"], filters: ['["leisure"="fitness_centre"]', '["leisure"="sports_centre"]'] },
  { keywords: ["yoga"], filters: ['["sport"="yoga"]', '["leisure"="fitness_centre"]'] },
  {
    keywords: ["salon", "hairdresser", "hair", "barber", "beauty", "nails", "spa", "massage"],
    filters: ['["shop"="hairdresser"]', '["shop"="beauty"]', '["shop"="nails"]', '["shop"="massage"]', '["leisure"="spa"]'],
  },
  { keywords: ["dentist", "dental"], filters: ['["amenity"="dentist"]', '["healthcare"="dentist"]'] },
  {
    keywords: ["doctor", "gp", "medical", "physio", "physiotherapy", "chiro", "chiropractor", "clinic"],
    filters: ['["amenity"="doctors"]', '["amenity"="clinic"]', '["healthcare"="physiotherapist"]', '["healthcare"="chiropractor"]'],
  },
  { keywords: ["vet", "veterinary", "veterinarian"], filters: ['["amenity"="veterinary"]'] },
  { keywords: ["pharmacy", "chemist"], filters: ['["amenity"="pharmacy"]'] },
  { keywords: ["lawyer", "solicitor", "attorney", "legal"], filters: ['["office"="lawyer"]'] },
  { keywords: ["accountant", "accounting", "bookkeeper", "bookkeeping", "tax"], filters: ['["office"="accountant"]', '["office"="tax_advisor"]'] },
  { keywords: ["realtor", "estate", "property"], filters: ['["office"="estate_agent"]'] },
  { keywords: ["plumber", "plumbing"], filters: ['["craft"="plumber"]'] },
  { keywords: ["electrician", "electrical"], filters: ['["craft"="electrician"]'] },
  { keywords: ["builder", "building", "carpenter", "renovation"], filters: ['["craft"="builder"]', '["craft"="carpenter"]'] },
  { keywords: ["painter", "painting"], filters: ['["craft"="painter"]'] },
  { keywords: ["photographer", "photography"], filters: ['["craft"="photographer"]', '["shop"="photo"]'] },
  { keywords: ["hotel", "motel", "guesthouse"], filters: ['["tourism"="hotel"]', '["tourism"="guest_house"]'] },
  { keywords: ["supermarket", "grocery", "grocer"], filters: ['["shop"="supermarket"]', '["shop"="convenience"]'] },
  { keywords: ["butcher", "butchery"], filters: ['["shop"="butcher"]'] },
  { keywords: ["florist", "flowers"], filters: ['["shop"="florist"]'] },
  { keywords: ["boutique", "clothing", "fashion", "retail", "shop", "store"], filters: ['["shop"="clothes"]', '["shop"="boutique"]'] },
  { keywords: ["mechanic", "automotive", "car", "panel", "tyre", "tire"], filters: ['["shop"="car_repair"]'] },
  { keywords: ["childcare", "kindergarten", "nursery"], filters: ['["amenity"="childcare"]', '["amenity"="kindergarten"]'] },
  { keywords: ["pet", "grooming"], filters: ['["shop"="pet"]', '["shop"="pet_grooming"]'] },
  { keywords: ["tattoo"], filters: ['["shop"="tattoo"]'] },
];

function singularise(word: string): string {
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith("ses") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) return word.slice(0, -1);
  return word;
}

function normaliseQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokensOf(query: string): Set<string> {
  const tokens = new Set<string>();
  for (const word of normaliseQuery(query).split(" ")) {
    if (!word) continue;
    tokens.add(word);
    tokens.add(singularise(word));
  }
  return tokens;
}

// The tag filters for the searched business type. When nothing in the table
// matches ("pizza", "floristry supplies"), fall back to searching the business
// name, which is what OpenStreetMap mappers actually write.
export function filtersForQuery(query: string): string[] {
  const tokens = tokensOf(query);
  for (const rule of TAG_RULES) {
    if (rule.keywords.some((keyword) => tokens.has(keyword))) return rule.filters;
  }
  const namePattern = normaliseQuery(query);
  if (!namePattern) return [];
  return [`["name"~"${namePattern}",i]`];
}

// --- geocoding (Nominatim) -------------------------------------------------

interface GeocodeCacheEntry {
  lat: number;
  lon: number;
  expires: number;
}

const geocodeCache = new Map<string, GeocodeCacheEntry>();

async function geocode(location: string): Promise<{ lat: number; lon: number }> {
  const cacheKey = normaliseQuery(location);
  const cached = geocodeCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return { lat: cached.lat, lon: cached.lon };

  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(location)}&format=jsonv2&limit=1`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new OpenStreetMapError("Couldn't reach OpenStreetMap to look up that location. Try again in a moment.");
  }
  if (!res.ok) {
    console.error(`Nominatim geocode failed (${res.status}) for "${location}"`);
    throw new OpenStreetMapError("Couldn't look up that location in OpenStreetMap right now. Try again in a moment.");
  }

  const data = await res.json().catch(() => null);
  const hit = Array.isArray(data) ? data[0] : null;
  const lat = hit ? Number.parseFloat(String(hit.lat)) : Number.NaN;
  const lon = hit ? Number.parseFloat(String(hit.lon)) : Number.NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new LocationNotFoundError(location);

  geocodeCache.set(cacheKey, { lat, lon, expires: Date.now() + GEOCODE_TTL_MS });
  return { lat, lon };
}

// --- Overpass query --------------------------------------------------------

export function buildOverpassQuery(filters: string[], lat: number, lon: number): string {
  const clauses = filters
    .map((filter) => `  nwr${filter}["name"](around:${SEARCH_RADIUS_METRES},${lat},${lon});`)
    .join("\n");
  return `[out:json][timeout:25];\n(\n${clauses}\n);\nout tags center ${MAX_RESULTS};`;
}

interface OverpassElement {
  type?: string;
  id?: number;
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

async function runOverpass(query: string): Promise<OverpassElement[]> {
  let res: Response;
  try {
    res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      body: new URLSearchParams({ data: query }).toString(),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new OpenStreetMapError("Couldn't reach OpenStreetMap's search service. Try again in a moment.");
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    // Log server-side only — the browser gets a short, honest message.
    console.error(`Overpass error ${res.status}: ${detail.slice(0, 500) || res.statusText}`);
    if (res.status === 429) {
      throw new OpenStreetMapError("OpenStreetMap is rate-limiting searches right now. Wait a few seconds and try again.");
    }
    throw new OpenStreetMapError("OpenStreetMap's search service didn't answer that search. Try again in a moment.");
  }

  const data: OverpassResponse | null = await res.json().catch(() => null);
  return Array.isArray(data?.elements) ? data.elements : [];
}

// --- mapping ---------------------------------------------------------------

const TYPE_TAGS = ["amenity", "shop", "craft", "office", "healthcare", "tourism", "leisure"] as const;

function prettifyType(raw: string): string {
  return raw
    .split("_")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

function businessTypeOf(tags: Record<string, string>): string {
  for (const key of TYPE_TAGS) {
    const value = tags[key];
    if (value) return prettifyType(value);
  }
  return "Local business";
}

function addressOf(tags: Record<string, string>): string | null {
  if (tags["addr:full"]) return tags["addr:full"];
  const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
  const parts = [street, tags["addr:suburb"], tags["addr:city"], tags["addr:postcode"], tags["addr:state"]].filter(
    (part) => part && part.trim().length > 0
  );
  return parts.length > 0 ? parts.join(", ") : null;
}

// OSM entries carry several tag spellings for the same detail.
function firstTag(tags: Record<string, string>, keys: string[]): string | null {
  for (const key of keys) {
    const value = tags[key];
    if (value && value.trim()) return value.trim();
  }
  return null;
}

function mapElement(element: OverpassElement, location: string): Lead | null {
  const tags = element.tags;
  if (!tags) return null;
  const name = tags.name?.trim();
  if (!name) return null;

  const websiteUrl = firstTag(tags, ["website", "contact:website", "url", "website:en"]);

  return {
    id: `osm-${element.type ?? "nwr"}-${element.id ?? name}`,
    name,
    businessType: businessTypeOf(tags),
    location,
    // OpenStreetMap has no ratings or review counts — never invented.
    rating: null,
    reviewCount: null,
    phone: firstTag(tags, ["phone", "contact:phone"]),
    email: firstTag(tags, ["email", "contact:email"]),
    address: addressOf(tags),
    hasWebsite: Boolean(websiteUrl),
    websiteUrl: websiteUrl || null,
    socialLinks: { instagram: null, facebook: null },
    priceRange: null,
    openNow: null,
    sample: false,
    source: "openstreetmap",
  };
}

/**
 * Real local businesses from OpenStreetMap for `query` around `location`.
 * Requires no API key. Throws LocationNotFoundError / OpenStreetMapError, which
 * the route turns into a short, honest message.
 */
export async function fetchFromOpenStreetMap(query: string, location: string): Promise<Lead[]> {
  const filters = filtersForQuery(query);
  if (filters.length === 0) return [];

  const { lat, lon } = await geocode(location);
  const elements = await runOverpass(buildOverpassQuery(filters, lat, lon));

  const seen = new Set<string>();
  const leads: Lead[] = [];
  for (const element of elements) {
    const lead = mapElement(element, location);
    if (!lead || seen.has(lead.id)) continue;
    seen.add(lead.id);
    leads.push(lead);
  }
  return leads;
}
