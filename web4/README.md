# Практична робота №4: REST API для енергетичних даних

Варіант 11: REST API для управління високовольтними вимикачами.

## Запуск

```bash
npm install
npm start
```

Сервер запускається за адресою:

```text
http://localhost:3000
```

## Тестування

У першому терміналі запустіть сервер:

```bash
npm start
```

У другому терміналі виконайте:

```bash
npm run test-api
```

## Основні endpoints

- `GET /api/circuit-breakers` - список всіх вимикачів, фільтрація та сортування
- `GET /api/circuit-breakers/:id` - отримання вимикача за ID
- `GET /api/circuit-breakers/:id/diagnostics` - діагностика стану
- `GET /api/circuit-breakers/:id/history` - історія комутацій
- `POST /api/circuit-breakers` - створення вимикача
- `POST /api/circuit-breakers/:id/switch` - виконання комутації
- `PUT /api/circuit-breakers/:id` - повне оновлення
- `PATCH /api/circuit-breakers/:id` - часткове оновлення
- `DELETE /api/circuit-breakers/:id` - видалення
- `GET /api/stats` - статистика API

## Приклад POST

```bash
curl -X POST http://localhost:3000/api/circuit-breakers \
  -H "Content-Type: application/json" \
  -d '{"name":"QF-110-05","voltage":110,"current":1600,"position":"open","mechanism":"spring","operationTime":50}'
```
