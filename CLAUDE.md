# Инструкции для AI-агента — проект PDCA / ПРП

## Бэклог проекта

Если пользователь спрашивает «что нам осталось сделать», «что в планах»,
«какие задачи остались» — открыть раздел **«Что осталось сделать»** в
[`README.md`](README.md) и пересказать оттуда. Это единственный источник правды
по незакрытым задачам; после выполнения пункта — вычеркнуть его там же.

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
- произвольные opacity на тексте (`text-ink/85`, `text-white/70`);
- веса `font-bold` / `font-extrabold`;
- произвольный tracking (`tracking-[-0.025em]`);
- старые имена `.caption-label`, `.h-section`, `.modal-h2` (удалены).

Для проверки прогони grep'ы из раздела «Анти-паттерны» в TYPOGRAPHY.md — все
должны вернуть 0 совпадений (кроме указанного исключения).

## Микротипографика

Неразрывные пробелы, тире, кавычки и многоточия **расставляются автоматически
на сборке**. Руками их писать больше не нужно.

Инструмент — [`astro-typograf`](https://github.com/mishamyrt/astro-typograf)
(обёртка над npm-пакетом `typograf`). Он работает на хуке `astro:build:done`:
парсит готовый HTML в `dist/` через cheerio и типографирует содержимое
элементов, попавших в CSS-селектор.

**Единственный источник правды — [`astro-typograf.config.mjs`](astro-typograf.config.mjs)**
в корне. Там живут селектор, список отключённых правил и обоснование каждого.
Файл импортируется и в `astro.config.mjs`, и в скрипт аудита.

### Главное, что нужно помнить

1. **В `npm run dev` типографики НЕТ.** Плагин работает только на сборке.
   Смотреть результат — `npm run build && npm run preview`. Прод и GitHub
   Pages получают её автоматически: деплой гоняет `npm run build`.
2. **Исходники `.astro` остаются чистыми.** Никаких невидимых символов
   в репозитории — это осознанное решение. Правки живут только в `dist/`.
3. **Ранее проставленные `&nbsp;` (их 134) не трогаются.** Правило
   `common/nbsp/replaceNbsp` выключено. Часть из них несёт функцию **обычного**
   пробела (из-за `compressHTML: 'jsx'`, см. раздел «Антипаттерны» ниже) —
   удалять их нельзя.

### Что отключено и почему

Принцип отбора: включено всё, что меняет **пробелы и знаки**; отключено всё,
что меняет **слова и авторскую пунктуацию**. Тексты отзывов и расшифровок
видеоотзывов хранятся дословно — редактировать их сборкой недопустимо.

| Правило | Почему выключено |
|---|---|
| `ru/punctuation/ano` | само расставляет запятые перед «а» и «но» |
| `ru/punctuation/exclamation` | `!!` → `!` — срезало бы «…пять лет в институте!!!» |
| `ru/punctuation/exclamationQuestion` | `!?` → `?!` |
| `common/punctuation/delDoublePunctuation` | правит авторскую пунктуацию |
| `ru/typo/switchingKeyboardLayout` | латиница → кириллица: побило бы PDCA, Kawasaki, BoomStream |
| `ru/number/ordinals` | «25-ый» → «25-й» — меняет буквы в словах |
| `ru/other/phone-number` | телефон в `Hero.astro` свёрстан вручную |
| `ru/number/comma` | «Astro 7.1» → «7,1» |
| `ru/date/fromISO`, `ru/date/weekday` | переформатируют даты |
| `common/space/trimLeft`, `trimRight` | обрезка краёв innerHTML склеила бы инлайн-элементы |

### Куда плагин НЕ дотягивается

Он обрабатывает **содержимое элементов** в собранном HTML. Мимо проходят:

- **`data-*` атрибуты**, из которых JS достаёт видимый текст. Решается
  функцией `typografAttr()` из того же конфига — она типографирует строку
  на этапе сборки. Уже применена к `data-name/role/city` в `Reviews.astro`
  и `data-name/meta` в `VideoReviews.astro`. В атрибут она кладёт **сырой
  U+00A0**, а не `&nbsp;`: Astro экранирует значения атрибутов, и сущность
  превратилась бы в видимое `&amp;nbsp;`.
- **Строки, которые JS собирает в рантайме.** Таких три, все помечены
  комментарием в коде и используют escape `\u00A0`:
  `examples.ts` (счётчик «6 реальных проектов»), `gallery.ts` (счётчик
  лайтбокса «12 / 93»), `reviews.ts` (разделитель « · » в подписи модалки).

### Проверка покрытия

```powershell
npm run build
node scripts/audit-typography.mjs
```

Скрипт обходит текстовые узлы `dist/index.html` и печатает всё, до чего
селектор не дотянулся. Должен возвращать «Весь видимый текст покрыт».

**Гонять после добавления любого нового текстового блока.** Если ругается —
решений два: навесить на элемент роль `.t-*` из `docs/TYPOGRAPHY.md`
(предпочтительно) либо дописать класс в `TYPOGRAF_SELECTOR`.

### Анти-паттерны

- Ручная расстановка `&nbsp;` в новом тексте — плагин сделает это сам.
- Голые `a` и `button` в селекторе: в ссылках `Hero.astro` живут e-mail
  и телефон, их типографировать нельзя. Кнопки перечислены классами `.btn-*`.
- Включение `common/html/e-mail` или `common/html/url` — они оборачивают
  текст в `<a>`, а адреса на сайте уже размечены ссылками вручную.
- Включение `ru/optalign/*` (висячая пунктуация) — требует отдельного CSS,
  без него ломает выключку.
- Текстовый элемент без роли `.t-*` и без класса в селекторе — выпадет
  из системы молча. Ловится скриптом аудита.

## Движение и анимация

Моушн на сайте — **одна система с одним словарём**, а не набор эффектов.
Пять приёмов, и у каждого ровно одна зона ответственности:

| Приём | Инструмент | Где живёт |
|---|---|---|
| Scrub, привязанный к скроллу покадрово | GSAP + ScrollTrigger | **только** диаграмма ПРП (`src/scripts/prp-diagram-scroll.ts`) |
| Однократное появление при скролле | IntersectionObserver + CSS-transition | `src/scripts/reveal.ts` + `[data-reveal]` в разметке |
| Числовая интерполяция | GSAP core | **только** 4 цифры `#offer-stats` (`src/scripts/stats-counter.ts`) |
| Ховер / фокус / состояние | CSS-transition | `global.css` |
| Бесконечное движение | CSS `@keyframes` | конвейеры отзывов, спиннер галереи |

**Первый экран статичен.** В `Hero.astro` и `DenisFixed.astro` анимации нет и
быть не должно — решение заказчика: первый экран грузится быстро и лаконично.
`data-reveal` туда не ставится.

### Токены — единственный источник значений

Одна кривая `--ease-brand: cubic-bezier(0.23, 1, 0.32, 1)` (в `@theme`, даёт и
`var()`, и утилиту `ease-brand`) и четыре длительности в `:root` внутри
`@layer base`:

| Токен | Значение | Роль |
|---|---|---|
| `--dur-micro` | 150ms | подсказка к термину, крестики, строки списков |
| `--dur-hover` | 200ms | базовый ховер-фидбек — самая частая роль |
| `--dur-zoom` | 300ms | зум изображений (галерея, превью видео) |
| `--dur-reveal` | 500ms | появление блока при скролле |

Плюс `--reveal-stagger: 60ms`, `--reveal-shift: 14px` и модальные
`--modal-dur-in/out` (500/350 — вход и выход разведены осознанно).

### Scroll-reveal: разметочный контракт

```html
<div data-reveal>…</div>                        <!-- одиночный блок -->
<div data-reveal="group">                       <!-- контейнер со стаггером -->
  <article style={`--reveal-i:${i}`}>…</article>
</div>
```

Скрипт ставит `data-revealed`, анимацию делает CSS. Пре-стейт (`opacity: 0`)
приезжает по классу `.js-reveal`, который ставит синхронный inline-скрипт в
`<head>` `BaseLayout.astro` вместе со страховочным таймером на 2.5 с — если
чанк не доедет, контент всё равно покажется.

**Куда `data-reveal` ставить нельзя:**

1. **На корень `<section>`.** `opacity < 1` создаёт stacking context, и сквозь
   секцию проступают fixed-слои hero (см. раздел «Стэкинг» ниже). Только на
   внутренние обёртки.
2. **На элементы, которыми уже владеет GSAP** — октагоны, стрелки и орнамент
   `#prp-steps`. Один элемент = один приём.
3. **На массовые списки** — 34 логотипа, 41 отзыв в конвейере, 93 фото
   галереи, 16 тренингов. У них либо свой моушн (marquee, hover-zoom), либо их
   слишком много: страница начнёт мерцать.
4. **Внутрь обрамлённых контейнеров как `="group"`.** Если рамку рисует
   контейнер (`border-y` у списка категорий, `border-x border-t` у таблицы
   регалий), стаггер сдвигает содержимое внутри неподвижной рамки. Такие блоки
   появляются одним `data-reveal`.

### Анти-паттерны

- `transition: all` / `transition-all` — перечисляй свойства поимённо.
- `transition-colors` / `transition-opacity` без `duration-*` — молча получает
  Tailwind-дефолт 150 мс и выпадает из системы. Всегда `duration-N ease-brand`.
- Хардкод `0.2s ease`, `0.25s ease`, `cubic-bezier(...)` в правилах — только токены.
- Анимация `padding` / `margin` / `width` / `height` / `top` / `left` — это
  пересчёт раскладки каждый кадр. Только `transform` и `opacity`.
- `:hover` с движением без `@media (hover: hover)` — тач фабрикует ложный
  ховер при тапе, и элемент залипает в наведённом состоянии.
- Новый приём появления «для разнообразия» (blur-in, split-текст, parallax,
  магнитные кнопки) — это шестой диалект вместо системы.

Контрольные grep'ы (все должны вернуть 0, кроме попаданий в комментарии):

```bash
grep -rn "transition-all" src/
grep -rnE "transition-(colors|opacity)([^-a-z]|$)" src/ | grep -vE "duration-[0-9]+"
grep -rnE "[0-9]+(\.[0-9]+)?s ease" src/
```

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
<section class="relative z-10 bg-bg ...">
  ...
</section>
```

Так уже сделаны все основные секции: `#about-training` (`bg-panel`),
`#video` (`bg-black`), `#examples` (`bg-bg`), `#offer-stats`
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

Вся палитра, шрифт `font-sans`, кастомные `text-eyebrow/meta/hint`,
`tracking-display/heading/label`, `max-w-prose/prose-narrow` живут в
`src/styles/global.css` внутри блока `@theme { ... }`. Источник правды один.

### Палитра: два фирменных цвета + нейтрали

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

**`wire-*` — это палитра прототипов из `wireframes/*.html`** (Tailwind-CDN
конфиг внутри каждого файла). С боевым сайтом она не связана: правки токенов
в `global.css` туда не доезжают и наоборот. Не смешивать.

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

## Галерея «Фотографии с тренингов»

Блок `#training-photos` (`src/components/TrainingPhotos.astro`) — masonry-лента из 93 кадров во всю ширину экрана + лайтбокс `#modal-gallery` (`ModalGallery.astro` + `src/scripts/gallery.ts`, поверх общего `setupModal`).

Кадры сняты на **разных** программах Дениса, не только на ПРП. Заголовок, надзаголовок и alt-тексты обязаны оставаться нейтральными к теме конкретного тренинга — не привязывать блок к «Профессиональному решению проблем».

### Два комплекта ассетов

| Папка | Формат | Кто обрабатывает | Куда идёт |
|---|---|---|---|
| `src/assets/images/trainings/preview/` | `.jpg`, 800px | `<Image />` → webp 320/480/800 | сетка, `loading="lazy"` |
| `src/assets/images/trainings/full/` | `.webp`, ≤1920px | никто, отдаётся как есть | лайтбокс, грузится только по клику |

Имена файлов в обеих папках совпадают до расширения (`denis-bulgin-trening-NNN`) — компонент сопоставляет пары именно по ним и падает на сборке, если пара не найдена.

### `getImage()` на этих кадрах — не использовать

Astro эмитит в `dist/` **исходник** каждого импортированного изображения, и для картинок, прогоняемых через `getImage()` (а не через `<Image />`), лишний оригинал из сборки не вычищается. На 93 фотографиях это давало **35 МБ мёртвого груза** в `dist/` — ни одной ссылки в HTML.

Поэтому кадры ужимаются заранее, один раз:

```powershell
# 1. Положить исходники .jpg в src/assets/images/trainings/full/
#    и превью с ТЕМИ ЖЕ именами — в .../preview/
node scripts/prepare-training-photos.mjs
```

Скрипт переименовывает исходники в `denis-bulgin-trening-NNN.webp`, ужимает до 1920px по длинной стороне (`withoutEnlargement` — мелкие кадры не растягиваются) и удаляет `.jpg`. Превью он не трогает: их всё равно перекодирует `<Image />`, а webp → webp — лишний цикл потерь.

### `Exclude` в `astro.config.mjs` — не удалять

```js
Exclude: [(File) => File.includes('denis-bulgin-trening-')],
```

Кадры галереи уже ужаты (`full` — скриптом, превью — самим Astro). Повторный проход `@playform/compress` с `webp: { effort: 6 }` по 372 файлам растягивал сборку с 11 с до 76 с и не давал выигрыша в весе.

### Свёртка ленты — клип, а не `display: none`

`.gallery-masonry[data-collapsed]` режет ленту по `max-height: 150vh`. Скрывать «лишние» кадры через `display: none` нельзя: в колоночной раскладке раскрытие переливает элементы между колонками, и уже просмотренные фото прыгают на другие места.

Атрибут `data-collapsed` ставит **синхронный** `is:inline`-скрипт внутри компонента, а не разметка. Без JS кнопка «Показать ещё» не заработает — и клип оставил бы 60+ кадров недостижимыми.

### Колонки и `sizes` держать в синхроне

Брейкпоинты `column-count` в `global.css` (2 / 3 / 4 / 5 / 6 на 0 / 30 / 40 / 64 / 96rem) и атрибут `sizes` у `<Image>` в `TrainingPhotos.astro` описывают одно и то же. Меняешь одно — правь второе, иначе браузер выберет не тот размер из srcset.

## Лид-форма и реферальный хвост

Блок `#request` (`src/components/LeadForm.astro`) — целевое действие лендинга:
контакты слева, форма справа, поверх панорамы `mountains-summit.jpg` со стальным
оверлеем (тот же приём, что в `#offer-stats` и `#video`).

### Бэкенда нет — и это временно

Заявка **никуда не уходит**. Вся логика — фронтендовая: валидация, состояния,
антиспам, сбор payload. Отправку изображает заглушка:

```ts
// src/scripts/lead-form.ts
async function sendLead(payload: LeadPayload): Promise<void> { … }
```

**Это единственная точка подключения обработчика.** Сигнатуру менять не нужно:
форма уже ждёт промис и разводит успех и ошибку сети. Реджект = показ блока
«не получилось отправить».

### Поля и валидация

Обязателен **только телефон** (плюс чекбокс согласия) — решение заказчика,
минимальный барьер. Имя, e-mail и комментарий необязательны; e-mail проверяется,
только если заполнен.

Телефон — **мягкая валидация без маски**: минимум 10 цифр, ввод с `8`/`7` (11 цифр)
или `9` (10 цифр) приводится к `+7…` на `blur`. Жёсткий шаблон `+7 (___) ___-__-__`
отсёк бы `+375`, `+49` и остальные — тренинги идут в России, СНГ и Евросоюзе.

Форма помечена `novalidate`: браузерные сообщения не стилизуются и не всегда
выводятся по-русски. Ошибки показываются **только после первой попытки отправки**
(флаг `attempted`), дальше поле перепроверяется на `input`.

### Тексты ошибок живут в `data-*`

Сообщения приходят из `data-error-empty` / `data-error-invalid` на самих полях
и типографируются на сборке через `typografAttr()` — плагин Типографа до
атрибутов не дотягивается, а JS кладёт их в DOM уже в рантайме. Тот же приём,
что для `data-role` в `Reviews.astro`.

В `TYPOGRAF_SELECTOR` дописаны `.field__label`, `.lead-consent__text`
и `.lead-debug__summary`: текст на `<label>` и `<summary>` иначе выпал бы
из типографики молча. `.contact-row__link` туда **не** добавлен намеренно —
в нём телефон и e-mail, ровно та же причина, по которой из селектора исключены
голые `a`.

### Honeypot — за экраном, не `display: none`

Поле `company_site` уводится классом `.field__hp` (`left: -9999px`). Скрывать его
через `display: none` нельзя: часть ботов такие поля пропускает, а нам нужно
ровно обратное — чтобы бот его заполнил. Для человека и скринридера оно
недостижимо (`aria-hidden` + `tabindex="-1"`), подпись на латинице — чтобы
не попадать в аудит русской типографики.

Заполненный honeypot показывает боту **успех** и не вызывает `sendLead()`.

### Реферальный хвост

Задача — не потерять источник заявки: человек приходит по рекламной ссылке
с UTM-метками, ходит по страницам, и к моменту отправки формы метки из адресной
строки пропали.

| Что | Где |
|---|---|
| Захват сырья | синхронный `is:inline` в `<head>` `BaseLayout.astro` |
| Хранение | `sessionStorage`, ключ `pdca:ref` |
| Разбор и форматирование | `src/scripts/referral.ts` |
| Подстановка в форму | `src/scripts/lead-form.ts` → hidden-поля `referral` и `referral_json` |

**Захват — синхронный и в `<head>`** по той же причине, что и пре-стейт
`js-reveal` рядом: уйди посетитель по ссылке раньше, чем догрузится чанк, —
метки пропали бы навсегда.

**`sessionStorage`, не `localStorage`**: хвост привязан к сессии вкладки —
переживает переходы между страницами (их станет больше) и умирает вместе
с вкладкой. Хранить дольше не нужно.

**Правило перезаписи:** первый источник в сессии не перетирается. Исключение —
прежний хвост был «пустой» (без меток), а сейчас пришли: рекламный переход
внутри сессии ценнее, чем прямой заход до него.

`formatReferral()` собирает человекочитаемый текст для письма: словарь подписей
(`utm_source` → «Источник», `yclid` → «Яндекс.Директ (click id)»), расшифровка
`document.referrer` по хосту («Яндекс (поиск)», «Дзен», «ВКонтакте»), дата
первого визита. **Неизвестные GET-параметры не теряются** — выводятся под своим
техническим именем, после известных. Служебный `debug` из хвоста исключается.

### Как проверить парсинг меток

```
http://localhost:4321/pdca-prp/?utm_source=yandex&utm_medium=cpc&yclid=123&debug=referral
```

`?debug=referral` раскрывает панель `#lead-debug` под формой: разобранный хвост
текстом плюс сырой JSON. Панель существует только ради этой проверки — пока
заявки никуда не уходят, посмотреть на хвост больше негде.

### Антипаттерны

- Жёсткая маска телефона — отсечёт иностранные номера.
- `display: none` на honeypot — половина ботов такие поля игнорирует.
- `localStorage` для хвоста — источник переживёт сессию и приклеится к чужой заявке.
- Захват хвоста бандленным модулем вместо `is:inline` в `<head>` — гонка с уходом
  посетителя по ссылке.
- `font-size` полей ниже 16px — iOS Safari зумит страницу при фокусе и обратно
  не отъезжает. Формула `.field__control` начинается ровно с 1rem, это
  задокументированное исключение из шкалы.
- Новые тексты в атрибутах без `typografAttr()` — останутся без типографики.

## Видео BoomStream

На сайте используется видеохостинг **BoomStream** (`play.boomstream.com`). Текущее видео — `nm7YeR0q` (Учебный курс «Профессиональное Решение Проблем», ~30 мин).

### Как добавить новое видео

Механизм унифицирован: `BoomStreamPlayer.astro` — переиспользуемый компонент, весь фолбэк (watchdog, оверлей «Видео не загрузилось», кнопка «Попробовать снова») приезжает с ним автоматически. Новое видео — это только:

```astro
---
import BoomStreamPlayer from '../components/BoomStreamPlayer.astro';
---
<BoomStreamPlayer code="КОД_ВИДЕО" title="Название видео (accessibility + подпись iframe)" />
```

- `code` — последний сегмент URL плеера (`play.boomstream.com/XXXX`), берётся из кабинета BoomStream.
- **Ничего дополнительно подключать не нужно**: `boomstream-watchdog.ts` обслуживает все экземпляры `[data-bs-player]` на странице разом (один message-листенер, один IntersectionObserver; Astro хойстит скрипт один раз). Несколько плееров с разными `code` работают независимо, таймер у каждого свой.
- Секцию-обёртку делает вызывающий — по правилам стэкинга (`relative z-10` + непрозрачный фон); образец — `src/components/Video.astro`.
- Опциональный флаг `autoplay` — muted-автостарт (см. «Muted-autoplay» ниже). Нюанс: его inline-скрипт ищет iframe по `src`, поэтому два плеера с **одинаковым** `code` и `autoplay` на одной странице не поддерживаются (случай гипотетический).
- Aspect ratio фиксирован 16:9 (`aspect-video`); для вертикальных видео компонент потребует доработки.

### Текущий embed

В `src/components/BoomStreamPlayer.astro` встроен **прямым `<iframe>`** по официальной рекомендации BoomStream: https://boomstream.ru/documentation/developers/adaptive-style. Без SDK biframesdk.js — адаптивность даёт CSS-контейнер. Внешний компонент `<Video />` (`src/components/Video.astro`) использует его как `<BoomStreamPlayer code="nm7YeR0q" />`.

```html
<div class="relative w-full aspect-video bg-panel overflow-hidden rounded-sm ...">
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
