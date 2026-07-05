import nodemailer from 'nodemailer';

/**
 * Email notifier for contact submissions.
 *
 * If SMTP is not configured (no SMTP_HOST), this becomes a safe no-op: the
 * submission is still stored and visible in the admin panel, we simply do not
 * send an email. When SMTP is configured, a formatted notification is sent to
 * the CONTACT_RECIPIENT address. Sending never blocks or fails the HTTP request.
 */
export function createMailer(config, log) {
  const m = config.mail || {};
  const enabled = Boolean(m.host && m.user && m.pass);

  if (!enabled) {
    log.warn?.('[mail] SMTP not configured — contact submissions will be stored only (no email). Set SMTP_HOST/SMTP_USER/SMTP_PASS to enable.');
    return { enabled: false, async notifyContact() {}, async notifyAssessment() {}, async sendTest() { return { ok: false, error: 'SMTP is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS, then redeploy.' }; } };
  }

  const transport = nodemailer.createTransport({
    host: m.host,
    port: m.port,
    secure: m.secure,
    auth: { user: m.user, pass: m.pass },
  });

  const fromAddr = m.from || `Skelion Platform <${m.user}>`;
  log.info?.(`[mail] SMTP enabled via ${m.host}:${m.port} — notifications to ${m.to}, from ${fromAddr}`);

  return {
    enabled: true,
    async notifyContact(sub) {
      const subject = `New enquiry: ${sub.name}${sub.organization ? ` (${sub.organization})` : ''}`;
      const text = [
        `New contact submission on skelionenterprises.com`,
        ``,
        `Name:         ${sub.name}`,
        `Organization: ${sub.organization || '-'}`,
        `Email:        ${sub.email}`,
        `Service:      ${sub.service || '-'}`,
        `Language:     ${sub.locale}`,
        ``,
        `Message:`,
        sub.message || '(none)',
        ``,
        `— Skelion platform`,
      ].join('\n');

      try {
        await transport.sendMail({
          from: fromAddr,
          to: m.to,
          replyTo: sub.email, // reply goes straight to the enquirer
          subject,
          text,
        });
        log.info?.(`[mail] notification sent for submission from ${sub.email}`);
      } catch (err) {
        // Never surface to the user; the submission is already safely stored.
        log.error?.(`[mail] send failed: ${err.message}`);
      }
    },
    async notifyAssessment(a) {
      const subject = `New security assessment: ${a.grade} (${a.total_score}/30)${a.organization ? ` — ${a.organization}` : ''}`;
      const text = [
        `A security self-assessment was completed on the Skelion platform.`,
        ``,
        `Reference:    ${a.reference}`,
        `Name:         ${a.name || '-'}`,
        `Organization: ${a.organization || '-'}`,
        `Email:        ${a.email || '-'}`,
        `Score:        ${a.total_score}/30 — grade ${a.grade}`,
        `Language:     ${a.locale}`,
        ``,
        `Review it in the admin console under Assessments.`,
      ].join('\n');
      try {
        await transport.sendMail({ from: fromAddr, to: m.to, replyTo: a.email || undefined, subject, text });
        log.info?.(`[mail] assessment notification sent (${a.reference})`);
      } catch (err) { log.error?.(`[mail] assessment send failed: ${err.message}`); }
    },
    async sendTest() {
      try {
        await transport.sendMail({
          from: fromAddr, to: m.to, subject: 'Skelion platform — SMTP test',
          text: `This is a test notification from the Skelion platform.\n\nIf you are reading this, SMTP delivery to ${m.to} works.\nSent: ${new Date().toISOString()}`,
        });
        return { ok: true, to: m.to };
      } catch (err) { return { ok: false, error: err.message }; }
    },
  };
}
