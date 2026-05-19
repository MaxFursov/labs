const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '100kb' }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

let apiStats = {
  startedAt: new Date().toISOString(),
  requests: 0,
  switchingOperations: 0
};

app.use((req, res, next) => {
  apiStats.requests += 1;
  next();
});

let circuitBreakers = [
  {
    id: 1,
    name: 'QF-110-01 Ввід 110 кВ',
    voltage: 110,
    current: 2000,
    position: 'closed',
    switchingCount: 128,
    lastSwitching: '2025-05-12T08:30:00.000Z',
    mechanism: 'spring',
    operationTime: 48,
    status: 'normal',
    history: [
      { timestamp: '2025-05-12T08:30:00.000Z', action: 'close', result: 'success' }
    ]
  },
  {
    id: 2,
    name: 'QF-35-02 Секційний 35 кВ',
    voltage: 35,
    current: 1250,
    position: 'open',
    switchingCount: 74,
    lastSwitching: '2025-05-13T12:10:00.000Z',
    mechanism: 'motor',
    operationTime: 62,
    status: 'maintenance',
    history: [
      { timestamp: '2025-05-13T12:10:00.000Z', action: 'open', result: 'success' }
    ]
  },
  {
    id: 3,
    name: 'QF-10-04 Фідер 10 кВ',
    voltage: 10,
    current: 630,
    position: 'closed',
    switchingCount: 213,
    lastSwitching: '2025-05-15T17:45:00.000Z',
    mechanism: 'hydraulic',
    operationTime: 55,
    status: 'normal',
    history: [
      { timestamp: '2025-05-15T17:45:00.000Z', action: 'close', result: 'success' }
    ]
  }
];

const allowedPositions = ['open', 'closed'];
const allowedMechanisms = ['spring', 'hydraulic', 'motor'];
const allowedStatuses = ['normal', 'maintenance', 'alarm'];

function findBreaker(id) {
  return circuitBreakers.find(item => item.id === Number(id));
}

function getNextId() {
  return circuitBreakers.length ? Math.max(...circuitBreakers.map(item => item.id)) + 1 : 1;
}

function validateBreaker(data, partial = false) {
  const errors = [];
  const required = ['name', 'voltage', 'current', 'position', 'mechanism', 'operationTime'];

  if (!partial) {
    required.forEach(field => {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        errors.push(`Поле ${field} є обов'язковим`);
      }
    });
  }

  if (data.voltage !== undefined && (!Number(data.voltage) || Number(data.voltage) <= 0)) {
    errors.push('voltage має бути додатним числом');
  }
  if (data.current !== undefined && (!Number(data.current) || Number(data.current) <= 0)) {
    errors.push('current має бути додатним числом');
  }
  if (data.operationTime !== undefined && (!Number(data.operationTime) || Number(data.operationTime) <= 0)) {
    errors.push('operationTime має бути додатним числом');
  }
  if (data.position !== undefined && !allowedPositions.includes(data.position)) {
    errors.push('position має бути open або closed');
  }
  if (data.mechanism !== undefined && !allowedMechanisms.includes(data.mechanism)) {
    errors.push('mechanism має бути spring, hydraulic або motor');
  }
  if (data.status !== undefined && !allowedStatuses.includes(data.status)) {
    errors.push('status має бути normal, maintenance або alarm');
  }

  return errors;
}

function toPublicBreaker(item) {
  const { history, ...publicData } = item;
  return publicData;
}

app.get('/', (req, res) => {
  res.json({
    title: 'REST API високовольтних вимикачів',
    variant: 11,
    endpoints: [
      'GET /api/circuit-breakers',
      'GET /api/circuit-breakers/:id',
      'POST /api/circuit-breakers',
      'POST /api/circuit-breakers/:id/switch',
      'GET /api/circuit-breakers/:id/history',
      'GET /api/circuit-breakers/:id/diagnostics',
      'PUT /api/circuit-breakers/:id',
      'PATCH /api/circuit-breakers/:id',
      'DELETE /api/circuit-breakers/:id',
      'GET /api/stats'
    ]
  });
});

