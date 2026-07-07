import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const BUSINESS_BLOG_PROMPTS: Record<string, { topics: string[]; tone: string; angle: string }> = {
  restaurant: {
    topics: ["seasonal menu highlights", "farm-to-table sourcing", "wine pairings", "chef interviews", "customer stories", "nutrition tips"],
    tone: "warm and inviting",
    angle: "Emphasize fresh ingredients, culinary craft, and the dining experience."
  },
  gym: {
    topics: ["workout tips", "nutrition advice", "member success stories", "new class announcements", "fitness myths debunked", "recovery techniques"],
    tone: "motivational and energetic",
    angle: "Focus on results, community, and pushing limits."
  },
  salon: {
    topics: ["hair care tips", "trending styles", "skincare routines", "product recommendations", "before-and-after stories", "seasonal beauty guides"],
    tone: "stylish and helpful",
    angle: "Highlight self-care, confidence, and expert techniques."
  },
  dentist: {
    topics: ["oral hygiene tips", "procedure guides", "patient stories", "tech innovations", "preventive care", "cosmetic options"],
    tone: "professional and reassuring",
    angle: "Build trust, explain procedures clearly, emphasize comfort."
  },
  yoga: {
    topics: ["beginner pose guides", "meditation tips", "breathwork techniques", "wellness lifestyle", "class benefits", "instructor spotlights"],
    tone: "calm and inspiring",
    angle: "Focus on mindfulness, flexibility, and inner peace."
  },
  general: {
    topics: ["behind the scenes", "customer tips", "community involvement", "product guides", "expert advice", "industry insights"],
    tone: "friendly and informative",
    angle: "Show expertise while remaining approachable and relatable."
  },
};

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 80);
}

function generateBlogPost(businessType: string, businessName: string, topicIndex?: number): { title: string; content: string; excerpt: string; tags: string[] } {
  const config = BUSINESS_BLOG_PROMPTS[businessType] || BUSINESS_BLOG_PROMPTS.general;
  const topicIdx = topicIndex ?? Math.floor(Math.random() * config.topics.length);
  const topic = config.topics[topicIdx];

  const titles = [
    `5 Reasons Why ${topic} Matters for Your ${businessName} Experience`,
    `The Ultimate Guide to ${topic.charAt(0).toUpperCase() + topic.slice(1)}`,
    `How ${businessName} is Transforming ${topic}`,
    `What You Need to Know About ${topic} This Season`,
    `${topic}: A Complete Guide for Beginners`,
    `Expert Tips on ${topic} From the Team at ${businessName}`,
  ];

  const title = titles[Math.floor(Math.random() * titles.length)];

  const paragraphs = [
    `At ${businessName}, we believe that ${topic} is more than just a trend — it's a way to enhance your experience and connect with what matters most. Whether you're a first-time visitor or a loyal customer, understanding ${topic} can transform the way you engage with our services.`,
    `Our team of experts has curated the best practices and insights to help you make the most of ${topic}. From foundational tips to advanced strategies, we've got you covered every step of the way.`,
    `One of the most important aspects of ${topic} is consistency. By incorporating small, intentional changes into your routine, you can achieve remarkable results over time. Our ${businessType} specialists recommend starting with the basics and building from there.`,
    `We've seen firsthand how ${topic} has evolved over the years. What used to be a niche interest is now a cornerstone of the ${businessType} experience. ${config.angle}`,
    `Ready to dive deeper? Here are three actionable steps you can take today:\n\n1. Start by exploring what ${topic} means specifically for your needs\n2. Connect with our team for personalized recommendations\n3. Join our community of like-minded individuals who share your passion`,
    `At ${businessName}, we're committed to helping you every step of the way. Visit us to learn more about ${topic} and discover how we can elevate your experience. Our doors are always open — we'd love to hear your story.`,
  ];

  const content = paragraphs.join("\n\n");
  const excerpt = paragraphs[0].substring(0, 150) + "...";

  const tagMap: Record<string, string[]> = {
    restaurant: ["food", "dining", "culinary", "recipes"],
    gym: ["fitness", "health", "training", "wellness"],
    salon: ["beauty", "style", "hair", "skincare"],
    dentist: ["dental", "health", "oral care", "wellness"],
    yoga: ["yoga", "meditation", "wellness", "mindfulness"],
    general: ["tips", "advice", "lifestyle", "community"],
  };

  const baseTags = tagMap[businessType] || tagMap.general;
  const topicTag = topic.toLowerCase().replace(/\s+/g, "-");
  const tags = [topicTag, ...baseTags];

  return { title, content, excerpt, tags };
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { websiteId, count = 1 } = body;

    if (!websiteId) {
      return NextResponse.json({ error: "websiteId is required" }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const website = await prisma.website.findUnique({
      where: { id: websiteId },
    });

    if (!website) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    if (website.userId && website.userId !== dbUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Deduct AI credits
    const creditsNeeded = count;
    if (dbUser.aiCredits < creditsNeeded && dbUser.plan !== "business") {
      return NextResponse.json({ error: "Insufficient AI credits" }, { status: 402 });
    }

    const generated = Math.min(count, 5);
    const posts = [];

    for (let i = 0; i < generated; i++) {
      const { title, content, excerpt, tags } = generateBlogPost(
        website.businessType,
        website.name,
        (i + Math.floor(Math.random() * 10)) % 6
      );

      const slug = `${generateSlug(title)}-${Date.now()}-${i}`;

      const post = await prisma.blogPost.create({
        data: {
          websiteId: website.id,
          title,
          slug,
          content,
          excerpt,
          tags: tags.join(", "),
          status: "draft",
        },
      });

      posts.push(post);
    }

    // Update credits
    if (dbUser.plan !== "business") {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { aiCredits: dbUser.aiCredits - creditsNeeded },
      });
    }

    return NextResponse.json({
      posts,
      creditsUsed: creditsNeeded,
      creditsRemaining: dbUser.plan === "business" ? "unlimited" : dbUser.aiCredits - creditsNeeded,
    });
  } catch (error) {
    console.error("Blog generation error:", error);
    return NextResponse.json({ error: "Failed to generate blog posts" }, { status: 500 });
  }
}