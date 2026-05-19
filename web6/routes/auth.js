const express = require('express');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { createUser, findByEmail, publicUser } = require('../models/UserStore');
const { loginLimiter, logEvent } = require('../middleware/security');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

router.get('/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

router.get('/status', (req, res) => {
  res.json({
    authenticated: !!(req.isAuthenticated && req.isAuthenticated()),
    user: req.user ? publicUser(req.user) : null,
    passwordRotationRequired: res.locals.passwordRotationRequired || false
  });
});

router.post('/register',
  body('name').trim().escape().isLength({ min: 2, max: 80 }).withMessage('Ім’я повинно містити 2-80 символів'),
  body('email').isEmail().normalizeEmail().withMessage('Некоректний email'),
  body('password').isLength({ min: 8 }).matches(/[A-Z]/).matches(/[0-9]/).withMessage('Пароль має містити мінімум 8 символів, велику літеру та цифру'),
  body('role').isIn(['operator', 'analyst', 'administrator']).withMessage('Некоректна роль'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password, role } = req.body;
    if (findByEmail(email)) return res.status(400).json({ error: 'Користувач з таким email вже існує' });

    const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '10', 10));
    const user = createUser({ name, email, passwordHash, role });
    logEvent('user_registered', { userId: user.id, email: user.email, role: user.role });
    res.status(201).json({ message: 'Реєстрація успішна', user: publicUser(user) });
  }
);

router.post('/login', loginLimiter, (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: info?.message || 'Помилка входу' });
    req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      res.json({ message: 'Вхід успішний', user: publicUser(user) });
    });
  })(req, res, next);
});

router.post('/logout', isAuthenticated, (req, res) => {
  const user = req.user ? publicUser(req.user) : null;
  req.logout((err) => {
    if (err) return res.status(500).json({ error: 'Помилка виходу' });
    req.session.destroy(() => {
      logEvent('logout', { user });
      res.clearCookie('connect.sid');
      res.json({ message: 'Вихід успішний' });
    });
  });
});

module.exports = router;
