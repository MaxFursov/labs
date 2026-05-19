const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'esco_contracts.json');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

function readContracts() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return raw.trim() ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Помилка читання JSON:', error);
    return [];
  }
}

function writeContracts(contracts) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(contracts, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Помилка запису JSON:', error);
    return false;
  }
}

function validateContract(body) {
  const errors = [];
  if (!body.contractNumber || body.contractNumber.trim().length < 3) errors.push('Номер договору має містити щонайменше 3 символи');
  if (!body.customer || body.customer.trim().length < 3) errors.push('Вкажіть замовника');
  if (!body.objectName || body.objectName.trim().length < 3) errors.push('Вкажіть об’єкт енергосервісу');
  if (!body.address || body.address.trim().length < 5) errors.push('Вкажіть адресу об’єкта');

  const contractValue = Number(body.contractValue);
  const annualSaving = Number(body.annualSaving);
  if (!Number.isFinite(contractValue) || contractValue <= 0) errors.push('Вартість договору має бути більшою за 0');
  if (!Number.isFinite(annualSaving) || annualSaving <= 0) errors.push('Очікувана річна економія має бути більшою за 0');

  if (!body.startDate) errors.push('Вкажіть дату початку договору');
  if (!body.endDate) errors.push('Вкажіть дату завершення договору');
  if (body.startDate && body.endDate && new Date(body.startDate) >= new Date(body.endDate)) {
    errors.push('Дата завершення має бути пізніше дати початку');
  }
  if (!body.status) errors.push('Оберіть статус договору');

  return errors;
}

function calculateMonths(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
}

function buildContract(body) {
  const contractValue = Number(body.contractValue);
  const annualSaving = Number(body.annualSaving);
  return {
    id: Date.now().toString(),
    contractNumber: body.contractNumber.trim(),
    customer: body.customer.trim(),
    objectName: body.objectName.trim(),
    address: body.address.trim(),
    contractValue,
    annualSaving,
    paybackPeriod: Number((contractValue / annualSaving).toFixed(2)),
    startDate: body.startDate,
    endDate: body.endDate,
    durationMonths: calculateMonths(body.startDate, body.endDate),
    status: body.status,
    responsiblePerson: (body.responsiblePerson || '').trim(),
    notes: (body.notes || '').trim(),
    createdAt: new Date().toISOString()
  };
}

app.get('/api/contracts', (req, res) => {
  const { status, search } = req.query;
  let contracts = readContracts();

  if (status && status !== 'all') {
    contracts = contracts.filter(item => item.status === status);
  }
  if (search) {
    const query = search.toLowerCase();
    contracts = contracts.filter(item =>
      item.contractNumber.toLowerCase().includes(query) ||
      item.customer.toLowerCase().includes(query) ||
      item.objectName.toLowerCase().includes(query)
    );
  }
  res.json(contracts);
});

app.post('/api/contracts', (req, res) => {
  const errors = validateContract(req.body);
  if (errors.length) {
    return res.status(400).json({ success: false, message: 'Помилка валідації', errors });
  }

  const contracts = readContracts();
  const duplicate = contracts.find(item => item.contractNumber === req.body.contractNumber.trim());
  if (duplicate) {
    return res.status(409).json({ success: false, message: 'Договір з таким номером вже існує' });
  }

  const newContract = buildContract(req.body);
  contracts.push(newContract);

  if (!writeContracts(contracts)) {
    return res.status(500).json({ success: false, message: 'Не вдалося зберегти дані' });
  }

  res.status(201).json({ success: true, message: 'ЕСКО контракт успішно зареєстровано', data: newContract });
});

app.delete('/api/contracts/:id', (req, res) => {
  const contracts = readContracts();
  const nextContracts = contracts.filter(item => item.id !== req.params.id);

  if (nextContracts.length === contracts.length) {
    return res.status(404).json({ success: false, message: 'Контракт не знайдено' });
  }
  if (!writeContracts(nextContracts)) {
    return res.status(500).json({ success: false, message: 'Не вдалося оновити JSON файл' });
  }
  res.json({ success: true, message: 'Контракт видалено' });
});

app.get('/api/statistics', (req, res) => {
  const contracts = readContracts();
  const totalValue = contracts.reduce((sum, item) => sum + Number(item.contractValue || 0), 0);
  const totalSaving = contracts.reduce((sum, item) => sum + Number(item.annualSaving || 0), 0);
  const activeCount = contracts.filter(item => item.status === 'active').length;

  res.json({
    totalCount: contracts.length,
    activeCount,
    totalValue,
    totalSaving,
    averagePayback: totalSaving > 0 ? Number((totalValue / totalSaving).toFixed(2)) : 0
  });
});

app.listen(PORT, () => {
  console.log(`Сервер запущено: http://localhost:${PORT}`);
});
