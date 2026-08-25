import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

interface SeoCheck {
  name: string;
  category: "meta" | "structure" | "images" | "mobile" | "speed" | "keywords";
  passed: boolean;
  weight: number;
  suggestion: string;
}

function analyzeMetaTitle(html: string): SeoCheck {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = match?.[1]?.trim() || "";
  const len = title.length;
  return {
    name: "Meta Title",
    category: "meta",
    passed: len >= 30 && len <= 60,
    weight: 20,
    suggestion: !title
      ? 'Add a meta title tag (<title>Your Business Name | City</title>)'
      : len < 30
      ? `Title too short (${len} chars). Aim for 30-60 chars. Current: "${title}"`
      : len > 60
      ? `Title too long (${len} chars). Aim for 30-60 chars. Current: "${title}"`
      : `Great title length (${len} chars)`,
  };
}

function analyzeMetaDescription(html: string): SeoCheck {
  const match = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
  const desc = match?.[1]?.trim() || "";
  const len = desc.length;
  return {
    name: "Meta Description",
    category: "meta",
    passed: len >= 70 && len <= 160,
    weight: 20,
    suggestion: !desc
      ? 'Add a meta description tag (<meta name="description" content="...">)'
      : len < 70
      ? `Description too short (${len} chars). Aim for 70-160 chars.`
      : len > 160
      ? `Description too long (${len} chars). Aim for 70-160 chars.`
      : `Good description length (${len} chars)`,
  };
}

function analyzeHeadings(html: string): SeoCheck {
  const h1s = html.match(/<h1[^>]*>/gi) || [];
  const h2s = html.match(/<h2[^>]*>/gi) || [];
  const h3s = html.match(/<h3[^>]*>/gi) || [];
  const noHeadings = h1s.length === 0 && h2s.length === 0 && h3s.length === 0;
  return {
    name: "Heading Structure",
    category: "structure",
    passed: !noHeadings && h1s.length >= 1 && h1s.length <= 3,
    weight: 15,
    suggestion: noHeadings
      ? 'No headings found. Add an <h1> for the page title and <h2>/<h3> for sections.'
      : h1s.length === 0
      ? 'Missing <h1> tag. Every page should have exactly one <h1>.'
      : h1s.length > 3
      ? `Too many <h1> tags (${h1s.length}). Use only one <h1> per page.`
      : `Good heading structure: ${h1s.length} H1, ${h2s.length} H2, ${h3s.length} H3`,
  };
}

function analyzeImageAlt(html: string): SeoCheck {
  const imgs = html.match(/<img[^>]*>/gi) || [];
  const withAlt = imgs.filter((img) => /alt\s*=\s*["'][^"']+["']/i.test(img));
  const totalImgs = imgs.length;
  const noAltImgs = imgs.filter((img) => !/alt\s*=/i.test(img));
  const passed = totalImgs === 0 || withAlt.length === totalImgs;

  return {
    name: "Image Alt Text",
    category: "images",
    passed,
    weight: 15,
    suggestion: totalImgs === 0
      ? "No images found on the page. Add relevant images with alt text."
      : noAltImgs.length > 0
      ? `${noAltImgs.length}/${totalImgs} images missing alt text. Add descriptive alt attributes.`
      : `All ${totalImgs} images have alt text ✓`,
  };
}

