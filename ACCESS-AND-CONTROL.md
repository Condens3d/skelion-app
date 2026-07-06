# Skelion Platform: Access and Control Manual

Read this once. It answers how you get in, how clients get in, how the two
connect, and how you keep control as owner.

## The one thing behind most "nothing works" symptoms

Email not sending, the client portal loading forever, the contact form saying
"transmission_failed", and the insights feed being "unreachable" are usually the
same root cause: the backend on Hostinger is missing environment variables, so
it cannot reach the database or the mail server. The platform now tells you
exactly what is missing. Start every troubleshooting session here:

    https://skeliontech.com/admin?ops=YOUR_OPS_KEY

Set OPS_KEY to a long random string in Hostinger first. That page shows a
pass/fail checklist with the exact fix for anything red, and a button to send a
real test email. If email is red, it prints the precise SMTP variables to set.

You can also read it as JSON:

    curl -H "x-ops-key: YOUR_OPS_KEY" https://skeliontech.com/api/ops/diagnostics

## 1. How YOU access the admin backend

- URL: https://skeliontech.com/admin
- Credentials: the ADMIN_EMAIL and ADMIN_PASSWORD you set as environment
  variables in Hostinger. The account is created once, on first boot with an
  empty database. After it exists, changing those variables does nothing; the
  account is already in the database.
- If you never see a login or it hangs: the backend is unreachable. Check the
  diagnostics URL above. The admin page now falls through to the login screen
  after 6 seconds instead of hanging forever, so a blank hang means the whole
  Node server is not running (a Hostinger deploy/start-command problem).
- Optional but strongly recommended: enable two-factor in the Security tab.

## 2. How CLIENTS access their portal, and how you control it

Clients do NOT self-register. That is deliberate and correct: you never want
strangers creating accounts that can see engagement data. You provision each
client yourself, and you can revoke them at any time.

To give a client access:

1. Sign in at /admin, open the "Clients" tab.
2. Create the client organization (e.g. "Afriland First Bank").
3. Under that org, create a portal user: their email, a name, and a temporary
   password of at least 12 characters that you choose.
4. Send them, through a secure channel (not the same email as the password if
   avoidable): the URL https://skeliontech.com/portal , their email, and the
   temporary password. Tell them to change it on first login (the portal has a
   change-password button).

To revoke a client: same Clients tab, open the org, delete the user (removes
their login immediately) or delete the whole org (removes users, engagements,
findings). Deletion is instant.

## 3. How the two portals interconnect

They share one database but are two separate security boundaries:

- You, in /admin, create organizations, users, engagements, findings, and
  compliance programs.
- The client, in /portal, sees ONLY their own organization's engagements,
  findings, and compliance posture. They can never see another client's data,
  and they can never reach any admin function.

The link is the client organization. When you add a finding to an engagement
under "Afriland First Bank", the user you created under that same org sees it in
their portal the next time they load it. That is the entire interconnect: you
publish on the admin side, they consume on the portal side, scoped by org.

## 4. Your control and visibility as owner

- Every client login is one you created and can delete.
- Client sessions are cookie-based, HttpOnly, SameSite=strict, and carry a
  token audience that is rejected by every admin endpoint. A client cannot use
  their session to reach admin APIs; this is enforced and tested.
- A client requesting another org's data by guessing an ID gets a 404, not the
  data. Tenant isolation is enforced on every query and covered by tests.
- Clients have read plus their own compliance self-assessment. They cannot
  create engagements, cannot see other tenants, cannot escalate. The realistic
  risk is a weak client password, so require strong ones and, for sensitive
  clients, rotate them.
- The diagnostics page gives you live visibility into database, email, admin
  account, and data counts at any moment.

## 5. Fixing email specifically (the recurring one)

In Hostinger environment variables, set and then REDEPLOY:

    SMTP_HOST=smtp.hostinger.com
    SMTP_PORT=465
    SMTP_SECURE=1
    SMTP_USER=info@skeliontech.com
    SMTP_PASS=<the mailbox password>
    CONTACT_RECIPIENT=info@skeliontech.com
    MAIL_FROM=Skelion Platform <info@skeliontech.com>

Preconditions that are easy to miss:
- The mailbox info@skeliontech.com must actually exist in hPanel > Emails.
- Hostinger applies env changes only on the NEXT deploy. Always redeploy after
  changing them.
- The From address must be the same mailbox as SMTP_USER, or the provider
  rejects the message. The platform already defaults From to SMTP_USER.

Then open /admin?ops=YOUR_OPS_KEY and click "send test email". A green result
means it works. A red result prints the exact SMTP error (auth, host, or TLS).

I am fairly confident about smtp.hostinger.com and port 465 for Hostinger email,
but verify them in your mailbox's configuration screen, since providers change
these and I cannot see your account.
