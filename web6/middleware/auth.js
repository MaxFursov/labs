function isAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.status(401).json({ error: 'Необхідна автентифікація' });
}

function hasRole(...roles) {
  return (req, res, next) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ error: 'Необхідна автентифікація' });
    }
    if (roles.includes(req.user.role)) return next();
    return res.status(403).json({ error: 'Недостатньо прав доступу' });
  };
}

function passwordRotationWarning(req, res, next) {
  if (req.user?.lastPasswordChange) {
    const days = (Date.now() - new Date(req.user.lastPasswordChange).getTime()) / (1000 * 60 * 60 * 24);
    res.locals.passwordRotationRequired = days > 90;
  }
  next();
}

module.exports = { isAuthenticated, hasRole, passwordRotationWarning };
