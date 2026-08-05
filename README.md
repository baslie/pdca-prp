# PDCA-PRP

Лендинг тренинга «Профессиональное Решение Проблем» Дениса Булгина.

## Стек

- **Astro 7** — статический сайт (`output: "static"`), компонентная декомпозиция,
  один Layout + одна страница + ~10 компонентов в `src/components/`.
- **Tailwind CSS v4** — через официальный Vite-плагин `@tailwindcss/vite`,
  единый стилевой файл `src/styles/global.css` (`@import "tailwindcss"`,
  `@theme`-токены, `@layer base/components`).
- **TypeScript** (strict, через `astro/tsconfigs/strict`) для всей логики
  в `src/scripts/`.
- **GSAP 3 + ScrollTrigger** (npm) — анимация диаграммы ПРП.
- **astro-icon + @iconify-json/lucide** — иконки рендерятся как inline SVG
  на build-time (без CDN, без runtime-замены).
- **Inter** (Google Fonts) + **Yuji Mai** (только один иероглиф 改善).
- **BoomStream** — видеоплеер, прямой `<iframe>` без SDK.
- **GitHub Actions** (`withastro/action@v3` + `actions/deploy-pages@v4`) —
  CI/CD на каждом push в `main`.
- **GitHub Pages** — хостинг, custom-домен `roman-purtow.ru`, project page
  под путём `/pdca-prp/`.

## Структура

```
.
├── astro.config.mjs           ← site, base, integrations (icon, tailwind vite)
├── tsconfig.json              ← extends astro/tsconfigs/strict
├── package.json               ← scripts: dev / build / preview / check
├── .github/workflows/
│   └── deploy.yml             ← CI: withastro/action + deploy-pages
├── src/
│   ├── layouts/BaseLayout.astro       ← <head>, SEO, JSON-LD, anti-FOUC inline-script
│   ├── pages/index.astro              ← главная страница (сборка компонентов)
│   ├── components/                    ← Hero, AboutTraining, Video, Examples,
│   │                                    OfferStats, PrpSteps, Modal*, BoomStreamPlayer,
│   │                                    DenisFixed, Logo
│   ├── scripts/                       ← modal.ts, modal-about.ts, examples.ts,
│   │                                    prp-diagram-scroll.ts (TS, build-bundled)
│   ├── styles/global.css              ← Tailwind v4 + @theme + @layer base/components
│   └── assets/                        ← images, svg — через Vite asset pipeline (hashed URLs)
├── public/                    ← статика «как есть»: favicon.ico, icons/, og-image.png,
│                                site.webmanifest, browserconfig.xml, robots.txt
├── docs/
│   └── TYPOGRAPHY.md          ← источник правды по тексту (см. ниже)
├── CLAUDE.md                  ← инструкции для AI-агента и людей-разработчиков
└── README.md
```

## Локальный dev

```powershell
npm install                     # один раз после клона
npm run dev                     # http://localhost:4321/pdca-prp/
```

Astro поднимает встроенный dev-сервер с HMR. Tailwind собирается на лету через
Vite-плагин. Учитывает `base: '/pdca-prp'` из `astro.config.mjs` — открывать
надо именно с этим префиксом.

Прод-проверка:

```powershell
npm run build                   # генерирует dist/
npm run preview                 # отдаёт dist/ как настоящий статик
```

Типы:

```powershell
npm run check                   # astro check (TypeScript + Astro)
```

## Типографика

Весь текст на странице подчинён единой системе: **8 ролей** (`.t-display`,
`.t-h-section` +`--compact`, `.t-h-sub`, `.t-lead`, `.t-body`, `.t-body-sm`,
`.t-quote`, плюс микротексты `.t-eyebrow`/`.t-meta`/`.t-hint`),
**7 цветов** (`.t-on-strong/default/muted/soft` для светлого фона,
`.t-on-dark/-muted/-soft` для тёмного), **4 веса** (400/500/600/900).

Единственный источник правды — [`docs/TYPOGRAPHY.md`](docs/TYPOGRAPHY.md).
Открыть и прочитать **перед** любой правкой текста, заголовков, подписей
или стилей. Там же — список анти-паттернов.

## Деплой

Сайт публикуется на GitHub Pages автоматически через GitHub Actions:

- Репозиторий: `github.com/baslie/pdca-prp`, ветка `main`.
- Workflow: `.github/workflows/deploy.yml` — `withastro/action@v3` →
  `npm ci && npm run build` → `actions/deploy-pages@v4`.
- Публичный URL: `https://roman-purtow.ru/pdca-prp/` (project page под
  user-доменом `baslie.github.io` → `roman-purtow.ru`, отсюда base `/pdca-prp`).

**Разовая настройка** (выполнена при миграции на Astro): в репозитории
**Settings → Pages → Build and deployment → Source = «GitHub Actions»** (вместо
устаревшего «Deploy from a branch»). Иначе workflow собирает артефакт,
но Pages не публикует.

После push в `main` сборка идёт ~1–2 минуты, статус — на вкладке Actions.

## Индексация

На время разработки сайт закрыт от индексации:

- `<meta name="robots" content="noindex, ...">` в `BaseLayout.astro` (плюс
  отдельные `googlebot` и `yandex` теги).
- `public/robots.txt` с `Disallow: /` для всех ботов.

Перед публичным анонсом обе меры нужно снять — чек-лист в `CLAUDE.md`.

## Соглашения для контрибьютора

- Перед правкой текста — открыть `docs/TYPOGRAPHY.md`.
- Перед добавлением блока после hero — раздел «Стэкинг и fixed-слои hero»
  в `CLAUDE.md` (нужны `relative z-10` + непрозрачный фон, иначе fixed-слои
  героики проступают сквозь блок).
- Коммиты — в стиле уже имеющихся в репозитории (`git log -5 --oneline`):
  префикс типа (`feat:`/`fix:`/`style:`/`refactor:`/`docs:`/`ci:`/`chore:`),
  затем суть на русском (можно с английским lead'ом в первой строке).
- Не использовать `--no-verify`, `--amend`, `git reset --hard`, force-push без
  явной необходимости.
