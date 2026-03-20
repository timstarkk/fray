import Link from "next/link"

export default function PrivacyPolicy() {
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
        <h1 className="text-3xl font-extrabold mb-2">Privacy Policy</h1>
        <p className="text-sm text-white/40 mb-10">Last updated: March 20, 2026</p>

        <div className="space-y-8 text-[15px] leading-relaxed text-white/70">
          <section>
            <h2 className="text-lg font-bold text-white mb-3">What Fray Is</h2>
            <p>
              Fray is a multi-persona AI chat application. You create or select AI personas, send a
              prompt, and multiple personas respond with different perspectives. Fray supports local
              models via Ollama and cloud models via OpenRouter using your own API key.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">Data We Collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-white">Account information:</strong> your email address and
                password, managed through AWS Cognito authentication.
              </li>
              <li>
                <strong className="text-white">Conversations:</strong> the prompts you send and the
                AI responses generated. These are stored in our database so you can access your
                conversation history.
              </li>
              <li>
                <strong className="text-white">Personas:</strong> any custom personas you create,
                including their names, descriptions, and system prompts.
              </li>
              <li>
                <strong className="text-white">API keys:</strong> if you choose to use cloud models,
                your OpenRouter API key is stored encrypted in our database. We use it only to make
                requests to OpenRouter on your behalf.
              </li>
              <li>
                <strong className="text-white">Settings:</strong> your model preferences, pinned
                models, and other application settings.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">Local Models (Ollama)</h2>
            <p>
              When you use local models through Ollama, your prompts and responses are processed
              entirely on your own machine. No conversation data is sent to our servers or any third
              party for local model inference. We store conversation history in our database for your
              convenience, but the AI processing itself happens locally.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">Cloud Models (OpenRouter)</h2>
            <p>
              When you use cloud models, your prompts are sent to OpenRouter using your own API key.
              OpenRouter then routes your request to the model provider (e.g., Anthropic, OpenAI,
              Google, Meta). Your usage and costs are billed directly to your OpenRouter account. We
              do not control how OpenRouter or the underlying model providers handle your data. Please
              review{" "}
              <a
                href="https://openrouter.ai/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white underline hover:text-white/80"
              >
                OpenRouter&apos;s privacy policy
              </a>{" "}
              for details.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">How We Use Your Data</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>To provide and maintain the Fray service</li>
              <li>To store your conversation history so you can return to past chats</li>
              <li>To authenticate your account</li>
              <li>To make API requests to OpenRouter on your behalf when using cloud models</li>
            </ul>
            <p className="mt-3">
              We do not sell your data. We do not use your conversations to train AI models. We do
              not share your data with third parties except as required to operate the service
              (hosting infrastructure, authentication).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">Data Storage and Security</h2>
            <p>
              Your data is stored on our servers hosted on AWS. API keys are encrypted at rest. We
              use standard security practices to protect your data, but no system is perfectly secure.
              You are responsible for keeping your account credentials and API keys confidential.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">Data Retention and Deletion</h2>
            <p>
              Your data is retained as long as your account is active. You can delete individual
              conversations at any time. If you want your account and all associated data deleted,
              contact us and we will process your request.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">Cookies</h2>
            <p>
              We use essential cookies and local storage for authentication and storing your
              preferences (selected model, pinned models). We do not use tracking cookies or
              third-party analytics cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">Changes to This Policy</h2>
            <p>
              We may update this policy as Fray evolves. Changes will be posted on this page with an
              updated date. Continued use of Fray after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">Contact</h2>
            <p>
              Questions about this policy? Reach out at{" "}
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
