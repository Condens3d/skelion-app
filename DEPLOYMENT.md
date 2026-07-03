# Skelion Enterprises: Deployment Runbook

Full-stack application. React SPA served by a Node.js API, backed by PostgreSQL in
production. Deployable to IIS (Windows Server) and to any container or cloud host
without code changes; only environment variables differ.

```
skelion-app/
├── src/                     React SPA (Vite build -> dist/)
├── server/                  Node.js + Express API
│   ├── src/db/              pluggable data layer (postgres.js | sqlite.js)
│   └── .env.example         server configuration template
├── public/                  static assets + web.config + .htaccess (copied into dist/)
├── dist/                    built SPA (produced by `npm run build`)
├── Dockerfile               single app image (SPA + API)
├── docker-compose.yml       app + PostgreSQL, one command
└── deploy/                  nginx proxy, Azure SWA, Netlify/Cloudflare headers
```

## Data layer selection

The driver is chosen at runtime from `DATABASE_URL`:

- `postgres://` or `postgresql://` selects PostgreSQL. This is the only supported
  production configuration; the server refuses to boot in `NODE_ENV=production`
  without it.
- Empty or absent selects SQLite via Node's built-in `node:sqlite`. This is for
  local development only and prints a warning on boot.

Both drivers expose the same async repository API and the same schema, so switching
engines never touches route code. The schema self-provisions on first connection;
there is no separate migration step to run for the current version.

## Option A: IIS (Windows Server, on-prem or Azure VM)

Two moving parts: IIS serves the static SPA and reverse-proxies `/api` to the Node
service; PostgreSQL runs as a managed instance or a local service.

**Prerequisites**

- IIS 8.5+ with URL Rewrite Module 2.1 and Application Request Routing (ARR) 3.0,
  with proxy enabled (ARR is what makes the `/api` reverse-proxy rule work).
- Node.js 22.5+ LTS on the server.
- A PostgreSQL 14+ instance. Azure Database for PostgreSQL Flexible Server is the
  path of least resistance on Azure; on-prem Postgres is fine for fully isolated
  environments.
- A TLS certificate bound to the site (win-acme for Let's Encrypt, or commercial).

**Steps**

1. Provision PostgreSQL. Create a database `skelion` and a least-privilege role that
   owns only that database. Record the DSN. Ensure the server can reach the database
   over TLS.
2. Publish the app to the server, for example `C:\inetpub\skelion\`. Copy the built
   `dist/` contents to the web root, and place the `server/` folder outside the web
   root, for example `C:\services\skelion-api\`.
3. Configure the API. In `C:\services\skelion-api\`, create `.env` from
   `server/.env.example`. Set `NODE_ENV=production`, the PostgreSQL `DATABASE_URL`,
   a strong `SESSION_SECRET`, `TRUST_PROXY=1`, `DIST_PATH` pointing at the web root,
   and the one-time `ADMIN_EMAIL` / `ADMIN_PASSWORD` seed.
4. Run the Node API as a Windows service so it survives reboots. Use a supervisor
   such as NSSM or the built-in service tooling. The service runs
   `node src/index.js` and listens on `localhost:8080`. Set the application pool for
   the static site to No Managed Code (there is no .NET surface).
5. `web.config` is picked up automatically. It forces HTTPS, canonicalizes non-www,
   sets the full security-header suite with the strict CSP (no `unsafe-inline`),
   reverse-proxies `/api` to `localhost:8080`, and rewrites unknown routes to
   `index.html` while returning real 404s for missing files.
6. First boot seeds the admin account, then remove `ADMIN_EMAIL` / `ADMIN_PASSWORD`
   from `.env` and restart the service.
7. Verify: `http://` must 301 to `https://`; a deep route such as `/pentesting` must
   load on refresh; a missing file such as `/x.png` must return 404;
   `/api/health` must return `{"status":"ok","driver":"postgres"}`.

## Option B: Docker Compose (fastest full-stack path)

Brings up the app and PostgreSQL together.

```bash
cp .env.compose.example .env        # then fill DB_PASSWORD, SESSION_SECRET, admin seed
docker compose up --build
```

The app listens on `:8080`, TLS terminated in front of it (load balancer, Traefik,
Caddy, or nginx with certbot). Postgres persists in the `skelion_pgdata` volume and
is reachable only on the internal network, so TLS to the database is disabled
in-cluster by design. Remove the admin seed variables from `.env` after first boot.

## Option C: Single container plus managed database (AWS, Azure, GCP)

Build and push the app image; point it at a managed PostgreSQL instance.

```bash
docker build -t skelion-web .
docker run -d -p 8080:8080 \
  -e NODE_ENV=production \
  -e DATABASE_URL="postgresql://USER:PASS@HOST:5432/skelion" \
  -e SESSION_SECRET="..." \
  -e TRUST_PROXY=1 \
  --name skelion --restart unless-stopped skelion-web
```

Works as-is on AWS ECS/Fargate with RDS for PostgreSQL, Azure Container Apps with
Azure Database for PostgreSQL, and Google Cloud Run with Cloud SQL (deploy with
`--port 8080`). Keep `PGSSL` at its default (TLS on, certificate verified) for any
network-crossing database connection.

## Option D: Static-only fallback (Netlify, Cloudflare Pages, Azure SWA)

If the dynamic layer is not wanted on a given surface, the SPA still deploys as pure
static files. Build with `VITE_FORM_ENDPOINT` set to a Formspree or Web3Forms URL so
the contact form posts to that external service, then deploy `dist/`. Copy
`deploy/_headers` (Netlify/Cloudflare) or `deploy/staticwebapp.config.json` (Azure)
into place. There is no admin console in this mode.

## Contact form and admin console

In the full-stack configuration the form posts to the built-in `/api/contact`,
which validates input, rate-limits abuse, filters bots with a honeypot, and stores
submissions in PostgreSQL. The admin console at `/admin` requires the seeded login
and lists submissions with handled and delete actions. `/admin` and `/api/` are
disallowed in `robots.txt`.

## Security posture shipped

Strict Content-Security-Policy with no `unsafe-inline` on scripts or styles, served
identically by the Node app, `web.config`, and `.htaccess`. HSTS (one year),
X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy,
and Cross-Origin-Opener-Policy. Server side: zod validation on every endpoint,
per-route rate limits, bcrypt password hashing (cost 12) with a 12-character
minimum, JWT sessions in strict-sameSite httpOnly secure cookies, parameterized
queries throughout, and a JSON error handler that never leaks stack traces.

## Go-live checklist

- [ ] PostgreSQL provisioned; least-privilege role; TLS reachable
- [ ] `SESSION_SECRET` set to a strong random value; not the default
- [ ] Admin account seeded, then seed variables removed and service restarted
- [ ] TLS certificate installed and auto-renewal confirmed
- [ ] `http://` and `www.` both 301 to `https://` apex
- [ ] Deep route refresh works; missing file returns real 404
- [ ] `/api/health` returns driver `postgres`
- [ ] Contact submission stored and visible in `/admin`
- [ ] Database backup and retention configured (managed provider or pg_dump schedule)
- [ ] securityheaders.com and Mozilla Observatory run against the domain
- [ ] Sitemap submitted in Google Search Console
- [ ] Real 1200x630 og:image added
