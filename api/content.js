// GET = public portfolio content, PUT = save (admin only)
const L = require('./_lib');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') return res.status(200).json((await L.load()) || {});
    if (req.method === 'PUT') {
      if (!L.isAdmin(req)) return res.status(401).json({ error: 'Not signed in' });
      const b = req.body;
      const ok = b && b.profile && ['projects', 'skills', 'contacts', 'sections'].every((k) => Array.isArray(b[k])) && JSON.stringify(b).length < 250000;
      if (!ok) return res.status(400).json({ error: 'Invalid content' });
      await L.save(b);
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
