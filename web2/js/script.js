'use strict';

const AUTO_UPDATE_DELAY = 3000;
const MAX_HISTORY_ITEMS = 20;

const parameters = [
  {
    key: 'reactivePower',
    name: 'Реактивна потужність мережі',
    unit: 'кВАр',
    min: -500,
    max: 500,
    normalMin: -100,
    normalMax: 100,
    decimals: 0
  },
  {
    key: 'powerFactor',
    name: 'Коефіцієнт потужності cos φ',
    unit: '',
    min: 0.6,
    max: 1.0,
    normalMin: 0.92,
    normalMax: 0.98,
    decimals: 2
  },
  {
    key: 'voltage',
    name: 'Напруга мережі',
    unit: 'В',
    min: 350,
    max: 420,
    normalMin: 380,
    normalMax: 400,
    decimals: 0
  },
  {
    key: 'steps',
    name: 'Увімкнені ступені КРМ',
    unit: 'шт',
    min: 0,
    max: 12,
    normalMin: 2,
    normalMax: 8,
    decimals: 0
  },
  {
    key: 'capacitorTemp',
    name: 'Температура конденсаторів',
    unit: '°C',
    min: 25,
    max: 78,
    normalMin: 30,
    normalMax: 55,
    decimals: 0
  },
  {
    key: 'contactors',
    name: 'Стан контакторів',
    unit: '%',
    min: 70,
    max: 100,
    normalMin: 88,
    normalMax: 100,
    decimals: 0
  }
];

const state = {
  autoIntervalId: null,
  isAutoUpdateEnabled: false,
  history: loadHistory(),
  dailySaving: Number(localStorage.getItem('dailySaving') || 0)
};

const elements = {};

function cacheDomElements() {
  elements.dashboard = document.getElementById('dashboard');
  elements.lastUpdate = document.getElementById('lastUpdate');
  elements.autoStatus = document.getElementById('autoStatus');
  elements.manualUpdateBtn = document.getElementById('manualUpdateBtn');
  elements.autoUpdateBtn = document.getElementById('autoUpdateBtn');
  elements.themeBtn = document.getElementById('themeBtn');
  elements.exportBtn = document.getElementById('exportBtn');
  elements.resetBtn = document.getElementById('resetBtn');
  elements.overallStatus = document.getElementById('overallStatus');
  elements.workMode = document.getElementById('workMode');
  elements.dailySaving = document.getElementById('dailySaving');
  elements.historyCount = document.getElementById('historyCount');
  elements.chart = document.getElementById('historyChart');
}

function createDashboardCards() {
  elements.dashboard.innerHTML = parameters.map((parameter, index) => `
    <article class="metric-card" id="card-${parameter.key}" aria-labelledby="title-${parameter.key}">
      <h3 id="title-${parameter.key}">${parameter.name}</h3>
      <div class="value-row">
        <span class="metric-value" id="value-${parameter.key}">--</span>
        <span class="metric-unit">${parameter.unit}</span>
      </div>
      <span class="metric-status" id="status-${parameter.key}">● Очікування</span>
      <div class="metric-bar" aria-hidden="true"><span id="bar-${parameter.key}"></span></div>
      <small>Норма: ${parameter.normalMin} - ${parameter.normalMax} ${parameter.unit}</small>
    </article>
  `).join('');
}

function getRandomNumber(min, max, decimals = 1) {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(decimals));
}

function generateSensorData() {
  const data = {};
  parameters.forEach(parameter => {
    data[parameter.key] = getRandomNumber(parameter.min, parameter.max, parameter.decimals);
  });
  data.timestamp = formatTimestamp();
  data.mode = getWorkMode(data);
  data.saving = calculateSaving(data.powerFactor, data.reactivePower);
  return data;
}

function checkStatus(value, parameter) {
  if (value >= parameter.normalMin && value <= parameter.normalMax) {
    return 'normal';
  }
  if (value >= parameter.min && value <= parameter.max) {
    return 'warning';
  }
  return 'critical';
}

function getStatusText(status) {
  const statusMap = {
    normal: '● Норма',
    warning: '● Попередження',
    critical: '● Критично'
  };
  return statusMap[status] || '● Невідомо';
}

function getWorkMode(data) {
  if (data.powerFactor < 0.9) return 'Інтенсивна компенсація';
  if (data.powerFactor > 0.99) return 'Очікування навантаження';
  return 'Автоматична компенсація';
}

function calculateSaving(powerFactor, reactivePower) {
  const compensationEffect = Math.max(0, powerFactor - 0.75);
  const reactiveLoad = Math.abs(reactivePower) / 1000;
  return Number((compensationEffect * reactiveLoad * 2.5).toFixed(2));
}

