const form = document.getElementById('escoForm');
const message = document.getElementById('message');
const contractsList = document.getElementById('contractsList');
const refreshBtn = document.getElementById('refreshBtn');
const statusFilter = document.getElementById('statusFilter');
const searchInput = document.getElementById('searchInput');
const statistics = document.getElementById('statistics');

const statusNames = {
  planned: 'Планується',
  active: 'Активний',
  completed: 'Завершений',
  paused: 'Призупинений'
};

function formatMoney(value) {
  return Number(value || 0).toLocaleString('uk-UA') + ' грн';
}

function showMessage(type, text) {
  message.className = `message ${type}`;
  message.textContent = text;
  setTimeout(() => { message.className = 'message'; }, 4500);
}

function validateFormData(data) {
  const errors = [];
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  if (Number(data.contractValue) <= 0) errors.push('Вартість договору має бути більшою за 0');
  if (Number(data.annualSaving) <= 0) errors.push('Річна економія має бути більшою за 0');
  if (data.startDate && data.endDate && start >= end) errors.push('Дата завершення має бути пізніше дати початку');
  return errors;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  const errors = validateFormData(data);

  if (errors.length) {
    showMessage('error', errors.join('. '));
    return;
  }

  try {
    const response = await fetch('/api/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Не вдалося зберегти договір');
    }
    showMessage('success', result.message);
    form.reset();
    await loadContracts();
  } catch (error) {
    showMessage('error', error.message);
  }
});

refreshBtn.addEventListener('click', loadContracts);
statusFilter.addEventListener('change', loadContracts);
searchInput.addEventListener('input', () => {
  clearTimeout(window.searchTimer);
  window.searchTimer = setTimeout(loadContracts, 300);
});

document.addEventListener('DOMContentLoaded', loadContracts);

async function loadContracts() {
  const params = new URLSearchParams();
  params.set('status', statusFilter.value);
  if (searchInput.value.trim()) params.set('search', searchInput.value.trim());

  try {
    const [contractsResponse, statsResponse] = await Promise.all([
      fetch('/api/contracts?' + params.toString()),
      fetch('/api/statistics')
    ]);
    const contracts = await contractsResponse.json();
    const stats = await statsResponse.json();
    renderContracts(contracts);
    renderStatistics(stats);
  } catch (error) {
    contractsList.innerHTML = '<div class="empty">Помилка завантаження даних</div>';
  }
}

function renderStatistics(stats) {
  statistics.innerHTML = `
    <div><strong>${stats.totalCount}</strong><span>контрактів</span></div>
    <div><strong>${stats.activeCount}</strong><span>активних</span></div>
    <div><strong>${formatMoney(stats.totalSaving)}</strong><span>економія/рік</span></div>
  `;
}

function renderContracts(contracts) {
  if (!contracts.length) {
    contractsList.innerHTML = '<div class="empty">Контракти ще не зареєстровані</div>';
    return;
  }

  contractsList.innerHTML = contracts.map(contract => `
    <article class="contract-card">
      <h3>${escapeHtml(contract.contractNumber)} - ${escapeHtml(contract.customer)}</h3>
      <span class="badge ${contract.status}">${statusNames[contract.status] || contract.status}</span>
      <div class="contract-meta">
        <p><b>Об’єкт:</b> ${escapeHtml(contract.objectName)}</p>
        <p><b>Адреса:</b> ${escapeHtml(contract.address)}</p>
        <p><b>Вартість:</b> ${formatMoney(contract.contractValue)}</p>
        <p><b>Економія:</b> ${formatMoney(contract.annualSaving)} / рік</p>
        <p><b>Окупність:</b> ${contract.paybackPeriod} року</p>
        <p><b>Тривалість:</b> ${contract.durationMonths} міс.</p>
      </div>
      <button class="btn delete" onclick="deleteContract('${contract.id}')">Видалити</button>
    </article>
  `).join('');
}

async function deleteContract(id) {
  if (!confirm('Видалити цей ЕСКО контракт?')) return;
  try {
    const response = await fetch('/api/contracts/' + id, { method: 'DELETE' });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'Помилка видалення');
    showMessage('success', result.message);
    await loadContracts();
  } catch (error) {
    showMessage('error', error.message);
  }
}

function escapeHtml(text) {
  return String(text || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
