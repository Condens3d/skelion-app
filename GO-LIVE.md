# Skelion Platform — Go Live

Practical answers to: how do I log in, is the database fine, and how do I put this online.

---

## 1. Logging in as admin

There is no public sign-up. The admin account is seeded once from environment
variables the first time the server starts with an empty admin table.

- You already started the server with `ADMIN_EMAIL=jedusor@skeliontech.com` and a password.
- Go to `/admin` on your running site (locally `http://localhost:8080/admin`).
- Enter that same email and password. That is your login.

Notes:

- The seed only runs while no admin exists. Changing `ADMIN_PASSWORD` later and
  restarting will **not** change an existing account. To rotate the password,
  delete the admin row (or the SQLite file in dev) and reseed, or add a reset
  path later.
- The session is a hardened, HttpOnly, SameSite=strict cookie. It expires after
  `SESSION_HOURS` (default 8).
- After first boot in production, remove `ADMIN_EMAIL` / `ADMIN_PASSWORD` from
  the environment so credentials are not sitting in your process list.

---

## 2. Is the database okay

Yes. There are two drivers, chosen automatically:

- **Development / local**: SQLite (`node:sqlite`), a single file at
  `server/data/skelion.db`. This is what you are running now. Zero setup.
- **Production**: PostgreSQL. The server **refuses to boot in production without
  a `DATABASE_URL`** on purpose, because SQLite is not appropriate for a public,
  concurrent deployment.

Tables (`submissions`, `admin_users`, `posts`, `subscribers`) are created
automatically on first boot for both drivers. Nothing to migrate by hand.

For going online, the included `docker-compose.yml` gives you PostgreSQL
automatically, so you do not have to install or manage a database yourself.

---

## 3. Turning on email for contact messages

Contact submissions are **always** saved and visible under `/admin`. Email is an
optional notification layer on top. When SMTP is configured, each new submission
is emailed to `CONTACT_RECIPIENT` (default `jedusor@skeliontech.com`), with the
sender's address set as reply-to so you can reply directly.

Set these (in `server/.env` or your host's env panel):

```
SMTP_HOST=smtp.hostinger.com      # your mail provider's SMTP host
SMTP_PORT=465
SMTP_SECURE=1                     # 1 for port 465, 0 for 587
SMTP_USER=jedusor@skeliontech.com # a real mailbox you own
SMTP_PASS=your-mailbox-password
MAIL_FROM=Skelion Website <no-reply@skeliontech.com>
CONTACT_RECIPIENT=jedusor@skeliontech.com
```

If `SMTP_HOST` is empty, nothing breaks: messages are simply stored, not emailed.

> I am not certain of your exact mail host. If you use Hostinger email, the SMTP
> settings above are the usual ones, but verify them in hPanel under Emails ->
> your mailbox -> Configuration. If you use Google Workspace or another provider,
> use their SMTP host and an app password.

---

## 4. Putting it online

The app is a Node server that also serves the built React site, plus a database.
That means it needs a host that can run a long-lived Node process. Plain shared
hosting (the cheapest Hostinger "Web Hosting" tier, PHP-oriented) is **not**
suitable. You need either a VPS or a container platform.

### Option A — Hostinger VPS (or any Ubuntu VPS), with Docker

Best if you want to stay on Hostinger. Use a **VPS / KVM plan** (root access),
not shared hosting.

1. Point your domain's DNS **A record** to the VPS IP address.
2. SSH into the VPS and install Docker + the compose plugin:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
3. Copy this project to the VPS (git clone or scp).
4. Create `.env` next to `docker-compose.yml`:
   ```bash
   cp .env.compose.example .env
   # then edit .env and set:
   #   DB_PASSWORD   -> a strong random string
   #   SESSION_SECRET-> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   #   ADMIN_EMAIL / ADMIN_PASSWORD (for first boot only)
   #   SMTP_* + CONTACT_RECIPIENT if you want email
   ```
5. Start it:
   ```bash
   docker compose up -d --build
   ```
   This runs PostgreSQL and the app together. The app listens on port 8080.
6. Put HTTPS in front. The simplest is Caddy, which gets a free Let's Encrypt
   certificate automatically. Minimal `Caddyfile`:
   ```
   skelionenterprises.com {
       reverse_proxy localhost:8080
   }
   ```
   Run Caddy (as a service or its own container) and it handles TLS for you.
7. After the admin account exists, edit `.env` to remove `ADMIN_EMAIL` /
   `ADMIN_PASSWORD` and `docker compose up -d` again.

### Option B — Managed platform (least server admin)

If you would rather not manage a server, a container platform plus managed
Postgres is the fastest path. Render and Railway both work well:

- Create a **PostgreSQL** instance on the platform, copy its connection string.
- Deploy this repo as a **web service from the Dockerfile**.
- Set env vars: `NODE_ENV=production`, `DATABASE_URL` (the managed string),
  `SESSION_SECRET`, `TRUST_PROXY=1`, first-boot `ADMIN_EMAIL`/`ADMIN_PASSWORD`,
  and the `SMTP_*` values if you want email.
- Point your domain at the platform per their DNS instructions. HTTPS is
  automatic.

> I cannot verify the current pricing or exact UI of these platforms from here,
> so check their docs as you go. The important invariants are the same
> everywhere: a Postgres `DATABASE_URL`, a `SESSION_SECRET`, `TRUST_PROXY=1`
> behind their proxy, and your domain's DNS pointed at the host.

### After go-live checklist

- Confirm `https://yourdomain/.well-known/security.txt` and `/rss.xml` load.
- Log in at `/admin`, publish one insight, confirm it appears on `/insights`.
- Run the domain through securityheaders.com and Mozilla Observatory.
- Configure database backups (managed platforms do this; on a VPS, schedule
  `pg_dump`).