app.get('/api/circuit-breakers', (req, res) => {
  const { status, position, mechanism, search, sort = 'id', order = 'asc', page = 1, limit = 20 } = req.query;
  let result = [...circuitBreakers];

  if (status) result = result.filter(item => item.status === status);
  if (position) result = result.filter(item => item.position === position);
  if (mechanism) result = result.filter(item => item.mechanism === mechanism);
  if (search) {
    const normalized = search.toLowerCase();
    result = result.filter(item => item.name.toLowerCase().includes(normalized));
  }

  const sortField = ['id', 'name', 'voltage', 'current', 'switchingCount', 'operationTime'].includes(sort) ? sort : 'id';
  result.sort((a, b) => {
    const direction = order === 'desc' ? -1 : 1;
    if (a[sortField] < b[sortField]) return -1 * direction;
    if (a[sortField] > b[sortField]) return 1 * direction;
    return 0;
  });

  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const start = (pageNumber - 1) * pageSize;
  const items = result.slice(start, start + pageSize).map(toPublicBreaker);

  res.json({
    data: items,
    meta: {
      total: result.length,
      page: pageNumber,
      limit: pageSize
    }
  });
});

app.get('/api/circuit-breakers/:id', (req, res) => {
  const breaker = findBreaker(req.params.id);
  if (!breaker) {
    return res.status(404).json({ error: 'Вимикач не знайдено', id: req.params.id });
  }
  res.json(toPublicBreaker(breaker));
});

app.get('/api/circuit-breakers/:id/diagnostics', (req, res) => {
  const breaker = findBreaker(req.params.id);
  if (!breaker) {
    return res.status(404).json({ error: 'Вимикач не знайдено' });
  }

  const operationStatus = breaker.operationTime <= 60 ? 'normal' : breaker.operationTime <= 80 ? 'warning' : 'alarm';
  const switchingStatus = breaker.switchingCount < 500 ? 'normal' : breaker.switchingCount < 1000 ? 'warning' : 'maintenance_required';

  res.json({
    id: breaker.id,
    name: breaker.name,
    position: breaker.position,
    status: breaker.status,
    diagnostics: {
      operationTimeMs: breaker.operationTime,
      operationTimeStatus: operationStatus,
      switchingCount: breaker.switchingCount,
      switchingStatus,
      recommendation: operationStatus === 'normal' && switchingStatus === 'normal'
        ? 'Параметри у нормі, планове ТО за графіком'
        : 'Потрібна додаткова перевірка комутаційного ресурсу'
    }
  });
});

app.get('/api/circuit-breakers/:id/history', (req, res) => {
  const breaker = findBreaker(req.params.id);
  if (!breaker) {
    return res.status(404).json({ error: 'Вимикач не знайдено' });
  }
  res.json({ id: breaker.id, name: breaker.name, history: breaker.history });
});

app.post('/api/circuit-breakers', (req, res) => {
  const errors = validateBreaker(req.body);
  if (errors.length) {
    return res.status(400).json({ error: 'Помилка валідації', details: errors });
  }

  const now = new Date().toISOString();
  const newBreaker = {
    id: getNextId(),
    name: req.body.name,
    voltage: Number(req.body.voltage),
    current: Number(req.body.current),
    position: req.body.position,
    switchingCount: Number(req.body.switchingCount || 0),
    lastSwitching: req.body.lastSwitching || now,
    mechanism: req.body.mechanism,
    operationTime: Number(req.body.operationTime),
    status: req.body.status || 'normal',
    history: [
      { timestamp: now, action: 'create', result: 'success' }
    ]
  };

  circuitBreakers.push(newBreaker);
  res.status(201).json(toPublicBreaker(newBreaker));
});

