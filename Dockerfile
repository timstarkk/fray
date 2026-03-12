# Stage 1: Install dependencies
FROM node:23-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build
FROM node:23-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# prisma generate doesn't connect but prisma.config.ts requires DATABASE_URL
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN npx prisma generate
# NEXT_PUBLIC_* vars are inlined at build time by Next.js
ARG NEXT_PUBLIC_COGNITO_USER_POOL_ID
ARG NEXT_PUBLIC_COGNITO_CLIENT_ID
ENV NEXT_PUBLIC_COGNITO_USER_POOL_ID=$NEXT_PUBLIC_COGNITO_USER_POOL_ID
ENV NEXT_PUBLIC_COGNITO_CLIENT_ID=$NEXT_PUBLIC_COGNITO_CLIENT_ID
RUN npm run build

# Stage 3: Production
FROM node:23-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma files + CLI with all transitive deps for migrations
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/@standard-schema ./node_modules/@standard-schema
COPY --from=builder /app/node_modules/c12 ./node_modules/c12
COPY --from=builder /app/node_modules/chokidar ./node_modules/chokidar
COPY --from=builder /app/node_modules/citty ./node_modules/citty
COPY --from=builder /app/node_modules/confbox ./node_modules/confbox
COPY --from=builder /app/node_modules/consola ./node_modules/consola
COPY --from=builder /app/node_modules/deepmerge-ts ./node_modules/deepmerge-ts
COPY --from=builder /app/node_modules/defu ./node_modules/defu
COPY --from=builder /app/node_modules/destr ./node_modules/destr
COPY --from=builder /app/node_modules/dotenv ./node_modules/dotenv
COPY --from=builder /app/node_modules/effect ./node_modules/effect
COPY --from=builder /app/node_modules/empathic ./node_modules/empathic
COPY --from=builder /app/node_modules/exsolve ./node_modules/exsolve
COPY --from=builder /app/node_modules/fast-check ./node_modules/fast-check
COPY --from=builder /app/node_modules/giget ./node_modules/giget
COPY --from=builder /app/node_modules/jiti ./node_modules/jiti
COPY --from=builder /app/node_modules/node-fetch-native ./node_modules/node-fetch-native
COPY --from=builder /app/node_modules/nypm ./node_modules/nypm
COPY --from=builder /app/node_modules/ohash ./node_modules/ohash
COPY --from=builder /app/node_modules/pathe ./node_modules/pathe
COPY --from=builder /app/node_modules/perfect-debounce ./node_modules/perfect-debounce
COPY --from=builder /app/node_modules/pkg-types ./node_modules/pkg-types
COPY --from=builder /app/node_modules/pure-rand ./node_modules/pure-rand
COPY --from=builder /app/node_modules/rc9 ./node_modules/rc9
COPY --from=builder /app/node_modules/readdirp ./node_modules/readdirp
COPY --from=builder /app/node_modules/tinyexec ./node_modules/tinyexec
RUN mkdir -p node_modules/.bin && ln -s ../prisma/build/index.js node_modules/.bin/prisma

USER nextjs
EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000
CMD ["node", "server.js"]
