const express = require('express');
const escapeHtml = require('escape-html');
const { body, validationResult } = require('express-validator');
const { isAuthenticated, hasRole } = require('../middleware/auth');
const { readLogs, logEvent, criticalIPWhitelist, apiLimiter } = require('../middleware/security');

const router = express.Router();
router.use(apiLimiter);
router.use(isAuthenticated);

let gridState = {
  generationMW: 245.4,
  loadMW: 238.8,
  storageMW: 12.6,
  frequencyHz: 50.02,
  renewableShare: 41.5,
  activeAlarms: 1,
  lastUpdate: new Date().toISOString()
};

let systemConfig = {
  balancingMode: 'auto',
  maxFrequencyDeviation: 0.2,
  demandResponseEnabled: true,
  forecastHorizonHours: 24,
  updatedAt: new Date().toISOString()
};

function getBalance() {
  const balanceMW = +(gridState.generationMW + gridState.storageMW - gridState.loadMW).toFixed(2);
  return {
    ...gridState,
    balanceMW,
    status: Math.abs(balanceMW) <= 10 && gridState.frequencyHz >= 49.8 && gridState.frequencyHz <= 50.2 ? 'normal' : 'warning'
  };
}

router.get('/grid/balance', hasRole('operator', 'analyst'), (req, res) => {
  logEvent('view_grid_balance', { user: req.user.email, role: req.user.role });
  res.json(getBalance());
});

router.post('/grid/adjust',
  hasRole('operator'),
  criticalIPWhitelist,
  body('generationMW').optional().isFloat({ min: 0, max: 1000 }),
  body('loadMW').optional().isFloat({ min: 0, max: 1000 }),
  body('storageMW').optional().isFloat({ min: -100, max: 100 }),
  body('comment').optional().trim().escape().isLength({ max: 200 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const patch = {};
    ['generationMW', 'loadMW', 'storageMW'].forEach(key => {
      if (req.body[key] !== undefined) patch[key] = Number(req.body[key]);
    });
    gridState = { ...gridState, ...patch, lastUpdate: new Date().toISOString() };
    logEvent('grid_adjusted', {
      user: req.user.email,
      patch,
      comment: escapeHtml(req.body.comment || '')
    });
    res.json({ message: 'Баланс мережі оновлено', balance: getBalance() });
  }
);

router.get('/forecasts', hasRole('analyst'), (req, res) => {
  const now = Date.now();
  const forecasts = Array.from({ length: 12 }, (_, i) => ({
    hour: new Date(now + i * 60 * 60 * 1000).toISOString(),
    predictedLoadMW: +(230 + Math.sin(i / 2) * 25 + Math.random() * 8).toFixed(2),
    predictedGenerationMW: +(240 + Math.cos(i / 2) * 20 + Math.random() * 10).toFixed(2),
    confidence: +(88 + Math.random() * 8).toFixed(1)
  }));
  logEvent('view_forecasts', { user: req.user.email });
  res.json({ region: 'city-smart-grid', horizonHours: 12, forecasts });
});

router.post('/system/config',
  hasRole('administrator'),
  criticalIPWhitelist,
  body('balancingMode').optional().isIn(['auto', 'manual', 'emergency']),
  body('maxFrequencyDeviation').optional().isFloat({ min: 0.05, max: 1 }),
  body('demandResponseEnabled').optional().isBoolean(),
  body('forecastHorizonHours').optional().isInt({ min: 1, max: 72 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    systemConfig = { ...systemConfig, ...req.body, updatedAt: new Date().toISOString() };
    logEvent('system_config_updated', { user: req.user.email, config: systemConfig });
    res.json({ message: 'Конфігурацію системи оновлено', config: systemConfig });
  }
);

router.get('/system/config', hasRole('administrator'), (req, res) => {
  res.json(systemConfig);
});

router.get('/logs', hasRole('administrator'), (req, res) => {
  res.json(readLogs().slice(0, 100));
});

module.exports = router;
