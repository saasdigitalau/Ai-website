import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

interface SnippetResult {
  platform: "instagram" | "twitter" | "linkedin" | "facebook";
  content: string;
  characterCount: number;
  hashtags: string[];
  tips: string;
}

const PLATFORM_LIMITS = {
  instagram: { max: 2200, ideal: 150, label: "Instagram Caption" },
  twitter: { max: 280, ideal: 200, label: "Twitter / X Post" },
  linkedin: { max: 3000, ideal: 600, label: "LinkedIn Post" },
  facebook: { max: 63206, ideal: 250, label: "Facebook Post" },
};

function extractContent(html: string, businessName?: string): {
  title: string;
  description: string;
  paragraphs: string[];
  services: string[];
  testimonials: string[];
  contactInfo: Record<string, string>;
} {
  const text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

  const titleMatch = text.match(/^(.+?)(?:[.!?]|$)/);
  const title = businessName || titleMatch?.[1]?.trim() || "Our Business";

  // Extract paragraphs (longer text blocks)
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 10);

  // Find service-related content
  const serviceKeywords = ["service", "offer", "provide", "specialize", "we do", "we offer", "expert"];
  const services = sentences.filter((s) =>
    serviceKeywords.some((kw) => s.toLowerCase().includes(kw))
  );

  // Find testimonial-like content
  const testimonialKeywords = ["testimonial", "review", "customer", "client", "love", "amazing", "recommend"];
  const testimonials = sentences.filter((s) =>
    testimonialKeywords.some((kw) => s.toLowerCase().includes(kw))
  );

  // Find contact info
  const contactInfo: Record<string, string> = {};
  const phoneMatch = text.match(/(\+?\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}/);
  if (phoneMatch) contactInfo.phone = phoneMatch[0];
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) contactInfo.email = emailMatch[0];

  return {
    title,
    description: sentences.slice(0, 3).join(". ") || text.substring(0, 200),
    paragraphs: sentences,
    services: services.length > 0 ? services : sentences.slice(1, 3),
    testimonials: testimonials.length > 0 ? testimonials : [],
    contactInfo,
  };
}

function generateInstagramSnippet(content: ReturnType<typeof extractContent>): string {
  const lines = [
    `✨ ${content.title}`,
    "",
    content.description.substring(0, 300),
    "",
  ];

  if (content.services.length > 0) {
    lines.push(`💼 What we offer:`);
    content.services.slice(0, 3).forEach((s) => {
      lines.push(`   • ${s.substring(0, 80)}`);
    });
    lines.push("");
  }

  if (content.testimonials.length > 0) {
    lines.push(`💬 What our clients say:`);
    lines.push(`   "${content.testimonials[0].substring(0, 120)}"`);
    lines.push("");
  }

  lines.push(`👇 Link in bio to learn more!`);
  lines.push(``);

  const hashtags = generateHashtags(content.title, "instagram");
  lines.push(hashtags.join(" "));

  return lines.join("\n");
}

function generateTwitterSnippet(content: ReturnType<typeof extractContent>): string {
  const lines = [
    `🚀 ${content.title}`,
    "",
    content.description.substring(0, 150),
  ];

  if (content.services.length > 0) {
    lines.push(`\n👉 ${content.services[0].substring(0, 80)}`);
  }

  const hashtags = generateHashtags(content.title, "twitter");
  lines.push(``);
  lines.push(hashtags.slice(0, 2).join(" "));

  const result = lines.join("\n");
  return result.length > 280 ? result.substring(0, 277) + "..." : result;
}

function generateLinkedInSnippet(content: ReturnType<typeof extractContent>): string {
  const lines = [
    `🚀 Exciting updates from ${content.title}!`,
    "",
    content.description.substring(0, 400),
    "",
  ];

  if (content.services.length > 0) {
    lines.push(`💡 **What We Do**`);
    content.services.slice(0, 3).forEach((s, i) => {
      lines.push(`${i + 1}. ${s.substring(0, 100)}`);
    });
    lines.push("");
  }

  if (content.testimonials.length > 0) {
    lines.push(`⭐ **Client Spotlight**`);
    lines.push(`"${content.testimonials[0].substring(0, 150)}"`);
    lines.push("");
  }

  const { phone, email } = content.contactInfo;
  if (phone || email) {
    lines.push(`📞 **Get in Touch**`);
    if (phone) lines.push(`   Phone: ${phone}`);
    if (email) lines.push(`   Email: ${email}`);
    lines.push("");
  }

  lines.push(`#${content.title.replace(/\s+/g, "")} #SmallBusiness #LocalBusiness`);
  lines.push(``);
  lines.push(`---`);
  lines.push(`Follow us for more updates! 🔔`);

  return lines.join("\n");
}

