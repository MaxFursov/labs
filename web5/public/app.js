const api = new PowerQualityAPI();
const charts = new PowerQualityCharts();
let autoUpdateEnabled = true;
let intervalId = null;

const fields = {
  voltageDeviation: document.getElementById('voltageDeviation'),
  unbalance: document.getElementById('unbalance'),
  thd: document.getElementById('thd'),
  flicker: document.getElementById('flicker'),
  frequency: document.getElementById('frequency'),
  lastUpdate: document.getElementById('lastUpdate'),
  overallStatus: document.getElementById('overallStatus')
};

function statusText(status) {
  return { normal: 'Норма', warning: 'Увага', critical: 'Критично' }[status] || status;
}

function setStatus(elementId, status) {
  const element = document.getElementById(elementId);
  element.textContent = statusText(status);
  element.className = `status-pill status-${status}`;
}

function setCardStatus(cardId, status) {
  const card = document.getElementById(cardId);
  card.classList.remove('card-normal', 'card-warning', 'card-critical');
  card.classList.add(`card-${status}`);
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('uk-UA');
}

function updateMetricCards(data) {
  fields.voltageDeviation.textContent = data.voltageDeviation.toFixed(2);
  fields.unbalance.textContent = data.unbalance.toFixed(2);
  fields.thd.textContent = data.thd.toFixed(2);
  fields.flicker.textContent = data.flicker.toFixed(2);
  fields.frequency.textContent = data.frequency.toFixed(2);
  fields.lastUpdate.textContent = formatTime(data.timestamp);

  setStatus('voltageStatus', data.voltageDeviationStatus);
  setStatus('unbalanceStatus', data.unbalanceStatus);
  setStatus('thdStatus', data.thdStatus);
  setStatus('flickerStatus', data.flickerStatus);
  setStatus('frequencyStatus', data.frequencyStatus);

  setCardStatus('voltageCard', data.voltageDeviationStatus);
  setCardStatus('unbalanceCard', data.unbalanceStatus);
  setCardStatus('thdCard', data.thdStatus);
  setCardStatus('flickerCard', data.flickerStatus);
  setCardStatus('frequencyCard', data.frequencyStatus);

  fields.overallStatus.textContent = `Загальний стан: ${statusText(data.compliance)}`;
  fields.overallStatus.className = `status-pill status-${data.compliance}`;
}

function updateTable(history) {
  const tbody = document.getElementById('historyTable');
  tbody.innerHTML = history.map(item => `
    <tr>
      <td>${formatTime(item.timestamp)}</td>
      <td>${item.voltageDeviation.toFixed(2)}</td>
      <td>${item.unbalance.toFixed(2)}</td>
      <td>${item.thd.toFixed(2)}</td>
      <td>${item.flicker.toFixed(2)}</td>
      <td>${item.frequency.toFixed(2)}</td>
      <td><span class="status-pill status-${item.compliance}">${statusText(item.compliance)}</span></td>
    </tr>
  `).join('');
}

function updateSummary(summary) {
  const box = document.getElementById('summaryBox');
  box.innerHTML = `
    <div class="summary-item"><span>Вибірок</span><strong>${summary.samples}</strong></div>
    <div class="summary-item"><span>Середній THD</span><strong>${summary.averageThd} %</strong></div>
    <div class="summary-item"><span>Середня частота</span><strong>${summary.averageFrequency} Гц</strong></div>
    <div class="summary-item"><span>Норма</span><strong class="text-success">${summary.normalCount}</strong></div>
    <div class="summary-item"><span>Попередження</span><strong class="text-warning">${summary.warningCount}</strong></div>
    <div class="summary-item"><span>Критичні</span><strong class="text-danger">${summary.criticalCount}</strong></div>
  `;
}

async function refreshData() {
  try {
    const [current, history, summary] = await Promise.all([
      api.getCurrent(),
      api.getHistory(12),
      api.getSummary()
    ]);

    updateMetricCards(current);
    updateTable(history);
    updateSummary(summary);
    charts.updateWaveform(current);
    charts.updateHarmonics(current);
    charts.updateTrend(history);
  } catch (error) {
    console.error(error);
    document.getElementById('apiStatus').textContent = 'API: помилка з’єднання';
  }
}

async function checkApiStatus() {
  try {
    const status = await api.getStatus();
    document.getElementById('apiStatus').textContent = `API: онлайн, записів: ${status.historySize}`;
  } catch (error) {
    document.getElementById('apiStatus').textContent = 'API: офлайн';
  }
}

function toggleAutoUpdate() {
  autoUpdateEnabled = !autoUpdateEnabled;
  const button = document.getElementById('autoBtn');

  if (autoUpdateEnabled) {
    button.textContent = 'Автооновлення увімкнено';
    button.className = 'btn btn-success';
    intervalId = setInterval(refreshData, 5000);
  } else {
    button.textContent = 'Автооновлення вимкнено';
    button.className = 'btn btn-outline-secondary';
    clearInterval(intervalId);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('refreshBtn').addEventListener('click', refreshData);
  document.getElementById('autoBtn').addEventListener('click', toggleAutoUpdate);
  refreshData();
  checkApiStatus();
  setInterval(checkApiStatus, 10000);
  intervalId = setInterval(refreshData, 5000);
});
