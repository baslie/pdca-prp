# Инструкции для AI-агента — проект PDCA / ПРП

## Типографика

**Источник правды — [`docs/TYPOGRAPHY.md`](docs/TYPOGRAPHY.md).** Открыть и
прочитать ПЕРЕД любой правкой текста, заголовков, подписей или стилей.

Коротко: 8 ролей текста (`.t-display`, `.t-h-section` (+`--compact`), `.t-h-sub`,
`.t-lead`, `.t-body`, `.t-body-sm`, `.t-quote`, плюс микротексты `.t-eyebrow`,
`.t-meta`, `.t-hint`), 7 цветов (`.t-on-strong/default/muted/soft` для светлого
фона + `.t-on-dark/-muted/-soft` для тёмного), 4 веса (400/500/600/900),
3 значения tracking. Канонический шрифт — Inter (Google Fonts).

**Запрещено:**
- ad-hoc размеры в HTML (`text-[15px]`, `text-[11px]` — кроме одного задокументированного
  плакатного исключения для `.feature-card__label`);
- произвольные opacity на тексте (`text-wire-text/85`, `text-white/70`);
- веса `font-bold` / `font-extrabold`;
- произвольный tracking (`tracking-[-0.025em]`);
- старые имена `.caption-label`, `.h-section`, `.modal-h2` (удалены).

Для проверки прогони grep'ы из раздела «Анти-паттерны» в TYPOGRAPHY.md — все
должны вернуть 0 совпадений (кроме указанного исключения).

## Стэкинг и fixed-слои hero

В hero-секции (первый экран) живут два **fixed**-элемента, которые рисуются
относительно viewport и продолжают «висеть» при скролле вниз:

- `aside#denis-fixed` — фото Дениса справа (`fixed top-0 right-0 h-screen`), `md+` только;
- `img#mountain-fixed` — гора в левом нижнем углу (`md:fixed bottom-0 left-0`).

У обоих **намеренно нет `z-index`** — слои выстраиваются по DOM-order, чтобы
`mix-blend-difference` на героике могла смешиваться с горой и Денисом
(blend работает только внутри одного stacking context — у `body`).

### Правило: всё, что идёт после hero — `relative z-10` + непрозрачный фон

Чтобы fixed-слои не «проступали» сквозь следующие блоки, каждая секция/блок
ниже hero обязан создать собственный stacking context, который их перекроет.
Шаблон такой:

```html
<section class="relative z-10 bg-wire-bg ...">
  ...
</section>
```

Так уже сделаны все основные секции: `#about-training` (`bg-wire-panel`),
`#video` (`bg-black`), `#examples` (`bg-wire-bg`), `#offer-stats`
(фон-картинка + overlay), плюс концевой воздушный `<div>` после offer-stats.

### Чек-лист при добавлении нового блока после hero

1. На корневом элементе блока — `relative z-10`.
2. **Непрозрачный** `bg-*` (не `bg-*/NN`, не прозрачный градиент без подложки).
   Прозрачный/полупрозрачный фон = fixed-Денис и гора снова видны.
3. Если блок — это просто воздух/разделитель, всё равно нужны `z-10` + `bg-*`,
   иначе сквозь него «выстреливают» fixed-слои (этот баг уже ловили).
4. Иконки/декор внутри блока с `position: absolute` относительно self —
   нормально, они в stacking context секции.

### Анти-паттерны

- `<div class="h-12">` без `z-10` и фона после offer-stats / любой секции.
- Снятие `z-10` с секции «для экономии» — fixed-слои сразу проступают.
- Назначение `z-index` Денису/горе — ломает `mix-blend-difference` в hero.

## Деплой

Прод-сайт публикуется на GitHub Pages автоматически через GitHub Actions.

- Репозиторий: `github.com/baslie/pdca-prp`, ветка `main`.
- Workflow: `.github/workflows/deploy.yml` — `withastro/action@v3` (npm ci + npm run build, upload `dist/` как Pages artifact) → `actions/deploy-pages@v4`.
- Публичный URL: `https://roman-purtow.ru/pdca-prp/` (project page под user-доменом `baslie.github.io` → `roman-purtow.ru`).
- `astro.config.mjs` фиксирует `site: 'https://roman-purtow.ru'` + `base: '/pdca-prp'` — все ссылки/ассеты автоматически с правильным префиксом.
- Триггер — каждый push в `main` или ручной запуск из вкладки Actions.
- На время разработки сайт закрыт от индексации: `public/robots.txt` (`Disallow: /`) + `<meta name="robots" content="noindex,...">` в `BaseLayout.astro`. Перед публичным анонсом — снять оба.

### Разовая настройка репозитория

В GitHub → **Settings → Pages → Build and deployment → Source = «GitHub Actions»** (вместо «Deploy from a branch»). Если стоит «from a branch», workflow собирает артефакт, но Pages его не публикует.

### Чек-лист перед публичным анонсом