function generateFacebookSnippet(content: ReturnType<typeof extractContent>): string {
  const lines = [
    `📢 **${content.title}**`,
    "",
    content.description.substring(0, 500),
    "",
  ];

  if (content.services.length > 0) {
    lines.push(`🔹 Our Services:`);
    content.services.slice(0, 4).forEach((s) => {
      lines.push(`   ✅ ${s.substring(0, 100)}`);
    });
    lines.push("");
  }

  if (content.testimonials.length > 0) {
    lines.push(`🗣️ **Don't just take our word for it!**`);
    lines.push(`"${content.testimonials[0].substring(0, 150)}"`);
    lines.push("");
  }

  lines.push(`💬 **Want to know more?**`);
  lines.push(`Drop us a message or visit our website!`);
  lines.push(``);

  const hashtags = generateHashtags(content.title, "facebook");
  lines.push(hashtags.join(" "));

  return lines.join("\n");
}

function generateHashtags(title: string, platform: string): string[] {
  const words = title.replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/);
  const tags = [
    `#${words[0] || "Business"}`,
    `#${words[words.length - 1] || "Local"}`,
    "#SmallBusiness",
    "#SupportLocal",
    "#Entrepreneur",
  ];

  if (platform === "instagram") {
    tags.push("#BusinessGrowth", "#MarketingTips", "#SmallBizLove", "#LocalBusiness");
  }

  return tags;
}

function getPlatformTips(platform: string): string {
  const tips: Record<string, string> = {
    instagram: "Add an eye-catching image or carousel. Use Stories to cross-promote. Best time: 9-11am EST.",
    twitter: "Keep it concise. Add a link to your site. Best time: 8-10am & 6-9pm EST. Use 1-2 hashtags max.",
    linkedin: "Add a professional image. Tag relevant connections. Best time: Tue-Thu 8-10am. Use industry hashtags.",
    facebook: "Add a photo or video. Ask a question to boost engagement. Best time: 9am-1pm weekdays.",
  };
  return tips[platform] || "Post consistently for best results!";
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

  const content = extractContent(html, businessName);

  const snippets: SnippetResult[] = [
    {
      platform: "instagram",
      content: generateInstagramSnippet(content),
      characterCount: 0,
      hashtags: generateHashtags(content.title, "instagram"),
      tips: getPlatformTips("instagram"),
    },
    {
      platform: "twitter",
      content: generateTwitterSnippet(content),
      characterCount: 0,
      hashtags: generateHashtags(content.title, "twitter"),
      tips: getPlatformTips("twitter"),
    },
    {
      platform: "linkedin",
      content: generateLinkedInSnippet(content),
      characterCount: 0,
      hashtags: generateHashtags(content.title, "linkedin"),
      tips: getPlatformTips("linkedin"),
    },
    {
      platform: "facebook",
      content: generateFacebookSnippet(content),
      characterCount: 0,
      hashtags: generateHashtags(content.title, "facebook"),
      tips: getPlatformTips("facebook"),
    },
  ];

  // Calculate character counts
  snippets.forEach((s) => {
    s.characterCount = s.content.length;
  });

  // Save to DB if websiteId provided
  if (websiteId) {
    try {
      // Delete old snippets for this website
      await prisma.socialSnippet.deleteMany({ where: { websiteId } });

      // Save new snippets
      for (const snippet of snippets) {
        await prisma.socialSnippet.create({
          data: {
            websiteId,
            platform: snippet.platform,
            content: snippet.content,
            characterCount: snippet.characterCount,
            hashtags: snippet.hashtags.join(", "),
          },
        });
      }
    } catch (e) {
      console.error("Failed to save social snippets:", e);
    }
  }

  return NextResponse.json({
    snippets,
    contentPreview: {
      title: content.title,
      description: content.description.substring(0, 200),
      serviceCount: content.services.length,
      testimonialCount: content.testimonials.length,
      hasContact: Object.keys(content.contactInfo).length > 0,
    },
  });
}

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

  const snippets = await prisma.socialSnippet.findMany({
    where: { websiteId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ snippets });
}