function analyzeMobileResponsiveness(html: string): SeoCheck {
  const hasViewport = /name=["']viewport["']/i.test(html);
  const hasMediaQueries = /@media\s*\(/i.test(html);
  const hasFlexOrGrid = /display:\s*(flex|grid)/i.test(html);
  const hasResponsiveClasses = /(sm:|md:|lg:|xl:)/i.test(html);
  const passed = hasViewport && (hasMediaQueries || hasFlexOrGrid || hasResponsiveClasses);
  const checks = [];
  if (hasViewport) checks.push("viewport meta tag ✓");
  if (!hasViewport) checks.push("missing viewport meta tag ✗");
  if (hasMediaQueries) checks.push("media queries ✓");
  if (hasFlexOrGrid) checks.push("flexbox/grid ✓");
  if (hasResponsiveClasses) checks.push("responsive classes ✓");

  return {
    name: "Mobile Responsiveness",
    category: "mobile",
    passed,
    weight: 15,
    suggestion: passed
      ? `Good mobile setup: ${checks.filter(c => c.includes('✓')).join(', ')}`
      : `Mobile improvements needed: ${checks.filter(c => c.includes('✗')).join(', ')}`,
  };
}

function analyzePageSpeed(html: string): SeoCheck {
  const externalCss = (html.match(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi) || []).length;
  const externalJs = (html.match(/<script[^>]+src=["'][^"']*["'][^>]*><\/script>/gi) || []).length;
  const inlineStyles = (html.match(/style\s*=\s*["'][^"']*["']/gi) || []).length;
  const largeImgs = (html.match(/<img[^>]+(?:width|height)\s*=\s*["']\d{4,}["']/gi) || []).length;
  const totalRequests = externalCss + externalJs;
  const passed = totalRequests <= 5 && inlineStyles <= 20;

  return {
    name: "Page Speed Hints",
    category: "speed",
    passed,
    weight: 15,
    suggestion: totalRequests > 5
      ? `High external resource count (${totalRequests} files). Aim for under 5 for faster loading.`
      : inlineStyles > 20
      ? `${inlineStyles} inline styles found. Consider moving to CSS for better caching.`
      : largeImgs > 0
      ? `${largeImgs} image(s) with large dimensions. Consider compressing images.`
      : `Good: ${externalCss} CSS files, ${externalJs} JS files. Loads efficiently.`,
  };
}

function analyzeKeywordUsage(html: string, businessName?: string): SeoCheck {
  const textContent = html.replace(/<[^>]*>/g, " ").toLowerCase();
  const words = textContent.split(/\s+/).filter((w) => w.length > 3);
  const wordFreq: Record<string, number> = {};
  words.forEach((w) => {
    wordFreq[w] = (wordFreq[w] || 0) + 1;
  });
  const topKeywords = Object.entries(wordFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);

  const wordCount = words.length;
  const passed = wordCount >= 100;

  return {
    name: "Keyword Usage & Content",
    category: "keywords",
    passed,
    weight: 15,
    suggestion: wordCount < 100
      ? `Thin content (${wordCount} words). Aim for 300+ words for good SEO. Top keywords: ${topKeywords.slice(0, 3).join(", ")}`
      : `Good content length (${wordCount} words). Top keywords: ${topKeywords.slice(0, 3).join(", ")}`,
  };
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { html, websiteId, businessName } = body;

  if (!html) {
    return NextResponse.json({ error: "HTML content is required" }, { status: 400 });
  }

  // Run all SEO checks
  const checks: SeoCheck[] = [
    analyzeMetaTitle(html),
    analyzeMetaDescription(html),
    analyzeHeadings(html),
    analyzeImageAlt(html),
    analyzeMobileResponsiveness(html),
    analyzePageSpeed(html),
    analyzeKeywordUsage(html, businessName),
  ];

  // Calculate weighted score
  const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
  const weightedScore = checks.reduce((sum, c) => sum + (c.passed ? c.weight : 0), 0);
  const score = Math.round((weightedScore / totalWeight) * 100);

  // Extract category scores
  const getCategoryScore = (cat: string) => {
    const catChecks = checks.filter(c => c.category === cat);
    const catWeight = catChecks.reduce((s, c) => s + c.weight, 0);
    const catPassed = catChecks.filter(c => c.passed).reduce((s, c) => s + c.weight, 0);
    return Math.round((catPassed / catWeight) * 100);
  };

  const suggestions = checks
    .filter((c) => !c.passed)
    .map((c) => c.suggestion);

  const result = {
    score,
    checks,
    suggestions,
    categoryScores: {
      meta: getCategoryScore("meta"),
      structure: getCategoryScore("structure"),
      images: getCategoryScore("images"),
      mobile: getCategoryScore("mobile"),
      speed: getCategoryScore("speed"),
      keywords: getCategoryScore("keywords"),
    },
  };

  // If websiteId provided, save to DB
  if (websiteId) {
    try {
      await prisma.seoResult.upsert({
        where: { websiteId },
        create: {
          websiteId,
          score,
          metaTitleScore: getCategoryScore("meta"),
          metaDescScore: getCategoryScore("meta"),
          headingScore: getCategoryScore("structure"),
          imageAltScore: getCategoryScore("images"),
          mobileScore: getCategoryScore("mobile"),
          speedScore: getCategoryScore("speed"),
          keywordScore: getCategoryScore("keywords"),
          checks: checks as unknown as Prisma.InputJsonValue,
          suggestions: suggestions as unknown as Prisma.InputJsonValue,
          rawHtml: html.substring(0, 10000), // Store first 10k chars
        },
        update: {
          score,
          metaTitleScore: getCategoryScore("meta"),
          metaDescScore: getCategoryScore("meta"),
          headingScore: getCategoryScore("structure"),
          imageAltScore: getCategoryScore("images"),
          mobileScore: getCategoryScore("mobile"),
          speedScore: getCategoryScore("speed"),
          keywordScore: getCategoryScore("keywords"),
          checks: checks as unknown as Prisma.InputJsonValue,
          suggestions: suggestions as unknown as Prisma.InputJsonValue,
          rawHtml: html.substring(0, 10000),
        },
      });
    } catch (e) {
      // DB save is optional
      console.error("Failed to save SEO result:", e);
    }
  }

  return NextResponse.json(result);
}

// GET /api/analyze-seo?websiteId=xxx - Get latest SEO result
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const websiteId = searchParams.get("websiteId");
  if (!websiteId) {
    return NextResponse.json({ error: "websiteId is required" }, { status: 400 });
  }

  const result = await prisma.seoResult.findUnique({
    where: { websiteId },
  });

  if (!result) {
    return NextResponse.json({ error: "No SEO analysis found" }, { status: 404 });
  }

  return NextResponse.json({
    score: result.score,
    checks: result.checks,
    suggestions: result.suggestions,
    categoryScores: {
      meta: result.metaTitleScore,
      structure: result.headingScore,
      images: result.imageAltScore,
      mobile: result.mobileScore,
      speed: result.speedScore,
      keywords: result.keywordScore,
    },
    createdAt: result.createdAt,
  });
}