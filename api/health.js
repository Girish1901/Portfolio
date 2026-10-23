// Health check controller. Works as a Vercel serverless function AND inside Express (Railway).
const startedAt = Date.now();

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    status: 'ok',
    service: 'girish-portfolio',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.round(process.uptime()),
    started_at: new Date(startedAt).toISOString(),
    platform: process.env.VERCEL ? 'vercel' : process.env.RAILWAY_ENVIRONMENT ? 'railway' : 'local',
    memory_mb: Math.round(process.memoryUsage().rss / 1048576),
  });
};
