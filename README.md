# PDCA-PRP

Лендинг тренинга «Профессиональное Решение Проблем» Дениса Булгина.

## Что осталось сделать

Актуальный бэклог проекта. Держать в синхроне: сделали пункт — снимаем галочку
и убираем из списка.

### 1. Форма заявки

**Фронтенд готов.** Блок `#request` (`src/components/LeadForm.astro`) — контакты
слева, форма справа, поверх горной панорамы. Поля, валидация, состояния
отправки, honeypot, чекбокс согласия и привязка реферального хвоста работают.
Осталось увезти заявку с сайта.

- [ ] **Решить, куда уходят заявки.** Сайт статический на GitHub Pages, бэкенда
      нет — нужен внешний обработчик: Formspree / Getform / Google Forms либо
      serverless-функция с отправкой в Telegram. Точка подключения ровно одна —
      функция `sendLead()` в `src/scripts/lead-form.ts`, сейчас заглушка
      с `console.log`. Сигнатуру менять не нужно: форма уже умеет ждать промис
      и разводить успех и ошибку сети.
- [ ] Ссылка на политику конфиденциальности в чекбоксе согласия — сейчас
      `href="#"` с пометкой `TODO(legal)` (см. п. 4).
- [ ] Капча провайдера, если honeypot окажется недостаточным.
- [ ] Перенацелить CTA на `#request`: кнопка «Подробнее» в hero ведёт
      на `#about-training`, в offer-блоке CTA нет вовсе.

### 2. Меню в шапке

Сейчас навигации по странице нет вообще: в hero только лого и контакты,
дальше 12 секций подряд — добраться до нужной можно лишь скроллом.

- [ ] Компонент `src/components/Header.astro` с якорной навигацией.
      Состав пунктов согласуем отдельно.
- [ ] Мобильная версия: бургер и выезжающая панель. Нативный `<dialog>`
      и общий `setupModal()` из `src/scripts/modal.ts` уже дают lock прокрутки,
      Esc и клик мимо — заводить своё не нужно.
- [ ] Решить поведение при скролле: липнет ли шапка, как меняется фон над
      светлыми и тёмными секциями.
- [ ] **Ужиться с hero.** Первый экран — особый: контакты в шапке свёрстаны
      двумя блоками (desktop-overlay ≥lg и мобильный правый угол), заголовок
      идёт через `mix-blend-difference`, а фото Дениса и гора — `fixed` без
      `z-index` ради этого блендинга. Меню не должно ломать ни стэкинг
      (см. CLAUDE.md), ни блендинг, и не дублировать контакты.
- [ ] Подсветка активного пункта при скролле — только через IntersectionObserver
      (`onceInView` не подойдёт, нужен повторяющийся вход в кадр).

### 3. Футер

- [ ] Компонент `src/components/Footer.astro`, последним в `index.astro` —
      после `<LeadForm />`.
- [ ] Контакты Дениса, ссылки на соцсети, копирайт с годом. Телефон, почта
      и Telegram уже собраны в левой колонке `LeadForm.astro` — брать оттуда,
      чтобы не разъехались (централизованного конфига контактов в проекте нет,
      значения дублируются в `Hero.astro`, `LeadForm.astro` и JSON-LD
      в `BaseLayout.astro`).
- [ ] Блок юридических ссылок (п. 4) и реквизиты (ИП/самозанятый, ИНН) —
      уточнить у заказчика, что именно публикуем.
- [ ] Навигация-якоря по секциям страницы — если делаем, брать тот же список
      секций, что и в меню (п. 2), чтобы не разъехались.

### 4. Юридические документы

Без них нельзя собирать персональные данные через форму (152-ФЗ).

- [ ] Политика конфиденциальности.
- [ ] Согласие на обработку персональных данных (текст под чекбоксом формы).
- [ ] Публичная оферта / условия оказания услуг — уточнить у заказчика,
      нужна ли (зависит от того, продаём ли мы с сайта).
- [ ] Формат размещения: отдельные страницы `src/pages/privacy.astro` и т. д.
      (не PDF — так документы индексируются и открываются с телефона).
- [ ] Ссылки в футере и рядом с чекбоксом формы.

### 5. Хвосты

- [ ] Скан сертификата Euclides Coimbra: сейчас в `index.astro` заглушка,
      импорт закомментирован (строки 22–26) — файл в `src/assets/images/`,
      раскомментировать и передать в `<Certificate>` **и** `<ModalCertificate>`.
- [ ] Настоящий OG-баннер 1200×630 вместо копии `denis-bulgin.png`
      в `public/og-image.png`.
- [ ] Перед публичным анонсом — снять `noindex` и открыть `robots.txt`.
      Полный чек-лист: раздел «Чек-лист перед публичным анонсом» в `CLAUDE.md`.

## Стек

- **Astro 7** — статический сайт (`output: "static"`), компонентная декомпозиция,
  один Layout + одна страница + ~10 компонентов в `src/components/`.
