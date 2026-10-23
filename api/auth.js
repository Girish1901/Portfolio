// GET = am I signed in, POST = sign in, DELETE = sign out
const L = require('./_lib');
const fails = new Map();

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') return res.status(200).json({ admin: L.isAdmin(req) });
  if (req.method === 'DELETE') { res.setHeader('Set-Cookie', L.cookie(req, '', 0)); return res.status(200).json({ ok: true }); }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) return res.status(503).json({ error: 'Admin is not configured' });

  const ip = String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || '').split(',')[0].trim();
  const old = fails.get(ip), f = old && Date.now() - old.t < 9e5 ? old : { n: 0, t: 0 };
  if (f.n >= 5) return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
  await new Promise((r) => setTimeout(r, 600));
  if (!L.checkEmail(req.body && req.body.email) || !L.checkPw(req.body && req.body.password)) {
    fails.set(ip, { n: f.n + 1, t: Date.now() });
    return res.status(401).json({ error: 'Wrong password' });
  }
  fails.delete(ip);
  res.setHeader('Set-Cookie', L.cookie(req, L.issue(), 604800));
  res.status(200).json({ ok: true });
};
