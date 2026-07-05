# Skelion Platform - Operations and Troubleshooting

The single reference for "is it actually working" and "how do I get in".

## Your unique backend access

There are two doors, both private.

1. Admin console at `/admin`. Log in with your ADMIN_EMAIL and ADMIN_PASSWORD.
   This is the day-to-day control panel: submissions, assessments, insights,
   client provisioning.

2. Operator diagnostics, gated by OPS_KEY. Set a long random `OPS_KEY`
   environment variable, then open:

       https://skeliontech.com/admin?ops=YOUR_OPS_KEY

   The login page then shows a live system-status strip: database driver and
   connection state, row counts, and SMTP status, plus a "send test email"
   button. This works WITHOUT logging in, so even if the admin account has an
   issue you can still see backend health. Keep OPS_KEY secret; anyone with it
   can read health and trigger a test email (not read your data).

   You can also hit it as JSON for scripts or uptime monitors:

       curl -H "x-ops-key: YOUR_OPS_KEY" https://skeliontech.com/api/ops/diagnostics

## Why "nothing worked" before, and what changed

The platform failed silently when a subsystem was misconfigured. Now the server
verifies the database and SMTP at boot and prints the result to the runtime log:

    ==========================================================
      SKELION PLATFORM - boot diagnostics
    ==========================================================
      [db]    OK        driver=pg connected
      [admin] OK        account ensured for info@skeliontech.com
      [mail]  OK        smtp.hostinger.com:465 secure=true -> info@skeliontech.com
    ==========================================================

Read this in Hostinger under Runtime logs after each deploy. Any line that is
not OK tells you exactly what to fix.

## Email is not sending

Email only sends when SMTP_HOST, SMTP_USER and SMTP_PASS are all set. The most
common causes, in order:

1. The variables are not set in Hostinger. Set them, then Redeploy (env changes
   apply on the next deploy only).
2. Wrong host/port. For Hostinger email: host smtp.hostinger.com, port 465,
   SMTP_SECURE=1. For port 587, set SMTP_SECURE=0.
3. From address mismatch. The platform now sends From your SMTP_USER mailbox,
   which is what providers require. Do not set MAIL_FROM to a different domain.
4. The mailbox does not exist. info@skeliontech.com must be a real mailbox you
   created in hPanel under Emails.

To test: open `/admin?ops=YOUR_OPS_KEY` and click "send test email", or:

    curl -X POST -H "x-ops-key: YOUR_OPS_KEY" https://skeliontech.com/api/ops/test-email

A success returns `{"ok":true,"to":"info@skeliontech.com"}`. A failure returns
the exact SMTP error, which tells you whether it is auth, host, or TLS.

## Database is not connected

In production the app refuses to boot without a working PostgreSQL DATABASE_URL,
and the boot log shows `[db] FAILED` with the reason. Common fixes:

- DATABASE_URL missing or not a `postgresql://` string. Copy the Supabase
  Session pooler URI (port 5432) into DATABASE_URL.
- SSL error connecting to Supabase: set `PGSSL_NO_VERIFY=1` and redeploy.

## Client portal access (by design)

Clients cannot self-register. That is deliberate: a security firm does not let
strangers create accounts that can see engagement data. You provision access:
admin console -> Clients tab -> create organization -> create a portal user with
a temporary password -> share it securely. The client signs in at `/portal` and
changes their password. If provisioning seemed to do nothing before, it was the
database not being connected; the diagnostics above now make that obvious.
