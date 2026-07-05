import jwt from 'jsonwebtoken';

const COOKIE = 'skelion_session';
const PORTAL_COOKIE = 'skelion_portal';

// Audience claims keep the two trust boundaries apart: an admin token can
// never authenticate portal endpoints and vice versa, even though both are
// signed with the same server secret.

export function issueSession(res, config, admin) {
  const token = jwt.sign({ sub: admin.id, email: admin.email, aud: 'admin' }, config.sessionSecret, {
    expiresIn: `${config.sessionHours}h`,
  });
  res.cookie(COOKIE, token, {
    httpOnly: true, sameSite: 'strict', secure: config.isProd,
    maxAge: config.sessionHours * 3600 * 1000, path: '/',
  });
}

export function clearSession(res) {
  res.clearCookie(COOKIE, { path: '/' });
}

export function requireAuth(config) {
  return (req, res, next) => {
    const token = req.cookies?.[COOKIE];
    if (!token) return res.status(401).json({ error: 'unauthenticated' });
    try {
      req.admin = jwt.verify(token, config.sessionSecret, { audience: 'admin' });
      next();
    } catch {
      clearSession(res);
      return res.status(401).json({ error: 'session_expired' });
    }
  };
}

// ---- client portal sessions (separate cookie + audience) ----

export function issuePortalSession(res, config, user) {
  const token = jwt.sign(
    { sub: user.id, email: user.email, cid: user.client_id, name: user.name, aud: 'portal' },
    config.sessionSecret,
    { expiresIn: `${config.sessionHours}h` }
  );
  res.cookie(PORTAL_COOKIE, token, {
    httpOnly: true, sameSite: 'strict', secure: config.isProd,
    maxAge: config.sessionHours * 3600 * 1000, path: '/',
  });
}

export function clearPortalSession(res) {
  res.clearCookie(PORTAL_COOKIE, { path: '/' });
}

export function requirePortalAuth(config) {
  return (req, res, next) => {
    const token = req.cookies?.[PORTAL_COOKIE];
    if (!token) return res.status(401).json({ error: 'unauthenticated' });
    try {
      req.client = jwt.verify(token, config.sessionSecret, { audience: 'portal' });
      next();
    } catch {
      clearPortalSession(res);
      return res.status(401).json({ error: 'session_expired' });
    }
  };
}

// ---- MFA step-up: short-lived token proving password was verified ----

export function issueMfaPending(config, admin) {
  return jwt.sign({ sub: admin.id, email: admin.email, aud: 'admin-mfa' }, config.sessionSecret, { expiresIn: '5m' });
}

export function verifyMfaPending(config, token) {
  try { return jwt.verify(token, config.sessionSecret, { audience: 'admin-mfa' }); }
  catch { return null; }
}
