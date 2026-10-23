// Railway / local server. Vercel ignores this and runs /api/* as functions.
const express = require('express');
const path = require('path');
const app = express();
app.use(express.json({ limit: '400kb' }));
['/health', '/healthz', '/api/health'].forEach((p) => app.get(p, require('./api/health')));
app.all('/api/content', require('./api/content'));
app.all('/api/auth', require('./api/auth'));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => console.log(`Portfolio live on :${port}`));