- **Tailwind CSS v4** — через официальный Vite-плагин `@tailwindcss/vite`,
  единый стилевой файл `src/styles/global.css` (`@import "tailwindcss"`,
  `@theme`-токены, `@layer base/components`).
- **TypeScript** (strict, через `astro/tsconfigs/strict`) для всей логики
  в `src/scripts/`.
- **GSAP 3 + ScrollTrigger** (npm) — scrub-анимация диаграммы ПРП и счётчик
  цифр в блоке «Мы предлагаем». Появление блоков при скролле сделано без GSAP:
  IntersectionObserver + CSS-transition (`src/scripts/reveal.ts`).
- **astro-icon + @iconify-json/lucide** — иконки рендерятся как inline SVG
  на build-time (без CDN, без runtime-замены).
- **astro-typograf + typograf** — русская микротипографика (неразрывные
  пробелы, тире, «ёлочки») расставляется автоматически по собранному HTML.
  Работает только на `npm run build`, исходники не трогает. Конфигурация —
  `astro-typograf.config.mjs`, проверка покрытия — `scripts/audit-typography.mjs`.
- **Inter** (Google Fonts) + **Yuji Mai** (только один иероглиф 改善).
- **BoomStream** — видеоплеер, прямой `<iframe>` без SDK.
- **GitHub Actions** (`withastro/action@v3` + `actions/deploy-pages@v4`) —
  CI/CD на каждом push в `main`.
- **GitHub Pages** — хостинг, custom-домен `roman-purtow.ru`, project page
  под путём `/pdca-prp/`.

## Структура

```
.
├── astro.config.mjs           ← site, base, integrations (icon, compress, typograf)
├── astro-typograf.config.mjs  ← микротипографика: правила, селектор, typografAttr()
├── tsconfig.json              ← extends astro/tsconfigs/strict
├── package.json               ← scripts: dev / build / preview / check
├── .github/workflows/
│   └── deploy.yml             ← CI: withastro/action + deploy-pages
├── scripts/
│   ├── prepare-training-photos.mjs   ← разовое ужатие кадров галереи
│   └── audit-typography.mjs          ← проверка покрытия Типографом
├── src/
│   ├── layouts/BaseLayout.astro       ← <head>, SEO, JSON-LD, anti-FOUC inline-script
│   ├── pages/index.astro              ← главная страница (сборка компонентов)
│   ├── components/                    ← Hero, AboutTraining, Video, Examples,
│   │                                    OfferStats, PrpSteps, AboutTrainer, Certificate,
│   │                                    Clients, Reviews, VideoReviews, Modal*,
│   │                                    BoomStreamPlayer, DenisFixed, Logo, TermTip
│   ├── scripts/                       ← modal.ts, modal-about.ts, examples.ts,
│   │                                    certificate.ts, reviews.ts, video-reviews.ts,
│   │                                    boomstream-watchdog.ts, prp-diagram-scroll.ts
│   ├── styles/global.css              ← Tailwind v4 + @theme + @layer base/components
│   └── assets/                        ← images, svg — через Vite asset pipeline (hashed URLs)
├── public/                    ← статика «как есть»: favicon.ico, icons/, og-image.png,
│                                site.webmanifest, browserconfig.xml, robots.txt
├── docs/
│   ├── TYPOGRAPHY.md          ← источник правды по тексту (см. ниже);
│   │                            раздел 9 — микротипографика
│   └── SPACING.md             ← источник правды по отступам и ритму
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

## Отступы и ритм

Воздух на странице тоже система: отступ — это **роль**, а не число.
Шесть токенов в `@theme` (`--spacing-section`, `-section-lg`, `-block`,
`-group`, `-gutter`, `-panel`) дают и `var()` в CSS, и Tailwind-утилиты
(`mt-block`, `gap-gutter`, `p-panel`), плюс composition-классы `.section-py` /
`.section-py-lg` для вертикали секции и `.section-px` / `.section-px-wide`
для полей.

Единственный источник правды — [`docs/SPACING.md`](docs/SPACING.md): шкала
с расчётом значений на 390/1440/1920px, карта страницы по секциям,
четыре задокументированных исключения и контрольные grep'ы.

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
- Перед правкой отступов (`py-*`, `mt-*`, `gap-*`) — открыть `docs/SPACING.md`.
  Своих `clamp()` в разметке быть не должно: расстояние выбирается из шести
  ступеней шкалы.
- Перед добавлением блока после hero — раздел «Стэкинг и fixed-слои hero»
  в `CLAUDE.md` (нужны `relative z-10` + непрозрачный фон, иначе fixed-слои
  героики проступают сквозь блок).
- Коммиты — в стиле уже имеющихся в репозитории (`git log -5 --oneline`):
  префикс типа (`feat:`/`fix:`/`style:`/`refactor:`/`docs:`/`ci:`/`chore:`),
  затем суть на русском (можно с английским lead'ом в первой строке).
- Не использовать `--no-verify`, `--amend`, `git reset --hard`, force-push без
  явной необходимости.
