# Инструкции для AI-агента — проект PDCA / ПРП

Лендинг тренинга «Профессиональное Решение Проблем» Дениса Булгина
(Astro 7 + Tailwind v4, статик на GitHub Pages). Этот файл — **роутер**:
перед правкой открой профильный документ из карты ниже. Здесь остаются
только железные правила, команды и правила работы агента.

## Карта документации

| Задача / триггер | Читать ПЕРЕД правкой |
|---|---|
| Текст, заголовки, кегли, цвета текста, `&nbsp;`, тире, кавычки | [docs/TYPOGRAPHY.md](docs/TYPOGRAPHY.md) (§9 — микротипографика) |
| Отступы `py-*`/`mt-*`/`gap-*`, новый блок, ритм страницы | [docs/SPACING.md](docs/SPACING.md) |
| Анимация, скролл, Lenis, `data-reveal`, ховеры, GSAP | [docs/MOTION.md](docs/MOTION.md) |
| Новая секция после hero, `z-index`, fixed-слои, mix-blend | [docs/STACKING.md](docs/STACKING.md) |
| Галерея `#training-photos`, кадры, лайтбокс | [docs/GALLERY.md](docs/GALLERY.md) |
| Лид-форма `#request`, валидация, honeypot, UTM-хвост | [docs/LEAD-FORM.md](docs/LEAD-FORM.md) |
| Видео, BoomStream, embed, autoplay, watchdog | [docs/VIDEO.md](docs/VIDEO.md) |
| Контент: проекты, отзывы, клиенты, фото, регалии, контакты | [src/data/](src/data/) — данные с типами; компоненты их только импортируют |
| Стек, дизайн-токены и палитра, package.json, деплой, dev-сервер | [docs/BUILD.md](docs/BUILD.md) |
| «Что осталось сделать», планы, задачи | [docs/BACKLOG.md](docs/BACKLOG.md) — единственный источник правды; выполнил пункт — вычеркни там же |
| Правила и селектор Типографа | [astro-typograf.config.mjs](astro-typograf.config.mjs) (комментарии в конфиге) |

## Железные правила

Однострочные инварианты, нарушение которых ломает сайт или сборку.
Обоснование каждого — в профильном документе из карты.

### Слои и первый экран

- Каждая секция/блок после hero: `relative z-10` + **непрозрачный** `bg-*` — иначе сквозь неё проступают fixed-слои hero.
- Небу, Денису и горе `z-index` не назначать — сломает `mix-blend-difference` в hero.
- С горы не снимать `mix-blend-multiply` — её белое JPEG-поле проступит поверх неба.
- Первый экран статичен: никаких `data-reveal` и анимаций в `Hero.astro` / `DenisFixed.astro` (решение заказчика).

### Текст

- Кегль/цвет/вес — только ролями `.t-*` / `.t-on-*`; `text-[15px]`, `text-ink/85`, `font-bold` запрещены.
- `&nbsp;` руками не ставить — типографика расставляется на сборке (в `npm run dev` её нет).
- Существующие 134 `&nbsp;` не удалять — часть работает обычным пробелом при `compressHTML: 'jsx'`.
- Текст, попадающий в `data-*` атрибуты, — только через `typografAttr()`.

### Отступы

- Отступ — роль из шести токенов шкалы; свой `clamp()` в разметке запрещён.
- Никаких фиксированных `py-16`/`mb-10` на границах секций — только `.section-py` / токены шкалы.

### Цвет

- Красный и синий — только `--color-brand-red/-blue` и производные через `color-mix()`; новый хекс запрещён. Меняешь `--color-brand-blue` — пересчитай `tableValues` дуотона в `Hero.astro`.
- Цвет inline-SVG — только `currentColor` (`var()` в presentation-атрибутах SVG не работает).

### Движение

- `transition-all` запрещён; свойства поимённо, длительность и кривая — только токены (`duration-N ease-brand`, `--dur-*`).
- Lenis — только дефолтный режим; wrapper/content-transform и GSAP ScrollSmoother запрещены (ломают fixed-слои и blend).
- Скроллящийся `<dialog>` обязан нести `data-lenis-prevent`.
- Анимировать только `transform` и `opacity` — не layout-свойства.
- В init-скриптах не ждать `window.load` — зависший iframe BoomStream заморозит init навсегда.

### Сборка и код

- Пути ассетов — ES-import или `import.meta.env.BASE_URL`; хардкод `/pdca-prp/` запрещён.
- `overrides` в `package.json` не удалять; `npm audit fix --force` не запускать.
- `Exclude` в `astro.config.mjs` не удалять; `getImage()` на кадрах галереи запрещён.
- `sendLead()` в `lead-form.ts` — единственная точка подключения бэкенда; сигнатуру не менять.
- Honeypot прячется только `left: -9999px`, не `display: none`.
- Каждый невоидный тег в `.astro` — с закрывающим: Rust-компилятор Astro 7 падает на невалидном HTML.

## Команды

```powershell
npm install         # первый запуск / после правок package.json
npm run dev         # dev-сервер с HMR -> http://localhost:4321/pdca-prp/
npm run build       # прод-сборка в dist/
npm run preview     # отдать dist/ как настоящий статик
npm run check       # astro check (TypeScript + Astro диагностика)
npm run audit:typography  # покрытие Типографом (гонять после build)
npm run photos:prepare    # ужать новые кадры галереи (см. docs/GALLERY.md)
```

## Dev-сервер

- Запускает пользователь, не Claude. Для проверки правок — `npm run build`
  (~1.5 с), при необходимости `npm run preview`; типы — `npm run check`.
- Альтернативные серверы (`http.server`, `serve`, vanilla `vite`) не использовать.
- Адрес: `http://localhost:4321/pdca-prp/` — префикс base обязателен.
  Детали (проверка порта, кэш браузера) — [docs/BUILD.md](docs/BUILD.md).

## Коммиты

- Стиль: `тип: суть на русском` (`feat:`/`fix:`/`style:`/`refactor:`/`docs:`/`ci:`/`chore:`) — сверяйся с `git log -5 --oneline`.
- Не использовать `--no-verify`, `--amend`, `git reset --hard`, force-push без явной необходимости.
