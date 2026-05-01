# Промпт для разработки gogeoservice_web

## Задача
Создать веб-интерфейс (SPA) для демонстрации сервиса NDVI-снимков geogoservice.

---

## Деплой: Docker
Приложение полностью контейнеризировано.

### Dockerfile (multi-stage)
- **Stage 1 `builder`**: `node:22-alpine` — `npm ci` + `npm run build` → артефакт `dist/`
- **Stage 2 `runtime`**: `nginx:alpine` — копирует `dist/` и кастомный `nginx.conf`

### nginx.conf (внутри контейнера)
- Раздаёт статику из `/usr/share/nginx/html`
- SPA fallback: все неизвестные пути → `index.html`
- Проксирует `/api/` → `http://gogeoapp:8080/api/` (имя сервиса из docker-compose)

### docker-compose.yml
Файл добавляется в **корень gogeoservice_web** и описывает только фронтенд-сервис.
Подключается к уже существующей внешней docker-сети проекта `geogoservice`
(сеть объявляется как `external: true`), чтобы иметь доступ к сервису `gogeoapp`.

```
services:
  gogeoservice_web:
    build: .
    ports:
      - "${HOST_PORT_WEB:-3000}:80"
    networks:
      - geogoservice_net

networks:
  geogoservice_net:
    external: true
```

### .env.example
```
HOST_PORT_WEB=3000
```

### Структура Docker-файлов
```
gogeoservice_web/
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── nginx.conf
└── Makefile
```

### Makefile
Все команды для работы с проектом:
```
make dev        # npm run dev (локальный дев-сервер Vite)
make install    # npm ci
make build      # npm run build (сборка dist/)
make up         # docker compose up -d --build
make down       # docker compose down
make logs       # docker compose logs -f
make rebuild    # down + up (пересборка образа)
make lint       # npm run lint
make preview    # npm run preview (локальный предпросмотр prod-сборки)
```

> Для разработки без Docker: `npm run dev` — Vite проксирует `/api` → `http://localhost:80`
> через `vite.config.ts` (переменная `VITE_API_URL` не нужна в dev-режиме).

---

## Стек
- Фреймворк: React 18 + TypeScript + Vite
- Карта: Leaflet + react-leaflet
  - Рисование полигонов: `@geoman-io/leaflet-geoman-free` (современная замена leaflet-draw;
    поддерживает произвольные полигоны, snapping, активно поддерживается)
- Проекции: proj4 (для конвертации EPSG:4326 → EPSG:3857)
- Стили: Tailwind CSS v3 (без UI-библиотек, кастомный дизайн)
- HTTP: fetch API (без axios)
- Бэкенд: geogoservice запущен локально, base URL задаётся через .env (VITE_API_URL)

### Заметка о производительности
Leaflet подходит для 10–100 PNG-оверлеев:
- Пан (перемещение мышью) — двигает весь map-pane одним CSS `transform: translate(...)`,
  это GPU-операция, не зависящая от числа оверлеев. Лагов не будет.
- Zoom — перепозиционирует оверлеи только в конце жеста (moveend), не покадрово.
- При необходимости 500+ оверлеев или WebGL-эффектов — переход на MapLibre GL JS,
  но для текущей задачи это избыточно.

---

## Функциональные требования

### 1. Интерактивная карта
- Leaflet карта на весь экран (или 70% экрана)
- Тайловый слой: OpenStreetMap (или Esri World Imagery — переключатель)
- Инструмент рисования произвольного полигона (минимум 3 точки — треугольник и более)
  через leaflet-geoman (`pm.Draw.Polygon`)
- Можно нарисовать только одну геозону одновременно
- При повторном рисовании — предыдущая геозона удаляется

### 2. Валидация геозоны
По нарисованному полигону вычисляется его ограничивающий прямоугольник (MBR/bbox)
в EPSG:3857 — именно он используется для запроса и наложения результата.

Условия валидности:
- Полигон должен иметь минимум 3 точки
- Минимальный размер стороны bbox: 100 м
- Максимальный размер стороны bbox: 500 000 м (500 км)
- Если геозона не проходит валидацию — показывать inline подсказку прямо на карте
  (красная заливка полигона + tooltip с причиной)
- Валидная геозона: зелёная рамка/заливка

