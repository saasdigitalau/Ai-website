export interface WebsiteData {
  html: string;
  metadata: {
    name: string;
    description: string;
    businessType: string;
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    logoText: string;
  };
}

const BUSINESS_TEMPLATES: Record<string, any> = {
  restaurant: {
    icon: "🍽️",
    keywords: ["food", "restaurant", "cafe", "bistro", "pizza", "sushi", "dining", "grill", "burger", "steak", "pasta", "bakery"],
    defaultName: "Gourmet Bistro",
    primaryColor: "#c2410c",
    secondaryColor: "#fef3c7",
    fontFamily: "'Playfair Display', serif",
    generateContent: (name: string, desc: string) => ({
      heroTitle: `Exquisite Dining at ${name}`,
      heroSubtitle: `Taste the finest culinary creations made with fresh, organic ingredients.`,
      aboutText: `Welcome to ${name}. ${desc || "We are a passion-driven culinary destination dedicated to bringing you an exceptional dining experience."}`,
      services: [
        { title: "Fine Dining", desc: "Multi-course menu paired with exceptional wines.", price: "$$$" },
        { title: "Private Events", desc: "Celebrate special occasions with custom catering.", price: "Custom" },
        { title: "Express Takeout", desc: "Enjoy your favorite dishes at home.", price: "From $12" }
      ],
      testimonials: [
        { name: "Sarah M.", text: "Every single dish was a masterpiece! Absolute perfection.", role: "Food Critic" },
        { name: "John D.", text: "Incredible service, stunning presentation and flavors.", role: "Regular Guest" }
      ],
      contactInfo: {
        address: "123 Culinary Lane",
        phone: "(555) 123-4567",
        email: `reservations@${name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
        hours: "Tue-Sun: 5PM-10PM"
      }
    })
  },
  gym: {
    icon: "💪",
    keywords: ["gym", "fitness", "workout", "crossfit", "training", "coach", "bodybuilding", "yoga", "pilates", "exercise"],
    defaultName: "Iron Strength Gym",
    primaryColor: "#dc2626",
    secondaryColor: "#171717",
    fontFamily: "'Montserrat', sans-serif",
    generateContent: (name: string, desc: string) => ({
      heroTitle: `Unleash Your Potential at ${name}`,
      heroSubtitle: `No excuses. Just results. Join the premier fitness community.`,
      aboutText: `At ${name}, ${desc || "we believe fitness is a lifestyle. Our elite coaches and motivating classes help you shatter your limits."}`,
      services: [
        { title: "Personal Training", desc: "One-on-one tailored fitness programming.", price: "$75/session" },
        { title: "Group Classes", desc: "HIIT, CrossFit, and strength conditioning.", price: "Included" },
        { title: "Open Gym", desc: "24/7 access to top-of-the-line equipment.", price: "$49/month" }
      ],
      testimonials: [
        { name: "Mike T.", text: "Best gym in town. The coaching staff is world-class.", role: "Member 2 Years" },
        { name: "Jessica R.", text: "Results in 3 months I couldn't get in 3 years elsewhere.", role: "Athlete" }
      ],
      contactInfo: {
        address: "456 Powerhouse Blvd",
        phone: "(555) 987-6543",
        email: `info@${name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
        hours: "Mon-Fri: 5AM-11PM | Sat-Sun: 7AM-8PM"
      }
    })
  },
  salon: {
    icon: "✨",
    keywords: ["salon", "spa", "hair", "beauty", "nails", "makeup", "esthetician", "lash", "barber", "facial"],
    defaultName: "Elegance Beauty Salon",
    primaryColor: "#db2777",
    secondaryColor: "#fdf2f8",
    fontFamily: "'Cormorant Garamond', serif",
    generateContent: (name: string, desc: string) => ({
      heroTitle: `Discover Your Glow at ${name}`,
      heroSubtitle: `Where beauty meets relaxation. Premium care for every style.`,
      aboutText: `${name} ${desc || "is a luxury beauty destination offering premium hair, nail, and skincare services. Our expert stylists bring out your best."}`,
      services: [
        { title: "Signature Hair", desc: "Cut, color, and styling by master stylists.", price: "From $65" },
        { title: "Luxury Facial", desc: "Rejuvenating treatments for radiant skin.", price: "$90" },
        { title: "Nail Art", desc: "Custom designs from gel to acrylic.", price: "From $35" }
      ],
      testimonials: [
        { name: "Annie K.", text: "The best blowout I've ever had! The salon is gorgeous.", role: "Style Blogger" },
        { name: "Rachel P.", text: "My go-to for every special occasion. Flawless every time.", role: "Regular Client" }
      ],
      contactInfo: {
        address: "789 Beauty Avenue",
        phone: "(555) 456-7890",
        email: `hello@${name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
        hours: "Mon-Sat: 9AM-8PM"
      }
    })
  },
  dentist: {
    icon: "🦷",
    keywords: ["dentist", "teeth", "orthodontist", "clinic", "oral", "smile", "dental", "hygiene"],
    defaultName: "Bright Smile Dental",
    primaryColor: "#0284c7",
    secondaryColor: "#f0f9ff",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    generateContent: (name: string, desc: string) => ({
      heroTitle: `Your Brightest Smile Starts at ${name}`,
      heroSubtitle: `Gentle, modern dentistry. We make every visit comfortable.`,
      aboutText: `${name} ${desc || "provides comprehensive dental care with cutting-edge technology. Your comfort and smile are our top priorities."}`,
      services: [
        { title: "General Dentistry", desc: "Cleanings, exams, and preventive care.", price: "Insurance accepted" },
        { title: "Cosmetic", desc: "Whitening, veneers, and smile makeovers.", price: "From $200" },
        { title: "Orthodontics", desc: "Invisalign and braces for all ages.", price: "Free consult" }
      ],
      testimonials: [
        { name: "Tom L.", text: "Haven't been this relaxed at a dentist ever. Amazing team!", role: "Patient" },
        { name: "Maria G.", text: "My smile has never looked better. Life-changing results.", role: "Patient" }
      ],
      contactInfo: {
        address: "321 Health Drive",
        phone: "(555) 234-5678",
        email: `care@${name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
        hours: "Mon-Fri: 8AM-5PM"
      }
    })
  },
  yoga: {
    icon: "🧘",
    keywords: ["yoga", "pilates", "meditation", "mindfulness", "zen", "breathwork", "wellness"],
    defaultName: "Serene Yoga Studio",
    primaryColor: "#0d9488",
    secondaryColor: "#f0fdfa",
    fontFamily: "'Quicksand', sans-serif",
    generateContent: (name: string, desc: string) => ({
      heroTitle: `Find Your Inner Peace at ${name}`,
      heroSubtitle: `A sanctuary for body, mind, and soul. All levels welcome.`,
      aboutText: `${name} ${desc || "is a welcoming space where you can step away from the noise of daily life and reconnect with yourself through mindful movement and breath."}`,
      services: [
        { title: "Vinyasa Flow", desc: "Dynamic sequences linking breath with movement.", price: "$20/class" },
        { title: "Sound Healing", desc: "Restorative sessions with singing bowls.", price: "$30/class" },
        { title: "Private Sessions", desc: "One-on-one guidance tailored to you.", price: "$75/session" }
      ],
      testimonials: [
        { name: "Emily R.", text: "This studio changed my life. The instructors are incredible.", role: "Member" },
        { name: "David K.", text: "A peaceful oasis. I leave every class feeling renewed.", role: "Student" }
      ],
      contactInfo: {
        address: "555 Harmony Street",
        phone: "(555) 789-0123",
        email: `om@${name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
        hours: "Mon-Sat: 6AM-8PM | Sun: 8AM-2PM"
      }
    })
  },
  general: {
    icon: "💼",
    keywords: ["business", "professional", "services", "consulting", "agency", "studio", "shop"],
    defaultName: "Professional Services",
    primaryColor: "#4f46e5",
    secondaryColor: "#f5f3ff",
    fontFamily: "'Inter', sans-serif",
    generateContent: (name: string, desc: string) => ({
      heroTitle: `Welcome to ${name}`,
      heroSubtitle: `Professional services tailored to your needs.`,
      aboutText: `${name} ${desc || "delivers top-quality professional services. We're committed to excellence and client satisfaction in everything we do."}`,
      services: [
        { title: "Consultation", desc: "Expert advice tailored to your goals.", price: "Free initial" },
        { title: "Full Service", desc: "End-to-end management of your project.", price: "Quote based" },
        { title: "Support", desc: "Ongoing maintenance and support.", price: "Monthly retainer" }
      ],
      testimonials: [
        { name: "Client A.", text: "Exceptional service from start to finish. Highly recommend!", role: "Client" },
        { name: "Client B.", text: "Professional, responsive, and delivered beyond expectations.", role: "Client" }
      ],
      contactInfo: {
        address: "100 Business Park",
        phone: "(555) 555-5555",
        email: `hello@${name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
        hours: "Mon-Fri: 9AM-6PM"
      }
    })
  }
};

function extractBusinessType(description: string): string {
  const lower = description.toLowerCase();
  for (const [type, config] of Object.entries(BUSINESS_TEMPLATES)) {
    if (config.keywords.some((kw: string) => lower.includes(kw))) return type;
  }
  return "general";
}

function extractName(description: string, businessType: string): string {
  const nameRegex = /(?:called|named|known as|")([^"]+)"?/i;
  const match = description.match(nameRegex);
  if (match) return match[1].trim();
  const startMatch = description.match(/^(?:a|an|the)?\s*(\w+(?:\s+\w+){0,3})?\s*(?:is|are|offers|provides)/i);
  if (startMatch && startMatch[1]) return startMatch[1].trim();
  return BUSINESS_TEMPLATES[businessType]?.defaultName || "Professional Services";
}

function generateHtml(data: WebsiteData["metadata"], content: any): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.name}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=${data.fontFamily.replace(/[' ]/g, "")}&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: ${data.fontFamily}, sans-serif; }
    .gradient-bg { background: linear-gradient(135deg, ${data.primaryColor}, ${data.secondaryColor}); }
  </style>
</head>
<body>
  <nav class="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
    <div class="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-white font-bold text-sm">${data.logoText[0]}</div>
        <span class="font-bold text-lg">${data.name}</span>
      </div>
      <div class="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
        <a href="#about" class="hover:text-gray-900">About</a>
        <a href="#services" class="hover:text-gray-900">Services</a>
        <a href="#testimonials" class="hover:text-gray-900">Testimonials</a>
        <a href="#contact" class="hover:text-gray-900">Contact</a>
      </div>
    </div>
  </nav>

  <section class="relative min-h-[80vh] flex items-center" style="background: linear-gradient(135deg, ${data.primaryColor}15, ${data.secondaryColor}30)">
    <div class="max-w-6xl mx-auto px-6 py-20">
      <div class="max-w-3xl">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-6" style="background:${data.primaryColor}20;color:${data.primaryColor}">
          <span>★</span> Open For Business
        </div>
        <h1 class="text-5xl md:text-7xl font-extrabold leading-[0.95] tracking-tight text-gray-900">${content.heroTitle}</h1>
        <p class="mt-6 text-lg md:text-xl text-gray-600 max-w-xl leading-relaxed">${content.heroSubtitle}</p>
        <div class="mt-8 flex flex-wrap gap-3">
          <a href="#contact" class="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white shadow-lg hover:brightness-110 transition-all" style="background:${data.primaryColor}">Get Started <i class="fas fa-arrow-right text-xs"></i></a>
          <a href="#services" class="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-gray-700 bg-white shadow-sm hover:shadow transition-all border border-gray-200">Our Services</a>
        </div>
      </div>
    </div>
  </section>

  <section id="about" class="py-20 px-6">
    <div class="max-w-4xl mx-auto text-center">
      <div class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest mb-4" style="background:${data.primaryColor}10;color:${data.primaryColor}">About</div>
      <h2 class="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">Our Story</h2>
      <p class="mt-6 text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">${content.aboutText}</p>
    </div>
  </section>

  <section id="services" class="py-20 px-6 bg-gray-50">
    <div class="max-w-6xl mx-auto">
      <div class="text-center mb-12">
        <div class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest mb-4" style="background:${data.primaryColor}10;color:${data.primaryColor}">Services</div>
        <h2 class="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">What We Offer</h2>
      </div>
      <div class="grid md:grid-cols-3 gap-6">
        ${content.services.map((s: any) => `
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold mb-4" style="background:${data.primaryColor}">${s.title[0]}</div>
          <h3 class="text-lg font-bold text-gray-900">${s.title}</h3>
          <p class="mt-2 text-sm text-gray-500">${s.desc}</p>
          <div class="mt-4 text-xs font-bold" style="color:${data.primaryColor}">${s.price}</div>
        </div>
        `).join("")}
      </div>
    </div>
  </section>

  <section id="testimonials" class="py-20 px-6">
    <div class="max-w-6xl mx-auto">
      <div class="text-center mb-12">
        <div class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest mb-4" style="background:${data.primaryColor}10;color:${data.primaryColor}">Testimonials</div>
        <h2 class="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">What Clients Say</h2>
      </div>
      <div class="grid md:grid-cols-3 gap-6">
        ${content.testimonials.map((t: any) => `
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div class="flex items-center gap-1 text-amber-400 text-sm mb-4">${"★".repeat(5)}</div>
          <p class="text-gray-600 text-sm leading-relaxed">"${t.text}"</p>
          <div class="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style="background:${data.primaryColor}">${t.name[0]}</div>
            <div><div class="text-sm font-semibold text-gray-900">${t.name}</div><div class="text-xs text-gray-500">${t.role}</div></div>
          </div>
        </div>
        `).join("")}
      </div>
    </div>
  </section>

  <section id="contact" class="py-20 px-6" style="background:${data.secondaryColor}">
    <div class="max-w-4xl mx-auto">
      <div class="text-center mb-12">
        <div class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest mb-4" style="background:${data.primaryColor}10;color:${data.primaryColor}">Contact</div>
        <h2 class="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">Get In Touch</h2>
      </div>
      <div class="grid md:grid-cols-3 gap-6">
        <div class="bg-white rounded-2xl p-5 text-center shadow-sm">
          <i class="fas fa-map-marker-alt text-xl mb-3" style="color:${data.primaryColor}"></i>
          <p class="text-sm text-gray-600">${content.contactInfo.address}</p>
        </div>
        <div class="bg-white rounded-2xl p-5 text-center shadow-sm">
          <i class="fas fa-phone text-xl mb-3" style="color:${data.primaryColor}"></i>
          <p class="text-sm text-gray-600">${content.contactInfo.phone}</p>
        </div>
        <div class="bg-white rounded-2xl p-5 text-center shadow-sm">
          <i class="fas fa-clock text-xl mb-3" style="color:${data.primaryColor}"></i>
          <p class="text-sm text-gray-600">${content.contactInfo.hours}</p>
        </div>
      </div>
      <div class="mt-6 text-center">
        <a href="mailto:${content.contactInfo.email}" class="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white shadow-lg hover:brightness-110 transition-all" style="background:${data.primaryColor}"><i class="fas fa-envelope"></i> ${content.contactInfo.email}</a>
      </div>
    </div>
  </section>

  <footer class="py-8 px-6 bg-gray-900 text-gray-400 text-center text-sm">
    <p>© 2026 ${data.name}. Built with SiteLaunch AI.</p>
  </footer>
</body>
</html>`;
}

export async function generateWebsite(description: string, businessType?: string): Promise<WebsiteData> {
  const type = businessType || extractBusinessType(description);
  const template = BUSINESS_TEMPLATES[type] || BUSINESS_TEMPLATES.general;
  const name = extractName(description, type);
  const content = template.generateContent(name, description);

  const metadata: WebsiteData["metadata"] = {
    name,
    description,
    businessType: type,
    primaryColor: template.primaryColor,
    secondaryColor: template.secondaryColor,
    fontFamily: template.fontFamily,
    logoText: name
  };

  const html = generateHtml(metadata, content);
  return { html, metadata };
}