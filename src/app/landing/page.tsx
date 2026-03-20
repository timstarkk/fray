"use client"

import Link from "next/link"

const features = [
  {
    icon: "👥",
    iconBg: "rgba(59,130,246,0.1)",
    iconColor: "#3b82f6",
    title: "Multi-Persona Debates",
    desc: "Drop a prompt and watch The Optimist, Devil's Advocate, and Researcher battle it out in real time.",
  },
  {
    icon: "⚙️",
    iconBg: "rgba(239,68,68,0.1)",
    iconColor: "#ef4444",
    title: "Build Custom Personas",
    desc: "Clone anyone's thinking style. From public figures to your own custom expert panel, built in seconds.",
  },
  {
    icon: "🔌",
    iconBg: "rgba(139,92,246,0.1)",
    iconColor: "#8b5cf6",
    title: "Model Agnostic",
    desc: "Run free on local models via Ollama, or tap into hundreds of cloud models with your own API key.",
  },
]

const marqueeItems = [
  "The Optimist", "Devil's Advocate", "The Researcher",
  "The Pragmatist", "The Editor", "Custom Personas",
]

export default function LandingB() {
  return (
    <div
      className="min-h-screen text-white overflow-hidden"
      style={{
        background: "#0e0e14",
        fontFamily: "var(--font-sora), sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      {/* TOPBAR */}
      <div
        className="max-w-[1200px] mx-auto px-10 py-7 flex items-center justify-between"
        style={{ animation: "fadeIn 0.6s ease both" }}
      >
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Fray" className="h-8" />
          <span className="text-[22px] font-extrabold" style={{ letterSpacing: "-0.02em" }}>
            Fray
          </span>
        </div>
        <nav className="hidden md:flex gap-8 items-center">
          <Link href="#features" className="text-sm font-semibold text-white/[0.28] hover:text-white transition-colors">
            Features
          </Link>
          <Link href="#cta" className="text-sm font-semibold text-white/[0.28] hover:text-white transition-colors">
            Personas
          </Link>
          <Link
            href="/signup"
            className="px-7 py-3 bg-white text-black rounded-full text-sm font-bold hover:-translate-y-0.5 transition-all"
            style={{ boxShadow: "none" }}
          >
            Get Started
          </Link>
        </nav>
      </div>

      {/* SPLIT HERO */}
      <div className="max-w-[1200px] mx-auto px-10 pt-14 pb-24 grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
        {/* Left */}
        <div>
          <div
            className="text-xs font-bold uppercase text-[#ef4444] mb-6"
            style={{ letterSpacing: "0.15em", animation: "fadeUp 0.6s ease 0.1s both" }}
          >
            Multi-Persona AI Chat
          </div>
          <h1
            className="font-extrabold leading-none mb-6"
            style={{
              fontSize: "clamp(40px, 5vw, 64px)",
              letterSpacing: "-0.03em",
              animation: "fadeUp 0.6s ease 0.15s both",
            }}
          >
            Think with a crowd, not a yes-man.
          </h1>
          <p
            className="text-[17px] leading-relaxed text-white/50 mb-10 max-w-[440px]"
            style={{ animation: "fadeUp 0.6s ease 0.2s both" }}
          >
            Fray puts multiple AI perspectives in one conversation. Drop a prompt. Watch personas
            with different worldviews debate, agree, and push back on each other.
          </p>
          <div
            className="flex gap-5 items-center"
            style={{ animation: "fadeUp 0.6s ease 0.25s both" }}
          >
            <Link
              href="/signup"
              className="px-9 py-4 bg-white text-black rounded-[14px] text-[15px] font-bold hover:-translate-y-0.5 transition-all"
            >
              Start a Fray &rarr;
            </Link>
            <Link
              href="/login"
              className="text-[15px] font-semibold text-white/[0.28] hover:text-white transition-colors"
            >
              See how it works
            </Link>
          </div>
        </div>

        {/* Right */}
        <div className="relative" style={{ animation: "fadeUp 0.7s ease 0.3s both" }}>
          <div
            className="rounded-[28px] p-4 transition-transform duration-500"
            style={{
              background: "#16161e",
              boxShadow:
                "0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.07), inset 0 1px 0 rgba(255,255,255,0.04)",
              transform: "rotate(2deg)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "rotate(0deg) scale(1.01)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "rotate(2deg)"
            }}
          >
            <img
              src="/screenshot-b.png"
              alt="Fray app"
              className="w-full rounded-[14px] block"
            />
          </div>

          {/* Float cards */}
          <div
            className="absolute hidden md:flex items-center gap-3 px-[18px] py-[14px] rounded-2xl text-sm font-semibold"
            style={{
              top: "-20px",
              left: "-40px",
              background: "#1c1c28",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
              backdropFilter: "blur(16px)",
              animation: "floatSlow 5s ease-in-out infinite",
            }}
          >
            <div
              className="w-9 h-9 rounded-[10px] flex items-center justify-center text-base"
              style={{ background: "rgba(59,130,246,0.12)" }}
            >
              ✨
            </div>
            <div>
              <div className="text-[13px] font-bold">The Optimist</div>
              <div className="text-[11px] text-white/[0.28] font-medium">is typing...</div>
            </div>
          </div>

          <div
            className="absolute hidden md:flex items-center gap-3 px-[18px] py-[14px] rounded-2xl text-sm font-semibold"
            style={{
              bottom: "20px",
              right: "-30px",
              background: "#1c1c28",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
              backdropFilter: "blur(16px)",
              animation: "floatSlow 5s ease-in-out 1.2s infinite",
            }}
          >
            <div
              className="w-9 h-9 rounded-[10px] flex items-center justify-center text-base"
              style={{ background: "rgba(239,68,68,0.12)" }}
            >
              😈
            </div>
            <div>
              <div className="text-[13px] font-bold">Devil&apos;s Advocate</div>
              <div className="text-[11px] text-white/[0.28] font-medium">disagrees</div>
            </div>
          </div>
        </div>
      </div>

      {/* MARQUEE */}
      <div
        className="overflow-hidden whitespace-nowrap py-7"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.07)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          animation: "fadeIn 0.6s ease 0.5s both",
        }}
      >
        <div
          className="flex gap-[60px]"
          style={{ animation: "marquee 22s linear infinite" }}
        >
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <span key={i}>
              <span
                className="text-sm font-bold uppercase text-white/[0.28] shrink-0"
                style={{ letterSpacing: "0.1em" }}
              >
                {item}
              </span>
              {i < marqueeItems.length * 2 - 1 && (
                <span className="text-white/[0.28] mx-[30px]">&bull;</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <div
        id="features"
        className="max-w-[1200px] mx-auto px-10 py-20 grid grid-cols-1 md:grid-cols-3 gap-5"
        style={{ animation: "fadeUp 0.7s ease 0.6s both" }}
      >
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-[20px] p-9 hover:-translate-y-1 transition-all cursor-default"
            style={{
              background: "#16161e",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div
              className="w-12 h-12 rounded-[14px] flex items-center justify-center text-[22px] mb-5"
              style={{ background: f.iconBg, color: f.iconColor }}
            >
              {f.icon}
            </div>
            <h3 className="text-[17px] font-bold mb-2.5">{f.title}</h3>
            <p className="text-sm leading-relaxed text-white/[0.28]">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* BOTTOM CTA */}
      <div
        id="cta"
        className="max-w-[1200px] mx-auto px-10 pb-28 text-center"
        style={{ animation: "fadeUp 0.7s ease 0.7s both" }}
      >
        <div
          className="w-[60px] h-[3px] rounded mx-auto mb-10"
          style={{ background: "linear-gradient(90deg, #ffffff 0%, #ffffff 33%, #3b82f6 33%, #3b82f6 66%, #ef4444 66%, #ef4444 100%)" }}
        />
        <h2
          className="font-extrabold mb-4"
          style={{ fontSize: "clamp(28px, 4vw, 40px)", letterSpacing: "-0.02em" }}
        >
          Stop getting one answer.
        </h2>
        <p className="text-base text-white/50 mb-9 max-w-[460px] mx-auto leading-relaxed">
          Every question deserves more than a single perspective. Start a Fray and get the full
          picture.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2.5 px-12 py-5 bg-white text-black font-bold text-base rounded-full hover:-translate-y-0.5 transition-all"
        >
          Get Early Access &rarr;
        </Link>
      </div>

      {/* Footer */}
      <footer
        className="py-8 text-center text-sm text-white/30 flex items-center justify-center gap-4"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      >
        <span>&copy; 2026 Fray</span>
        <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy</Link>
        <Link href="/terms" className="hover:text-white/60 transition-colors">Terms</Link>
      </footer>
    </div>
  )
}
