import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import QRCode from 'qrcode';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import {
  issueSession, clearSession, requireAuth, issueMfaPending, verifyMfaPending,
} from '../auth.js';
import {
  generateSecret, verifyTotp, otpauthURL, generateRecoveryCodes,
} from '../totp.js';

const LoginSchema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(200) });
const MfaVerifySchema = z.object({ pending: z.string().min(10), token: z.string().trim().max(20) });
const EnableSchema = z.object({ token: z.string().trim().length(6) });

// recovery_codes may arrive as a JSON string (SQLite) or array (Postgres JSONB).
function parseRecovery(v) {
  if (Array.isArray(v)) return v;
  try { return JSON.parse(v || '[]'); } catch { return []; }
}

export function authRouter(store, config) {
  const router = Router();
  const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'rate_limited' } });
  const mfaLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'rate_limited' } });

  // Step 1: password. If MFA is enabled, return a short-lived pending token
  // instead of a session, and require step 2.
  router.post('/login', loginLimiter, async (req, res, next) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'validation_failed' });
    try {
      const admin = await store.findAdminByEmail(parsed.data.email);
      if (!admin || !bcrypt.compareSync(parsed.data.password, admin.password_hash)) {
        return res.status(401).json({ error: 'invalid_credentials' });
      }
      if (admin.mfa_enabled) {
        return res.json({ mfa_required: true, pending: issueMfaPending(config, admin) });
      }
      issueSession(res, config, admin);
      res.json({ ok: true, email: admin.email, mfa_enabled: false });
    } catch (e) { next(e); }
  });

  // Step 2: TOTP code or a recovery code. Consumes the pending token.
  router.post('/login/mfa', mfaLimiter, async (req, res, next) => {
    const parsed = MfaVerifySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'validation_failed' });
    const pending = verifyMfaPending(config, parsed.data.pending);
    if (!pending) return res.status(401).json({ error: 'mfa_expired' });
    try {
      const admin = await store.findAdminById(pending.sub);
      if (!admin || !admin.mfa_enabled) return res.status(401).json({ error: 'invalid' });
      const code = parsed.data.token.trim();

      if (verifyTotp(admin.mfa_secret, code)) {
        issueSession(res, config, admin);
        return res.json({ ok: true, email: admin.email });
      }
      // Fallback: single-use recovery code
      const codes = parseRecovery(admin.recovery_codes);
      const idx = codes.findIndex((h) => bcrypt.compareSync(code, h));
      if (idx !== -1) {
        codes.splice(idx, 1);
        await store.setAdminRecoveryCodes(admin.id, codes);
        issueSession(res, config, admin);
        return res.json({ ok: true, email: admin.email, recovery_used: true, recovery_remaining: codes.length });
      }
      res.status(401).json({ error: 'invalid_code' });
    } catch (e) { next(e); }
  });

  router.post('/logout', (req, res) => { clearSession(res); res.json({ ok: true }); });

  router.get('/me', requireAuth(config), async (req, res, next) => {
    try {
      const admin = await store.findAdminById(req.admin.sub);
      res.json({ email: req.admin.email, mfa_enabled: Boolean(admin?.mfa_enabled) });
    } catch (e) { next(e); }
  });

  // ---- MFA management (authenticated) ----

  // Begin enrolment: generate a secret, return provisioning URI + secret for QR.
  router.post('/mfa/setup', requireAuth(config), async (req, res, next) => {
    try {
      const admin = await store.findAdminById(req.admin.sub);
      if (admin.mfa_enabled) return res.status(409).json({ error: 'already_enabled' });
      const secret = generateSecret();
      await store.setAdminMfaSecret(admin.id, secret);
      const otpauth = otpauthURL({ secret, label: admin.email });
      let qr_svg = '';
      try {
        qr_svg = await QRCode.toString(otpauth, { type: 'svg', margin: 1, width: 200, color: { dark: '#0E1318', light: '#F8FAFB' } });
      } catch { /* QR optional: manual key still shown */ }
      res.json({ secret, otpauth, qr_svg });
    } catch (e) { next(e); }
  });

  // Confirm enrolment: verify a live code, then enable and issue recovery codes.
  router.post('/mfa/enable', requireAuth(config), async (req, res, next) => {
    const parsed = EnableSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'validation_failed' });
    try {
      const admin = await store.findAdminById(req.admin.sub);
      if (admin.mfa_enabled) return res.status(409).json({ error: 'already_enabled' });
      if (!admin.mfa_secret || !verifyTotp(admin.mfa_secret, parsed.data.token)) {
        return res.status(401).json({ error: 'invalid_code' });
      }
      const plain = generateRecoveryCodes(10);
      const hashes = plain.map((c) => bcrypt.hashSync(c, 10));
      await store.enableAdminMfa(admin.id, hashes);
      res.json({ ok: true, recovery_codes: plain });
    } catch (e) { next(e); }
  });

  // Disable MFA (requires a current code to prove possession).
  router.post('/mfa/disable', requireAuth(config), async (req, res, next) => {
    const parsed = EnableSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'validation_failed' });
    try {
      const admin = await store.findAdminById(req.admin.sub);
      if (!admin.mfa_enabled) return res.json({ ok: true });
      if (!verifyTotp(admin.mfa_secret, parsed.data.token)) return res.status(401).json({ error: 'invalid_code' });
      await store.disableAdminMfa(admin.id);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  return router;
}
