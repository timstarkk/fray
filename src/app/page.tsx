import Link from "next/link"

const features = [
  {
    icon: "👥",
    iconBg: "rgba(59,130,246,0.12)",
    iconColor: "#3b82f6",
    title: "Multi-Persona Debates",
    desc: "Drop a prompt and watch The Optimist, Devil's Advocate, and Researcher battle it out in real time.",
  },
  {
    icon: "⚙️",
    iconBg: "rgba(239,68,68,0.12)",
    iconColor: "#ef4444",
    title: "Build Custom Personas",
    desc: "Clone anyone's thinking style. From Elon Musk to your own custom expert panel.",
  },
  {
    icon: "🔌",
    iconBg: "rgba(139,92,246,0.12)",
    iconColor: "#8b5cf6",
    title: "Model Agnostic",
    desc: "Run free on local models via Ollama, or tap into hundreds of cloud models with your own API key.",
  },
]

export default function LandingPage() {
  return (
    <div
      className="min-h-screen text-white overflow-hidden relative"
      style={{ background: "#0d0e17", fontFamily: "var(--font-sora), sans-serif" }}
    >
      {/* Ambient glow */}
      <div
        className="absolute left-1/2 -translate-x-1/2 w-[900px] h-[900px] pointer-events-none"
        style={{
          top: "-40%",
          background:
            "radial-gradient(circle, rgba(59,130,246,0.12) 0%, rgba(239,68,68,0.06) 40%, transparent 70%)",
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 max-w-[1100px] mx-auto flex items-center justify-between px-8 pt-8">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Fray" className="h-8" />
          <span className="text-xl font-extrabold tracking-tight">Fray</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-semibold text-white/50 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center px-6 py-2.5 bg-white text-black text-sm font-bold rounded-xl hover:-translate-y-0.5 transition-all"
            style={{ boxShadow: "none" }}
            onMouseEnter={undefined}
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative max-w-[1100px] mx-auto px-8 pt-28 pb-20 text-center">
        <div
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[13px] font-semibold text-white/60 mb-10"
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            animation: "fadeUp 0.8s ease both",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: "#10b981",
              boxShadow: "0 0 8px #10b981",
            }}
          />
          Now in Alpha
        </div>

        <h1
          className="font-extrabold leading-none mb-7"
          style={{
            fontSize: "clamp(48px, 7vw, 88px)",
            letterSpacing: "-0.03em",
            animation: "fadeUp 0.8s ease 0.1s both",
          }}
        >
          Think with a crowd,
          <br />
          <span
            className="bg-clip-text"
            style={{
              backgroundImage:
                "linear-gradient(135deg, #fff 20%, #3b82f6 50%, #ef4444 80%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            not a yes-man.
          </span>
        </h1>

        <p
          className="text-lg text-white/50 max-w-[560px] mx-auto mb-12 leading-relaxed font-normal"
          style={{ animation: "fadeUp 0.8s ease 0.2s both" }}
        >
          Fray is a group chat with AI personas that debate, challenge, and
          build on each other&apos;s ideas. Stop getting one answer. Start
          getting the full picture.
        </p>

        <div
          className="flex justify-center gap-4"
          style={{ animation: "fadeUp 0.8s ease 0.3s both" }}
        >
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-9 py-4 bg-white text-black font-bold text-[15px] rounded-[14px] hover:-translate-y-0.5 transition-all"
            style={{}}
          >
            Get Early Access &rarr;
          </Link>
          <Link
            href="#features"
            className="inline-flex items-center gap-2 px-9 py-4 text-white/80 font-semibold text-[15px] rounded-[14px] hover:bg-white/[0.08] transition-all"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            Learn More
          </Link>
        </div>
      </div>

      {/* App Preview */}
      <div
        className="relative max-w-[1000px] mx-auto px-8 pb-24"
        style={{ animation: "fadeUp 1s ease 0.5s both" }}
      >
        <div
          className="rounded-[20px] overflow-hidden relative"
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            background: "#1a1b2e",
            boxShadow:
              "0 40px 120px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)",
          }}
        >
          <img
            src="/screenshot.png"
            alt="Fray app"
            className="w-full block"
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(180deg, transparent 60%, rgba(13,14,23,0.8) 100%)",
            }}
          />
        </div>
      </div>

      {/* Features */}
      <div
        id="features"
        className="max-w-[1000px] mx-auto px-8 pb-28 grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-[20px] p-9 hover:-translate-y-1 transition-all cursor-default"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div
              className="w-12 h-12 rounded-[14px] flex items-center justify-center text-[22px] mb-5"
              style={{ background: f.iconBg, color: f.iconColor }}
            >
              {f.icon}
            </div>
            <h3 className="text-[17px] font-bold mb-2.5">{f.title}</h3>
            <p className="text-sm text-white/45 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="max-w-[1200px] mx-auto px-10 pb-28 text-center">
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
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <span>&copy; 2026 Fray</span>
        <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy</Link>
        <Link href="/terms" className="hover:text-white/60 transition-colors">Terms</Link>
      </footer>
    </div>
  )
}
