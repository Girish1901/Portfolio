// GET = public portfolio content, PUT = save to data/content.json
const L = require('./_lib');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') {
      const data = await L.load();
      return res.status(200).json(data || {});
    }
    if (req.method === 'PUT' || req.method === 'POST') {
      const b = req.body;
      const ok = b && b.profile && ['projects', 'skills', 'contacts', 'sections'].every((k) => Array.isArray(b[k]));
      if (!ok) return res.status(400).json({ error: 'Invalid content schema' });
      await L.save(b);
      return res.status(200).json({ ok: true, message: 'Saved to local disk (data/content.json)' });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) { 
    res.status(500).json({ error: e.message }); 
  }
};
