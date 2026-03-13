# Fray

Multi-persona group chat where AI personas with distinct personalities debate, brainstorm, and build on each other's ideas. Bring your own API key via OpenRouter, or run local models with Ollama.

## Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS v4, shadcn/ui
- **Database:** Postgres with Prisma ORM
- **Auth:** AWS Cognito
- **LLM:** BYOK via OpenRouter + local models via Ollama
- **Web search:** Self-hosted SearXNG
- **Containers:** Podman + podman-compose

## Local Development

```bash
cp .env.example .env
# Fill in ENCRYPTION_KEY and Cognito values

# Start Postgres and SearXNG
podman-compose -p fray up db searxng -d

# Run migrations and seed
npx prisma migrate dev
npx prisma db seed

# Start dev server
npm run dev
```

App runs at http://localhost:3000.

## Production Deployment

Fray runs on a single EC2 instance (Fedora) with Caddy for auto-SSL.

### First-time setup

1. Launch a Fedora EC2 instance with ports 22, 80, 443 open
2. Point your domain's A record at the instance IP
3. SSH in and run `setup.sh`, then fill in `.env`
4. Build and start:

```bash
podman-compose -f podman-compose.prod.yml build
podman-compose -f podman-compose.prod.yml run --rm app npx prisma migrate deploy
podman-compose -f podman-compose.prod.yml run --rm app npx prisma db seed
podman-compose -f podman-compose.prod.yml up -d
```

### Deploying updates

```bash
./deploy.sh -i ~/.ssh/fray.pem fedora@your-ec2-ip
```

Pulls latest code, rebuilds containers, runs migrations, and restarts.

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Purpose |
|---|---|
| `ENCRYPTION_KEY` | AES-256-GCM key for stored API keys |
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | Cognito user pool |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | Cognito app client |
| `DOMAIN` | Production domain for Caddy auto-SSL |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` | Production DB credentials |
