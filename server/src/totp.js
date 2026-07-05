import crypto from 'node:crypto';

/**
 * Self-contained TOTP (RFC 6238) and base32 (RFC 4648), built on Node's crypto.
 * No third-party dependency is added: for a security product, keeping the second
 * authentication factor free of unvetted supply-chain risk is the correct posture.
 *
 * Defaults match Google Authenticator / Authy: SHA1, 6 digits, 30s period.
 */

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf) {
  let bits = 0, value = 0, out = '';
  for (const byte of buf) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(str) {
  const clean = str.toUpperCase().replace(/=+$/g, '').replace(/\s/g, '');
  let bits = 0, value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return Buffer.from(out);
}

/** New random base32 secret (default 20 bytes = 160 bits, per RFC 4226). */
export function generateSecret(bytes = 20) {
  return base32Encode(crypto.randomBytes(bytes));
}

function hotp(secret, counter, digits = 6) {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  // 64-bit big-endian counter
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 10 ** digits).toString().padStart(digits, '0');
}

export function totp(secret, { period = 30, digits = 6, t = Date.now() } = {}) {
  return hotp(secret, Math.floor(t / 1000 / period), digits);
}

/**
 * Verify a token, tolerating +/- `window` periods of clock drift (default 1,
 * i.e. the current, previous, and next 30s window). Constant-ish comparison.
 */
export function verifyTotp(secret, token, { period = 30, digits = 6, window = 1, t = Date.now() } = {}) {
  if (!secret || !token || !/^\d{6}$/.test(String(token).trim())) return false;
  const clean = String(token).trim();
  const counter = Math.floor(t / 1000 / period);
  for (let w = -window; w <= window; w++) {
    const candidate = hotp(secret, counter + w, digits);
    if (crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(clean))) return true;
  }
  return false;
}

/** otpauth:// URI for QR provisioning in authenticator apps. */
export function otpauthURL({ secret, label, issuer = 'Skelion' }) {
  const l = encodeURIComponent(label);
  const i = encodeURIComponent(issuer);
  return `otpauth://totp/${i}:${l}?secret=${secret}&issuer=${i}&algorithm=SHA1&digits=6&period=30`;
}

/** One-time recovery codes: return plaintext (shown once) + bcrypt-ready list. */
export function generateRecoveryCodes(count = 10) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(5).toString('hex'); // 10 hex chars
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  }
  return codes;
}
