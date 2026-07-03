import jwt from 'jsonwebtoken';

const COOKIE = 'skelion_session';

export function issueSession(res, config, admin) {
  const token = jwt.sign({ sub: admin.id, email: admin.email }, config.sessionSecret, {
    expiresIn: `${config.sessionHours}h`,
  });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.isProd,
    maxAge: config.sessionHours * 3600 * 1000,
    path: '/',
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
      req.admin = jwt.verify(token, config.sessionSecret);
      next();
    } catch {
      clearSession(res);
      return res.status(401).json({ error: 'session_expired' });
    }
  };
}
