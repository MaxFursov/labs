class PowerQualityAPI {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  async request(path, options = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`HTTP ${response.status}: ${message}`);
    }

    return response.json();
  }

  getCurrent() {
    return this.request('/api/power-quality/current');
  }

  getHistory(limit = 12) {
    return this.request(`/api/power-quality/history?limit=${limit}`);
  }

  getSummary() {
    return this.request('/api/power-quality/summary');
  }

  getStatus() {
    return this.request('/api/status');
  }
}
