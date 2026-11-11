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

// Descriptions are typed by hand and usually arrive as a fragment ("a local real
// estate agent in Port Kennedy helping people buy and sell homes"). Dropped into
// a paragraph as-is it ran on from the business name with no punctuation, so it
// is normalised to a sentence: capital first letter, trailing full stop.
function asSentence(text: string): string {
  const trimmed = (text || "").trim();
  if (!trimmed) return "";
  const capitalised = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capitalised) ? capitalised : `${capitalised}.`;
}

// One `trades` template, three variants. Electricians, plumbers and builders want
// the same shape of site — call-out strip, service cards, service area, licence
// details, photos of past jobs — but different service names and hero line, so the
// variant is picked from the description instead of duplicating the whole template.
type TradeVariant = "electrical" | "plumbing" | "building";

const TRADE_VARIANT_KEYWORDS: Record<TradeVariant, string[]> = {
  electrical: ["electrician", "electrical", "sparky", "solar"],
  plumbing: ["plumber", "plumbing", "blocked drain", "gas fit", "gasfitting", "hot water"],
  building: ["builder", "building", "construction", "renovation", "extension", "carpenter", "concreting", "tiling", "roofing", "landscap", "painter", "painting", "handyman", "deck"],
};

function pickTradeVariant(description: string): TradeVariant {
  const lower = (description || "").toLowerCase();
  for (const variant of ["electrical", "plumbing", "building"] as TradeVariant[]) {
    if (TRADE_VARIANT_KEYWORDS[variant].some((kw) => lower.includes(kw))) return variant;
  }
  // "tradesman"/"trade" match the template without naming a trade — building is
  // the broadest wording, so it is the least wrong guess.
  return "building";
}

const TRADE_VARIANTS: Record<TradeVariant, {
  badge: string;
  heroLine: string;
  services: { title: string; desc: string }[];
}> = {
  electrical: {
    badge: "Electrical",
    heroLine: "Switchboards, lighting, fault finding and new wiring, quoted before we start.",
    services: [
      { title: "Switchboard upgrades", desc: "Older fuse boxes replaced with safety switches and modern circuit protection." },
      { title: "Safety inspections", desc: "Wiring, power points and switchboards checked, with a written list of anything that needs fixing." },
      { title: "New installations", desc: "Power points, circuits and lighting for new rooms, sheds, garages and fit-outs." },
      { title: "Lighting design", desc: "Indoor and outdoor lighting planned around how you actually use the space." },
      { title: "Fault finding", desc: "Tripping circuits and dead power points traced and repaired." },
      { title: "Solar-ready wiring", desc: "Switchboard capacity and cabling prepared so panels can be added later." },
    ],
  },
  plumbing: {
    badge: "Plumbing & gas",
    heroLine: "Blocked drains, hot water, leaks and gas fitting, quoted before we start.",
    services: [
      { title: "Blocked drains", desc: "Drains cleared and camera-checked so you know what caused the blockage." },
      { title: "Hot water systems", desc: "Repairs and replacements for gas, electric and heat-pump units." },
      { title: "Leaks and repairs", desc: "Leaking taps, toilets and pipes found and fixed before they cause damage." },
      { title: "Gas fitting", desc: "Gas appliance installation, servicing and leak testing." },
      { title: "Bathroom renovations", desc: "Rough-in and fit-off plumbing for bathroom and laundry renovations." },
      { title: "New connections", desc: "Water, sewer and stormwater connections for new builds and extensions." },
    ],
  },
  building: {
    badge: "Building & renovations",
    heroLine: "Renovations, extensions and new builds, quoted before we start.",
    services: [
      { title: "Renovations", desc: "Kitchens, bathrooms and whole-of-home renovations managed from demolition to handover." },
      { title: "Extensions", desc: "Single and double-storey extensions tied into the existing structure." },
      { title: "New builds", desc: "New homes built from slab to handover against an agreed scope of work." },
      { title: "Repairs and maintenance", desc: "Structural repairs, patching and general maintenance jobs, big or small." },
      { title: "Decks and pergolas", desc: "Timber and composite decks, pergolas and carports built to plan." },
      { title: "Project management", desc: "Trades, approvals and timelines coordinated so you deal with one builder." },
    ],
  },
};

// One `legal` template, two variants. A law firm and an accounting practice want
// the same page shape — practice areas, how a matter runs, credentials, fees,
// office — but different practice-area names and credential wording, so the
// variant is picked from the description instead of duplicating the template.
type LegalVariant = "legal" | "accounting";

const LEGAL_VARIANT_KEYWORDS: Record<LegalVariant, string[]> = {
  legal: ["solicitor", "lawyer", "law firm", "law practice", "legal practice", "conveyanc", "barrister", "family law", "wills", "estate planning", "litigation", "legal advice", "legal services"],
  accounting: ["accountant", "accounting", "bookkeep", "tax agent", "tax return", "chartered accountant", "cpa", "payroll", "bas agent", "bas lodgement", "auditor"],
};

function pickLegalVariant(description: string): LegalVariant {
  const lower = (description || "").toLowerCase();
  for (const variant of ["legal", "accounting"] as LegalVariant[]) {
    if (LEGAL_VARIANT_KEYWORDS[variant].some((kw) => lower.includes(kw))) return variant;
  }
  // Matched the template without naming a practice — solicitors are the broader
  // reading of "legal & accounting", so legal is the least wrong guess.
  return "legal";
}

const LEGAL_VARIANTS: Record<LegalVariant, {
  badge: string;
  heroLine: string;
  credentialsHeading: string;
  credentialItems: { label: string; value: string }[];
  practiceAreas: { title: string; desc: string }[];
}> = {
  legal: {
    badge: "Solicitors & conveyancing",
    heroLine: "Conveyancing, family law, wills and estates, and business matters, explained in plain language.",
    credentialsHeading: "Qualified and accountable",
    credentialItems: [
      { label: "Practising certificate", value: "[Your practising certificate]" },
      { label: "ABN", value: "[Your ABN]" },
      { label: "Professional body", value: "[Your professional body membership]" },
      { label: "In practice", value: "[Years in practice]" },
    ],
    practiceAreas: [
      { title: "Conveyancing", desc: "Contracts, searches and settlement for buying or selling a property, with each step explained as it happens." },
      { title: "Family law", desc: "Separation, parenting arrangements and property matters, working towards agreement before court where that is possible." },
      { title: "Wills & estates", desc: "Wills, powers of attorney and probate, drafted around what you want to happen." },
      { title: "Employment", desc: "Contracts, unfair dismissal and workplace disputes for employers and employees." },
      { title: "Business law", desc: "Company setup, commercial contracts, leases and shareholder agreements for small businesses." },
      { title: "Dispute resolution", desc: "Letters of demand, mediation and court work when a disagreement cannot be settled between the parties." },
    ],
  },
  accounting: {
    badge: "Accountants & bookkeepers",
    heroLine: "Tax returns, bookkeeping and BAS, company setup and business advisory, explained in plain language.",
    credentialsHeading: "Registered and accountable",
    credentialItems: [
      { label: "Registration", value: "[Your registration type]" },
      { label: "ABN", value: "[Your ABN]" },
      { label: "Professional body", value: "[Your professional body membership]" },
      { label: "In practice", value: "[Years in practice]" },
    ],
    practiceAreas: [
      { title: "Tax returns", desc: "Individual and business returns prepared and lodged, with the records needed listed up front." },
      { title: "Bookkeeping & BAS", desc: "Regular bookkeeping and BAS lodgement, so the figures are current before year end." },
      { title: "Company & trust setup", desc: "Company, trust and ABN registrations set up, with the structure explained in plain language." },
      { title: "Payroll", desc: "Payroll processing, superannuation and payroll reporting for your team." },
      { title: "Business advisory", desc: "Cash flow, budgeting and structure reviews when you are making a decision about the business." },
      { title: "Audit support", desc: "Records and reconciliations prepared for an audit or a review, with what is needed listed clearly." },
    ],
  },
};

// One `portfolio` template, three variants. A photographer, a celebrant and a venue
// want the same gallery-first page shape — gallery, packages, how booking works,
// approach, where I work, contact — but different packages, call to action and hire
// detail block, so the variant is picked from the description instead of duplicating
// the whole template.
type PortfolioVariant = "photographer" | "celebrant" | "venue";

// Multi-word or unambiguous wording only. Bare "photo", "venue", "studio", "space",
// "event", "wedding", "hire", "booking" and "services" are deliberately absent: they
// would swallow restaurants with function rooms, generic studios and event catering,
// which must keep falling through to `general`.
const PORTFOLIO_VARIANT_KEYWORDS: Record<PortfolioVariant, string[]> = {
  photographer: ["photographer", "photography", "photo studio", "portrait photographer", "wedding photographer", "headshot", "portrait session"],
  celebrant: ["celebrant", "marriage celebrant", "wedding celebrant", "funeral celebrant", "naming ceremony", "vow renewal"],
  venue: ["wedding venue", "function room", "function centre", "function center", "event space", "reception venue", "venue hire", "hire the venue"],
};

