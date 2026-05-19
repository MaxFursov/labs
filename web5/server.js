const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const MAX_HISTORY = 60;
const history = [];

function randomFloat(min, max, decimals = 2) {
  return Number((Math.random() * (max - min) + min).toFixed(decimals));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getStatus(value, normalMin, normalMax, warnMin, warnMax) {
  if (value >= normalMin && value <= normalMax) return 'normal';
  if (value >= warnMin && value <= warnMax) return 'warning';
  return 'critical';
}

function generateWaveform(amplitude = 230, thd = 4) {
  const points = [];
  for (let i = 0; i < 120; i += 1) {
    const angle = (2 * Math.PI * i) / 120;
    const harmonic3 = Math.sin(3 * angle) * (thd / 100) * amplitude * 0.45;
    const harmonic5 = Math.sin(5 * angle) * (thd / 100) * amplitude * 0.25;
    points.push(Number((Math.sin(angle) * amplitude + harmonic3 + harmonic5).toFixed(2)));
  }
  return points;
}

function generateHarmonics(thd) {
  return [
    { order: 1, value: 100 },
    { order: 3, value: Number((thd * randomFloat(0.35, 0.55, 2)).toFixed(2)) },
    { order: 5, value: Number((thd * randomFloat(0.20, 0.38, 2)).toFixed(2)) },
    { order: 7, value: Number((thd * randomFloat(0.12, 0.25, 2)).toFixed(2)) },
    { order: 9, value: Number((thd * randomFloat(0.04, 0.12, 2)).toFixed(2)) }
  ];
}

function generatePowerQualityData() {
  const voltageDeviation = randomFloat(-7.5, 7.5, 2);
  const unbalance = randomFloat(0.2, 4.8, 2);
  const thd = randomFloat(1.2, 10.5, 2);
  const flicker = randomFloat(0.25, 1.65, 2);
  const frequency = randomFloat(49.72, 50.28, 2);

  const result = {
    timestamp: new Date().toISOString(),
    objectName: 'Пункт вимірювання якості електроенергії №11',
    location: 'ПС Лівобережна, шини 10 кВ',
    voltageDeviation,
    voltageDeviationStatus: getStatus(voltageDeviation, -5, 5, -8, 8),
    unbalance,
    unbalanceStatus: getStatus(unbalance, 0, 2, 0, 4),
    thd,
    thdStatus: getStatus(thd, 0, 5, 0, 8),
    flicker,
    flickerStatus: getStatus(flicker, 0, 1, 0, 1.4),
    frequency,
    frequencyStatus: getStatus(frequency, 49.9, 50.1, 49.7, 50.3),
    compliance: 'normal',
    waveform: [],
    harmonics: []
  };

  const statuses = [result.voltageDeviationStatus, result.unbalanceStatus, result.thdStatus, result.flickerStatus, result.frequencyStatus];
  if (statuses.includes('critical')) result.compliance = 'critical';
  else if (statuses.includes('warning')) result.compliance = 'warning';

  const amplitude = clamp(230 * (1 + voltageDeviation / 100), 205, 255);
  result.waveform = generateWaveform(amplitude, thd);
  result.harmonics = generateHarmonics(thd);

  return result;
}

function pushReading() {
  const data = generatePowerQualityData();
  history.unshift(data);
  if (history.length > MAX_HISTORY) history.pop();
  return data;
}

for (let i = 0; i < 20; i += 1) {
  const item = generatePowerQualityData();
  item.timestamp = new Date(Date.now() - (20 - i) * 60000).toISOString();
  history.unshift(item);
}

setInterval(pushReading, 5000);

app.get('/api/power-quality/current', (req, res) => {
  const current = history[0] || pushReading();
  res.json(current);
});

app.get('/api/power-quality/history', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, MAX_HISTORY);
  res.json(history.slice(0, limit));
});

app.get('/api/power-quality/summary', (req, res) => {
  const source = history.slice(0, 20);
  const avg = (field) => Number((source.reduce((sum, item) => sum + item[field], 0) / source.length).toFixed(2));
  res.json({
    objectName: 'Пункт вимірювання якості електроенергії №11',
    samples: source.length,
    averageVoltageDeviation: avg('voltageDeviation'),
    averageUnbalance: avg('unbalance'),
    averageThd: avg('thd'),
    averageFlicker: avg('flicker'),
    averageFrequency: avg('frequency'),
    criticalCount: source.filter(item => item.compliance === 'critical').length,
    warningCount: source.filter(item => item.compliance === 'warning').length,
    normalCount: source.filter(item => item.compliance === 'normal').length
  });
});

app.post('/api/power-quality/readings', (req, res) => {
  const { voltageDeviation, unbalance, thd, flicker, frequency } = req.body;
  const required = [voltageDeviation, unbalance, thd, flicker, frequency];

  if (required.some(value => typeof value !== 'number' || Number.isNaN(value))) {
    return res.status(400).json({
      error: 'Некоректні дані',
      message: 'Поля voltageDeviation, unbalance, thd, flicker, frequency мають бути числами'
    });
  }

  const data = {
    timestamp: new Date().toISOString(),
    objectName: 'Пункт вимірювання якості електроенергії №11',
    location: 'ПС Лівобережна, шини 10 кВ',
    voltageDeviation,
    voltageDeviationStatus: getStatus(voltageDeviation, -5, 5, -8, 8),
    unbalance,
    unbalanceStatus: getStatus(unbalance, 0, 2, 0, 4),
    thd,
    thdStatus: getStatus(thd, 0, 5, 0, 8),
    flicker,
    flickerStatus: getStatus(flicker, 0, 1, 0, 1.4),
    frequency,
    frequencyStatus: getStatus(frequency, 49.9, 50.1, 49.7, 50.3),
    compliance: 'normal',
    waveform: generateWaveform(230 * (1 + voltageDeviation / 100), thd),
    harmonics: generateHarmonics(thd)
  };

  const statuses = [data.voltageDeviationStatus, data.unbalanceStatus, data.thdStatus, data.flickerStatus, data.frequencyStatus];
  if (statuses.includes('critical')) data.compliance = 'critical';
  else if (statuses.includes('warning')) data.compliance = 'warning';

  history.unshift(data);
  if (history.length > MAX_HISTORY) history.pop();
  res.status(201).json(data);
});

app.get('/api/status', (req, res) => {
  res.json({
    api: 'online',
    uptimeSeconds: Math.round(process.uptime()),
    updateIntervalSeconds: 5,
    historySize: history.length
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint не знайдено' });
});

app.listen(PORT, () => {
  console.log(`Практична робота №5 запущена: http://localhost:${PORT}`);
  console.log('API: /api/power-quality/current, /history, /summary, /readings, /api/status');
});
