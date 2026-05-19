function statusColor(status) {
  if (status === 'critical') return '#dc2626';
  if (status === 'warning') return '#f59e0b';
  return '#16a34a';
}

class PowerQualityCharts {
  constructor() {
    this.waveformChart = null;
    this.harmonicsChart = null;
    this.trendChart = null;
    this.initCharts();
  }

  initCharts() {
    const waveformCtx = document.getElementById('waveformChart');
    this.waveformChart = new Chart(waveformCtx, {
      type: 'line',
      data: {
        labels: Array.from({ length: 120 }, (_, i) => i),
        datasets: [{
          label: 'U(t), В',
          data: [],
          borderWidth: 2,
          pointRadius: 0,
          borderColor: '#2563eb',
          tension: 0.25
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true } },
        scales: {
          x: { title: { display: true, text: 'Відлік' } },
          y: { title: { display: true, text: 'Напруга, В' } }
        }
      }
    });

    const harmonicsCtx = document.getElementById('harmonicsChart');
    this.harmonicsChart = new Chart(harmonicsCtx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Амплітуда, %',
          data: [],
          backgroundColor: []
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });

    const trendCtx = document.getElementById('trendChart');
    this.trendChart = new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          { label: 'THD, %', data: [], borderColor: '#7c3aed', tension: 0.35, yAxisID: 'y' },
          { label: 'Частота, Гц', data: [], borderColor: '#0f766e', tension: 0.35, yAxisID: 'y1' }
        ]
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: { type: 'linear', position: 'left', title: { display: true, text: 'THD, %' } },
          y1: { type: 'linear', position: 'right', title: { display: true, text: 'Гц' }, grid: { drawOnChartArea: false } }
        }
      }
    });
  }

  updateWaveform(data) {
    this.waveformChart.data.datasets[0].data = data.waveform;
    this.waveformChart.update();
  }

  updateHarmonics(data) {
    this.harmonicsChart.data.labels = data.harmonics.map(item => `${item.order}-та`);
    this.harmonicsChart.data.datasets[0].data = data.harmonics.map(item => item.value);
    this.harmonicsChart.data.datasets[0].backgroundColor = data.harmonics.map(item => item.order === 1 ? '#2563eb' : statusColor(data.thdStatus));
    this.harmonicsChart.update();
  }

  updateTrend(history) {
    const sorted = [...history].reverse();
    this.trendChart.data.labels = sorted.map(item => new Date(item.timestamp).toLocaleTimeString('uk-UA'));
    this.trendChart.data.datasets[0].data = sorted.map(item => item.thd);
    this.trendChart.data.datasets[1].data = sorted.map(item => item.frequency);
    this.trendChart.update();
  }
}
