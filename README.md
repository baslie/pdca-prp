# PDCA-PRP

Лендинг тренинга «Профессиональное Решение Проблем» Дениса Булгина.
Прод: <https://roman-purtow.ru/pdca-prp/>

## Стек

- **Astro 7** — статик, один Layout + одна страница + ~20 компонентов.
- **Tailwind CSS v4** — Vite-плагин, единый `src/styles/global.css` (`@theme`-токены).
- **TypeScript** (strict) — вся логика в `src/scripts/`.
- **GSAP 3 + ScrollTrigger** — scrub-диаграмма ПРП, счётчик цифр, конвейеры отзывов.
- **Lenis** — плавный инерционный скролл, синхронизирован с GSAP через `gsap.ticker`.
- **astro-icon + lucide** — иконки inline SVG на build-time.
- **astro-typograf** — русская микротипографика автоматически по собранному HTML.
- **Inter** + **Yuji Mai** (Google Fonts).
- **BoomStream** — видеоплеер, прямой `<iframe>` без SDK.
- **GitHub Actions + GitHub Pages** — CI/CD на каждом push в `main`.

Полная таблица с колонкой «где править» — [docs/BUILD.md](docs/BUILD.md).

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
│   │                                    BoomStreamPlayer, SkyFixed, DenisFixed,
│   │                                    Logo, TermTip, LeadForm
│   ├── scripts/                       ← modal.ts, examples.ts, reviews.ts, gallery.ts,
│   │                                    lead-form.ts, referral.ts, smooth-scroll.ts,
│   │                                    boomstream-watchdog.ts, prp-diagram-scroll.ts…
│   ├── styles/global.css              ← Tailwind v4 + @theme + @layer base/components
│   └── assets/                        ← images, svg — через Vite asset pipeline (hashed URLs)
├── public/                    ← статика «как есть»: favicon.ico, icons/, og-image.png,
│                                site.webmanifest, browserconfig.xml, robots.txt
├── docs/                      ← документация по темам (см. «Документация» ниже)
├── CLAUDE.md                  ← роутер: карта документации + железные правила
└── README.md
```

## Быстрый старт

```powershell
npm install                     # один раз после клона
npm run dev                     # http://localhost:4321/pdca-prp/  (префикс base обязателен)
npm run build && npm run preview   # прод-проверка (типографика есть только в сборке)
npm run check                   # astro check (TypeScript + Astro)
```

## Документация

| Файл | Что внутри |
|---|---|
| [docs/BACKLOG.md](docs/BACKLOG.md) | бэклог «Что осталось сделать» + чек-лист перед анонсом |
| [docs/TYPOGRAPHY.md](docs/TYPOGRAPHY.md) | шкала ролей текста, цвета, веса; §9 — микротипографика |
| [docs/SPACING.md](docs/SPACING.md) | шкала отступов, карта страницы, исключения |
| [docs/MOTION.md](docs/MOTION.md) | система движения: Lenis, GSAP, scroll-reveal, токены |
| [docs/STACKING.md](docs/STACKING.md) | fixed-слои hero, blend-режимы, правило z-10 + фон |
| [docs/GALLERY.md](docs/GALLERY.md) | галерея тренингов: ассеты, лайтбокс, свёртка |
| [docs/LEAD-FORM.md](docs/LEAD-FORM.md) | лид-форма: валидация, honeypot, реферальный хвост |
| [docs/VIDEO.md](docs/VIDEO.md) | BoomStream: embed, postMessage API, watchdog |
| [docs/BUILD.md](docs/BUILD.md) | стек, дизайн-токены и палитра, overrides, деплой |

## Деплой

Автоматически на GitHub Pages при каждом push в `main` (GitHub Actions,
~1–2 минуты, статус — вкладка Actions). Публичный URL —
`https://roman-purtow.ru/pdca-prp/`. Сайт пока закрыт от индексации
(`noindex` + `robots.txt`); чек-лист снятия — [docs/BACKLOG.md](docs/BACKLOG.md).
Подробности — [docs/BUILD.md](docs/BUILD.md).

## Соглашения

- Правила для агентов и людей — [CLAUDE.md](CLAUDE.md): карта «когда какой
  документ читать» и железные правила.
- Коммиты — в стиле уже имеющихся (`git log -5 --oneline`): `тип: суть на русском`.