1. Снять `noindex` из `<meta name="robots">`, `googlebot`, `yandex` в `src/layouts/BaseLayout.astro`.
2. В `public/robots.txt` заменить `Disallow: /` на `Allow: /` (или удалить файл).
3. Сверить, что canonical (`new URL(base, Astro.site)` в `BaseLayout.astro`) даёт актуальный URL.
4. По возможности — сгенерировать настоящий 1200×630 OG-баннер, заменить `public/og-image.png` (сейчас это копия `denis-bulgin.png`).
5. Опубликовать `sitemap.xml` (опционально — JSON-LD Course уже даёт схему). Astro умеет через интеграцию `@astrojs/sitemap`.

## Стек и сборка

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

### Команды

```powershell
npm install         # первый запуск / после правок package.json
npm run dev         # dev-сервер с HMR -> http://localhost:4321/pdca-prp/
npm run build       # прод-сборка в dist/
npm run preview     # отдать dist/ как настоящий статик
npm run check       # astro check (TypeScript + Astro диагностика)
```

### Дизайн-токены — где править

Все цвета `wire-*`, шрифт `font-sans`, кастомные `text-eyebrow/meta/hint`,
`tracking-display/heading/label`, `max-w-prose/prose-narrow` живут в
`src/styles/global.css` внутри блока `@theme { ... }`. Источник правды один.

### `overrides` в package.json — не удалять

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

### Антипаттерны

- `theme('colors.wire.X')` в CSS — **v3-синтаксис, удалён в v4**. Используй `var(--color-wire-X)`.
- Возврат CDN `cdn.tailwindcss.com` — нельзя, прод-warning в DevTools.
- Правка `dist/_astro/*.css` напрямую — бесполезно, перезатрётся следующим `astro build`. Меняй `src/styles/global.css`.
- Хардкод путей `/pdca-prp/...` в `<img src=...>` — используй ES-импорт ассета (`import x from '../assets/...'`) или `import.meta.env.BASE_URL`. base может смениться.
- Незакрытые теги в `.astro`. Astro 7 собирает Rust-компилятором: он требует
  закрывающий тег у **каждого** невоидного элемента и больше не «чинит»
  невалидный HTML молча — падает на этапе сборки.
- Расчёт на HTML-правила пробелов между тегами. В Astro 7 `compressHTML`
  по умолчанию `'jsx'`: пробелы с переносом строки между элементами
  вырезаются. Нужен именно пробел в вёрстке — ставь `&nbsp;` или `{' '}`.

## Локальный dev-сервер

### Запуск

```powershell
npm run dev
```

Astro поднимает встроенный dev-сервер с HMR на `http://localhost:4321/pdca-prp/`
(порт по умолчанию — 4321; `base: '/pdca-prp'` обязателен в URL — Astro учитывает базу). Tailwind собирается на лету через Vite-плагин, TypeScript-скрипты в `src/scripts/` бандлятся и type-check'аются.

### Правила для AI-агента

1. **Сервер запускает пользователь, не Claude.** При обычной работе Claude вообще не трогает `npm run dev` — его инициирует человек, когда хочет визуально проверить вёрстку. Если по задаче нужно убедиться, что сервер уже работает — проверка через:
   ```powershell
   Get-NetTCPConnection -LocalPort 4321 -State Listen -ErrorAction SilentlyContinue
   ```

2. **Для проверки сборки используй `npm run build`** (быстро, ~1.5 сек) и при необходимости `npm run preview`. `npm run check` — для type-чек'а Astro/TS без рендера.

3. **Никаких альтернатив** — Python `http.server`, vanilla `vite`, `serve` и пр. не использовать. Astro дев-сервер сам всё умеет.

### Кэш браузера

После значительных правок CSS/токенов или смены ассетов на хэшированные URL — рекомендуй пользователю Ctrl+F5.

## Видео BoomStream

На сайте используется видеохостинг **BoomStream** (`play.boomstream.com`). Текущее видео — `nm7YeR0q` (Учебный курс «Профессиональное Решение Проблем», ~30 мин).

### Текущий embed

В `src/components/BoomStreamPlayer.astro` встроен **прямым `<iframe>`** по официальной рекомендации BoomStream: https://boomstream.ru/documentation/developers/adaptive-style. Без SDK biframesdk.js — адаптивность даёт CSS-контейнер. Внешний компонент `<Video />` (`src/components/Video.astro`) использует его как `<BoomStreamPlayer code="nm7YeR0q" />`.

```html
<div class="relative w-full aspect-video bg-wire-panel overflow-hidden rounded-sm ...">
  <iframe class="absolute inset-0 w-full h-full"
          src="https://play.boomstream.com/nm7YeR0q?color=false&amp;title=0"
          frameborder="0"
          scrolling="no"
          allow="autoplay; fullscreen"
          loading="lazy"
          title="Учебный курс «Профессиональное Решение Проблем»"></iframe>
</div>
```

