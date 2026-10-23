// Shared helpers: storage (Upstash Redis if configured, else a local JSON file) + admin auth.
const crypto = require('crypto'), fs = require('fs'), path = require('path');
const KEY = 'portfolio:content';
const DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data'), FILE = path.join(DIR, 'content.json');
const U = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const T = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const H = { Authorization: 'Bearer ' + T };

exports.load = async () => {
  if (U) {
    const r = await fetch(U + '/get/' + KEY, { headers: H });
    if (!r.ok) throw new Error('Storage read failed');
    const j = await r.json();
    return j.result ? JSON.parse(j.result) : null;
  }
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return null; }
};
exports.save = async (obj) => {
  const v = JSON.stringify(obj);
  if (U) {
    const r = await fetch(U, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify(['SET', KEY, v]) });
    if (!r.ok) throw new Error('Storage write failed');
    return;
  }
  try { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(FILE, v); }
  catch { throw new Error('No writable storage. Connect Upstash Redis (see README).'); }
};

const secret = () => process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || '';
const sign = (s) => crypto.createHmac('sha256', secret()).update(s).digest('hex');
const safeEqual = (a, b) => {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b) || a.length !== b.length) return false;
  try { return crypto.timingSafeEqual(a, b); }
  catch { return false; }
};
exports.issue = () => { const e = Date.now() + 7 * 864e5; return e + '.' + sign(String(e)); };
exports.isAdmin = (req) => {
  if (!secret()) return false;
  const m = /(?:^|;\s*)adm=([^;]+)/.exec(req.headers.cookie || '');
  if (!m) return false;
  const [e, sg] = m[1].split('.');
  if (!e || !sg || +e < Date.now()) return false;
  const a = Buffer.from(sign(e)), b = Buffer.from(sg);
  return safeEqual(a, b);
};
exports.checkPw = (pw) => {
  const p = process.env.ADMIN_PASSWORD;
  if (!p || typeof pw !== 'string') return false;
  const h = (x) => crypto.createHash('sha256').update(x).digest();
  return safeEqual(h(pw), h(p));
};
exports.checkEmail = (email) => {
  const expected = process.env.ADMIN_EMAIL;
  if (!expected || typeof email !== 'string') return false;
  const h = (x) => crypto.createHash('sha256').update(x.trim().toLowerCase()).digest();
  return safeEqual(h(email), h(expected));
};
exports.cookie = (req, val, age) =>
  `adm=${val}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}` + (req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '');
