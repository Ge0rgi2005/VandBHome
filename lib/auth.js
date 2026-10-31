const crypto = require('crypto');
const { promisify } = require('util');
const scrypt = promisify(crypto.scrypt);

const ADMIN_COOKIE = 'vb_admin';
const USER_COOKIE = 'vb_user';
const ADMIN_AGE = 7 * 24 * 3600;
const USER_AGE = 30 * 24 * 3600;

const secret = () => process.env.SESSION_SECRET || process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || '';
const sign = (p) => crypto.createHmac('sha256', secret()).update(p).digest('hex');
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();

function configured() { return !!secret(); }
function adminConfigured() { return !!process.env.ADMIN_PASSWORD; }

function passwordOk(input) {
  if (!adminConfigured()) return false;
  return crypto.timingSafeEqual(sha(input || ''), sha(process.env.ADMIN_PASSWORD));
}

// Токен: kind.uid.exp.sig
function makeToken(kind, uid, ageSec) {
  const body = `${kind}.${uid}.${Date.now() + ageSec * 1000}`;
  return `${body}.${sign(body)}`;
}
function readToken(token, kind) {
  if (!token || !configured()) return null;
  const parts = token.split('.');
  if (parts.length !== 4 || parts[0] !== kind) return null;
  const body = parts.slice(0, 3).join('.');
  const good = Buffer.from(sign(body));
  const got = Buffer.from(parts[3]);
  if (good.length !== got.length || !crypto.timingSafeEqual(good, got)) return null;
  if (Number(parts[2]) < Date.now()) return null;
  return Number(parts[1]);
}

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

const setCookie = (res, name, value, maxAge) =>
  res.setHeader('Set-Cookie', `${name}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`);

// ----- админ -----
const isAdmin = (req) => readToken(parseCookies(req)[ADMIN_COOKIE], 'admin') === 0;
const adminLogin = (res) => setCookie(res, ADMIN_COOKIE, makeToken('admin', 0, ADMIN_AGE), ADMIN_AGE);
const adminLogout = (res) => setCookie(res, ADMIN_COOKIE, '', 0);

// ----- потребители -----
const userId = (req) => {
  const id = readToken(parseCookies(req)[USER_COOKIE], 'user');
  return id && id > 0 ? id : null;
};
const userLogin = (res, id) => setCookie(res, USER_COOKIE, makeToken('user', id, USER_AGE), USER_AGE);
const userLogout = (res) => setCookie(res, USER_COOKIE, '', 0);

async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const h = await scrypt(pw, salt, 64);
  return `${salt.toString('hex')}:${h.toString('hex')}`;
}
async function verifyPassword(pw, stored) {
  const [s, h] = String(stored).split(':');
  if (!s || !h) return false;
  const hh = await scrypt(pw, Buffer.from(s, 'hex'), 64);
  const want = Buffer.from(h, 'hex');
  return hh.length === want.length && crypto.timingSafeEqual(hh, want);
}

module.exports = {
  configured, adminConfigured, passwordOk, isAdmin, adminLogin, adminLogout,
  userId, userLogin, userLogout, hashPassword, verifyPassword,
  // съвместимост със стария код
  login: adminLogin, logout: adminLogout,
};
