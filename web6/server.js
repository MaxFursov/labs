require('dotenv').config();
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const csrf = require('csurf');
const path = require('path');
const passport = require('./config/passport');
const { seedUsers } = require('./models/UserStore');
const { attachSecurityHeaders, logEvent } = require('./middleware/security');
const { passwordRotationWarning } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(attachSecurityHeaders);
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'development-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 2
  }
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(passwordRotationWarning);

const csrfProtection = csrf();
app.use(csrfProtection);

app.use(express.static(path.join(__dirname, 'public')));
app.use('/auth', require('./routes/auth'));
app.use('/api', require('./routes/api'));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    logEvent('csrf_validation_failed', { url: req.originalUrl, ip: req.ip });
    return res.status(403).json({ error: 'Невалідний CSRF токен' });
  }
  console.error(err);
  res.status(500).json({ error: 'Внутрішня помилка сервера' });
});

seedUsers().then(() => {
  app.listen(PORT, () => {
    console.log(`Secure Smart Grid app started at http://localhost:${PORT}`);
    console.log('Test users: operator@grid.local / Operator123!, analyst@grid.local / Analyst123!, admin@grid.local / Admin123!');
  });
});