Ключевые моменты:
- **`aspect-video` (16:9)** — современный эквивалент CSS-хака `padding-bottom: 56.25%` из документации BoomStream. Резервирует место под плеер до его загрузки, CLS отсутствует.
- **Параметры плеера** (`color=false&title=0`) передаются в query-string `src` — без отдельного `config.jsonp`.
- **`allow="autoplay; fullscreen"`** — обязательно для muted-autoplay (Autoplay Policy браузеров) и для перехода в fullscreen. Поддерживается во всех браузерах с 2020 г.
- **БЕЗ устаревшего `allowfullscreen`** — атрибут-дубликат `allow`'а вызывал DevTools warning «Allow attribute will take precedence over 'allowfullscreen'». Удалён в пользу единственного современного `allow="...fullscreen"`.
- **`loading="lazy"`** — iframe (и связанные ~150 KB JS+медиа) грузятся, когда пользователь доскроллит до видео.
- **Без `biframesdk.js`** и без `config.jsonp` — минус 2 HTTP-запроса и минус JS-зависимость.

### Управление плеером через postMessage API

Документация: https://api.boomstream.com/player-api (англ.), https://boomstream.ru/documentation/api/player-api (рус.).

- **Events от плеера**: `loaded`, `play`, `pause`, `stop`, `time`, `progress`, `fullScreen`, `event`. Ловятся через `window.addEventListener('message', …)`. Origin: `https://play.boomstream.com`. В `event.data` поля: `method`, `code`, `time`, `duration`.
- **Actions в плеер**: `play`, `pause`, `seek`, `mute`, `unmute`, `volume`, `useLastTime`, `previous`, `next`, `fullScreen`, `toggleFullScreenButtonState`. Отправляются через `frame.contentWindow.postMessage({ code: '<CODE>', method: 'action', action: '<ACTION>', data: '' }, 'https://play.boomstream.com')`.
- **iframe должен содержать** `allow="autoplay; fullscreen"` — в текущей разметке прописано вручную (см. блок «Текущий embed» выше).

### Watchdog: fallback при недоступности видеохостинга

У посетителей с VPN запрос к `play.boomstream.com` может «висеть» — iframe остаётся пустым, а поймать провал штатно нельзя (`load` у cross-origin iframe срабатывает даже на странице ошибки, `error` не срабатывает вовсе). Решение — `src/scripts/boomstream-watchdog.ts` (подключён в `BoomStreamPlayer.astro`):

- Сигнал успеха — **любой** postMessage плеера с нашим `code` (не только `loaded`).
- Когда обёртка `[data-bs-player]` приближается к вьюпорту (IntersectionObserver, rootMargin 200px), взводится таймер 5 с. Не пришло ни одного сообщения — поверх панели показывается оверлей `[data-bs-overlay]` («Видео не загрузилось… отключите VPN») с кнопкой `[data-bs-retry]` («Попробовать снова» = переустановка `src` + новый таймер). Позднее сообщение плеера снимает оверлей автоматически — поэтому короткий таймаут безопасен и для честно-медленных сетей.
- Кнопка — класс `.btn-video-retry` в `global.css` (палитра `.btn-primary`, габариты `.btn-modal-back`).

По той же причине `src/scripts/prp-diagram-scroll.ts` **не ждёт `window.load`** — init вызывается сразу (зависший iframe откладывал бы load бесконечно, и блок `#prp-steps` навсегда оставался бы в pre-state opacity 0.15). Пересчёт позиций после догрузки шрифтов обеспечивают `document.fonts.ready` + autoRefreshEvents самого ScrollTrigger. **Не возвращать ожидание load.**

### Muted-autoplay — как включить

Документация прямо говорит: *«muted required when auto-starting on load»* — автоплей со звуком блокируют сами браузеры (Autoplay Policy), это не ограничение BoomStream. Корректный паттерн — стартовать без звука, пользователь сам включает.

Встроен в `BoomStreamPlayer.astro` — включается флагом `autoplay`: `<BoomStreamPlayer code="..." autoplay />`. Готовый сниппет (для справки — он уже внутри компонента под `{autoplay && (<script>...)}`):

```html
<script>
  (function () {
    var MEDIA_CODE = 'nm7YeR0q';
    var BS_ORIGIN  = 'https://play.boomstream.com';
    var started    = false;

    function sendAction(action, data) {
      var frame = document.querySelector('iframe[src*="' + MEDIA_CODE + '"]');
      if (!frame || !frame.contentWindow) return;
      frame.contentWindow.postMessage(
        { code: MEDIA_CODE, method: 'action', action: action, data: data || '' },
        BS_ORIGIN
      );
    }

    window.addEventListener('message', function (e) {
      if (e.origin !== BS_ORIGIN) return;
      var d = e.data;
      if (!d || d.code !== MEDIA_CODE) return;
      if (d.method === 'loaded' && !started) {
        started = true;
        sendAction('mute');
        sendAction('play');
      }
    }, false);
  })();
</script>
```

Флаг `started` гарантирует одноразовое вмешательство — дальше пользователь сам управляет (unmute, pause, seek и т. д.).

### Edge-cases muted-autoplay

- iOS в режиме Low Power Mode — autoplay блокируется системно, даже muted.
- Firefox — может блокировать по доменной политике пользователя.
- Скрытая вкладка / `prefers-reduced-motion` — не влияет, но autoplay в фоне браузеры приостанавливают.

В этих случаях плеер просто покажет постер с кнопкой play — деградация мягкая.
