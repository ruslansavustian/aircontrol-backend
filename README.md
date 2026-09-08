# Air monitor API — первый запуск

NestJS + TypeScript. Принимает показания ESP32 и выводит их в консоль. БД и Telegram будут следующими этапами. `source: "mock"` явно обозначает вымышленные данные.

## Локальный запуск

Node.js >= 20.19 (для Docker выбран Node.js 24). Из общей рабочей папки (после отдельного clone backend переходи сразу в его корень):

```sh
cd backend
npm ci
cp .env.example .env
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Скопируй сгенерированную строку в `DEVICE_TOKEN` внутри `.env`. `DEVICE_ID=home-air-01` можно оставить. `DOMAIN` для локального запуска не нужен. Токен не отправляй в чат и не коммить.

```sh
npm run dev
```

Проверка во втором терминале из `backend/`:

```sh
curl http://localhost:3000/api/v1/health
npm run send:example
```

Ожидается `HTTP 202` и строка `measurement.received` в консоли сервера. Пример берётся из `examples/measurement.json`, токен автоматически читается из `.env`.

## Структура

- `src/main.ts` — запуск, JSON до 4 KiB, глобальная валидация.
- `src/config.ts` — конфигурация из окружения, проверка при запуске.
- `src/modules/measurements/` — controller → service → консоль; guard проверяет Bearer token, DTO проверяет поля.
- `src/modules/health/` — проверка доступности процесса.

`npm run build` компилирует TypeScript; `npm start` запускает результат. `npm run typecheck` проверяет типы.

## Контракт

`POST /api/v1/measurements`, JSON, `Authorization: Bearer <DEVICE_TOKEN>`.

Полный пример — `examples/measurement.json`. `deviceId` должен совпадать с `DEVICE_ID`. `source` — `mock` или `pms5003`. `bootId` — 32 hex-символа, `sequence` — целое uint32. Концентрации — числа 0–65535 мкг/м³. `measuredAt` — ISO-дата или явный `null`; сервер добавляет своё `receivedAt`. Мок — один снимок (`windowSeconds: 0`, `sampleCount: 1`), а не среднее за 30 секунд.

Ответ `202` означает, что данные проверены и выведены в лог. Хранения и удаления дублей пока нет. `400` — неверное тело, `401` — неверный/отсутствующий токен, `403` — другое устройство, `413` — тело больше лимита. Неизвестные поля запрещены.

## Новый сервер с Caddy (альтернативный вариант)

Этот Compose предназначен для сервера с установленным Docker Compose и свободными портами 80/443. Если там уже работает Nginx/Caddy/Traefik, сначала адаптируем подключение к существующему proxy.

1. Загрузи репозиторий на сервер и перейди в корень клонированного backend-репозитория.
2. Создай `.env` из `.env.example`, задай `DEVICE_TOKEN`, `DEVICE_ID` и `DOMAIN`, например `air.example.com` (без протокола и пути).
3. Направь DNS A домена на IPv4 сервера. AAAA добавляй только при настроенном IPv6. Открой входящие TCP 80/443 в firewall сервера и Hetzner.
4. Запусти:

```sh
docker compose -f compose.caddy.yaml up -d --build
docker compose -f compose.caddy.yaml logs -f api
```

Caddy получает и обновляет сертификат автоматически; данные сертификатов сохраняются в volume. Условия — в [документации Caddy](https://caddyserver.com/docs/automatic-https). Порт API 3000 доступен внутри Compose; публичный вход — HTTPS через Caddy.

```sh
curl https://air.example.com/api/v1/health
npm run send:example -- https://air.example.com
```

Вторую команду можно выполнить на Mac из `backend/`, указав в локальном `.env` тот же токен и ID, что на сервере. Контейнер запускается без root, перезапускается автоматически, логи ограничены ротацией. Логи не заменяют БД.

## Подключение ESP32

Прошивка находится в отдельном репозитории `controller/`. После проверки HTTPS API перейди в его корень:

```sh
cd ../controller
cp firmware/main/config/api_config.example.h firmware/main/config/api_config.local.h
```

Укажи локально:

- `kEndpoint` — полный `https://air.example.com/api/v1/measurements`;
- `kDeviceId` — тот же `DEVICE_ID`;
- `kDeviceToken` — тот же `DEVICE_TOKEN`.

Оставь `kAllowInsecureHttp = false`. Локальные `.env` и `*.local.h` игнорируются Git; изменения конфигурации прошивки требуют пересборки и записи.

```sh
make build
make flash
make monitor
```

ESP32 подключается к Wi-Fi, синхронизирует часы через SNTP и отправляет случайные значения. Пауза между циклами — 30 секунд плюс время запроса; первая отправка может потребовать нескольких циклов. На устройстве ожидается `accepted (HTTP 202)`, на сервере — `measurement.received` с `source: "mock"`.

HTTPS проверяет сертификат через ESP-IDF certificate bundle. Если часы не синхронизировались, отправка ждёт. Очереди и повторной отправки конкретного измерения пока нет: после ошибки следующий цикл создаёт новое. Wi-Fi делает максимум 5 повторов; длительные обрывы разберём отдельно.

Источник данных выделен в `firmware/main/modules/measurements/measurement_source.h` и `mock_measurement_source.cpp`. Позже реализацию заменим на чтение PMS5003; транспорт и API сохранятся, а обработку отсутствия показаний добавим вместе с драйвером.

## Сервер с существующим Nginx (aircontrol.savustian.de)

На myserver репозиторий размещён в /root/aircontrol/backend, controller клонируется отдельно в /root/aircontrol/controller. Для этой установки используется **compose.yaml**, без Caddy. Nginx принимает HTTPS и направляет запросы на 127.0.0.1:3030; внутри контейнера NestJS слушает 3000.

Обновление из корня серверного backend:

```sh
git pull --ff-only
docker compose up -d --build
docker compose logs -f api
```

.env хранится только на сервере (права 600); BACKEND_PORT по умолчанию 3030. Конфигурация Nginx: /etc/nginx/sites-available/aircontrol.savustian.de. Сертификат обслуживает Certbot; webroot для ACME — /var/www/aircontrol. Для проверки: https://aircontrol.savustian.de/api/v1/health.
