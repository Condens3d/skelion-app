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
    return { enabled: false, async notifyContact() {} };
  }

  const transport = nodemailer.createTransport({
    host: m.host,
    port: m.port,
    secure: m.secure,
    auth: { user: m.user, pass: m.pass },
  });

  log.info?.(`[mail] SMTP enabled via ${m.host}:${m.port} — notifications to ${m.to}`);

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
          from: m.from,
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
  };
}
