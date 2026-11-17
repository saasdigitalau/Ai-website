// Shape of a single Lead Finder result. Shared by the API route and the
// providers so both return exactly the same fields.

// Where a lead came from. Demo rows carry no source at all — they are labelled
// sample data, not businesses from a provider.
export type LeadSource = "google_places" | "openstreetmap";

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
  source?: LeadSource;
}
