import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const LOGO_STYLES = [
  "Modern minimalist", "Bold geometric", "Hand-drawn organic", "Vintage classic",
  "Tech-forward", "Luxury elegant", "Playful colorful", "Earthy natural",
  "Industrial strong", "Art deco", "Neon vibrant", "Watercolor soft",
];

const COLOR_PALETTES = [
  { name: "Ocean Depth", colors: ["#0f172a", "#1e3a5f", "#2563eb", "#38bdf8", "#f0f9ff"], mood: "Professional & Trustworthy" },
  { name: "Sunset Warmth", colors: ["#27272a", "#ea580c", "#f59e0b", "#fcd34d", "#fef3c7"], mood: "Warm & Inviting" },
  { name: "Forest Calm", colors: ["#064e3b", "#047857", "#10b981", "#6ee7b7", "#ecfdf5"], mood: "Natural & Balanced" },
  { name: "Midnight Purple", colors: ["#1e1b4b", "#4338ca", "#7c3aed", "#a78bfa", "#f5f3ff"], mood: "Creative & Luxurious" },
  { name: "Rose Garden", colors: ["#2d1b69", "#be185d", "#f43f5e", "#fb7185", "#fff1f2"], mood: "Bold & Passionate" },
  { name: "Coral Reef", colors: ["#0c4a6e", "#f97316", "#fb923c", "#fed7aa", "#fff7ed"], mood: "Energetic & Friendly" },
  { name: "Slate Modern", colors: ["#0f172a", "#334155", "#64748b", "#94a3b8", "#f8fafc"], mood: "Clean & Minimal" },
  { name: "Emerald Gold", colors: ["#022c22", "#065f46", "#059669", "#fbbf24", "#fefce8"], mood: "Premium & Trustworthy" },
  { name: "Berry Blast", colors: ["#1a0a2e", "#7c2d12", "#db2777", "#f472b6", "#fdf2f8"], mood: "Youthful & Vibrant" },
  { name: "Skyline", colors: ["#0f172a", "#1d4ed8", "#3b82f6", "#93c5fd", "#eff6ff"], mood: "Modern & Reliable" },
];

const FONT_PAIRS = [
  { heading: "Playfair Display", body: "Inter", style: "Classic & Elegant" },
  { heading: "Montserrat", body: "Open Sans", style: "Modern & Clean" },
  { heading: "Poppins", body: "Roboto", style: "Contemporary & Friendly" },
  { heading: "DM Serif Display", body: "DM Sans", style: "Editorial & Sophisticated" },
  { heading: "Space Grotesk", body: "Inter", style: "Tech-forward & Bold" },
  { heading: "Fraunces", body: "Work Sans", style: "Unique & Memorable" },
  { heading: "Cabinet Grotesk", body: "Satoshi", style: "Minimal & Luxury" },
  { heading: "Bricolage Grotesque", body: "Plus Jakarta Sans", style: "Playful & Modern" },
  { heading: "Instrument Serif", body: "Instrument Sans", style: "Creative & Artsy" },
  { heading: "Clash Grotesk", body: "Inter", style: "Geometric & Precise" },
];

const LOGO_LETTER_STYLES: Record<string, { icon: string; bgStyle: string }> = {
  restaurant: { icon: "knife-cross", bgStyle: "warm" },
  gym: { icon: "dumbbell", bgStyle: "bold" },
  salon: { icon: "sparkles", bgStyle: "elegant" },
  dentist: { icon: "tooth", bgStyle: "clean" },
  yoga: { icon: "lotus", bgStyle: "calm" },
  general: { icon: "star", bgStyle: "modern" },
};

function generateSVGLogo(letters: string, palette: string[], style: string, businessType: string): string {
  const bgColor = palette[0];
  const accentColor = palette[2];
  const textColor = palette[4];
  const shapeColor = palette[1];

  const shapes = {
    circle: `<circle cx="32" cy="32" r="28" fill="${shapeColor}" opacity="0.15"/>`,
    diamond: `<polygon points="32,8 56,32 32,56 8,32" fill="${shapeColor}" opacity="0.15"/>`,
    hexagon: `<polygon points="32,6 58,19 58,45 32,58 6,45 6,19" fill="${shapeColor}" opacity="0.12"/>`,
    blob: `<path d="M32,6 C48,6 58,16 58,32 C58,48 48,58 32,58 C16,58 6,48 6,32 C6,16 16,6 32,6Z" fill="${shapeColor}" opacity="0.1"/>`,
    ring: `<circle cx="32" cy="32" r="24" fill="none" stroke="${accentColor}" stroke-width="2" opacity="0.3"/>`,
  };

  const shapeKeys = Object.keys(shapes);
  const selectedShape = shapes[shapeKeys[Math.floor(Math.random() * shapeKeys.length)]];

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
    <rect width="64" height="64" rx="12" fill="${bgColor}"/>
    ${selectedShape}
    <text x="32" y="40" text-anchor="middle" font-family="system-ui" font-weight="800" font-size="22" fill="${textColor || '#ffffff'}">${letters}</text>
  </svg>`;
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { businessName, businessType } = body;

    if (!businessName) {
      return NextResponse.json({ error: "businessName is required" }, { status: 400 });
    }

    const normalizedType = businessType?.toLowerCase() || "general";
    const typeConfig = LOGO_LETTER_STYLES[normalizedType] || LOGO_LETTER_STYLES.general;

    // Generate initials
    const initials = businessName
      .split(" ")
      .map((w: string) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "S";

    // Select random palette
    const palette = COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)];

    // Select random font pair
    const fontPair = FONT_PAIRS[Math.floor(Math.random() * FONT_PAIRS.length)];

    // Select random logo style
    const logoStyle = LOGO_STYLES[Math.floor(Math.random() * LOGO_STYLES.length)];

    // Generate SVG logo
    const logoSvg = generateSVGLogo(initials, palette.colors, logoStyle, normalizedType);

    return NextResponse.json({
      brandKit: {
        logo: {
          svg: logoSvg,
          initials,
          style: logoStyle,
          businessType: normalizedType,
        },
        colors: {
          palette: {
            name: palette.name,
            mood: palette.mood,
            colors: palette.colors,
          },
          primary: palette.colors[2],
          secondary: palette.colors[1],
          accent: palette.colors[3],
          background: palette.colors[4],
          dark: palette.colors[0],
        },
        typography: {
          headingFont: fontPair.heading,
          bodyFont: fontPair.body,
          style: fontPair.style,
        },
        preview: {
          heading: `Welcome to ${businessName}`,
          subtitle: "We're excited to have you here.",
          body: "Your brand identity is the foundation of how customers perceive your business. This kit gives you a professional starting point.",
        },
      },
    });
  } catch (error) {
    console.error("Brand kit generation error:", error);
    return NextResponse.json({ error: "Failed to generate brand kit" }, { status: 500 });
  }
}