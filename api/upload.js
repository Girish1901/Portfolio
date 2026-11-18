// File upload handler: saves uploaded images or PDFs locally into public/img/uploads/
const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { name, data, prefix = 'uploads' } = req.body || {};
    if (!name || !data) {
      return res.status(400).json({ error: 'Missing file name or data' });
    }

    // Match base64 data URI: data:image/png;base64,....
    const matches = data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer;
    if (matches && matches[2]) {
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(data, 'base64');
    }

    const cleanName = Date.now() + '_' + name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uploadDir = path.join(__dirname, '..', 'public', 'img', prefix);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const targetPath = path.join(uploadDir, cleanName);
    fs.writeFileSync(targetPath, buffer);

    const relativeUrl = `img/${prefix}/${cleanName}`;
    return res.status(200).json({ ok: true, url: relativeUrl });
  } catch (err) {
    console.error('Local file upload failed:', err);
    return res.status(500).json({ error: err.message });
  }
};
