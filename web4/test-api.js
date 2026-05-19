const BASE_URL = 'http://localhost:3000/api';

async function request(title, url, options = {}) {
  console.log(`\n${title}`);
  const response = await fetch(url, options);
  const data = await response.json();
  console.log('HTTP status:', response.status);
  console.log(JSON.stringify(data, null, 2));
  return data;
}

async function testAPI() {
  try {
    await request('1. GET всі вимикачі', `${BASE_URL}/circuit-breakers`);
    await request('2. GET вимикач за ID', `${BASE_URL}/circuit-breakers/1`);
    await request('3. GET діагностика', `${BASE_URL}/circuit-breakers/1/diagnostics`);

    const created = await request('4. POST створення вимикача', `${BASE_URL}/circuit-breakers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'QF-110-05 Резервний 110 кВ',
        voltage: 110,
        current: 1600,
        position: 'open',
        switchingCount: 0,
        mechanism: 'spring',
        operationTime: 50,
        status: 'normal'
      })
    });

    await request('5. POST комутація створеного вимикача', `${BASE_URL}/circuit-breakers/${created.id}/switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close' })
    });

    await request('6. PATCH часткове оновлення', `${BASE_URL}/circuit-breakers/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operationTime: 54, status: 'normal' })
    });

    await request('7. GET історія комутацій', `${BASE_URL}/circuit-breakers/${created.id}/history`);
    await request('8. GET фільтр за положенням closed', `${BASE_URL}/circuit-breakers?position=closed&sort=switchingCount&order=desc`);
    await request('9. GET статистика API', `${BASE_URL}/stats`);
    await request('10. DELETE видалення тестового вимикача', `${BASE_URL}/circuit-breakers/${created.id}`, { method: 'DELETE' });

    console.log('\nТестування завершено успішно');
  } catch (error) {
    console.error('Помилка тестування:', error.message);
  }
}

testAPI();
