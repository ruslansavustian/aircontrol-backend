# Aircontrol backend

NestJS + TypeScript + TypeORM + PostgreSQL. Принимает показания ESP32, сохраняет их в таблицу `measurements`, логирует только ошибки сохранения, без сообщений на каждый успешный запрос или дубль. Генерация показаний выполняется на устройстве. `source: mock` означает вымышленные данные.

## Запуск Docker (существующий Nginx)

```sh
cp .env.example .env
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Задай DEVICE_TOKEN, затем сгенерируй отдельно POSTGRES_PASSWORD. Не заменяй существующий DEVICE_TOKEN на работающем сервере: он должен совпадать с прошивкой. POSTGRES_USER/POSTGRES_DB можно оставить aircontrol. Секреты — только в .env, права `chmod 600 .env`.

```sh
docker compose up -d --build
docker compose logs -f
```

Стандартный compose.yaml: Nginx хоста → 127.0.0.1:3030 → api:3000 → db:5432. PostgreSQL 17 имеет собственный volume `postgres_data`, без опубликованного порта. Другие БД сервера не используются. API ждёт готовности PostgreSQL, запускает миграции, затем NestJS. synchronize=false; таблицы изменяются только миграциями. При ошибке миграции API не запускается. Автозапуск миграций рассчитан на один экземпляр API.

На Hetzner: `/root/aircontrol/backend`; домен https://aircontrol.savustian.de. Контроллер — отдельный репозиторий `/root/aircontrol/controller`.

Обновления только через GitHub:

```sh
git pull --ff-only
docker compose up -d --build
docker compose ps
```

Docker проверяет TCP-порт API; это подтверждает прослушивание порта, но не доступность БД из API. PostgreSQL проверяется отдельно через pg_isready. HTTP health endpoint удалён. Не использовать `docker compose down -v`: это удаляет данные. Обычное пересоздание контейнеров сохраняет volume. Изменение POSTGRES_PASSWORD в .env не меняет пароль в уже инициализированной БД.

## Локальная разработка с Node.js

Node.js >=20.19, в контейнере Node.js 24. `npm ci`, настрой `.env`, запусти PostgreSQL и укажи DB_HOST/DB_PORT (по умолчанию 127.0.0.1:5432). Compose не открывает порт БД; для локальной разработки можно создать игнорируемый compose.override.yaml с `services: { db: { ports: ["127.0.0.1:5433:5432"] } }`, запустить `docker compose up -d db` и задать DB_PORT=5433.

```sh
npm run build
npm run migration:run
npm run dev
```

В другом терминале: `npm run send:example`. Для удалённого API: `npm run send:example -- https://aircontrol.savustian.de` (DEVICE_TOKEN/DEVICE_ID должны совпадать с сервером).

## Таблица и API

`POST /api/v1/measurements`, `Authorization: Bearer <DEVICE_TOKEN>`. Полный JSON: examples/measurement.json. Валидация DTO, неизвестные поля запрещены, размер до 4 KiB.

В measurements хранятся UUID id, deviceId, source, bootId, sequence, PM1/PM2.5/PM10 в мкг/м³, measuredAt (UTC, nullable), receivedAt (время БД), uptimeMs, sampleCount, windowSeconds, firmwareVersion и schemaVersion. bigint поля в TypeORM представлены строками во избежание потери точности; API по-прежнему принимает проверенные числа.

Индекс уникальности `(device_id, boot_id, sequence)` защищает от конкурентных повторов. bootId нормализуется в lowercase. Первый успешно сохранённый payload остаётся неизменным; повтор, даже с другим содержимым, возвращает ту же запись с duplicate=true.

**202** теперь возвращается только после записи или подтверждения существующего дубля, сохранён для совместимости ESP32. Ответ содержит accepted, id, duplicate, deviceId, sequence, receivedAt. **400** — тело невалидно, **401/403** — доступ, **413** — размер, **503** — БД не приняла запись. Прошивка пока не повторяет потерянные измерения. Старые консольные логи автоматически не импортируются.

Для аналитики индексированы `(device_id, source, measured_at)` и received_at. День/месяц позже группируем по measured_at с явно выбранным часовым поясом. Mock и pms5003 не смешиваем. Записи без measured_at отдельно считаем как неизвестное время, а не молча заменяем received_at. Текущие снимки можно усреднять, но среднее нерегулярных образцов не равно точному среднему по времени. API аналитики пока не реализован.

Просмотр таблицы:

```sh
docker compose exec db psql -U aircontrol -d aircontrol -c 'SELECT id, source, sequence, measured_at, received_at, pm25_ug_m3 FROM measurements ORDER BY received_at DESC LIMIT 10;'
```

## Резервная копия

Из backend/ на сервере, сохраняй копии также вне этого сервера:

```sh
mkdir -p backups
chmod 700 backups
umask 077
docker compose exec -T db pg_dump -U aircontrol -d aircontrol -Fc > backups/aircontrol.dump
```

Используй новый filename для каждой копии. Проверить содержимое: `docker compose exec -T db pg_restore --list < backups/aircontrol.dump`. Полную проверку восстановления делай в отдельной пустой БД через pg_restore, не поверх рабочей. Автоматический backup/offsite ещё не настроен.

## Структура

- src/database/data-source.ts — единая конфигурация NestJS и TypeORM CLI.
- src/database/migrations/ — версионированная схема.
- src/modules/measurements/ — DTO, entity, guard, controller, service.

Проверки: `npm run build`, `npm run typecheck`, `npm run migration:show`. Добавляя новую миграцию, зарегистрируй её в data-source.ts.

## ESP32 и Telegram

Настройки устройства: отдельный репозиторий controller, файл firmware/main/config/api_config.local.h. endpoint — https://aircontrol.savustian.de/api/v1/measurements, тот же DEVICE_TOKEN и DEVICE_ID. Для этого обновления БД менять прошивку не нужно.

Telegram: [пошаговая инструкция](TELEGRAM.md). Доступны команды настройки/теста и TelegramModule со сводкой каждый час за последний час; включается TELEGRAM_ENABLED=true. Подробности о канале, окнах, фактах и доставке — в TELEGRAM.md.

Для отдельного нового сервера со свободными 80/443 есть альтернативный compose.caddy.yaml: задай DOMAIN и запускай `docker compose -f compose.caddy.yaml up -d --build`. На текущем Hetzner используй стандартный compose.yaml, существующий Nginx и Certbot.

## Adminer через SSH

Compose запускает отдельный Adminer для этой БД на `127.0.0.1:8081`. PostgreSQL остаётся внутри сети Compose. Telani Adminer на 8080 не меняется.

На Mac добавь в ~/.zshrc (путь к своему клону):

```zsh
source "/Volumes/doc-station/c++/esp32+PM5003/backend/scripts/tunnel.zsh"
```

После `source ~/.zshrc`: `tunnel myserver` открывает Telani через http://127.0.0.1:8080, `tunnel myserver controller` — Aircontrol через http://127.0.0.1:8081. Держи терминал открытым. Сохраняется синтаксис `tunnel host local_port remote_port`.

В Adminer выбери PostgreSQL, сервер `db`, пользователя и базу `aircontrol` (либо свои POSTGRES_USER/POSTGRES_DB). Пароль — существующий POSTGRES_PASSWORD из серверной .env. Это пароль БД, не DEVICE_TOKEN.
