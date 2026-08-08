# Стек, сборка и деплой — PDCA / ПРП

Этот документ — единственный источник правды по инфраструктуре: стек,
дизайн-токены и палитра, `overrides` в package.json, деплой и dev-сервер.
Открыть ПЕРЕД правкой конфигов, зависимостей или токенов. Доменные токены
описаны в профильных документах: цвета текста — [TYPOGRAPHY.md, §3](TYPOGRAPHY.md#3-цветовая-палитра-текста),
токены отступов — [SPACING.md, §2](SPACING.md#2-шкала), токены длительностей —
[MOTION.md](MOTION.md).

## Стек

| Слой | Технология | Где править |
|---|---|---|
| Фреймворк | Astro 7 (static output, Rust-компилятор, Vite 8) | `astro.config.mjs` |
| Стили | Tailwind v4 через `@tailwindcss/vite` Vite-плагин | `src/styles/global.css` |
| Дизайн-токены | CSS-переменные namespace (`--color-*`, `--font-*`, `--text-*`, `--tracking-*`, `--container-*`) | блок `@theme { ... }` в `src/styles/global.css` |
| Логика | TypeScript (strict) | `src/scripts/*.ts`, подключаются `<script>` в компонентах |
| Иконки | `astro-icon` + `@iconify-json/lucide` (build-time inline SVG) | `<Icon name="lucide:..." />` в .astro |
| Анимация | `gsap` + `gsap/ScrollTrigger` из npm | `src/scripts/prp-diagram-scroll.ts` |
| Шрифты | Inter + Yuji Mai через Google Fonts CDN (`<link>` в BaseLayout) | `src/layouts/BaseLayout.astro` |
| Видео | BoomStream `<iframe>` без SDK | `src/components/BoomStreamPlayer.astro` |
| CI/CD | GitHub Actions: `withastro/action@v3` + `actions/deploy-pages@v4` | `.github/workflows/deploy.yml` |

## Дизайн-токены — где править

Вся палитра, шрифт `font-sans`, кастомные `text-eyebrow/meta/hint`,
`tracking-display/heading/label`, `max-w-prose/prose-narrow` живут в
`src/styles/global.css` внутри блока `@theme { ... }`. Источник правды один.

## Палитра: два фирменных цвета + нейтрали

| Токен | Значение | Роль |
|---|---|---|
| `--color-brand-red` | `#e84249` (Pantone Red 032 C) | акценты в заголовках, кнопки в покое, стрелки диаграммы ПРП, плашка логотипа, иероглифы 改善 |
| `--color-brand-blue` | `#003154` (Pantone 648 C) | фон «О тренере», октагоны ПРП, ховер кнопок и карточек, дуотон горы в hero |
| `--color-bg` / `panel` / `surface` / `border` / `muted` / `ink` / `ink-dark` | `#FFFFFF` … `#0C0C0C` | нейтрали: фоны, линии, три уровня текста |

**Красный и синий на сайте только эти два — плюс их производные.** Оттенок
получают из токена, а не новым хексом: `color-mix(in srgb, var(--color-brand-blue) 65%, var(--color-ink-dark))`
(`.steel-overlay`), `color-mix(… 75%, transparent)` (`.certificate-doc__hint`),
`rgb(from var(--color-brand-blue) calc(255 - r) …)` (`.t-blend-brand`).

Цветные inline-SVG (орнамент и стрелки ПРП, плашка логотипа) рисуются через
`fill="currentColor"` / `stroke="currentColor"`, а цвет им даёт CSS-класс
(`.prp-arrows`, `.prp-ornament`, `.logo-prp`). `var()` в presentation-атрибутах
SVG не работает — только `currentColor` либо правило в CSS.

Единственное вынужденное исключение — `tableValues` у `feComponentTransfer`
в `Hero.astro` (дуотон горы): SVG-фильтр принимает только числа, каналы
`#003154` записаны как `0 / 0.192 / 0.329`. Меняешь `--color-brand-blue` —
пересчитай и их.

## `overrides` в package.json — не удалять

```jsonc
"overrides": {
  "sharp": "^0.35.3",           // @playform/compress пинит уязвимый 0.34.5
  "svgo": "^4.0.2",             // он же пинит уязвимый 4.0.1
  "@iconify/tools": { "svgo": "^3.3.4" }  // тут нужна ветка 3.x, svgo 4 её сломает
}
```

`@playform/compress` объявляет `sharp` и `svgo` **точными** версиями, поэтому
`npm audit fix` их не поднимает, а `npm audit fix --force` вместо этого
откатывает сам compress до 0.2.0. Единственный рабочий вариант — overrides.
Вложенный override для `@iconify/tools` обязателен: у него svgo ветки 3.x с
несовместимым API, глобальный `^4.0.2` сломал бы сборку иконок.

При апгрейде `@playform/compress` проверить, не подтянул ли он безопасные версии
сам (`npm view @playform/compress dependencies`) — тогда overrides можно убрать.

## Деплой

Прод-сайт публикуется на GitHub Pages автоматически через GitHub Actions.

- Репозиторий: `github.com/baslie/pdca-prp`, ветка `main`.
- Workflow: `.github/workflows/deploy.yml` — `withastro/action@v3` (npm ci + npm run build, upload `dist/` как Pages artifact) → `actions/deploy-pages@v4`.
- Публичный URL: `https://roman-purtow.ru/pdca-prp/` (project page под user-доменом `baslie.github.io` → `roman-purtow.ru`).
- `astro.config.mjs` фиксирует `site: 'https://roman-purtow.ru'` + `base: '/pdca-prp'` — все ссылки/ассеты автоматически с правильным префиксом.
- Триггер — каждый push в `main` или ручной запуск из вкладки Actions. После push сборка идёт ~1–2 минуты, статус — на вкладке Actions.
- **Сайт пока закрыт от индексации**: `public/robots.txt` (`Disallow: /`) +
  `<meta name="robots" content="noindex,...">` в `BaseLayout.astro`. Это не баг —
  не «чинить»; чек-лист снятия перед публичным анонсом — в [BACKLOG.md](BACKLOG.md).

### Разовая настройка репозитория

В GitHub → **Settings → Pages → Build and deployment → Source = «GitHub Actions»** (вместо «Deploy from a branch»). Если стоит «from a branch», workflow собирает артефакт, но Pages его не публикует.

## Dev-сервер

```powershell
npm run dev
```

Astro поднимает встроенный dev-сервер с HMR на `http://localhost:4321/pdca-prp/`
(порт по умолчанию — 4321; `base: '/pdca-prp'` обязателен в URL — Astro учитывает
базу). Tailwind собирается на лету через Vite-плагин, TypeScript-скрипты
в `src/scripts/` бандлятся и type-check'аются.

Сервер запускает пользователь, не AI-агент. Если по задаче нужно убедиться,
что сервер уже работает — проверка через:

```powershell
Get-NetTCPConnection -LocalPort 4321 -State Listen -ErrorAction SilentlyContinue
```

Альтернативные серверы (Python `http.server`, vanilla `vite`, `serve` и пр.)
не использовать — Astro дев-сервер сам всё умеет.

### Кэш браузера

После значительных правок CSS/токенов или смены ассетов на хэшированные URL —
рекомендуй пользователю Ctrl+F5.

## Анти-паттерны

- `theme('colors.X')` в CSS — **v3-синтаксис, удалён в v4**. Используй `var(--color-X)`.
- Новый хекс красного или синего где угодно, кроме блока `@theme` — оттенок берётся из `--color-brand-red/-blue` через `color-mix()`.
- Возврат CDN `cdn.tailwindcss.com` — нельзя, прод-warning в DevTools.
- Правка `dist/_astro/*.css` напрямую — бесполезно, перезатрётся следующим `astro build`. Меняй `src/styles/global.css`.
- Хардкод путей `/pdca-prp/...` в `<img src=...>` — используй ES-импорт ассета (`import x from '../assets/...'`) или `import.meta.env.BASE_URL`. base может смениться.
- Незакрытые теги в `.astro`. Astro 7 собирает Rust-компилятором: он требует
  закрывающий тег у **каждого** невоидного элемента и больше не «чинит»
  невалидный HTML молча — падает на этапе сборки.
- Расчёт на HTML-правила пробелов между тегами. В Astro 7 `compressHTML`
  по умолчанию `'jsx'`: пробелы с переносом строки между элементами
  вырезаются. Нужен именно пробел в вёрстке — ставь `&nbsp;` или `{' '}`.