function pickPortfolioVariant(description: string): PortfolioVariant {
  const lower = (description || "").toLowerCase();
  for (const variant of ["photographer", "celebrant", "venue"] as PortfolioVariant[]) {
    if (PORTFOLIO_VARIANT_KEYWORDS[variant].some((kw) => lower.includes(kw))) return variant;
  }
  // Matched the template without naming which — photography is the broadest reading
  // of "portfolio businesses", so photographer is the least wrong guess.
  return "photographer";
}

const PORTFOLIO_VARIANTS: Record<PortfolioVariant, {
  badge: string;
  heroLine: string;
  cta: string;
  galleryHeading: string;
  galleryTag: string;
  packages: { title: string; desc: string }[];
  bookingSteps: { title: string; desc: string }[];
  approachHeading: string;
  approachLine: string;
  areaEyebrow: string;
  areaLead: string;
  areaNote: string;
  hireDetails?: { eyebrow: string; heading: string; note: string; items: { label: string; value: string }[] };
}> = {
  photographer: {
    badge: "Photography",
    heroLine: "Weddings, portraits and events, photographed in [Suburb] and surrounds.",
    cta: "Check availability",
    galleryHeading: "Recent work",
    galleryTag: "Photograph",
    packages: [
      { title: "Half-day coverage", desc: "Up to [Your hours] on the day for a ceremony, portrait session or event, with the edited photographs delivered afterwards." },
      { title: "Full-day coverage", desc: "Coverage from preparation through to the end of the day, with the edited photographs delivered afterwards." },
      { title: "Portrait session", desc: "A shorter studio or outdoor session for headshots, couples or family photographs, with the edited photographs delivered afterwards." },
    ],
    bookingSteps: [
      { title: "Enquire", desc: "Send your date, the location and what you have in mind, and you get a reply with availability." },
      { title: "Date and quote confirmed", desc: "The package, the coverage and the price are agreed in writing before anything is locked in." },
      { title: "Booking secured", desc: "A deposit and a signed agreement secure the date, and the shoot is planned from there." },
    ],
    approachHeading: "How I work",
    approachLine: "Every booking is planned around your date, the location and what you want the photographs for, so nothing on the day is improvised.",
    areaEyebrow: "Where I work",
    areaLead: "Based in [Suburb], working across [Suburb 2] and surrounds",
    areaNote: "Placeholder suburbs — replace with the areas you work in. Travel outside [Suburb] is quoted with the package, and sessions run by appointment.",
  },
  celebrant: {
    badge: "Marriage & funeral celebrancy",
    heroLine: "Marriage, funeral and naming ceremonies, written with you and held in [Suburb] and surrounds.",
    cta: "Enquire about your date",
    galleryHeading: "Recent ceremonies",
    galleryTag: "Ceremony",
    packages: [
      { title: "Marriage ceremony", desc: "The ceremony written with you, a run-through before the day, and the paperwork lodged after the ceremony." },
      { title: "Funeral or memorial service", desc: "A service written with the family, with help preparing the eulogy and the order of service, held where the family chooses." },
      { title: "Naming ceremony", desc: "A welcome for a new child, written with the family and held wherever suits you." },
    ],
    bookingSteps: [
      { title: "Enquire about your date", desc: "Send your date and the kind of ceremony, and you get a reply confirming whether the date is free." },
      { title: "Date and quote confirmed", desc: "We talk through the ceremony you want, and the date and the price are confirmed in writing." },
      { title: "Booking secured", desc: "The booking is secured and the notice and paperwork requirements are set out for you." },
    ],
    approachHeading: "How I work",
    approachLine: "Ceremonies are written with you — the words are yours, and there is a run-through before the day.",
    areaEyebrow: "Where I work",
    areaLead: "Based in [Suburb], officiating in [Suburb 2] and surrounds",
    areaNote: "Placeholder suburbs — replace with the areas you travel to. [Your notice period] is needed before a date can be confirmed.",
  },
  venue: {
    badge: "Venue hire",
    heroLine: "A [Suburb] venue for weddings, parties and functions, with capacity and hire details confirmed on enquiry.",
    cta: "Check availability",
    galleryHeading: "The venue",
    galleryTag: "Venue",
    packages: [
      { title: "Ceremony and reception", desc: "Hire of the ceremony space and the reception room, with tables and seating set up as agreed." },
      { title: "Function hire", desc: "Hire of the function room for an agreed period, with the layout and access times confirmed beforehand." },
      { title: "Exclusive-use day", desc: "Exclusive use of the venue for the day, including set-up and pack-down time." },
    ],
    bookingSteps: [
      { title: "Enquire", desc: "Send your date, your guest numbers and what the event is, and you get a reply with availability." },
      { title: "Inspection and quote", desc: "Come and look through the venue, and the hire period and the price are confirmed in writing." },
      { title: "Booking secured", desc: "A deposit and a signed hire agreement secure the date." },
    ],
    approachHeading: "About the venue",
    approachLine: "Hire is arranged around your date, your guest numbers and how you want the room set up.",
    areaEyebrow: "Where to find us",
    areaLead: "At [Suburb], with guests travelling from [Suburb 2] and surrounds",
    areaNote: "Placeholder suburbs — replace with your own location and the areas your guests travel from. Access times are confirmed with the hire agreement.",
    // Capacity and hire terms are placeholders. Nothing here is invented: the venue
    // types in its own capacity, hire period, inclusions and deposit terms.
    hireDetails: {
      eyebrow: "Hire details",
      heading: "Capacity and hire",
      note: "Placeholder details — replace with your own capacity, hire periods, inclusions and deposit terms.",
      items: [
        { label: "Capacity", value: "[Your capacity]" },
        { label: "Hire period", value: "[Your hire period]" },
        { label: "Included", value: "[What's included]" },
        { label: "Deposit", value: "[Your deposit terms]" },
      ],
    },
  },
};

// One `health` template, two variants. An allied health practice and a veterinary
// clinic want the same appointment-led page shape — appointment types, the team,
// what to expect, fees and rebates, location and hours — but different appointment
// names, fee wording and after-hours handling, so the variant is picked from the
// description instead of duplicating the whole template.
type HealthVariant = "allied" | "vet";

// Named professions and multi-word clinic wording only. Bare "health", "clinic",
// "care", "therapy", "vet", "medical", "doctor" and "services" are deliberately
// absent: they would swallow a medical centre, a childcare centre and every generic
// "services" business, which must keep falling through to their own template.
const HEALTH_VARIANT_KEYWORDS: Record<HealthVariant, string[]> = {
  allied: ["physiotherapist", "physiotherapy", "physio", "chiropractor", "chiropractic", "osteopath", "podiatrist", "podiatry", "myotherapist", "remedial massage", "occupational therapist", "speech pathologist", "psychologist", "dietitian", "allied health"],
  vet: ["veterinary clinic", "vet clinic", "veterinarian", "animal hospital", "vet hospital", "veterinary surgeon", "veterinary practice", "vet practice"],
};

function pickHealthVariant(description: string): HealthVariant {
  const lower = (description || "").toLowerCase();
  for (const variant of ["allied", "vet"] as HealthVariant[]) {
    if (HEALTH_VARIANT_KEYWORDS[variant].some((kw) => lower.includes(kw))) return variant;
  }
  // Matched the template without naming a profession — allied health is the broader
  // reading of "allied health & veterinary", so allied is the least wrong guess.
  return "allied";
}

