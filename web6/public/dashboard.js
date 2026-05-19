let currentUser = null;

async function loadStatus() {
  await refreshCsrf();
  const response = await fetch('/auth/status', { credentials: 'include' });
  const data = await response.json();
  if (!data.authenticated) {
    location.href = 'login.html';
    return;
  }
  currentUser = data.user;
  document.getElementById('userInfo').textContent = `${escapeHtml(currentUser.name)} (${currentUser.role})`;
  document.getElementById('operatorPanel').classList.toggle('hidden', currentUser.role !== 'operator');
  document.getElementById('analystPanel').classList.toggle('hidden', currentUser.role !== 'analyst');
  document.getElementById('adminPanel').classList.toggle('hidden', currentUser.role !== 'administrator');
}

async function loadBalance() {
  try {
    const response = await fetch('/api/grid/balance', { credentials: 'include' });
    const data = await response.json();
    if (!response.ok) return;
    document.getElementById('balance').textContent = `${data.balanceMW} МВт`;
    document.getElementById('generation').textContent = `${data.generationMW} МВт`;
    document.getElementById('load').textContent = `${data.loadMW} МВт`;
    document.getElementById('frequency').textContent = `${data.frequencyHz} Гц`;
    document.getElementById('renewable').textContent = `${data.renewableShare} %`;
    document.getElementById('alarms').textContent = data.activeAlarms;
    const badge = document.getElementById('balanceStatus');
    badge.textContent = data.status;
    badge.className = `badge ${data.status === 'normal' ? 'normal' : 'warning'}`;
  } catch (error) {
    console.error(error);
  }
}

async function loadForecasts() {
  if (!currentUser || currentUser.role !== 'analyst') return;
  const response = await fetch('/api/forecasts', { credentials: 'include' });
  const data = await response.json();
  if (!response.ok) return;
  const rows = data.forecasts.map(item => `
    <tr><td>${new Date(item.hour).toLocaleTimeString('uk-UA')}</td><td>${item.predictedLoadMW}</td><td>${item.predictedGenerationMW}</td><td>${item.confidence}%</td></tr>
  `).join('');
  document.getElementById('forecastTable').innerHTML = `<thead><tr><th>Година</th><th>Навантаження, МВт</th><th>Генерація, МВт</th><th>Довіра</th></tr></thead><tbody>${rows}</tbody>`;
}

async function loadLogs() {
  if (!currentUser || currentUser.role !== 'administrator') return;
  const response = await fetch('/api/logs', { credentials: 'include' });
  const logs = await response.json();
  if (!response.ok) return;
  const rows = logs.slice(0, 12).map(log => `
    <tr><td>${new Date(log.timestamp).toLocaleString('uk-UA')}</td><td>${escapeHtml(log.type)}</td><td>${escapeHtml(JSON.stringify(log.details))}</td></tr>
  `).join('');
  document.getElementById('logsTable').innerHTML = `<thead><tr><th>Час</th><th>Подія</th><th>Дані</th></tr></thead><tbody>${rows}</tbody>`;
}

async function initializeForms() {
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await secureFetch('/auth/logout', { method: 'POST' });
    location.href = 'login.html';
  });

  document.getElementById('adjustForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
      const response = await secureFetch('/api/grid/adjust', { method: 'POST', body: JSON.stringify(data) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Помилка');
      showMessage('message', 'success', result.message);
      await loadBalance();
    } catch (error) { showMessage('message', 'error', error.message); }
  });

  document.getElementById('configForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    data.demandResponseEnabled = data.demandResponseEnabled === 'true';
    data.maxFrequencyDeviation = Number(data.maxFrequencyDeviation);
    data.forecastHorizonHours = Number(data.forecastHorizonHours);
    try {
      const response = await secureFetch('/api/system/config', { method: 'POST', body: JSON.stringify(data) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Помилка');
      showMessage('message', 'success', result.message);
      await loadLogs();
    } catch (error) { showMessage('message', 'error', error.message); }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadStatus();
  await initializeForms();
  await loadBalance();
  await loadForecasts();
  await loadLogs();
  setInterval(loadBalance, 5000);
});
