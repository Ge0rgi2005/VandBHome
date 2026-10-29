const crypto = require('crypto');

const COOKIE = 'vb_admin';
const MAX_AGE = 7 * 24 * 3600; // 7 дни

const secret = () => process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || '';
const sign = (p) => crypto.createHmac('sha256', secret()).update(p).digest('hex');
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();

function configured() { return !!process.env.ADMIN_PASSWORD; }

function passwordOk(input) {
  if (!configured()) return false;
  return crypto.timingSafeEqual(sha(input || ''), sha(process.env.ADMIN_PASSWORD));
}

function makeToken() {
  const exp = String(Date.now() + MAX_AGE * 1000);
  return `${exp}.${sign(exp)}`;
}

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function isAdmin(req) {
  if (!configured()) return false;
  const token = parseCookies(req)[COOKIE];
  if (!token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const good = Buffer.from(sign(exp));
  const got = Buffer.from(sig);
  return good.length === got.length && crypto.timingSafeEqual(good, got);
}

const setCookie = (res, token, maxAge) =>
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`);

module.exports = {
  configured, passwordOk, isAdmin,
  login: (res) => setCookie(res, makeToken(), MAX_AGE),
  logout: (res) => setCookie(res, '', 0),
};
