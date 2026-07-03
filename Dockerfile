# ---------- build the frontend ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY index.html vite.config.ts tsconfig*.json tailwind.config.ts postcss.config.js ./
COPY public ./public
COPY src ./src
RUN npm run build

# ---------- runtime: Node serves API + static SPA ----------
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY server/src ./src
COPY --from=build /app/dist /app/dist
# DATABASE_URL (postgres://) is injected at run time (compose / orchestrator).
# SQLITE_PATH is only a dev fallback and unused when DATABASE_URL is set.
ENV DIST_PATH=/app/dist PORT=8080
RUN addgroup -S skelion && adduser -S skelion -G skelion
USER skelion
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:8080/api/health || exit 1
CMD ["node", "src/index.js"]
