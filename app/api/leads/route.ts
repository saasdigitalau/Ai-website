import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// Mock business data for lead finder
const BUSINESS_TYPES: Record<string, string[]> = {
  restaurant: ["Italian", "Mexican", "Japanese", "Indian", "Thai", "American", "French", "Chinese", "Greek", "Vietnamese"],
  gym: ["CrossFit", "Yoga", "Pilates", "Weight Training", "Martial Arts", "Cycling", "Boxing", "Dance"],
  salon: ["Hair Salon", "Barbershop", "Nail Salon", "Day Spa", "Tanning Salon", "Brow & Lash Studio"],
  dentist: ["General Dentistry", "Orthodontics", "Pediatric Dentistry", "Cosmetic Dentistry", "Oral Surgery"],
  yoga: ["Hatha Yoga", "Vinyasa Yoga", "Hot Yoga", "Restorative Yoga", "Power Yoga", "Yin Yoga"],
  general: ["Boutique", "Cafe", "Baker", "Food Truck", "Fitness Coach", "Photographer", "Consultant", "Handyman", "Pet Services", "Tutoring"],
};

const LOCATIONS = [
  "Austin, TX", "Los Angeles, CA", "New York, NY", "Chicago, IL", "Miami, FL",
  "San Francisco, CA", "Seattle, WA", "Denver, CO", "Boston, MA", "Portland, OR",
  "Atlanta, GA", "Dallas, TX", "Houston, TX", "Phoenix, AZ", "San Diego, CA",
  "Nashville, TN", "Charlotte, NC", "Minneapolis, MN", "Tampa, FL", "Orlando, FL",
];

const FIRST_NAMES = ["Luna", "Oliver", "Aria", "Leo", "Mia", "Noah", "Zoe", "Liam", "Ivy", "Finn", "Ella", "Mason", "Stella", "Lucas", "Nova"];
const LAST_NAMES = ["Smith", "Rivera", "Chen", "Patel", "Kim", "Singh", "Johnson", "Garcia", "Brown", "Lee", "Davis", "Martinez", "Wilson", "Anderson", "Taylor"];

function generateMockBusinesses(type: string, location: string, count: number = 20) {
  const types = BUSINESS_TYPES[type] || BUSINESS_TYPES.general;
  const businesses = [];
  
  for (let i = 0; i < count; i++) {
    const bizType = types[i % types.length];
    const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const name = `${firstName}&#39;s ${bizType}`;
    const hasWebsite = Math.random() > 0.45; // ~55% without website
    
    businesses.push({
      id: `lead-${i + 1}-${Date.now()}`,
      name,
      businessType: bizType,
      location,
      rating: (3.5 + Math.random() * 1.5).toFixed(1),
      reviewCount: Math.floor(Math.random() * 150) + 5,
      phone: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, "0")}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${bizType.toLowerCase().replace(/\s+/g, "")}.com`,
      address: `${Math.floor(Math.random() * 9000) + 100} ${["Main St", "Oak Ave", "Maple Dr", "Broadway", "Park Blvd", "Cedar Ln", "Lake Dr", "River Rd", "Elm St", "Pine St"][Math.floor(Math.random() * 10)]}, ${location}`,
      hasWebsite,
      websiteUrl: hasWebsite ? `https://${name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com` : null,
      socialLinks: {
        instagram: Math.random() > 0.3 ? `@${name.toLowerCase().replace(/[^a-z0-9]/g, "")}` : null,
        facebook: Math.random() > 0.4 ? `${name.replace(/\s/g, "")}` : null,
      },
      ratingCount: Math.floor(Math.random() * 200) + 10,
      priceRange: ["$", "$$", "$$$"][Math.floor(Math.random() * 3)],
      openNow: Math.random() > 0.25,
    });
  }

  // Sort: businesses without websites first
  businesses.sort((a, b) => Number(a.hasWebsite) - Number(b.hasWebsite));
  
  return businesses;
}

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || "";
  const location = searchParams.get("location") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const format = searchParams.get("format"); // "csv" for CSV export

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
  });
  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Normalize the query to match our business types
  const normalizedQuery = query.toLowerCase().trim();
  const matchedKey = Object.keys(BUSINESS_TYPES).find(
    (key) => normalizedQuery.includes(key) || BUSINESS_TYPES[key].some(t => normalizedQuery.includes(t.toLowerCase()))
  ) || "general";

  // Generate mock data
  const allResults = generateMockBusinesses(matchedKey, location || "Austin, TX");
  const totalResults = allResults.length;
  const noWebsiteCount = allResults.filter((b) => !b.hasWebsite).length;

  // Paginate
  const startIndex = (page - 1) * limit;
  const paginatedResults = allResults.slice(startIndex, startIndex + limit);

  // Save search to DB
  const leadSearch = await prisma.leadSearch.create({
    data: {
      userId: dbUser.id,
      query: query || matchedKey,
      location: location || null,
      results: paginatedResults,
      count: totalResults,
    },
  });

  // Check if CSV export requested
  if (format === "csv") {
    const csvHeader = "Name,Business Type,Location,Rating,Reviews,Phone,Email,Address,Has Website,Website URL,Instagram,Facebook,Price Range,Open Now\n";
    const csvRows = allResults.map((b) =>
      [
        `"${b.name}"`,
        `"${b.businessType}"`,
        `"${b.location}"`,
        b.rating,
        b.reviewCount,
        `"${b.phone}"`,
        `"${b.email}"`,
        `"${b.address}"`,
        b.hasWebsite ? "Yes" : "No",
        b.websiteUrl || "",
        b.socialLinks.instagram || "",
        b.socialLinks.facebook || "",
        b.priceRange,
        b.openNow ? "Yes" : "No",
      ].join(",")
    ).join("\n");

    return new NextResponse(csvHeader + csvRows, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="leads-${matchedKey}-${location.replace(/[^a-zA-Z0-9]/g, "-")}.csv"`,
      },
    });
  }

  return NextResponse.json({
    results: paginatedResults,
    pagination: {
      page,
      limit,
      total: totalResults,
      totalPages: Math.ceil(totalResults / limit),
      noWebsiteCount,
    },
    searchId: leadSearch.id,
    query: query || matchedKey,
    location: location || "Austin, TX",
  });
}