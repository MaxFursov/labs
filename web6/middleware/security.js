const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LOG_FILE = path.join(DATA_DIR, 'security-events.json');

function ensureLogFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, '[]', 'utf8');
}

function readLogs() {
  ensureLogFile();
  try {
    return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
  } catch (error) {
    return [];
  }
}

function logEvent(type, details = {}) {
  const logs = readLogs();
  logs.unshift({
    id: Date.now().toString(),
    type,
    details,
    timestamp: new Date().toISOString()
  });
  fs.writeFileSync(LOG_FILE, JSON.stringify(logs.slice(0, 300), null, 2), 'utf8');
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Забагато спроб входу. Спробуйте пізніше.' }
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Перевищено ліміт запитів до API.' }
});

function criticalIPWhitelist(req, res, next) {
  const allowed = (process.env.ALLOWED_IPS || '127.0.0.1,::1,::ffff:127.0.0.1')
    .split(',')
    .map(item => item.trim());
  const ip = req.ip || req.connection.remoteAddress;
  if (allowed.includes(ip)) return next();
  logEvent('blocked_ip_for_critical_operation', { ip, url: req.originalUrl, user: req.user?.email });
  return res.status(403).json({ error: 'IP-адреса не дозволена для критичних операцій' });
}

function attachSecurityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
}

module.exports = { logEvent, readLogs, loginLimiter, apiLimiter, criticalIPWhitelist, attachSecurityHeaders };
