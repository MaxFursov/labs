let csrfToken = '';
async function refreshCsrf() {
  const response = await fetch('/auth/csrf-token', { credentials: 'include' });
  const data = await response.json();
  csrfToken = data.csrfToken;
  return csrfToken;
}

async function secureFetch(url, options = {}) {
  if (!csrfToken) await refreshCsrf();
  const headers = options.headers || {};
  if (options.method && options.method !== 'GET') headers['CSRF-Token'] = csrfToken;
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const response = await fetch(url, { ...options, headers, credentials: 'include' });
  if (response.status === 403) {
    await refreshCsrf();
  }
  return response;
}

function showMessage(elementId, type, text) {
  const el = document.getElementById(elementId);
  el.className = `message ${type}`;
  el.textContent = text;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
