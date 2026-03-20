import Link from "next/link"

export default function TermsOfService() {
  return (
    <div
      className="min-h-screen text-white"
      style={{ background: "#0d0e17", fontFamily: "var(--font-sora), sans-serif" }}
    >
      <nav className="max-w-[800px] mx-auto px-8 pt-8 pb-4">
        <Link href="/" className="text-sm font-semibold text-white/50 hover:text-white transition-colors">
          &larr; Back to Fray
        </Link>
      </nav>

      <article className="max-w-[800px] mx-auto px-8 pb-20">
        <h1 className="text-3xl font-extrabold mb-2">Terms of Service</h1>
        <p className="text-sm text-white/40 mb-10">Last updated: March 20, 2026</p>

        <div className="space-y-8 text-[15px] leading-relaxed text-white/70">
          <section>
            <h2 className="text-lg font-bold text-white mb-3">Acceptance</h2>
            <p>
              By creating an account or using Fray, you agree to these terms. If you don&apos;t
              agree, don&apos;t use the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">What Fray Provides</h2>
            <p>
              Fray is a multi-persona AI chat application. You can use it with local models (via
              Ollama, free) or cloud models (via OpenRouter, using your own API key and at your own
              cost). Fray is currently in alpha. Features may change, break, or be removed without
              notice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">Your Account</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>You must provide a valid email address to create an account.</li>
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>You are responsible for all activity that occurs under your account.</li>
              <li>One person, one account. Don&apos;t share accounts.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">API Keys and Costs</h2>
            <p>
              If you use cloud models through OpenRouter, you provide your own API key. All costs
              for cloud model usage are billed directly to your OpenRouter account. Fray does not
              charge for cloud model usage and is not responsible for any charges incurred on your
              OpenRouter account. Monitor your own usage and set spending limits through OpenRouter
              if desired.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">AI Output</h2>
            <p>
              AI-generated responses are produced by third-party language models (for cloud) or
              locally-run models (for Ollama). Fray does not guarantee the accuracy, completeness,
              or appropriateness of any AI output. Personas are fictional characters with assigned
              perspectives. Their responses do not represent the views of Fray or its developers.
              Do not rely on AI output for medical, legal, financial, or other professional advice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">Acceptable Use</h2>
            <p>Don&apos;t use Fray to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Generate content that is illegal in your jurisdiction</li>
              <li>Attempt to compromise the security of the service or other users</li>
              <li>Abuse the service in ways that degrade it for other users</li>
              <li>Reverse engineer, scrape, or redistribute the service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">Your Content</h2>
            <p>
              You own the prompts you write and retain rights to your content. By using Fray, you
              grant us a limited license to store and process your content as needed to operate the
              service (storing conversations, sending prompts to model providers). We don&apos;t
              claim ownership of your content and don&apos;t use it to train models.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">Service Availability</h2>
            <p>
              Fray is provided &ldquo;as is&rdquo; without warranties of any kind. We don&apos;t
              guarantee uptime, data preservation, or uninterrupted service. We may modify, suspend,
              or discontinue any part of the service at any time.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Fray and its developers are not liable for any
              indirect, incidental, special, or consequential damages arising from your use of the
              service. This includes but is not limited to: data loss, API key misuse, charges
              incurred through OpenRouter, or reliance on AI-generated output.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">Account Termination</h2>
            <p>
              We may suspend or terminate your account if you violate these terms. You can stop
              using Fray at any time. Contact us if you want your account and data deleted.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">Changes to These Terms</h2>
            <p>
              We may update these terms as Fray evolves. Changes will be posted on this page with an
              updated date. Continued use of Fray after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">Contact</h2>
            <p>
              Questions about these terms? Reach out at{" "}
              <a href="mailto:tim@timstark.dev" className="text-white underline hover:text-white/80">
                tim@timstark.dev
              </a>
              .
            </p>
          </section>
        </div>
      </article>
    </div>
  )
}
