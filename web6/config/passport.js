const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const { findByEmail, findById, updateUser } = require('../models/UserStore');
const { logEvent } = require('../middleware/security');

passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    const user = findByEmail(email);
    if (!user) {
      logEvent('failed_login_unknown_user', { email });
      return done(null, false, { message: 'Невірний email або пароль' });
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      logEvent('blocked_login_locked_user', { userId: user.id, email });
      return done(null, false, { message: 'Обліковий запис тимчасово заблоковано' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      const failedLoginCount = (user.failedLoginCount || 0) + 1;
      const patch = { failedLoginCount };
      if (failedLoginCount >= 5) {
        patch.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }
      updateUser(user.id, patch);
      logEvent('failed_login', { userId: user.id, email, failedLoginCount });
      return done(null, false, { message: 'Невірний email або пароль' });
    }

    updateUser(user.id, {
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date().toISOString()
    });
    logEvent('successful_login', { userId: user.id, email, role: user.role });
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  try {
    const user = findById(id);
    done(null, user || false);
  } catch (error) {
    done(error);
  }
});

module.exports = passport;