const HEALTH_VARIANTS: Record<HealthVariant, {
  badge: string;
  heroLine: string;
  appointmentHeading: string;
  appointmentNote: string;
  appointments: { title: string; desc: string }[];
  teamEyebrow: string;
  teamHeading: string;
  teamNote: string;
  teamIcon: string;
  stepsNote: string;
  steps: { title: string; desc: string }[];
  fees: { eyebrow: string; heading: string; text: string; placeholder: string; extra: string; note: string };
  office: { eyebrow: string; heading: string; lead: string; note: string };
  afterHours?: string;
}> = {
  allied: {
    badge: "Allied health",
    heroLine: "Assessment, treatment and ongoing care, by appointment in [Suburb] and surrounds.",
    appointmentHeading: "Appointment types",
    appointmentNote: "Every appointment is booked in advance. Tell us what you need help with when you book, so the right appointment type and length are set.",
    appointments: [
      { title: "Initial consultation", desc: "A first appointment to hear what brought you in, take a history and assess what is going on, with the findings explained to you." },
      { title: "Standard follow-up", desc: "A shorter appointment to continue treatment and review how things have gone since your last visit." },
      { title: "Extended consultation", desc: "A longer appointment for more than one issue, or where there is more to work through." },
      { title: "Care plan review", desc: "A scheduled review of your written care plan and your goals, with the plan updated as things change." },
      { title: "Telehealth appointment", desc: "An appointment by video where coming in is not practical, confirmed as an option when you book." },
      { title: "Referral appointment", desc: "An appointment booked on a referral from your GP or another practitioner, with the referral noted when you book." },
    ],
    teamEyebrow: "Our team",
    teamHeading: "Your practitioners",
    teamNote: "Placeholder bios — replace with your own practitioners' names, qualifications, special interests and the days they are available. Registration details are the practice's to supply.",
    teamIcon: "fa-user-md",
    stepsNote: "Three steps, the same for every appointment.",
    steps: [
      { title: "Book an appointment", desc: "Book online or by phone, and say what you would like help with so the right appointment type and length are set." },
      { title: "Your first appointment", desc: "Your practitioner takes a history, assesses what is going on and talks through the options with you. Referral and paperwork requirements are set out when you book: [Your referral requirements]." },
      { title: "Ongoing plan", desc: "You leave with a written plan setting out what was found, what happens next and when to book again." },
    ],
    // Fees and rebates are the honesty-critical block: no fee, no gap and no rebate
    // amount is knowable here, so every figure is the practice's own placeholder and
    // any rebate is described as conditional on the provider and the client's cover.
    fees: {
      eyebrow: "Fees and rebates",
      heading: "Fees are confirmed when you book",
      text: "The fee for each appointment type is confirmed when you book, and it is set out on our fee schedule. Any rebate depends on the provider or fund involved — a health fund, a government scheme or a compensable claim — and on your level of cover, so it differs from one client to the next. Ask before you book if you need to know what your cover provides.",
      placeholder: "[Your fee schedule]",
      extra: "[Your rebate information]",
      note: "No fees and no rebate amounts are shown on this page. Replace this with your own fee schedule and your own rebate information, including the funds and providers you are recognised by.",
    },
    office: {
      eyebrow: "Location and hours",
      heading: "Where to find us",
      lead: "At [Suburb], with clients travelling from [Suburb 2] and surrounds",
      note: "Placeholder details — replace with your own clinic address, the suburbs you serve and your opening hours.",
    },
  },
  vet: {
    badge: "Veterinary clinic",
    heroLine: "Appointments for check-ups, vaccinations and ongoing care, at [Suburb].",
    appointmentHeading: "Appointment types",
    appointmentNote: "Every appointment is booked in advance. Tell us what your animal needs when you book, so the right appointment type is set.",
    appointments: [
      { title: "General check-up", desc: "A routine examination, with what was found, what to watch for and what happens next explained at the visit." },
      { title: "Vaccination appointment", desc: "A scheduled vaccination appointment, with the due dates and the records confirmed at the visit." },
      { title: "New puppy or kitten visit", desc: "A first appointment for a new puppy or kitten, covering the checks and the questions you have about care at home." },
      { title: "Dental appointment", desc: "A dental check, with any scale and polish booked as a separate appointment and confirmed with you beforehand." },
      { title: "Senior animal check", desc: "A check-up for older animals, looking at mobility, weight and comfort, with the findings talked through with you." },
      { title: "Post-operative recheck", desc: "A follow-up appointment after surgery or a procedure, to check healing and answer your questions." },
    ],
    teamEyebrow: "Our team",
    teamHeading: "Our vets and nurses",
    teamNote: "Placeholder bios — replace with your own team's names, qualifications, special interests and the days they are available. Registration details are the clinic's to supply.",
    teamIcon: "fa-paw",
    stepsNote: "Three steps, the same for every appointment.",
    steps: [
      { title: "Book an appointment", desc: "Book online or by phone, and say what kind of appointment your animal needs and how they travel." },
      { title: "Your first visit", desc: "Bring [What to bring] — records from a previous clinic, current medication and vaccination history — and the vet goes through it with you." },
      { title: "Ongoing care", desc: "Any treatment is explained to you, and the cost of it is confirmed with you before treatment begins." },
    ],
    fees: {
      eyebrow: "Fees and rebates",
      heading: "Costs are confirmed before treatment begins",
      text: "The cost of a consultation, and of any treatment that follows it, is confirmed with you before treatment begins. If your animal is insured, any rebate depends on your insurer and your level of cover — it is paid by the insurer, and it differs from one policy to the next. Ask at booking if you need to know what your cover includes.",
      placeholder: "[Your fee schedule]",
      extra: "[Your rebate information]",
      note: "No costs and no rebate amounts are shown on this page. Replace this with your own fee schedule and your own rebate information, including the insurers you work with.",
    },
    office: {
      eyebrow: "Location and hours",
      heading: "Where to find us",
      lead: "At [Suburb], with clients travelling from [Suburb 2] and surrounds",
      note: "Placeholder details — replace with your own clinic address, opening hours and after-hours arrangement.",
    },
    // No "24/7" and no emergency-service claim: the clinic supplies its own wording.
    afterHours: "[Your after-hours arrangement]",
  },
};

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
      aboutText: `Welcome to ${name}. ${desc ? asSentence(desc) : "We are a passion-driven culinary destination dedicated to bringing you an exceptional dining experience."}`,
      services: [
        { title: "Fine Dining", desc: "Multi-course menu paired with exceptional wines.", price: "[Your price]" },
        { title: "Private Events", desc: "Celebrate special occasions with custom catering.", price: "[Your price]" },
        { title: "Express Takeout", desc: "Enjoy your favorite dishes at home.", price: "[Your price]" }
      ],
      testimonials: [
        {
          name: "[Customer name]",
          text: "Sample review — replace with a real customer quote.",
          role: "[Customer role]",
          stars: 0
        },
        {
          name: "[Customer name]",
          text: "Sample review — replace with a real customer quote.",
          role: "[Customer role]",
          stars: 0
        }
      ],
      contactInfo: {
        address: "[Your street address]",
        phone: "[Your phone number]",
        email: "[your@email]",
        hours: "[Your opening hours]"
      }
    })
  },
  gym: {
    icon: "💪",
    keywords: ["gym", "fitness", "workout", "crossfit", "training", "coach", "bodybuilding", "pilates", "exercise"],
    defaultName: "Iron Strength Gym",
    primaryColor: "#dc2626",
    secondaryColor: "#171717",
    fontFamily: "'Montserrat', sans-serif",
    generateContent: (name: string, desc: string) => ({
      heroTitle: `Unleash Your Potential at ${name}`,
      heroSubtitle: `No excuses. Just results. Join the premier fitness community.`,
      aboutText: desc
        ? `${name}. ${asSentence(desc)}`
        : `At ${name}, we believe fitness is a lifestyle. Our elite coaches and motivating classes help you shatter your limits.`,
      services: [
        { title: "Personal Training", desc: "One-on-one tailored fitness programming.", price: "[Your price]" },
        { title: "Group Classes", desc: "HIIT, CrossFit, and strength conditioning.", price: "[Your price]" },
        { title: "Open Gym", desc: "24/7 access to top-of-the-line equipment.", price: "[Your price]" }
      ],
      testimonials: [
        {
          name: "[Customer name]",
          text: "Sample review — replace with a real customer quote.",
          role: "[Customer role]",
          stars: 0
        },
        {
          name: "[Customer name]",
          text: "Sample review — replace with a real customer quote.",
          role: "[Customer role]",
          stars: 0
        }
      ],
      contactInfo: {
        address: "[Your street address]",
        phone: "[Your phone number]",
        email: "[your@email]",
        hours: "[Your opening hours]"
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
      aboutText: desc
        ? `${name}. ${asSentence(desc)}`
        : `${name} is a luxury beauty destination offering premium hair, nail, and skincare services. Our expert stylists bring out your best.`,
      services: [
        { title: "Signature Hair", desc: "Cut, color, and styling by master stylists.", price: "[Your price]" },
        { title: "Luxury Facial", desc: "Rejuvenating treatments for radiant skin.", price: "[Your price]" },
        { title: "Nail Art", desc: "Custom designs from gel to acrylic.", price: "[Your price]" }
      ],
      testimonials: [
        {
          name: "[Customer name]",
          text: "Sample review — replace with a real customer quote.",
          role: "[Customer role]",
          stars: 0
        },
        {
          name: "[Customer name]",
          text: "Sample review — replace with a real customer quote.",
          role: "[Customer role]",
          stars: 0
        }
      ],
      contactInfo: {
        address: "[Your street address]",
        phone: "[Your phone number]",
        email: "[your@email]",
        hours: "[Your opening hours]"
      }
    })
  },
  health: {
    icon: "🩺",
    // Named professions and multi-word clinic wording only — no bare "health",
    // "clinic", "care", "therapy", "vet", "medical", "doctor" or "services". This
    // entry sits BEFORE `dentist` on purpose: the dentist entry owns the bare keyword
    // "clinic", so without that "a veterinary clinic in Joondalup" would route to
    // dentistry. It carries no dentist wording, so "a dentist in Perth" still lands
    // on `dentist`.
    keywords: [...HEALTH_VARIANT_KEYWORDS.allied, ...HEALTH_VARIANT_KEYWORDS.vet],
    defaultName: "Your Clinic",
    // Deep-green accent on a near-black green. secondaryColor drives the dark hero and
    // the availability / location panels, so darkHero is set: generateHtml then paints
    // the hero dark with white headings and forces the contact section light.
    primaryColor: "#059669",
    secondaryColor: "#0b2b26",
    fontFamily: "'Inter', sans-serif",
    generateContent: (name: string, desc: string) => {
      const variant = pickHealthVariant(desc);
      const v = HEALTH_VARIANTS[variant];
      return {
        healthVariant: variant,
        darkHero: true,
        // The clinic name is the headline; the customer's own description is the
        // sub-line. No invented tagline and no claim about outcomes.
        heroBadge: v.badge,
        heroTitle: name,
        heroSubtitle: desc ? asSentence(desc) : v.heroLine,
        ctaPrimary: { label: "Book an appointment", href: "#contact" },
        // No booking form: a form that posts nowhere is a fake. Phone only.
        ctaSecondary: { label: "Call [Your phone number]", href: "tel:[Your phone number]" },
        navLinks: [
          { label: "Our team", href: "#practitioners" },
          { label: "What to expect", href: "#process" },
          { label: "Fees", href: "#fees" },
          { label: v.office.eyebrow, href: "#office" }
        ],
        // An appointment-led page is appointment types, the team, what to expect, fees
        // and rebates, location and contact — not an "about us" essay plus review cards,
        // so the two standard sections are switched off for this template only.
        hideAbout: true,
        hideTestimonials: true,
        // Vet only: the clinic's own after-hours arrangement, never "24/7" and never an
        // emergency-service claim.
        availability: v.afterHours ? { text: "After hours", detail: v.afterHours } : undefined,
        servicesEyebrow: "Appointment types",
        servicesHeading: v.appointmentHeading,
        servicesNavLabel: "Appointments",
        servicesNote: v.appointmentNote,
        // Each card is something a patient or client books, not a marketing feature.
        // No price on a card: fees are confirmed at booking (see the fees block).
        services: v.appointments.map((a) => ({ title: a.title, desc: a.desc, price: "" })),
        // Practitioner bios are placeholders only: no invented names, qualifications,
        // registrations, years in practice or photos.
        practitioners: {
          eyebrow: v.teamEyebrow,
          heading: v.teamHeading,
          note: v.teamNote,
          icon: v.teamIcon,
          items: [1, 2, 3].map(() => ({
            name: "[Practitioner name]",
            details: [
              { label: "Qualification", value: "[Qualification]" },
              { label: "Special interest", value: "[Special interest]" },
              { label: "Days available", value: "[Days available]" }
            ]
          }))
        },
        processSteps: {
          heading: "What to expect",
          note: v.stepsNote,
          steps: v.steps
        },
        // Fees and rebates: no fee, no gap and no rebate amount is stated anywhere. Both
        // figures are the clinic's own placeholders and every rebate is conditional on
        // the provider and the client's level of cover.
        fees: v.fees,
        // Clinic location and hours. Hours are the clinic's own, never "24/7".
        office: {
          eyebrow: v.office.eyebrow,
          heading: v.office.heading,
          lead: v.office.lead,
          address: "[Your street address], [Suburb]",
          hours: "[Your opening hours]",
          note: v.office.note,
          suburbs: ["[Suburb 1]", "[Suburb 2]", "[Suburb 3]", "[Suburb 4]"]
        },
        contactInfo: {
          address: "[Your street address]",
          phone: "[Your phone number]",
          phoneLink: true,
          email: "[Your email]",
          hours: "[Your opening hours]",
          // One short line so nobody mistakes a generated page for clinical advice.
          note: "This page is general information only and is not medical or veterinary advice."
        }
      };
    }
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
      aboutText: desc
        ? `${name}. ${asSentence(desc)}`
        : `${name} provides comprehensive dental care with cutting-edge technology. Your comfort and smile are our top priorities.`,
      services: [
        { title: "General Dentistry", desc: "Cleanings, exams, and preventive care.", price: "[Your price]" },
        { title: "Cosmetic", desc: "Whitening, veneers, and smile makeovers.", price: "[Your price]" },
        { title: "Orthodontics", desc: "Invisalign and braces for all ages.", price: "[Your price]" }
      ],
      testimonials: [
        {
          name: "[Customer name]",
          text: "Sample review — replace with a real customer quote.",
          role: "[Customer role]",
          stars: 0
        },
        {
          name: "[Customer name]",
          text: "Sample review — replace with a real customer quote.",
          role: "[Customer role]",
          stars: 0
        }
      ],
      contactInfo: {
        address: "[Your street address]",
        phone: "[Your phone number]",
        email: "[your@email]",
        hours: "[Your opening hours]"
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
      aboutText: desc
        ? `${name}. ${asSentence(desc)}`
        : `${name} is a welcoming space where you can step away from the noise of daily life and reconnect with yourself through mindful movement and breath.`,
      services: [
        { title: "Vinyasa Flow", desc: "Dynamic sequences linking breath with movement.", price: "[Your price]" },
        { title: "Sound Healing", desc: "Restorative sessions with singing bowls.", price: "[Your price]" },
        { title: "Private Sessions", desc: "One-on-one guidance tailored to you.", price: "[Your price]" }
      ],
      testimonials: [
        {
          name: "[Customer name]",
          text: "Sample review — replace with a real customer quote.",
          role: "[Customer role]",
          stars: 0
        },
        {
          name: "[Customer name]",
          text: "Sample review — replace with a real customer quote.",
          role: "[Customer role]",
          stars: 0
        }
      ],
      contactInfo: {
        address: "[Your street address]",
        phone: "[Your phone number]",
        email: "[your@email]",
        hours: "[Your opening hours]"
      }
    })
  },
  realestate: {
    icon: "🏡",
    // Real-estate wording only. The bare word "agent" is deliberately absent —
    // it would swallow travel agents and insurance brokers.
    keywords: ["real estate", "realtor", "realty", "estate agent", "property", "properties", "listing", "listings", "appraisal", "homes for sale", "house and land", "buyer's agent", "mortgage broker"],
    defaultName: "Your Agency Name",
    primaryColor: "#1e3a5f",
    secondaryColor: "#f7f4ef",
    fontFamily: "'Inter', sans-serif",
    generateContent: (name: string, desc: string) => ({
      // Serif headings over the sans body set above.
      headingFontFamily: "'Playfair Display', serif",
      heroBadge: "Property sales & appraisals",
      heroTitle: name,
      heroSubtitle: desc ? asSentence(desc) : "Local property sales, buyer representation and free appraisals, from first meeting to settlement.",
      ctaPrimary: { label: "Book a free appraisal", href: "#contact" },
      ctaSecondary: { label: "View listings", href: "#listings" },
      navLinks: [
        { label: "Listings", href: "#listings" },
        { label: "How it works", href: "#process" }
      ],
      aboutHeading: "About your agent",
      aboutText: desc
        ? `${name}. ${asSentence(desc)}`
        : `${name} helps people buy and sell property locally, from the first appraisal through to settlement.`,
      servicesHeading: "What I Do",
      services: [
        { title: "Selling your home", desc: "Appraisal, marketing campaign and negotiation, handled from listing through to settlement.", price: "" },
        { title: "Buying with confidence", desc: "Shortlisting, inspections and offers, with the paperwork looked after for you.", price: "" },
        { title: "Free property appraisal", desc: "An honest opinion of what your property is worth today, with no obligation to list.", price: "" }
      ],
      // Every factual field on a listing card is a visible placeholder — no
      // addresses, suburbs, prices or dates are invented for the customer.
      listings: {
        heading: "Current Listings",
        note: "Placeholder listings — replace each field with your own property details.",
        items: [0, 1, 2].map(() => ({
          suburb: "[Suburb]",
          type: "[Property type]",
          spec: "[X] bed · [X] bath · [X] car",
          price: "[Sale price]",
          status: "[Sold date]"
        }))
      },
      processSteps: {
        heading: "How Selling Works",
        note: "The same three steps for every property. No two campaigns are identical.",
        steps: [
          { title: "Appraisal", desc: "We walk through the property, agree a realistic price guide and set the plan for the campaign." },
          { title: "Campaign", desc: "Photography, listing copy and inspections are arranged, then offers are presented and negotiated." },
          { title: "Sold", desc: "Contracts are exchanged and the sale is managed through to settlement." }
        ]
      },
      testimonials: [
        {
          name: "[Customer name]",
          text: "Sample review — replace with a real customer quote.",
          role: "[Customer role]",
          stars: 0
        },
        {
          name: "[Customer name]",
          text: "Sample review — replace with a real customer quote.",
          role: "[Customer role]",
          stars: 0
        }
      ],
      contactInfo: {
        address: "[Your street address]",
        phone: "[Your phone number]",
        email: "[Your email]",
        hours: "[Your opening hours]",
        // WA agents must display a licence/registration number, so this is a
        // placeholder field rather than a made-up credential.
        licence: "[Your licence number]"
      }
    })
  },
  trades: {
    icon: "🔧",
    // Trade wording only, and deliberately no bare "services": the general entry
    // below owns "services"/"agency"/"studio"/"shop", so this entry has to sit
    // before it without stealing those businesses.
    keywords: ["electrician", "electrical", "sparky", "plumber", "plumbing", "blocked drain", "gas fitting", "builder", "building", "construction", "renovation", "extensions", "carpenter", "concreting", "tiling", "tiler", "roofing", "roofer", "landscaper", "landscaping", "painter", "painting", "handyman", "trade", "tradesman"],
    defaultName: "Your Trade Business",
    // Hi-vis orange accent on dark slate. secondaryColor is the dark slate: it
    // drives the dark hero and the availability / service-area panels, and
    // generateHtml forces the contact section light when darkHero is set, so no
    // heading ever lands dark-on-dark.
    primaryColor: "#ea580c",
    secondaryColor: "#0f172a",
    fontFamily: "'Inter', sans-serif",
    generateContent: (name: string, desc: string) => {
      const variant = pickTradeVariant(desc);
      const v = TRADE_VARIANTS[variant];
      return {
        tradeVariant: variant,
        darkHero: true,
        heroBadge: v.badge,
        // The business name is the headline; the customer's own one-line
        // description is the sub-line.
        heroTitle: name,
        heroSubtitle: desc ? asSentence(desc) : v.heroLine,
        ctaPrimary: { label: "Get a free quote", href: "#contact" },
        // No quote form: a form that posts nowhere is a fake. Phone and email only.
        ctaSecondary: { label: "Call [Your phone number]", href: "tel:[Your phone number]" },
        navLinks: [
          { label: "What we do", href: "#services" },
          { label: "Service area", href: "#service-area" },
          { label: "Our work", href: "#work" }
        ],
        // Availability is a placeholder the customer fills in — never "24/7".
        availability: { text: "Same-day call-outs", detail: "[Your hours]" },
        aboutHeading: "Who you're calling",
        aboutText: `${name}. ${desc ? asSentence(desc) : v.heroLine} Every job starts with a quote, so you know what is being done and what it costs before any work begins.`,
        servicesHeading: "What We Do",
        services: v.services.map((s) => ({ title: s.title, desc: s.desc, price: "" })),
        serviceArea: {
          eyebrow: "Service Area",
          heading: "Service Area",
          lead: "Servicing [Your suburb] and surrounds",
          note: "Placeholder suburbs — replace these with the areas you actually cover.",
          suburbs: ["[Suburb 1]", "[Suburb 2]", "[Suburb 3]", "[Suburb 4]"]
        },
        // Credentials are placeholders. Nothing here is invented: the customer
        // types in their own licence, ABN and insurer.
        credentials: {
          heading: "Licensed, insured and accountable",
          note: "Placeholder details — replace with your own licence number, ABN, insurer and years in business.",
          items: [
            { label: "Licence", value: "[Your licence number]" },
            { label: "ABN", value: "[Your ABN]" },
            { label: "Insured by", value: "[Your insurer]" },
            { label: "In business", value: "[Years in business]" }
          ]
        },
        // Photo tiles, not photos. No generated or stock imagery goes anywhere.
        workGallery: {
          heading: "Before & After",
          note: "Add photos of your own work — these tiles are placeholders, not examples.",
          items: [0, 1, 2].map(() => ({
            label: "Add a photo of your work",
            tag: "Before / After",
            caption: "[Job description]"
          }))
        },
        testimonials: [
          {
            name: "[Customer name]",
            text: "Sample review — replace with a real customer quote.",
            role: "[Customer role]",
            stars: 0
          },
          {
            name: "[Customer name]",
            text: "Sample review — replace with a real customer quote.",
            role: "[Customer role]",
            stars: 0
          }
        ],
        contactInfo: {
          address: "[Your street address]",
          phone: "[Your phone number]",
          phoneLink: true,
          email: "[Your email]",
          hours: "[Your opening hours]"
        }
      };
    }
  },
  legal: {
    icon: "⚖️",
    // Practice wording only, and no bare "law", "tax", "firm", "advice" or
    // "services": a taxi service, a law-adjacent shop or a generic firm must
    // still fall through to `general`. Multi-word keywords only.
    keywords: ["solicitor", "lawyer", "law firm", "law practice", "legal practice", "conveyancer", "conveyancing", "barrister", "family law", "wills and estates", "wills & estates", "estate planning", "litigation", "accountant", "accounting", "bookkeeper", "bookkeeping", "tax agent", "tax return", "chartered accountant", "payroll services"],
    defaultName: "Your Practice",
    // Bronze accent on deep navy, the way a practice site usually reads. The
    // secondary colour is dark: it drives the dark hero and the office panel, and
    // generateHtml forces the contact section light when darkHero is set.
    primaryColor: "#b45309",
    secondaryColor: "#0f172a",
    fontFamily: "'Inter', sans-serif",
    generateContent: (name: string, desc: string) => {
      const variant = pickLegalVariant(desc);
      const v = LEGAL_VARIANTS[variant];
      return {
        legalVariant: variant,
        darkHero: true,
        // The practice name is the headline; the customer's own description is
        // the sub-line. No invented tagline or claim.
        heroBadge: v.badge,
        heroTitle: name,
        heroSubtitle: desc ? asSentence(desc) : v.heroLine,
        ctaPrimary: { label: "Book a consultation", href: "#contact" },
        // No enquiry form: a form that posts nowhere is a fake. Phone only.
        ctaSecondary: { label: "Call [Your phone number]", href: "tel:[Your phone number]" },
        navLinks: [
          { label: "Practice areas", href: "#services" },
          { label: "How it works", href: "#process" },
          { label: "Fees", href: "#fees" },
          { label: "Office", href: "#office" }
        ],
        // A practice page is practice areas, how a matter runs, credentials, fees,
        // office and contact — not an "about us" essay plus review cards, so the
        // two standard sections are switched off for this template only.
        hideAbout: true,
        hideTestimonials: true,
        servicesHeading: "Practice areas",
        services: v.practiceAreas.map((p) => ({ title: p.title, desc: p.desc, price: "" })),
        processSteps: {
          heading: "How it works",
          note: "Three steps, the same for every matter.",
          steps: [
            { title: "First meeting", desc: "We talk through what you need and the documents you already have, and set out the options in plain language." },
            { title: "We handle the paperwork", desc: "Drafting, lodgement and correspondence are handled for you, with a list of what is needed from you at each stage." },
            { title: "You are kept informed", desc: "You get an update at each milestone, and you can call your contact directly with a question." }
          ]
        },
        // Credentials are placeholders. Nothing here is invented: the practice
        // types in its own certificate, registration, ABN and memberships.
        credentials: {
          heading: v.credentialsHeading,
          note: "Placeholder details — replace with your own registration, ABN, professional body memberships and years in practice.",
          items: v.credentialItems
        },
        // Fees are quoted per matter. No price, no "fixed fee", no "free
        // consultation", no success rate, no award — none of that is knowable here.
        fees: {
          eyebrow: "Fees",
          heading: "Fees are quoted per matter",
          text: "Every matter is different, so fees are quoted per matter after the first meeting, once we know what is involved. You are told what it will cost before any work starts.",
          placeholder: "[Your fee structure]",
          note: "No prices are shown on this page. Replace this with your own fee structure — hourly rates, fixed-fee options or scale fees."
        },
        // Office and service area. Hours are the practice's own, never "24/7".
        office: {
          eyebrow: "Office",
          heading: "Where to find us",
          lead: "Based in [Suburb], working with clients across [Suburb 2] and surrounds",
          address: "[Your street address], [Suburb]",
          hours: "[Your opening hours]",
          note: "Placeholder details — replace with your own office address, the suburbs you service and your opening hours.",
          suburbs: ["[Suburb 1]", "[Suburb 2]", "[Suburb 3]", "[Suburb 4]"]
        },
        contactInfo: {
          address: "[Your street address]",
          phone: "[Your phone number]",
          phoneLink: true,
          email: "[Your email]",
          hours: "[Your opening hours]",
          // One short line so nobody mistakes a generated page for advice.
          note: "General information only — nothing on this page is legal or financial advice."
        }
      };
    }
  },
  portfolio: {
    icon: "📸",
    // Portfolio wording only, and no bare "photo", "wedding", "venue", "studio",
    // "space", "event", "hire", "booking" or "services": a restaurant with a
    // function room, a generic studio and an event caterer must still fall through
    // to their own template. Multi-word or unambiguous terms only.
    keywords: ["photographer", "photography", "photo studio", "portrait photographer", "wedding photographer", "headshot", "portrait session", "celebrant", "marriage celebrant", "wedding celebrant", "funeral celebrant", "naming ceremony", "vow renewal", "wedding venue", "function room", "function centre", "function center", "event space", "reception venue", "venue hire", "hire the venue"],
    defaultName: "Your Business Name",
    // Teal accent on near-black. secondaryColor is the dark panel behind the gallery
    // tiles and the service-area section, so darkHero is set: generateHtml then paints
    // the hero dark with white headings and forces the contact section light.
    primaryColor: "#0f766e",
    secondaryColor: "#111827",
    fontFamily: "'Inter', sans-serif",
    generateContent: (name: string, desc: string) => {
      const variant = pickPortfolioVariant(desc);
      const v = PORTFOLIO_VARIANTS[variant];
      return {
        portfolioVariant: variant,
        darkHero: true,
        // Serif headings over the sans body set above.
        headingFontFamily: "'DM Serif Display', serif",
        // The business name is the headline; the customer's own description is the
        // sub-line. No invented tagline, no award, no client count.
        heroBadge: v.badge,
        heroTitle: name,
        heroSubtitle: desc ? asSentence(desc) : v.heroLine,
        ctaPrimary: { label: v.cta, href: "#contact" },
        // No enquiry form: a form that posts nowhere is a fake. Phone only.
        ctaSecondary: { label: "Call [Your phone number]", href: "tel:[Your phone number]" },
        navLinks: [
          { label: "Gallery", href: "#gallery" },
          { label: "Booking", href: "#process" },
          { label: v.areaEyebrow, href: "#service-area" }
        ],
        // Gallery first: six placeholder tiles and no images at all — no <img>, no
        // stock photography and no link to a portfolio that does not exist.
        portfolioGallery: {
          eyebrow: "Gallery",
          heading: v.galleryHeading,
          note: "Placeholder tiles — add your own photos here. No images are included with this page.",
          items: [1, 2, 3, 4, 5, 6].map((n) => ({
            label: `[Your photo ${n}]`,
            tag: v.galleryTag,
            caption: "[Photo caption]"
          }))
        },
        // A portfolio page is gallery, packages, how booking works, approach, where I
        // work and contact — not an "about us" essay plus review cards, so the two
        // standard sections are switched off for this template only.
        hideAbout: true,
        hideTestimonials: true,
        servicesEyebrow: "Packages",
        servicesHeading: "Packages",
        servicesNavLabel: "Packages",
        // No price is invented: never "from $X", never a discount.
        servicesNote: "Package prices are confirmed on enquiry, once the date, location and what is needed are known.",
        services: v.packages.map((p) => ({ title: p.title, desc: p.desc, price: "[Your package price]" })),
        processSteps: {
          heading: "How booking works",
          note: "Three steps, the same for every booking.",
          steps: v.bookingSteps
        },
        // The approach section replaces the standard About block (see hideAbout
        // above) so the gallery can sit directly under the hero.
        approach: {
          eyebrow: "Approach",
          heading: v.approachHeading,
          text: `${name}. ${desc ? asSentence(desc) : v.heroLine} ${v.approachLine}`
        },
        // Where I work. Suburbs and travel/notice terms are placeholders; the hours
        // are the customer's own, never "24/7".
        serviceArea: {
          eyebrow: v.areaEyebrow,
          lead: v.areaLead,
          note: v.areaNote,
          suburbs: ["[Suburb 1]", "[Suburb 2]", "[Suburb 3]", "[Suburb 4]"]
        },
        // Venues only: capacity and hire terms. Undefined for the other two variants,
        // which leaves the block out of their pages entirely.
        credentials: v.hireDetails,
        contactInfo: {
          address: "[Your street address]",
          phone: "[Your phone number]",
          phoneLink: true,
          email: "[Your email]",
          hours: "[Your opening hours]",
          // One short line so nobody mistakes a generated page for a confirmed date.
          note: "Availability is confirmed before any booking is made."
        }
      };
    }
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
      aboutText: desc
        ? `${name}. ${asSentence(desc)}`
        : `${name} delivers top-quality professional services. We're committed to excellence and client satisfaction in everything we do.`,
      services: [
        { title: "Consultation", desc: "Expert advice tailored to your goals.", price: "[Your price]" },
        { title: "Full Service", desc: "End-to-end management of your project.", price: "[Your price]" },
        { title: "Support", desc: "Ongoing maintenance and support.", price: "[Your price]" }
      ],
      testimonials: [
        {
          name: "[Customer name]",
          text: "Sample review — replace with a real customer quote.",
          role: "[Customer role]",
          stars: 0
        },
        {
          name: "[Customer name]",
          text: "Sample review — replace with a real customer quote.",
          role: "[Customer role]",
          stars: 0
        }
      ],
      contactInfo: {
        address: "[Your street address]",
        phone: "[Your phone number]",
        email: "[your@email]",
        hours: "[Your opening hours]"
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

// UI chrome strings, translated for the most common languages.
// Keys are English; values are Record<langCode, translation>. Falls back to English.
const UI_STRINGS: Record<string, Record<string, string>> = {
  About: { es: "Nosotros", fr: "À propos", de: "Über uns", it: "Chi siamo", pt: "Sobre nós", ja: "私たちについて", zh: "关于我们", ar: "من نحن" },
  Services: { es: "Servicios", fr: "Services", de: "Leistungen", it: "Servizi", pt: "Serviços", ja: "サービス", zh: "服务", ar: "خدماتنا" },
  Testimonials: { es: "Testimonios", fr: "Témoignages", de: "Bewertungen", it: "Testimonianze", pt: "Depoimentos", ja: "お客様の声", zh: "客户评价", ar: "آراء العملاء" },
  Contact: { es: "Contacto", fr: "Contact", de: "Kontakt", it: "Contatti", pt: "Contato", ja: "お問い合わせ", zh: "联系我们", ar: "اتصل بنا" },
  "Open For Business": { es: "Abierto al público", fr: "Ouvert au public", de: "Geöffnet", it: "Aperto", pt: "Aberto", ja: "営業中", zh: "营业中", ar: "مفتوح للعمل" },
  "Get Started": { es: "Empezar", fr: "Commencer", de: "Loslegen", it: "Inizia", pt: "Começar", ja: "はじめる", zh: "开始", ar: "ابدأ" },
  "Our Services": { es: "Nuestros servicios", fr: "Nos services", de: "Unsere Leistungen", it: "I nostri servizi", pt: "Nossos serviços", ja: "サービス内容", zh: "我们的服务", ar: "خدماتنا" },
  "Our Story": { es: "Nuestra historia", fr: "Notre histoire", de: "Unsere Geschichte", it: "La nostra storia", pt: "Nossa história", ja: "私たちのストーリー", zh: "我们的故事", ar: "قصتنا" },
  "What We Offer": { es: "Qué ofrecemos", fr: "Ce que nous proposons", de: "Was wir anbieten", it: "Cosa offriamo", pt: "O que oferecemos", ja: "私たちの提供内容", zh: "我们提供什么", ar: "ماذا نقدم" },
  "What Clients Say": { es: "Qué dicen los clientes", fr: "Ce que disent nos clients", de: "Das sagen Kunden", it: "Cosa dicono i clienti", pt: "O que dizem os clientes", ja: "お客様の声", zh: "客户评价", ar: "ماذا يقول العملاء" },
  "Get In Touch": { es: "Ponte en contacto", fr: "Entrez en contact", de: "Kontakt aufnehmen", it: "Mettiti in contatto", pt: "Entre em contato", ja: "お問い合わせ", zh: "联系我们", ar: "تواصل معنا" },
  "Built with SiteLaunch AI": { es: "Creado con SiteLaunch AI", fr: "Créé avec SiteLaunch AI", de: "Erstellt mit SiteLaunch AI", it: "Creato con SiteLaunch AI", pt: "Criado com SiteLaunch AI", ja: "SiteLaunch AIで作成", zh: "由SiteLaunch AI创建", ar: "تم إنشاؤه بواسطة SiteLaunch AI" },
};

function T(str: string, lang: string): string {
  return UI_STRINGS[str]?.[lang] || str;
}

// Avatar initial for a testimonial name. Placeholder names ("[Customer name]")
// must not print a bracket, so fall back to a neutral glyph.
function initial(name: string): string {
  const m = /[A-Za-z0-9]/.exec(name || "");
  return m ? m[0].toUpperCase() : "•";
}

// Google Fonts needs the family on its own, spaces as "+" and weights after a
// colon: `family=Playfair+Display:wght@400;500;600&display=swap`. Handing it the
// raw CSS stack ("'Playfair Display', serif") produced an invalid URL that the
// browser dropped, so every page silently fell back to a system font.
function googleFontFamilyParam(fontStack: string): string {
  const family = (fontStack || "")
    .split(",")[0]
    .trim()
    .replace(/['"]/g, "")
    .trim()
    .replace(/ /g, "+");
  return family ? `family=${family}:wght@400;500;600&display=swap` : "";
}

function generateHtml(data: WebsiteData["metadata"], content: any, lang: string = "en"): string {
  const bodyFontParam = googleFontFamilyParam(data.fontFamily);
  // A dark-hero template (trades) uses its secondary colour as a dark slate panel,
  // so the contact section is forced onto a light surface — otherwise its
  // text-gray-900 headings would land dark-on-dark.
  const contactBg = content.darkHero ? "#f1f5f9" : data.secondaryColor;
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.name}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <style>
    ${bodyFontParam ? `@import url('https://fonts.googleapis.com/css2?${bodyFontParam}');` : ""}
    ${content.headingFontFamily ? `@import url('https://fonts.googleapis.com/css2?family=${content.headingFontFamily.replace(/['"]/g, "").split(",")[0].trim().replace(/ /g, "+")}&display=swap');` : ""}
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: ${data.fontFamily}, sans-serif; }
    ${content.headingFontFamily ? `h1, h2, h3 { font-family: ${content.headingFontFamily}; }` : ""}
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
        ${content.hideAbout ? "" : `<a href="#about" class="hover:text-gray-900">${T("About", lang)}</a>`}
        <a href="#services" class="hover:text-gray-900">${content.servicesNavLabel || T("Services", lang)}</a>
        ${(content.navLinks || []).map((l: any) => `<a href="${l.href}" class="hover:text-gray-900">${l.label}</a>`).join("")}
        ${content.hideTestimonials ? "" : `<a href="#testimonials" class="hover:text-gray-900">${T("Testimonials", lang)}</a>`}
        <a href="#contact" class="hover:text-gray-900">${T("Contact", lang)}</a>
      </div>
    </div>
  </nav>

  <section class="relative min-h-[80vh] flex items-center" style="${content.darkHero ? `background:${data.secondaryColor}` : `background: linear-gradient(135deg, ${data.primaryColor}15, ${data.secondaryColor}30)`}">
    <div class="max-w-6xl mx-auto px-6 py-20">
      <div class="max-w-3xl">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-6" style="${content.darkHero ? `background:${data.primaryColor};color:${data.secondaryColor}` : `background:${data.primaryColor}20;color:${data.primaryColor}`}">
          <span>★</span> ${content.heroBadge || T("Open For Business", lang)}
        </div>
        <h1 class="text-5xl md:text-7xl font-extrabold leading-[0.95] tracking-tight ${content.darkHero ? "text-white" : "text-gray-900"}">${content.heroTitle}</h1>
        <p class="mt-6 text-lg md:text-xl ${content.darkHero ? "text-slate-300" : "text-gray-600"} max-w-xl leading-relaxed">${content.heroSubtitle}</p>
        <div class="mt-8 flex flex-wrap gap-3">
          <a href="${content.ctaPrimary?.href || "#contact"}" class="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white shadow-lg hover:brightness-110 transition-all" style="background:${data.primaryColor}">${content.ctaPrimary?.label || T("Get Started", lang)} <i class="fas fa-arrow-right text-xs"></i></a>
          <a href="${content.ctaSecondary?.href || "#services"}" class="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-gray-700 bg-white shadow-sm hover:shadow transition-all border border-gray-200">${content.ctaSecondary?.label || T("Our Services", lang)}</a>
        </div>
      </div>
    </div>
  </section>

  ${content.availability ? `
  <section class="px-6 py-3 border-t border-b border-white/10" style="background:${data.secondaryColor}">
    <div class="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm font-bold">
      <i class="fas fa-bolt" style="color:${data.primaryColor}"></i>
      <span style="color:${data.primaryColor}">${content.availability.text}</span>
      <span class="text-white">— ${content.availability.detail}</span>
    </div>
  </section>
  ` : ""}${content.portfolioGallery ? `
  <section id="gallery" class="py-20 px-6 bg-gray-50">
    <div class="max-w-6xl mx-auto">
      <div class="text-center mb-12">
        <div class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest mb-4" style="background:${data.primaryColor}10;color:${data.primaryColor}">${content.portfolioGallery.eyebrow}</div>
        <h2 class="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">${content.portfolioGallery.heading}</h2>
        <p class="mt-4 text-sm text-gray-500 max-w-xl mx-auto">${content.portfolioGallery.note}</p>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        ${content.portfolioGallery.items.map((g: any) => `
        <div class="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <div class="h-40 md:h-52 flex flex-col items-center justify-center gap-2 border-b border-dashed border-gray-300" style="background:${data.secondaryColor}0d">
            <i class="fas fa-image text-xl" style="color:${data.primaryColor}"></i>
            <span class="text-[10px] font-bold uppercase tracking-widest text-center px-4" style="color:${data.primaryColor}">${g.label}</span>
          </div>
          <div class="p-4">
            <div class="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">${g.tag}</div>
            <div class="text-sm font-bold text-gray-900">${g.caption}</div>
          </div>
        </div>
        `).join("")}
      </div>
    </div>
  </section>
  ` : ""}

  ${content.hideAbout ? "" : `<section id="about" class="py-20 px-6">
    <div class="max-w-4xl mx-auto text-center">
      <div class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest mb-4" style="background:${data.primaryColor}10;color:${data.primaryColor}">${T("About", lang)}</div>
      <h2 class="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">${content.aboutHeading || T("Our Story", lang)}</h2>
      <p class="mt-6 text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">${content.aboutText}</p>
    </div>
  </section>`}

  <section id="services" class="py-20 px-6 bg-gray-50">
    <div class="max-w-6xl mx-auto">
      <div class="text-center mb-12">
        <div class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest mb-4" style="background:${data.primaryColor}10;color:${data.primaryColor}">${content.servicesEyebrow || T("Services", lang)}</div>
        <h2 class="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">${content.servicesHeading || T("What We Offer", lang)}</h2>${content.servicesNote ? `<p class="mt-4 text-sm text-gray-500 max-w-xl mx-auto">${content.servicesNote}</p>` : ""}
      </div>
      <div class="grid md:grid-cols-3 gap-6">
        ${content.services.map((s: any) => `
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold mb-4" style="background:${data.primaryColor}">${s.title[0]}</div>
          <h3 class="text-lg font-bold text-gray-900">${s.title}</h3>
          <p class="mt-2 text-sm text-gray-500">${s.desc}</p>
          ${s.price ? `<div class="mt-4 text-xs font-bold" style="color:${data.primaryColor}">${s.price}</div>` : ""}
        </div>
        `).join("")}
      </div>
    </div>
  </section>

  ${content.listings ? `
  <section id="listings" class="py-20 px-6">
    <div class="max-w-6xl mx-auto">
      <div class="text-center mb-12">
        <div class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest mb-4" style="background:${data.primaryColor}10;color:${data.primaryColor}">Listings</div>
        <h2 class="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">${content.listings.heading}</h2>
        <p class="mt-4 text-sm text-gray-500 max-w-xl mx-auto">${content.listings.note}</p>
      </div>
      <div class="grid md:grid-cols-3 gap-6">
        ${content.listings.items.map((p: any) => `
        <div class="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-all">
          <div class="h-36 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-white/70" style="background:${data.primaryColor}">Photo placeholder</div>
          <div class="p-6">
            <div class="text-[10px] font-bold uppercase tracking-widest mb-2" style="color:${data.primaryColor}">${p.type}</div>
            <h3 class="text-lg font-bold text-gray-900">${p.suburb}</h3>
            <p class="mt-2 text-sm text-gray-500">${p.spec}</p>
            <div class="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span class="text-sm font-bold text-gray-900">${p.price}</span>
              <span class="text-[10px] font-bold uppercase tracking-widest text-gray-400">${p.status}</span>
            </div>
          </div>
        </div>
        `).join("")}
      </div>
    </div>
  </section>
  ` : ""}${content.practitioners ? `
  <section id="practitioners" class="py-20 px-6">
    <div class="max-w-6xl mx-auto">
      <div class="text-center mb-12">
        <div class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest mb-4" style="background:${data.primaryColor}10;color:${data.primaryColor}">${content.practitioners.eyebrow}</div>
        <h2 class="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">${content.practitioners.heading}</h2>
        <p class="mt-4 text-sm text-gray-500 max-w-xl mx-auto">${content.practitioners.note}</p>
      </div>
      <div class="grid md:grid-cols-3 gap-6">
        ${content.practitioners.items.map((p: any) => `
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold mb-4" style="background:${data.primaryColor}"><i class="fas ${content.practitioners.icon}"></i></div>
          <h3 class="text-lg font-bold text-gray-900">${p.name}</h3>
          <div class="mt-4 space-y-2">
            ${p.details.map((d: any) => `
            <div>
              <div class="text-[10px] font-bold uppercase tracking-widest text-gray-400">${d.label}</div>
              <div class="text-sm font-semibold text-gray-700">${d.value}</div>
            </div>
            `).join("")}
          </div>
        </div>
        `).join("")}
      </div>
    </div>
  </section>
  ` : ""}

  ${content.processSteps ? `
  <section id="process" class="py-20 px-6 bg-gray-50">
    <div class="max-w-5xl mx-auto">
      <div class="text-center mb-12">
        <div class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest mb-4" style="background:${data.primaryColor}10;color:${data.primaryColor}">Process</div>
        <h2 class="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">${content.processSteps.heading}</h2>
        <p class="mt-4 text-sm text-gray-500 max-w-xl mx-auto">${content.processSteps.note}</p>
      </div>
      <div class="grid md:grid-cols-3 gap-6">
        ${content.processSteps.steps.map((s: any, i: number) => `
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold mb-4" style="background:${data.primaryColor}">${i + 1}</div>
          <h3 class="text-lg font-bold text-gray-900">${s.title}</h3>
          <p class="mt-2 text-sm text-gray-500">${s.desc}</p>
        </div>
        `).join("")}
      </div>
    </div>
  </section>
  ` : ""}${content.approach ? `
  <section id="approach" class="py-20 px-6">
    <div class="max-w-4xl mx-auto text-center">
      <div class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest mb-4" style="background:${data.primaryColor}10;color:${data.primaryColor}">${content.approach.eyebrow}</div>
      <h2 class="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">${content.approach.heading}</h2>
      <p class="mt-6 text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">${content.approach.text}</p>
    </div>
  </section>
  ` : ""}

  ${content.serviceArea ? `
  <section id="service-area" class="py-20 px-6" style="background:${data.secondaryColor}">
    <div class="max-w-5xl mx-auto text-center">
      <div class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest mb-4" style="background:${data.primaryColor};color:${data.secondaryColor}">${content.serviceArea.eyebrow}</div>
      <h2 class="text-4xl md:text-5xl font-extrabold tracking-tight text-white">${content.serviceArea.lead}</h2>
      <p class="mt-4 text-sm text-slate-300 max-w-xl mx-auto">${content.serviceArea.note}</p>
      <div class="mt-8 flex flex-wrap justify-center gap-3">
        ${content.serviceArea.suburbs.map((s: string) => `
        <span class="px-4 py-2 rounded-full text-sm font-semibold text-white bg-white/10 border border-white/20">${s}</span>
        `).join("")}
      </div>
    </div>
  </section>
  ` : ""}

  ${content.credentials ? `
  <section id="credentials" class="py-16 px-6 bg-white border-b border-gray-100">
    <div class="max-w-6xl mx-auto">
      <div class="text-center mb-10">
        <div class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest mb-4" style="background:${data.primaryColor}10;color:${data.primaryColor}">${content.credentials.eyebrow || "Credentials"}</div>
        <h2 class="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">${content.credentials.heading}</h2>
        <p class="mt-4 text-sm text-gray-500 max-w-xl mx-auto">${content.credentials.note}</p>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        ${content.credentials.items.map((c: any) => `
        <div class="rounded-2xl p-5 text-center bg-gray-50 border border-gray-200">
          <div class="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">${c.label}</div>
          <div class="text-sm font-bold text-gray-900">${c.value}</div>
        </div>
        `).join("")}
      </div>
    </div>
  </section>
  ` : ""}${content.fees ? `
  <section id="fees" class="py-20 px-6 bg-gray-50">
    <div class="max-w-4xl mx-auto">
      <div class="text-center mb-10">
        <div class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest mb-4" style="background:${data.primaryColor}10;color:${data.primaryColor}">${content.fees.eyebrow}</div>
        <h2 class="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">${content.fees.heading}</h2>
      </div>
      <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
        <p class="text-lg text-gray-700 leading-relaxed max-w-2xl mx-auto">${content.fees.text}</p>
        <div class="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white" style="background:${data.primaryColor}">${content.fees.placeholder}</div>${content.fees.extra ? `
        <div class="mt-3 inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white" style="background:${data.primaryColor}">${content.fees.extra}</div>` : ""}
        <p class="mt-6 text-xs text-gray-500 max-w-xl mx-auto">${content.fees.note}</p>
      </div>
    </div>
  </section>
  ` : ""}${content.office ? `
  <section id="office" class="py-20 px-6" style="background:${data.secondaryColor}">
    <div class="max-w-5xl mx-auto">
      <div class="text-center">
        <div class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest mb-4" style="background:${data.primaryColor};color:${data.secondaryColor}">${content.office.eyebrow}</div>
        <h2 class="text-4xl md:text-5xl font-extrabold tracking-tight text-white">${content.office.heading}</h2>
        <p class="mt-4 text-sm text-slate-300 max-w-xl mx-auto">${content.office.note}</p>
      </div>
      <div class="mt-10 grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
        <div class="rounded-2xl p-5 text-center bg-white/10 border border-white/20">
          <i class="fas fa-map-marker-alt text-xl mb-3" style="color:${data.primaryColor}"></i>
          <div class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Address</div>
          <div class="text-sm font-semibold text-white">${content.office.address}</div>
        </div>
        <div class="rounded-2xl p-5 text-center bg-white/10 border border-white/20">
          <i class="fas fa-clock text-xl mb-3" style="color:${data.primaryColor}"></i>
          <div class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Opening hours</div>
          <div class="text-sm font-semibold text-white">${content.office.hours}</div>
        </div>
      </div>
      <p class="mt-8 text-center text-lg font-bold text-white">${content.office.lead}</p>
      <div class="mt-6 flex flex-wrap justify-center gap-3">
        ${content.office.suburbs.map((s: string) => `
        <span class="px-4 py-2 rounded-full text-sm font-semibold text-white bg-white/10 border border-white/20">${s}</span>
        `).join("")}
      </div>
    </div>
  </section>
  ` : ""}

  ${content.workGallery ? `
  <section id="work" class="py-20 px-6 bg-gray-50">
    <div class="max-w-6xl mx-auto">
      <div class="text-center mb-12">
        <div class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest mb-4" style="background:${data.primaryColor}10;color:${data.primaryColor}">Our Work</div>
        <h2 class="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">${content.workGallery.heading}</h2>
        <p class="mt-4 text-sm text-gray-500 max-w-xl mx-auto">${content.workGallery.note}</p>
      </div>
      <div class="grid md:grid-cols-3 gap-6">
        ${content.workGallery.items.map((w: any) => `
        <div class="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <div class="h-44 flex flex-col items-center justify-center gap-2 border-b border-dashed border-gray-300" style="background:${data.secondaryColor}0d">
            <i class="fas fa-camera text-xl" style="color:${data.primaryColor}"></i>
            <span class="text-[10px] font-bold uppercase tracking-widest text-center px-4" style="color:${data.primaryColor}">${w.label}</span>
          </div>
          <div class="p-6">
            <div class="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">${w.tag}</div>
            <h3 class="text-lg font-bold text-gray-900">${w.caption}</h3>
          </div>
        </div>
        `).join("")}
      </div>
    </div>
  </section>
  ` : ""}

  ${content.hideTestimonials ? "" : `<section id="testimonials" class="py-20 px-6">
    <div class="max-w-6xl mx-auto">
      <div class="text-center mb-12">
        <div class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest mb-4" style="background:${data.primaryColor}10;color:${data.primaryColor}">${T("Testimonials", lang)}</div>
        <h2 class="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">${T("What Clients Say", lang)}</h2>
      </div>
      <div class="grid md:grid-cols-3 gap-6">
        ${content.testimonials.map((t: any) => `
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          ${t.stars ? `<div class="flex items-center gap-1 text-amber-400 text-sm mb-4">${"★".repeat(t.stars)}</div>` : `<div class="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Sample review</div>`}
          <p class="text-gray-600 text-sm leading-relaxed">"${t.text}"</p>
          <div class="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style="background:${data.primaryColor}">${initial(t.name)}</div>
            <div><div class="text-sm font-semibold text-gray-900">${t.name}</div><div class="text-xs text-gray-500">${t.role}</div></div>
          </div>
        </div>
        `).join("")}
      </div>
    </div>
  </section>`}

  <section id="contact" class="py-20 px-6" style="background:${contactBg}">
    <div class="max-w-4xl mx-auto">
      <div class="text-center mb-12">
        <div class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest mb-4" style="background:${data.primaryColor}10;color:${data.primaryColor}">${T("Contact", lang)}</div>
        <h2 class="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">${T("Get In Touch", lang)}</h2>
      </div>
      <div class="grid ${content.contactInfo.licence ? "md:grid-cols-4" : "md:grid-cols-3"} gap-6">
        <div class="bg-white rounded-2xl p-5 text-center shadow-sm">
          <i class="fas fa-map-marker-alt text-xl mb-3" style="color:${data.primaryColor}"></i>
          <p class="text-sm text-gray-600">${content.contactInfo.address}</p>
        </div>
        <div class="bg-white rounded-2xl p-5 text-center shadow-sm">
          <i class="fas fa-phone text-xl mb-3" style="color:${data.primaryColor}"></i>
          <p class="text-sm text-gray-600">${content.contactInfo.phoneLink ? `<a href="tel:${content.contactInfo.phone}" class="hover:underline">${content.contactInfo.phone}</a>` : content.contactInfo.phone}</p>
        </div>
        <div class="bg-white rounded-2xl p-5 text-center shadow-sm">
          <i class="fas fa-clock text-xl mb-3" style="color:${data.primaryColor}"></i>
          <p class="text-sm text-gray-600">${content.contactInfo.hours}</p>
        </div>
        ${content.contactInfo.licence ? `
        <div class="bg-white rounded-2xl p-5 text-center shadow-sm">
          <i class="fas fa-id-card text-xl mb-3" style="color:${data.primaryColor}"></i>
          <p class="text-sm text-gray-600">${content.contactInfo.licence}</p>
        </div>
        ` : ""}
      </div>
      <div class="mt-6 text-center">
        ${/^\[/.test(content.contactInfo.email)
          ? `<span class="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white shadow-lg" style="background:${data.primaryColor}"><i class="fas fa-envelope"></i> ${content.contactInfo.email}</span>`
          : `<a href="mailto:${content.contactInfo.email}" class="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white shadow-lg hover:brightness-110 transition-all" style="background:${data.primaryColor}"><i class="fas fa-envelope"></i> ${content.contactInfo.email}</a>`}
      </div>${content.contactInfo.note ? `<p class="mt-8 text-xs text-gray-500 max-w-xl mx-auto text-center">${content.contactInfo.note}</p>` : ""}
    </div>
  </section>

  <footer class="py-8 px-6 bg-gray-900 text-gray-400 text-center text-sm">
    <p>© 2026 ${data.name}. ${T("Built with SiteLaunch AI", lang)}.</p>
  </footer>
</body>
</html>`;
}

export async function generateWebsite(
  description: string,
  businessType?: string,
  name?: string,
  lang: string = "en"
): Promise<WebsiteData> {
  const type = businessType || extractBusinessType(description);
  const template = BUSINESS_TEMPLATES[type] || BUSINESS_TEMPLATES.general;
  const siteName = name || extractName(description, type);
  const content = template.generateContent(siteName, description);

  const metadata: WebsiteData["metadata"] = {
    name: siteName,
    description,
    businessType: type,
    primaryColor: template.primaryColor,
    secondaryColor: template.secondaryColor,
    fontFamily: template.fontFamily,
    logoText: siteName,
    lang,
  } as WebsiteData["metadata"] & { lang: string };

  const html = generateHtml(metadata, content, lang);
  return { html, metadata };
}