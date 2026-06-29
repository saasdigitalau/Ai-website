"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [generatedSite, setGeneratedSite] = useState<string | null>(null);
  const [description, setDescription] = useState("");

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleGenerate = async () => {
    if (!description.trim()) return;
    try {
      const res = await fetch("/api/generate-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();
      if (data.html) setGeneratedSite(data.html);
    } catch {
      // fallback demo
      setGeneratedSite(`<div style="padding:2rem;text-align:center"><h2>Site generated for: ${description}</h2><p style="color:gray;margin-top:1rem">Connect an AI API key for full generation.</p></div>`);
    }
  };

  if (generatedSite) {
    return (
      <div className="h-screen flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b">
          <button onClick={() => setGeneratedSite(null)} className="text-sm text-indigo-600 font-semibold hover:underline">← Back to SiteLaunch</button>
          <span className="text-xs text-gray-400">AI Generated Site</span>
        </div>
        <iframe srcDoc={generatedSite} className="flex-1 w-full border-0" title="Generated Site" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      {/* NAV */}
      <nav className={`fixed top-0 w-full z-50 transition-all ${scrolled ? "bg-white/90 backdrop-blur border-b" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">S</div>
            <span className="font-heading font-extrabold text-lg">SiteLaunch AI</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#builder" className="hover:text-gray-900">Builder</a>
            <a href="#leads" className="hover:text-gray-900">Leads</a>
            <a href="#invoicing" className="hover:text-gray-900">Invoicing</a>
            <a href="#pricing" className="hover:text-gray-900">Pricing</a>
          </div>
          <a href="#builder" className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 shadow-md hover:brightness-110 transition-all">Get Started</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center px-6 pt-24 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute right-0 top-1/3 h-[600px] w-[600px] rounded-full opacity-30 animate-blob" style={{background: "hsl(239 84% 67% / 0.25)", filter: "blur(140px)"}}></div>
          <div className="absolute left-0 bottom-1/4 h-[500px] w-[500px] rounded-full opacity-20 animate-blob" style={{background: "hsl(270 80% 60% / 0.2)", filter: "blur(120px)", animationDelay: "2s"}}></div>
        </div>
        <div className="mx-auto max-w-6xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest bg-indigo-50 text-indigo-600 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
            AI-Powered Website Builder
          </div>
          <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl font-extrabold leading-[0.92] tracking-[-0.03em] text-gray-900">
            A sentence.<br/>
            <span className="text-gradient">A website.</span><br/>
            <span className="italic" style={{background: "linear-gradient(135deg, #6366f1, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"}}>Today.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Describe your business in one sentence. Get a professional AI-generated website in minutes. Find leads without websites. Invoice clients — all from one platform.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a href="#builder" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 shadow-xl hover:brightness-110 transition-all" style={{boxShadow: "0 14px 30px -10px rgba(99,102,241,0.4)"}}>
              Build your first site <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
            </a>
            <a href="#pricing" className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:border-indigo-200 transition-all">See pricing</a>
          </div>
          <p className="mt-4 text-xs text-gray-400">Cancel anytime · No setup fees</p>

          {/* DEMO INPUT */}
          <div className="mt-12 max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>
                </div>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                  placeholder="Describe your business... e.g. A cozy vegan cafe in Portland serving organic bowls"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-300"
                />
                <button onClick={handleGenerate} className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:brightness-110 transition-all whitespace-nowrap">
                  Generate <span className="hidden sm:inline">Site</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 px-6 bg-gray-50/50">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest bg-indigo-50 text-indigo-600 mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>
            How It Works
          </div>
          <h2 className="font-heading text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">Three steps to your site</h2>
          <div className="mt-12 grid md:grid-cols-3 gap-8 text-left">
            {[
              { num: "01", title: "Describe your business", desc: "Type one sentence about what you do. Our AI understands every business type — restaurants, gyms, salons, dentists, and more.", color: "from-indigo-500 to-blue-500" },
              { num: "02", title: "Customize & preview", desc: "Share a live preview link with clients. They see changes instantly — no logins, no surprises. Make unlimited revisions.", color: "from-purple-500 to-pink-500" },
              { num: "03", title: "Launch & get paid", desc: "Connect a custom domain. Hosting is built-in. Then invoice your clients — right from the same dashboard.", color: "from-emerald-500 to-teal-500" },
            ].map((step) => (
              <div key={step.num} className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition-all">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center text-white text-sm font-bold mb-4`}>{step.num}</div>
                <h3 className="font-heading text-lg font-bold text-gray-900">{step.title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI BUILDER SECTION */}
      <section id="builder" className="py-20 px-6 overflow-hidden">
        <div className="absolute left-0 top-1/3 h-[400px] w-[400px] rounded-full opacity-20 -z-10 animate-blob" style={{background: "hsl(239 84% 67% / 0.3)", filter: "blur(120px)"}}></div>
        <div className="max-w-6xl mx-auto">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest bg-indigo-50 text-indigo-600 mb-4">Features</div>
            <h2 className="font-heading text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">Everything you need to run a <span className="text-gradient">web agency.</span></h2>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {["Preview Links", "Custom Domains", "Built-in Hosting", "Unlimited Revisions", "AI-Powered Design", "Recurring Revenue"].map((f) => (
              <span key={f} className="px-4 py-2 rounded-full text-xs font-semibold bg-white text-gray-600 ring-1 ring-gray-200">{f}</span>
            ))}
          </div>
          <div className="mt-8 grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl p-8 shadow-sm border hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg mb-5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>
              </div>
              <h3 className="font-heading text-2xl font-extrabold text-gray-900">Preview Links</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">Share a private preview link with your client. They see live changes the moment you save — no logins, no surprises.</p>
              <div className="mt-6 text-3xl font-extrabold" style={{background: "linear-gradient(135deg, #6366f1, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"}}>Instant</div>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-6 border">
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-3 w-3"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg> Share preview</div>
                <div className="mt-2 flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2"><span className="truncate font-mono text-xs text-gray-700">sitelaunch.app/p/L0t2-Bvk9</span><button className="px-2.5 py-1 rounded-md text-[10px] font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600">Copy</button></div>
                <div className="mt-3 flex items-center justify-between text-[10px]"><span className="flex items-center gap-1 text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>Client viewing now</span><span className="text-gray-400">2 viewers</span></div>
              </div>
              <div className="mt-3 bg-white rounded-2xl p-3 shadow-sm">
                <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-[11px] font-bold text-white">MR</div><div className="flex-1 text-[11px] text-gray-700">&ldquo;Love it! Can the hero be a bit darker?&rdquo;</div><span className="text-[10px] text-gray-400">3m</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LEAD FINDER */}
      <section id="leads" className="py-20 px-6 bg-gray-50/50">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest bg-indigo-50 text-indigo-600 mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-3 w-3"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
              Lead Finder
            </div>
            <h2 className="font-heading text-4xl md:text-5xl font-extrabold leading-[0.98] tracking-tight text-gray-900">Find local customers <br/><span className="text-gradient">in seconds.</span></h2>
            <p className="mt-5 text-gray-500 leading-relaxed max-w-lg">Included with every plan: pull 200M+ local businesses from Google. Phone, email, address — auto-flagged when they don&apos;t have a website.</p>
            <ul className="mt-7 space-y-3">
              {[
                ["200M+ businesses, live data", "— Google Business + AI enrichment."],
                ["No-website flag", "— Sort straight to your hottest prospects."],
                ["Build them a page in seconds", "— Turn a lead into a customer in the same tab."]
              ].map(([a, b]) => (
                <li key={a} className="flex items-start gap-3">
                  <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-purple-600"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3 w-3 text-white"><path d="m4 12 5 5L20 6"/></svg></div>
                  <div><span className="font-heading text-sm font-bold text-gray-900">{a}</span><span className="ml-1.5 text-xs text-gray-500">{b}</span></div>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white rounded-3xl shadow-lg border overflow-hidden">
            <div className="border-b bg-gray-50/50 p-4">
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 ring-1 ring-gray-200">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-indigo-500"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  <div><div className="text-[8.5px] font-bold uppercase tracking-widest text-gray-400">Business</div><div className="text-[11.5px] font-semibold text-gray-900">Yoga studios</div></div>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 ring-1 ring-gray-200">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" style={{color: "#8b5cf6"}}><path d="M12 22s-7-7-7-12a7 7 0 1 1 14 0c0 5-7 12-7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>
                  <div><div className="text-[8.5px] font-bold uppercase tracking-widest text-gray-400">Location</div><div className="text-[11.5px] font-semibold text-gray-900">Austin, TX</div></div>
                </div>
                <button className="flex items-center gap-1 rounded-xl px-3 py-2.5 text-[10.5px] font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-3 w-3"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg> Find</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 p-4">
              {[
                ["L&L", "Lotus & Linen", "4.7", "No website"],
                ["M&M", "Mat & Mantra", "4.8", "No website"],
                ["SF", "Sunrise Flow", "4.7", "Has website"],
                ["S", "Stillwater", "4.8", "No website"]
              ].map(([initial, name, rating, badge]) => (
                <div key={name} className="rounded-xl bg-white p-3 ring-1 ring-gray-100">
                  <div className="flex items-start gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg text-[10px] font-bold text-white bg-gradient-to-br from-indigo-500 to-purple-600">{initial}</div>
                    <div className="min-w-0 flex-1"><div className="truncate text-[11.5px] font-bold text-gray-900">{name}</div><div className="flex items-center gap-1 text-[9.5px] text-gray-400"><span className="text-amber-400">★</span> {rating}</div></div>
                  </div>
                  {badge === "No website" && <div className="mt-2 flex items-center gap-1 rounded-md px-1.5 py-1 text-[8.5px] font-bold" style={{background: "hsl(239 84% 67% / 0.08)", color: "#6366f1"}}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-2 w-2"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg> No website</div>}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t bg-gray-50/50 px-4 py-2.5">
              <div className="text-[10.5px] font-bold text-indigo-600">32 results · 18 no-website</div>
              <button className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[9.5px] font-bold text-gray-700 ring-1 ring-gray-200"><svg viewBox="0 0 24 24" fill="none" strokeWidth="2.4" className="h-2.5 w-2.5"><path d="M12 3v13m0 0-5-5m5 5 5-5"/><path d="M5 21h14"/></svg> CSV</button>
            </div>
          </div>
        </div>
      </section>

      {/* INVOICING */}
      <section id="invoicing" className="py-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1">
            <div className="bg-white rounded-3xl shadow-lg border overflow-hidden">
              <div className="flex items-center justify-between border-b bg-gray-50/50 px-5 py-3"><span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9.5px] font-bold text-emerald-600">● Paid</span><span className="font-mono text-[10.5px] font-bold text-gray-700">INV-0017</span></div>
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div><div className="text-[9px] font-bold uppercase tracking-widest text-gray-400">From</div><div className="mt-0.5 font-heading text-sm font-bold text-gray-900">SiteLaunch Studio</div><div className="text-[9.5px] text-gray-400">hi@sitelaunch.studio</div></div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2 text-right"><div className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Total</div><div className="font-heading text-xl font-extrabold text-gray-900">$850</div></div>
                </div>
                <div className="mt-4 space-y-1.5">
                  <div className="grid grid-cols-[1fr_70px] gap-2 rounded-lg bg-gray-50 px-3 py-2 text-[11px]"><span>Website design + build</span><span className="text-right font-mono font-bold">$650</span></div>
                  <div className="grid grid-cols-[1fr_70px] gap-2 rounded-lg bg-gray-50 px-3 py-2 text-[11px]"><span>Copywriting (5 pages)</span><span className="text-right font-mono font-bold">$200</span></div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button className="flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[10.5px] font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-3 w-3"><path d="M4 4 20 12 4 20 7 12 4 4z"/></svg> Send</button>
                  <button className="flex items-center gap-1 rounded-full bg-white px-3 py-2 text-[10.5px] font-bold text-gray-700 ring-1 ring-gray-200"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-2.5 w-2.5"><path d="M12 3v13m0 0-5-5m5 5 5-5"/><path d="M5 21h14"/></svg> PDF</button>
                </div>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest bg-emerald-50 text-emerald-600 mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-3 w-3"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>
              Invoicing
            </div>
            <h2 className="font-heading text-4xl md:text-5xl font-extrabold leading-[0.98] tracking-tight text-gray-900">You built it.<br/><span className="italic" style={{background: "linear-gradient(135deg, #10b981, #14b8a6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"}}>Now get paid.</span></h2>
            <p className="mt-5 text-gray-500 leading-relaxed max-w-lg">Built-in invoicing for client work. Create beautiful invoices, send them as PDFs, and track who&apos;s paid. Your clients pay you directly — no processing fees.</p>
            <div className="mt-7 grid grid-cols-3 gap-3 rounded-2xl p-4" style={{background: "linear-gradient(135deg, #10b98110, #14b8a610)"}}>
              {[["3.2d", "avg time to paid"], ["0%", "processing fees"], ["Instant", "PDF export"]].map(([n, l]) => (
                <div key={n}><div className="font-heading text-2xl font-extrabold text-gray-900">{n}</div><div className="text-[10.5px] text-gray-500">{l}</div></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20 px-6 bg-gray-50/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest bg-amber-50 text-amber-600 mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-3 w-3"><path d="M7 11A4 4 0 1 1 3 7v0a4 4 0 0 1 4-4M17 11a4 4 0 1 1-4-4v0a4 4 0 0 1 4-4"/></svg>
              Field Notes
            </div>
            <h2 className="font-heading text-4xl md:text-5xl font-extrabold leading-[0.95] tracking-tight text-gray-900">Real customers, <span className="italic text-gradient">real results.</span></h2>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-5">
            {[
              { name: "Priya Anand", role: "Owner, Lotus Linen Yoga", text: "I described my studio in one sentence and had a beautiful website by lunch. My first booking came in that night.", color: "from-purple-500 to-pink-500" },
              { name: "Sarah Chen", role: "Dentist, Bluebonnet", text: "I'm not techy. SiteLaunch made me a page that looks better than what my old agency charged me $4,000 for.", color: "from-teal-400 to-cyan-500" },
              { name: "Jasmine Rivera", role: "Boutique owner, NYC", text: "I run my whole side hustle off of SiteLaunch. New page, send an invoice, get paid — all in one afternoon.", color: "from-orange-500 to-amber-500" }
            ].map((t, i) => (
              <figure key={t.name} className={`bg-white rounded-3xl p-7 shadow-sm border hover:-translate-y-1 transition-all ${i === 1 ? "md:translate-y-6" : ""}`}>
                <div className={`absolute -left-1 top-6 h-12 w-1 rounded-full bg-gradient-to-b ${t.color}`}></div>
                <svg viewBox="0 0 24 24" fill="currentColor" className={`h-6 w-6 opacity-10 mb-2`} style={{color: t.color.includes("purple") ? "#8b5cf6" : t.color.includes("teal") ? "#14b8a6" : "#f59e0b"}}><path d="M7 11A4 4 0 1 1 3 7v0a4 4 0 0 1 4-4M17 11a4 4 0 1 1-4-4v0a4 4 0 0 1 4-4"/></svg>
                <blockquote className="font-heading text-lg font-bold leading-snug tracking-tight text-gray-900">"{t.text}"</blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t pt-4">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white bg-gradient-to-br ${t.color}`}>{t.name.split(" ").map(s => s[0]).join("")}</div>
                  <div><div className="font-heading text-sm font-bold text-gray-900">{t.name}</div><div className="text-[10.5px] text-gray-500">{t.role}</div></div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Pricing</p>
            <h2 className="mt-3 font-heading text-4xl font-extrabold text-gray-900">Choose Your <span className="text-gradient">Plan</span></h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { name: "Starter", price: "$25", features: ["100 AI credits / month", "Lead gen (5 searches/mo)", "50 results per search", "Invoicing (full access)", "AI website generation"], popular: false },
              { name: "Pro", price: "$50", features: ["200 AI credits / month", "Lead gen (25 searches/mo)", "50 results per search", "Invoicing (full access)", "AI website generation", "Priority support"], popular: true },
              { name: "Business", price: "$100", features: ["500 AI credits / month", "Lead gen (100 searches/mo)", "50 results per search", "Invoicing (full access)", "AI website generation", "Priority support"], popular: false }
            ].map((plan) => (
              <div key={plan.name} className={`relative rounded-3xl p-8 transition-all ${
                plan.popular 
                  ? "bg-gradient-to-b from-indigo-500 to-purple-700 text-white shadow-2xl shadow-indigo-500/25 scale-105"
                  : "bg-white border shadow-sm hover:shadow-lg"
              }`}>
                {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white"><svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/></svg> Most Popular</div>}
                <h3 className={`font-heading text-lg font-bold ${plan.popular ? "text-white" : "text-gray-900"}`}>{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-0.5">
                  <span className={`font-heading text-5xl font-extrabold ${plan.popular ? "text-white" : "text-gray-900"}`}>{plan.price}</span>
                  <span className={`text-sm ${plan.popular ? "text-white/70" : "text-gray-400"}`}>/mo</span>
                </div>
                <div className={`my-6 h-px ${plan.popular ? "bg-white/20" : "bg-gray-200"}`}></div>
                <ul className="space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-center gap-2.5 text-xs sm:text-sm ${plan.popular ? "text-white/80" : "text-gray-500"}`}>
                      <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${plan.popular ? "bg-white/20" : "bg-indigo-50"}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`h-2.5 w-2.5 ${plan.popular ? "text-white" : "text-indigo-600"}`}><path d="M20 6 9 17l-5-5"/></svg>
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
                <button className={`mt-8 block w-full rounded-2xl py-3.5 text-center font-heading text-sm font-semibold transition-all ${
                  plan.popular 
                    ? "bg-white text-indigo-600 shadow-lg hover:bg-white/90" 
                    : "border border-gray-200 text-gray-900 hover:border-indigo-200 hover:bg-indigo-50/50"
                }`}>Get Started</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-gray-50/50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest bg-gray-100 text-gray-600 mb-4">FAQ</div>
            <h2 className="font-heading text-4xl font-extrabold tracking-tight text-gray-900">Questions, answered.</h2>
          </div>
          <div className="space-y-2">
            {[
              ["What kinds of pages can SiteLaunch build?", "Landing pages for any kind of small business — restaurants, gyms, salons, freelancers, services, events, online stores. If a customer needs to find you online, we can build it."],
              ["Do I need to know how to code?", "Not at all. Just describe your business in plain English. Our AI handles all the design and development. You can customize colors, text, and images without touching code."],
              ["How does Lead Finder get its data?", "It pulls from Google Business profiles and AI enrichment. We index 200M+ businesses, flag which ones lack a website, and surface their contact info so you can reach out."],
              ["How does invoicing work?", "Create a professional invoice with line items, send it as a PDF or link, and track payment status (paid/pending/overdue). Your clients pay you directly — no processing fees."]
            ].map(([q, a]) => (
              <details key={q} className="overflow-hidden rounded-2xl bg-white ring-1 ring-gray-100">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left">
                  <span className="font-heading text-sm font-bold text-gray-900">{q}</span>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-3.5 w-3.5"><path d="M12 5v14M5 12h14"/></svg></span>
                </summary>
                <div className="px-5 pb-5 text-sm leading-relaxed text-gray-500">{a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-20">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] px-6 py-20 text-center bg-gradient-to-br from-indigo-500 to-purple-600" style={{boxShadow: "0 30px 80px -20px rgba(99,102,241,0.5)"}}>
          <div className="pointer-events-none absolute inset-0 opacity-15" style={{backgroundImage: "radial-gradient(rgba(255,255,255,0.22) 1.5px, transparent 1.5px)", backgroundSize: "26px 26px"}}></div>
          <div className="relative text-white">
            <h2 className="font-heading text-5xl md:text-7xl font-extrabold leading-[0.92] tracking-[-0.02em]">A sentence.<br/>A website.<br/><span className="italic" style={{background: "linear-gradient(135deg, white, rgba(255,255,255,0.7))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"}}>Today.</span></h2>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <a href="#builder" className="flex items-center gap-2 rounded-2xl bg-white px-7 py-4 font-heading text-sm font-bold text-gray-900 transition-all hover:scale-[1.02]" style={{boxShadow: "0 14px 30px -10px rgba(0,0,0,0.25)"}}>
                Build your first site <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-3.5 w-3.5"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
              </a>
            </div>
            <p className="mt-4 text-xs text-white/70">Cancel anytime · No setup fees</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t bg-white/70 px-6 py-14">
        <div className="max-w-7xl mx-auto grid md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600"><span className="font-heading text-sm font-bold text-white">S</span></div>
              <span className="font-heading text-base font-extrabold tracking-tight text-gray-900">SiteLaunch AI</span>
            </div>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-gray-500">A beautiful website for your business — built in minutes, in plain English.</p>
          </div>
          {[["Product", ["Features", "Find customers", "Get paid", "Pricing"]], ["Resources", ["University", "Playbooks", "Templates", "Help center"]], ["Company", ["About", "Customers", "Affiliates", "Contact"]]].map(([section, links]) => (
            <div key={section as string}>
              <div className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400">{section as string}</div>
              <ul className="mt-3 space-y-2">
                {(links as string[]).map((link) => (
                  <li key={link}><a href="#" className="text-xs text-gray-600 hover:text-gray-900 transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t pt-6 text-[11px] text-gray-500 max-w-7xl mx-auto">
          <span>© 2026 SiteLaunch AI · Made for small business.</span>
          <span>Made in Austin, TX</span>
        </div>
      </footer>
    </main>
  );
}