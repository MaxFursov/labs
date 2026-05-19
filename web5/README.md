# Практична робота №5

Тема: Клієнтський веб-додаток JavaScript + API для візуалізації даних енергетичних об'єктів у реальному часі.

Варіант 11: Моніторинг якості електроенергії.

## Функціонал

- REST API на Node.js + Express
- Клієнтська частина HTML/CSS/JavaScript
- Завантаження даних через Fetch API
- Оновлення даних кожні 5 секунд
- Графік форми сигналу напруги
- Спектральний аналіз гармонік
- Графік історії THD та частоти
- Таблиця останніх вимірювань
- Індикатори відповідності нормам

## Запуск

```bash
npm install
npm start
```

Після запуску відкрийте:

```text
http://localhost:3000
```

## API endpoints

```text
GET  /api/power-quality/current
GET  /api/power-quality/history?limit=12
GET  /api/power-quality/summary
POST /api/power-quality/readings
GET  /api/status
```