function updateDisplay(data) {
  let worstStatus = 'normal';

  parameters.forEach(parameter => {
    const value = data[parameter.key];
    const status = checkStatus(value, parameter);
    const progress = ((value - parameter.min) / (parameter.max - parameter.min)) * 100;

    const card = document.getElementById(`card-${parameter.key}`);
    const valueElement = document.getElementById(`value-${parameter.key}`);
    const statusElement = document.getElementById(`status-${parameter.key}`);
    const barElement = document.getElementById(`bar-${parameter.key}`);

    valueElement.textContent = value;
    statusElement.textContent = getStatusText(status);
    statusElement.className = `metric-status badge-${status}`;
    card.className = `metric-card ${status}`;
    if (status === 'critical') card.classList.add('pulse');
    barElement.style.width = `${Math.max(0, Math.min(100, progress))}%`;

    if (status === 'critical') worstStatus = 'critical';
    if (status === 'warning' && worstStatus !== 'critical') worstStatus = 'warning';
  });

  elements.lastUpdate.textContent = data.timestamp;
  elements.workMode.textContent = data.mode;
  updateOverallStatus(worstStatus);

  state.dailySaving += data.saving;
  elements.dailySaving.textContent = state.dailySaving.toFixed(2);
  localStorage.setItem('dailySaving', state.dailySaving.toFixed(2));

  saveData(data);
  drawChart();
}

function updateOverallStatus(status) {
  const textMap = {
    normal: 'Норма',
    warning: 'Попередження',
    critical: 'Критично'
  };
  elements.overallStatus.textContent = textMap[status];
  elements.overallStatus.className = `badge badge-${status}`;
}

function formatTimestamp() {
  return new Date().toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function manualUpdate() {
  try {
    const data = generateSensorData();
    updateDisplay(data);
  } catch (error) {
    console.error('Помилка ручного оновлення:', error);
    alert('Не вдалося оновити дані. Перевірте консоль браузера.');
  }
}

function toggleAutoUpdate() {
  if (!state.isAutoUpdateEnabled) {
    state.autoIntervalId = setInterval(manualUpdate, AUTO_UPDATE_DELAY);
    state.isAutoUpdateEnabled = true;
    elements.autoUpdateBtn.textContent = 'Зупинити автооновлення';
    elements.autoUpdateBtn.className = 'btn btn-danger';
    elements.autoStatus.textContent = 'увімкнено, 3 сек';
    manualUpdate();
  } else {
    clearInterval(state.autoIntervalId);
    state.autoIntervalId = null;
    state.isAutoUpdateEnabled = false;
    elements.autoUpdateBtn.textContent = 'Запустити автооновлення';
    elements.autoUpdateBtn.className = 'btn btn-success';
    elements.autoStatus.textContent = 'вимкнено';
  }
}

function saveData(data) {
  state.history.push(data);
  if (state.history.length > MAX_HISTORY_ITEMS) {
    state.history.shift();
  }
  localStorage.setItem('krmMonitoringHistory', JSON.stringify(state.history));
  elements.historyCount.textContent = `${state.history.length} записів`;
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem('krmMonitoringHistory')) || [];
  } catch (error) {
    console.warn('Історію не вдалося прочитати:', error);
    return [];
  }
}

function drawChart() {
  const canvas = elements.chart;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const padding = 42;
  const points = state.history.map(item => item.powerFactor);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--surface-soft').trim();
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--muted').trim();
  ctx.font = '16px Arial';
  ctx.fillText('cos φ', padding, 24);
  ctx.fillText('1.00', 8, padding + 5);
  ctx.fillText('0.60', 8, height - padding + 5);

  if (points.length < 2) return;

  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const minValue = 0.6;
  const maxValue = 1.0;

  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 3;
  ctx.beginPath();

  points.forEach((value, index) => {
    const x = padding + (index / (MAX_HISTORY_ITEMS - 1)) * chartWidth;
    const y = height - padding - ((value - minValue) / (maxValue - minValue)) * chartHeight;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  points.forEach((value, index) => {
    const x = padding + (index / (MAX_HISTORY_ITEMS - 1)) * chartWidth;
    const y = height - padding - ((value - minValue) / (maxValue - minValue)) * chartHeight;
    ctx.beginPath();
    ctx.fillStyle = value >= 0.92 && value <= 0.98 ? '#12945f' : '#d98b00';
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function toggleTheme() {
  document.body.classList.toggle('dark-theme');
  const isDark = document.body.classList.contains('dark-theme');
  elements.themeBtn.textContent = isDark ? 'Світла тема' : 'Темна тема';
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  drawChart();
}

function exportHistoryToCsv() {
  if (!state.history.length) {
    alert('Історія вимірювань порожня. Спочатку оновіть дані.');
    return;
  }
  const header = ['time', ...parameters.map(parameter => parameter.key), 'mode', 'saving'];
  const rows = state.history.map(item => header.map(key => item[key]).join(';'));
  const csv = [header.join(';'), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'krm-monitoring-history.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

function resetHistory() {
  state.history = [];
  state.dailySaving = 0;
  localStorage.removeItem('krmMonitoringHistory');
  localStorage.removeItem('dailySaving');
  elements.dailySaving.textContent = '0.00';
  elements.historyCount.textContent = '0 записів';
  drawChart();
}

function initializePage() {
  cacheDomElements();
  createDashboardCards();
  elements.manualUpdateBtn.addEventListener('click', manualUpdate);
  elements.autoUpdateBtn.addEventListener('click', toggleAutoUpdate);
  elements.themeBtn.addEventListener('click', toggleTheme);
  elements.exportBtn.addEventListener('click', exportHistoryToCsv);
  elements.resetBtn.addEventListener('click', resetHistory);

  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-theme');
    elements.themeBtn.textContent = 'Світла тема';
  }

  elements.dailySaving.textContent = state.dailySaving.toFixed(2);
  elements.historyCount.textContent = `${state.history.length} записів`;
  manualUpdate();
  drawChart();
}

document.addEventListener('DOMContentLoaded', initializePage);
