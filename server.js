// Portfolio server — works locally and on Railway / any Node host.
// Vercel uses /api/* as serverless functions and serves /public as static.
const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const app      = express();

app.use(express.json({ limit: '10mb' }));

// ─── Health endpoints ─────────────────────────────────────────────────────────
['/health', '/healthz', '/api/health'].forEach((p) => app.get(p, require('./api/health')));

// ─── API endpoints ────────────────────────────────────────────────────────────
app.all('/api/content', require('./api/content'));
app.all('/api/auth',    require('./api/auth'));
app.all('/api/upload',  require('./api/upload'));

// ─── Inject Firebase config from env vars into index.html ────────────────────
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');

  const firebaseCfg = {
    apiKey:            process.env.FIREBASE_API_KEY            || '',
    authDomain:        process.env.FIREBASE_AUTH_DOMAIN        || '',
    projectId:         process.env.FIREBASE_PROJECT_ID         || '',
    storageBucket:     process.env.FIREBASE_STORAGE_BUCKET     || '',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId:             process.env.FIREBASE_APP_ID             || '',
    measurementId:     process.env.FIREBASE_MEASUREMENT_ID     || ''
  };

  if (firebaseCfg.apiKey) {
    const injection = `<script>window.__firebaseConfig=${JSON.stringify(firebaseCfg)};</script>`;
    html = html.replace('</head>', injection + '\n</head>');
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.send(html);
});

// ─── Static files ─────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => console.log(`Portfolio live on :${port}`));
