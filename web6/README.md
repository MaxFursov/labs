# Практична робота №6 - Безпека веб-додатків

Варіант 11: Портал управління розумною енергомережею (Smart Grid)

## Функціонал

- Реєстрація користувачів з ролями `operator`, `analyst`, `administrator`
- Логін через PassportJS Local Strategy
- Сесії через `express-session`
- Хешування паролів через bcryptjs
- RBAC-авторизація для API
- CSRF-захист для POST/PUT/DELETE запитів
- XSS-захист через Helmet, CSP та санітизацію введених даних
- Rate limiting для логіну та API
- Логування дій користувачів
- Захищені API endpoints для Smart Grid

## Запуск

```bash
npm install
npm start
```

Після запуску відкрити:

```text
http://localhost:3000
```

## Тестові користувачі

Після першого запуску автоматично створюються користувачі:

| Роль | Email | Пароль |
|---|---|---|
| operator | operator@grid.local | Operator123! |
| analyst | analyst@grid.local | Analyst123! |
| administrator | admin@grid.local | Admin123! |

## Основні endpoints

| Метод | URL | Ролі | Опис |
|---|---|---|---|
| POST | `/auth/register` | - | Реєстрація |
| POST | `/auth/login` | - | Вхід |
| POST | `/auth/logout` | authenticated | Вихід |
| GET | `/api/grid/balance` | operator, analyst | Баланс мережі |
| POST | `/api/grid/adjust` | operator | Коригування балансу |
| GET | `/api/forecasts` | analyst | Прогнози |
| POST | `/api/system/config` | administrator | Налаштування системи |
| GET | `/api/logs` | administrator | Журнал подій |

## Примітка

Для POST/PUT/DELETE запитів потрібен CSRF-токен. Клієнтська частина отримує його автоматично через `/auth/csrf-token` і передає в заголовку `CSRF-Token`.