### 3. Панель управления (sidebar или нижняя панель)
Компоненты:
- Date picker (только дата, без времени)
  - Диапазон: с 2017-01-01 по сегодня минус 15 дней (данные появляются с задержкой)
  - По умолчанию: текущий день минус 30 дней
- Кнопка "Получить NDVI"
  - Активна только когда геозона нарисована, валидна и дата выбрана
  - Состояния: normal / loading (spinner) / disabled
- Информационный блок о текущей геозоне:
  - Размер в км × км
  - Центр координат (WGS84, 4 знака)
  - Площадь в км²
- Легенда цветов NDVI:
  - Прозрачный → вода/облака
  - Красный–Жёлтый → редкая/стрессовая растительность
  - Светло-зелёный–Тёмно-зелёный → здоровая растительность

### 4. Отображение результата
- После успешного ответа (200, image/png):
  - Наложить PNG поверх нарисованного bbox на карте (ImageOverlay в Leaflet)
  - Opacity overlay: 0.85, регулируется слайдером [0.0 – 1.0]
  - Анимация появления (fade-in)
- Кнопка "Сбросить" — удаляет и геозону, и overlay

### 5. Обработка ошибок
- 400 — "Некорректные параметры запроса"
- 404 — "Снимок не найден: нет сцены с облачностью < 20% для выбранной даты и области.
         Попробуйте изменить дату ±2–3 недели."
- 500 — "Ошибка обработки на сервере"
- Network error — "Сервис недоступен. Проверьте, запущен ли geogoservice."
Ошибки показывать в toast-уведомлении (без библиотек, свой компонент).

### 6. UX-детали
- Пока идёт запрос — полупрозрачный overlay поверх карты + spinner по центру
- После получения снимка — сообщение-тост "Снимок получен ✓ (источник: Planetary Computer)"
  (если сервер вернёт заголовок X-STAC-Provider — показываем его, иначе опускаем)
- Responsive: работает на экранах от 1024px
- Язык UI: русский

---

## API
Единственный эндпоинт, который использует фронтенд:

```
GET /api/render
Параметры (современный формат):
  bbox=minX,minY,maxX,maxY   — в EPSG:3857 (метры)
  date=YYYY-MM-DD
  w={width}                  — ширина выходного PNG в пикселях
  h={height}                 — высота выходного PNG в пикселях

Расчёт w и h:
  Вычислять пропорционально аспекту bbox (ширина/высота),
  нормировать к максимуму 512px по большей стороне.

Ответ: бинарный image/png.

Пример:
  /api/render?bbox=1486000,6890000,1500000,6900000&date=2024-06-15&w=512&h=365
```

---

## Структура проекта

```
gogeoservice_web/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── Map/
│   │   │   ├── MapView.tsx         # Leaflet-карта, leaflet-geoman рисование
│   │   │   └── NdviOverlay.tsx     # ImageOverlay для результата (bbox полигона)
│   │   ├── Sidebar/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── DatePicker.tsx
│   │   │   ├── ZoneInfo.tsx
│   │   │   └── NdviLegend.tsx
│   │   └── ui/
│   │       ├── Toast.tsx
│   │       ├── Spinner.tsx
│   │       └── Slider.tsx
│   ├── hooks/
│   │   ├── useNdviRequest.ts       # fetch + состояния loading/error/result
│   │   └── useDrawnZone.ts         # управление нарисованным bbox
│   ├── utils/
│   │   ├── projection.ts           # EPSG:4326 ↔ EPSG:3857 конвертация
│   │   ├── validation.ts           # проверка размера геозоны
│   │   └── ndviApi.ts              # buildUrl, fetchNdvi
│   └── types/
│       └── index.ts                # BBox3857, BBox4326, NdviRequestParams
├── public/
├── index.html
├── vite.config.ts                  # proxy /api → http://localhost:80
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Критерии готовности
- [ ] Рисование прямоугольника на карте
- [ ] Валидация размера с визуальной обратной связью
- [ ] Выбор даты с корректным диапазоном
- [ ] Успешный запрос и наложение PNG на карту
- [ ] Обработка всех кодов ошибок
- [ ] Слайдер прозрачности overlay
- [ ] Кнопка сброса
- [ ] Toast-уведомления
- [ ] Легенда NDVI