app.post('/api/circuit-breakers/:id/switch', (req, res) => {
  const breaker = findBreaker(req.params.id);
  if (!breaker) {
    return res.status(404).json({ error: 'Вимикач не знайдено' });
  }

  const action = req.body.action;
  if (!['open', 'close'].includes(action)) {
    return res.status(400).json({ error: 'action має бути open або close' });
  }

  if (breaker.status === 'maintenance') {
    return res.status(409).json({ error: 'Комутація неможлива: вимикач у ремонті' });
  }

  const newPosition = action === 'open' ? 'open' : 'closed';
  const now = new Date().toISOString();
  breaker.position = newPosition;
  breaker.switchingCount += 1;
  breaker.lastSwitching = now;
  breaker.history.push({ timestamp: now, action, result: 'success' });
  apiStats.switchingOperations += 1;

  res.json({
    message: `Комутацію виконано: ${action}`,
    data: toPublicBreaker(breaker)
  });
});

app.put('/api/circuit-breakers/:id', (req, res) => {
  const index = circuitBreakers.findIndex(item => item.id === Number(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Вимикач не знайдено' });
  }

  const errors = validateBreaker(req.body);
  if (errors.length) {
    return res.status(400).json({ error: 'Помилка валідації', details: errors });
  }

  const previousHistory = circuitBreakers[index].history || [];
  circuitBreakers[index] = {
    id: Number(req.params.id),
    name: req.body.name,
    voltage: Number(req.body.voltage),
    current: Number(req.body.current),
    position: req.body.position,
    switchingCount: Number(req.body.switchingCount || 0),
    lastSwitching: req.body.lastSwitching || new Date().toISOString(),
    mechanism: req.body.mechanism,
    operationTime: Number(req.body.operationTime),
    status: req.body.status || 'normal',
    history: [
      ...previousHistory,
      { timestamp: new Date().toISOString(), action: 'full_update', result: 'success' }
    ]
  };

  res.json(toPublicBreaker(circuitBreakers[index]));
});

app.patch('/api/circuit-breakers/:id', (req, res) => {
  const breaker = findBreaker(req.params.id);
  if (!breaker) {
    return res.status(404).json({ error: 'Вимикач не знайдено' });
  }

  const errors = validateBreaker(req.body, true);
  if (errors.length) {
    return res.status(400).json({ error: 'Помилка валідації', details: errors });
  }

  Object.assign(breaker, req.body, { id: breaker.id });
  if (req.body.voltage !== undefined) breaker.voltage = Number(req.body.voltage);
  if (req.body.current !== undefined) breaker.current = Number(req.body.current);
  if (req.body.operationTime !== undefined) breaker.operationTime = Number(req.body.operationTime);
  if (req.body.switchingCount !== undefined) breaker.switchingCount = Number(req.body.switchingCount);
  breaker.history.push({ timestamp: new Date().toISOString(), action: 'partial_update', result: 'success' });

  res.json(toPublicBreaker(breaker));
});

app.delete('/api/circuit-breakers/:id', (req, res) => {
  const index = circuitBreakers.findIndex(item => item.id === Number(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Вимикач не знайдено' });
  }
  const [deleted] = circuitBreakers.splice(index, 1);
  res.json({ message: 'Вимикач видалено', data: toPublicBreaker(deleted) });
});

app.get('/api/stats', (req, res) => {
  res.json({
    ...apiStats,
    objectsCount: circuitBreakers.length,
    activeBreakers: circuitBreakers.filter(item => item.status === 'normal').length,
    maintenanceBreakers: circuitBreakers.filter(item => item.status === 'maintenance').length,
    alarmBreakers: circuitBreakers.filter(item => item.status === 'alarm').length
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint не знайдено', path: req.originalUrl });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Внутрішня помилка сервера' });
});

app.listen(PORT, () => {
  console.log(`REST API сервер запущено на http://localhost:${PORT}`);
  console.log('Варіант 11: високовольтний вимикач');
});
