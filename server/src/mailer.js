import nodemailer from 'nodemailer';

/**
 * Email notifier for contact submissions and assessments.
 *
 * If SMTP is not configured (no SMTP_HOST/USER/PASS), this becomes a safe no-op:
 * submissions are still stored and visible in the admin panel, we simply do not
 * send email. When SMTP is configured, notifications are sent to CONTACT_RECIPIENT.
 * Sending never blocks or fails the HTTP request. verify() lets boot and the
 * diagnostics endpoint test the connection without sending mail.
 */
export function createMailer(config, log) {
  const m = config.mail || {};
  const enabled = Boolean(m.host && m.user && m.pass);

  if (!enabled) {
    log.warn?.('[mail] SMTP not configured. Contact submissions will be stored only (no email). Set SMTP_HOST/SMTP_USER/SMTP_PASS to enable.');
    const disabled = { ok: false, error: 'SMTP not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS, then redeploy.' };
    return {
      enabled: false,
      reason: disabled.error,
      async notifyContact() {},
      async notifyAssessment() {},
      async verify() { return disabled; },
      async sendTest() { return disabled; },
    };
  }

  // From must match the authenticated mailbox on most providers (Hostinger
  // rejects mismatched senders), so fall back to the SMTP user.
  const fromAddr = m.from || `Skelion Platform <${m.user}>`;

  const transport = nodemailer.createTransport({
    host: m.host,
    port: m.port,
    secure: m.secure, // true for 465, false for 587/STARTTLS
    auth: { user: m.user, pass: m.pass },
  });

  log.info?.(`[mail] SMTP enabled via ${m.host}:${m.port} secure=${m.secure}, notifications to ${m.to}, from ${fromAddr}`);

  async function verify() {
    try {
      await transport.verify();
      return { ok: true, host: m.host, port: m.port, secure: m.secure, from: fromAddr, to: m.to };
    } catch (err) {
      return { ok: false, error: err.message, host: m.host, port: m.port, secure: m.secure };
    }
  }

  async function send(opts) {
    try { await transport.sendMail({ from: fromAddr, ...opts }); return { ok: true }; }
    catch (err) { log.error?.(`[mail] send failed: ${err.message}`); return { ok: false, error: err.message }; }
  }

  return {
    enabled: true,
    verify,

    async notifyContact(sub) {
      const subject = `New enquiry: ${sub.name}${sub.organization ? ` (${sub.organization})` : ''}`;
      const text = [
        'New contact submission on skeliontech.com', '',
        `Name:         ${sub.name}`,
        `Organization: ${sub.organization || '-'}`,
        `Email:        ${sub.email}`,
        `Service:      ${sub.service || '-'}`,
        `Language:     ${sub.locale}`, '',
        'Message:', sub.message || '(none)', '',
        '- Skelion platform',
      ].join('\n');
      await send({ to: m.to, replyTo: sub.email, subject, text });
    },

    async notifyAssessment(a) {
      const subject = `New security assessment: ${a.grade} (${a.total_score}/30)${a.organization ? ` - ${a.organization}` : ''}`;
      const text = [
        'A security self-assessment was completed on the Skelion platform.', '',
        `Reference:    ${a.reference}`,
        `Name:         ${a.name || '-'}`,
        `Organization: ${a.organization || '-'}`,
        `Email:        ${a.email || '-'}`,
        `Score:        ${a.total_score}/30, grade ${a.grade}`,
        `Language:     ${a.locale}`, '',
        'Review it in the admin console under Assessments.',
      ].join('\n');
      await send({ to: m.to, replyTo: a.email || undefined, subject, text });
    },

    async sendTest() {
      const r = await send({
        to: m.to,
        subject: 'Skelion platform - SMTP test',
        text: `This is a test notification from the Skelion platform.\n\nIf you are reading this, SMTP delivery to ${m.to} works.\nSent: ${new Date().toISOString()}`,
      });
      return r.ok ? { ok: true, to: m.to } : { ok: false, error: r.error };
    },
  };
}
