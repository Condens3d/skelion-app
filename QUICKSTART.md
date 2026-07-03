# Skelion Platform: Quickstart

Read this first. It addresses the two issues that bite people on first run.

## 0. Run from INSIDE this folder

After you unzip, `cd` into this project folder (the one containing this file and
`package.json`). Do NOT run commands from the starter-kit folder. Most "cannot
read package.json" and "no such file or directory: server" errors are just being
in the wrong directory.

Confirm you are in the right place:

```
ls package.json server/package.json
```

Both paths must exist. If they do, you are in the right folder.

## 1. Check Node first (this project needs Node 22.5 or newer)

The dev database driver uses Node's built-in SQLite, which exists only in
Node 22.5.0 and later. Check:

```
node -v
npm -v
```

If Node is older than 22.5, or if you hit `npm error LRU is not a constructor`,
your local Node/npm is the problem, not the project. The `LRU` error in
particular is a broken npm install, usually an outdated Node from the distro
package manager. The clean fix is nvm:

```
# install nvm (see https://github.com/nvm-sh/nvm for the current one-liner), then:
nvm install --lts
nvm use --lts
npm cache clean --force
```

Re-check `node -v`. You want v22.x or newer. Then continue.

## 2. Fastest run (local, SQLite, no external services)

This is the path verified end to end. From this folder:

```
npm install
cd server && npm install && cd ..
ADMIN_EMAIL=admin@skelionenterprises.com ADMIN_PASSWORD=choose-a-strong-12plus-char-pass npm start
```

`npm start` builds the site and starts the API, which serves everything at:

- Site:  http://localhost:8080
- Admin: http://localhost:8080/admin  (log in with the email/password above)

Stop with Ctrl+C.

## 3. Production run (PostgreSQL, one command)

Requires Docker. From this folder:

```
cp .env.compose.example .env
# edit .env: set DB_PASSWORD, SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
# generate a secret: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
docker compose up --build
```

App on http://localhost:8080, PostgreSQL alongside it. Remove ADMIN_EMAIL and
ADMIN_PASSWORD from .env after the first successful boot, then restart.

## 4. IIS and cloud

See DEPLOYMENT.md for the full IIS (Windows Server) runbook and the Azure,
AWS, GCP, Netlify, and Cloudflare paths.

## 5. Push to your GitHub

The full commit history is included in this package.

```
git remote add origin https://github.com/<you>/skelion-app.git
git branch -M main
git push -u origin main
```

## Commands reference

- `npm run dev`         Vite dev server (frontend only; proxies /api to :8080)
- `npm run build`       Production build to dist/ (runs the SEO prerender)
- `npm start`           Build, then start the API serving the built site
- `npm test`            Backend API test suite (8 tests)
- `npm run test:e2e`    Playwright smoke tests (run `npx playwright install` once first)
- `npm run server:dev`  API only, watch mode
