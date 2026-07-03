# ---------- build the frontend ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY index.html vite.config.ts tsconfig*.json tailwind.config.ts postcss.config.js ./
COPY public ./public
COPY src ./src
RUN npm run build

# ---------- runtime: Node serves API + static ----------
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY server/src ./src
COPY --from=build /app/dist /app/dist
ENV DIST_PATH=/app/dist DATABASE_PATH=/data/skelion.db PORT=8080
RUN addgroup -S skelion && adduser -S skelion -G skelion \
  && mkdir -p /data && chown skelion:skelion /data
USER skelion
VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:8080/api/health || exit 1
CMD ["node", "src/index.js"]
