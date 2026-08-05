# Типографика — PDCA / ПРП

Этот документ — единственный источник правды по тексту в проекте. Любая правка
HTML/JS, добавление нового блока или редизайн секции опирается на него.
Перед коммитом — пройдись по [чек-листу](#7-чек-лист-перед-коммитом).

Базовые токены живут в `assets/js/tailwind-config.js`, классы ролей —
в `<style type="text/tailwindcss">` внутри `index.html` (`@layer base` для
fluid-ролей, `@layer components` для микротекстов, цвета и компонентов).

---

## 1. Принципы

1. **Семантика > утилиты.** В DOM пишется один класс роли (`.t-h-section`,
   `.t-body`), а не ассорти из `text-2xl font-black tracking-[-0.02em]`. Утилиты
   допустимы только для уникальных правок: одно слово красное, выравнивание
   по центру, отступ.
2. **8 ролей закрывают 95% текста.** Display, H-section (+compact), H-sub, Lead,
   Body, Body-sm, Quote — fluid. Eyebrow, Meta, Hint — статика. Любое отклонение
   — это либо новая роль (тогда фиксируем здесь), либо плакатное исключение
   (документируем, см. раздел [Плакатные исключения](#5-адаптация)).
3. **Один H2 — одна шкала.** В основном контенте и в модалках H2 принадлежит
   одной семье `.t-h-section`. Для узких колонок модалок есть модификатор
   `.t-h-section--compact`, но это та же визуальная семья.
4. **Только 4 уровня контраста текста на светлом фоне** и **3 — на тёмном.**
   `text-wire-text/85`, `text-white/70` и т. п. в HTML — анти-паттерн.
5. **Только fluid либо статика.** Промежуточных «text-2xl, на md text-3xl»
   подходов в шкале нет. Fluid через `clamp(min, ax + b, max)`, статика —
   фиксированный rem.

---

## 2. Шкала ролей

```
Размер на дельте 360 → 1280 px viewport:

DISPLAY     36 → 144 px  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
H-SECTION   32 →  60 px  ▓▓▓▓▓▓▓▓▓▓▓▓
COMPACT     24 →  36 px  ▓▓▓▓▓▓▓
H-SUB       18 →  22 px  ▓▓▓▓
LEAD        17 →  22 px  ▓▓▓▓
QUOTE       18 →  26 px  ▓▓▓▓▓ italic
BODY        17 →  20 px  ▓▓▓
BODY-SM     15 →  17 px  ▓▓
META        14 px static ▓▓
EYEBROW     11 px static ▓ (uppercase, tracking 0.32em)
HINT        12 px static ▓
```

| Роль          | Класс                              | Формула                                              | LH    | Tracking  | Вес | Use case |
|---------------|------------------------------------|------------------------------------------------------|-------|-----------|-----|----------|
| Display       | `.t-display`                       | `clamp(2.25rem, 5.4vw, 9rem)`                        | 0.95  | -0.03em   | 900 | H1 героя. Один на странице. |
| H-section     | `.t-h-section`                     | `clamp(2rem, 3.6vw, 3.75rem)`                        | 1.10  | -0.025em  | 900 | H2 секций. |
| H-sect compact| `.t-h-section .t-h-section--compact`| `clamp(1.5rem, 2.4vw, 2.25rem)`                     | 1.15  | -0.02em   | 900 | H2 в модалках, H3 в шапках карточек. |
| H-sub         | `.t-h-sub`                         | `clamp(1.125rem, 1.4vw, 1.375rem)`                   | 1.30  | -0.01em   | 600 | H3 в длинном тексте, заголовок строки-категории. |
| Lead          | `.t-lead`                          | `clamp(1.0625rem, 1.25vw, 1.375rem)`                 | 1.55  | -0.005em  | 400 | Лид-абзац под H1. |
| Body          | `.t-body`                          | `clamp(1.0625rem, 0.7vw + 0.875rem, 1.25rem)`        | 1.65  | 0         | 400 | Основной текст. |
| Body-sm       | `.t-body-sm`                       | `clamp(0.9375rem, 0.4vw + 0.875rem, 1.0625rem)`      | 1.55  | 0         | 400 | Уменьшенный body, ссылки в списках, описания. |
| Quote         | `.t-quote`                         | `clamp(1.125rem, 1.4vw, 1.625rem)`                   | 1.40  | -0.005em  | 500 italic | `<blockquote>`. |
| Eyebrow       | `.t-eyebrow`                       | 0.6875rem (11px) static                              | 1.40  | 0.32em    | 600 | Надзаголовок-капслок: «Тренинг», «О тренинге». |
| Meta          | `.t-meta`                          | 0.875rem (14px) static                               | 1.45  | 0         | 400 | Атрибьюшн под цитатой, подпись stat-card, мелкий комментарий. |
| Hint          | `.t-hint`                          | 0.75rem (12px) static                                | 1.40  | 0         | 400 | Самое мелкое: техническая пометка, мобильная подпись иероглифа. |

### Примеры HTML

```html
<!-- Display: единственный H1 на странице -->
<h1 class="t-display">
  <span class="text-white mix-blend-difference">Профессиональное</span><br>
  <span class="text-wire-accent">решение</span>
</h1>

<!-- Eyebrow → H-section: канонический заголовок секции -->
<p class="t-eyebrow t-on-muted mb-6">О тренинге</p>
<h2 class="t-h-section t-on-strong">Философия постоянных <span class="text-wire-accent">улучшений</span></h2>

<!-- H2 в модалке -->
<h2 class="t-h-section t-h-section--compact t-on-strong mt-14 mb-6">1-й день тренинга</h2>

<!-- Lead под H1 (на тёмном фоне) -->
<p class="t-lead t-on-dark mix-blend-difference max-w-2xl">…</p>

<!-- Body с ударением и цитатой -->
<div class="space-y-4 t-on-default">
  <p class="t-body">Всё больше компаний во всём мире принимают <strong class="font-semibold t-on-strong">кайдзен</strong>.</p>
  <blockquote class="t-quote t-on-strong">Кайдзен начинается с проблемы…</blockquote>
  <p class="t-meta t-on-muted">Масааки Имаи, создатель концепции кайдзен</p>
</div>

<!-- Hint -->
<div class="t-hint t-on-muted">Нажмите на категорию, чтобы посмотреть список проектов.</div>
```

---

## 3. Цветовая палитра текста

### Светлый фон (#FFFFFF, .bg-wire-bg, .bg-wire-panel)

| Уровень | Класс           | Цвет                       | Контраст | Когда |
|---------|-----------------|----------------------------|----------|-------|
| Strong  | `.t-on-strong`  | `#0C0C0C` (`wire-dark`)    | 19.6:1 ✅ AAA | Заголовки всех уровней, `<strong>`, имена/credit. |
| Default | `.t-on-default` | `#2B2B2B` (`wire-text`)    | 12.6:1 ✅ AAA | Body, lead, list items. |
| Muted   | `.t-on-muted`   | `#2B2B2B` @ 70%            | 4.6:1  ✅ AA  | Eyebrow, meta, hint, body-sm, captions. |
| Soft    | `.t-on-soft`    | `#2B2B2B` @ 45%            | —      | Только декор и неважные таймстампы. **Не для основного контента.** |

### Тёмный фон (#0C0C0C/55, фон с горой)

| Уровень          | Класс                | Цвет          | Контраст | Когда |
|------------------|----------------------|---------------|----------|-------|
| On-dark          | `.t-on-dark`         | `#FFFFFF`     | 19.6:1 ✅ | Заголовки, основной текст. |
| On-dark Muted    | `.t-on-dark-muted`   | `#FFFFFF` @ 75% | 14.7:1 ✅ | Eyebrow на тёмном, captions, secondary. |
| On-dark Soft     | `.t-on-dark-soft`    | `#FFFFFF` @ 55% | 10.8:1 ✅ | Декоративные пометки. |

### Правило

В HTML пишется ТОЛЬКО один из этих 7 классов. `text-wire-text/85`, `text-white/70`,
`text-neutral-500` и подобные — **запрещены** (есть автоматический grep в шаге CI/ревью).

---

## 4. Веса и tracking

### Веса (Inter)

В Google Fonts тянем 400/500/600/700/800/900, но в шкале живут только **четыре**:

| Вес | Tailwind        | Когда |
|-----|-----------------|-------|
| 400 | `font-normal`   | Body, lead, meta, hint. |
| 500 | `font-medium`   | Quote (через `.t-quote`), `<em>`. |
| 600 | `font-semibold` | H-sub, eyebrow, кнопки, `<strong>` в body. |
| 900 | `font-black`    | Display, H-section (+compact), stat-card numbers. |

`font-bold` (700) и `font-extrabold` (800) — **не использовать**: между 600 и 900
нет визуально полезной точки в нашей сетке.

### Tracking (letter-spacing)

В `tailwind-config.js` заведено три ключа + дефолтный 0:

| Token              | Значение | Когда |
|--------------------|----------|-------|
| `tracking-display` | -0.03em  | `.t-display`, плакатные цифры stat-card. |
| `tracking-heading` | -0.02em  | Резерв для будущих заголовков, не используется напрямую (роли уже задают свой letter-spacing). |
| `tracking-label`   | 0.32em   | `.t-eyebrow`. |
| (default 0)        | —        | Body, lead, meta, hint. |

Произвольные значения вроде `tracking-[-0.025em]` запрещены кроме `--compact`-варианта,
который зашит в роль.

---

## 5. Адаптация

### Где fluid, где статика

| Роль                        | Подход         | Почему |
|-----------------------------|----------------|--------|
| Display, H-section (+compact), H-sub, Lead, Body, Body-sm, Quote | **Fluid `clamp()`** | Линейная адаптация под viewport без скачков на breakpoint'ах. |
| Eyebrow, Meta, Hint         | **Статика**    | Микротекст должен быть стабильно мелким. Fluid даёт нечитаемый плавающий результат. |
| Stat-card number            | **Breakpoint-driven** (`text-5xl md:text-6xl lg:text-7xl`) | Это плакат, не типографика. Скачки — часть художественного решения. |

### Почему `clamp(min, ax + b, max)` лучше `clamp(min, vw, max)`

Старая формула `clamp(1rem, 1.05vw, 1.25rem)` для body работала только в одной
точке. На 1024px `1.05vw = 10.75px` → срабатывал min 16px. Чтобы достичь 20px,
требовался viewport ≥ 1905px. По факту body везде = 16px.

Новая формула `clamp(1.0625rem, 0.7vw + 0.875rem, 1.25rem)`:
- 360px → 17px (минимум)
- 768px → 19.4px
- 1280px+ → 20px (максимум)

Body растёт линейно по всей дельте viewport. Тот же подход — для `.t-body-sm`.

### Плакатные исключения (вне шкалы)

Эти элементы НЕ обязаны соответствовать шкале — они визуальные акценты,
а не текст:

- **Иероглиф 改善** (kanji): `text-[clamp(110px,11vw,200px)]` (desktop) /
  `text-[56px] sm:text-[72px]` (mobile). Шрифт `Yuji Mai`,
  цвет — `text-wire-accent`.
- **Цифры stat-card** (`22 / 17 / 850 / 13 000`): `font-black tracking-display`,
  размер — `clamp(1.5rem, 29cqi, 4.5rem)` (container query, `container-type:
  inline-size` на `.stat-card`, так что `cqi` считается от контент-бокса карточки).
  Множитель `29cqi` продиктован самым длинным числом — «13 000», 6 знаков: при
  прежних `36cqi` оно занимало 118% контент-бокса и вылезало за карточку. При
  добавлении числа длиннее 6 знаков множитель придётся пересчитать.
- **`.feature-card__label`** в glass-карточках: tracking `wider` (0.05em) узкий,
  чем у `.t-eyebrow` (0.32em) — иначе длинные подписи «Многолетний опыт» не
  умещаются в 6-колоночную сетку.
- **Контактные ссылки в шапке**: `text-xs sm:text-sm md:text-base` —
  респонсив адресной строки.
- **`.trainer-pill`** — пиллы клиентов в секции `#about-trainer`: uppercase,
  статичный кегль 0.875rem (= `.t-meta`), letter-spacing 0.08em, тонкая обводка
  без скруглений, ховер — заливка `wire-accent2`. Разрядка вне токенов
  (`tracking-label` 0.32em здесь слишком широк) — это «лента логотипов»,
  плакатный элемент, а не текст.
- **`.prp-octagon__num` / `.prp-octagon__text`** — цифра и текст шага внутри
  октагона ПРП-диаграммы (секция `#prp-steps`). Размеры — в `cqi` (container
  query, 1cqi = 1% ширины октагона), чтобы текст масштабировался вместе с
  октагоном на любом viewport:
  `__num` — `clamp(1.35rem, 8.5cqi, 2.3rem)`, вес 600 (по просьбе заказчика
  плотнее, чем «обычное начертание» из ТЗ блока); `__text` —
  `clamp(0.8rem, 5cqi, 1.25rem)`.
  Потолок `__text` (`1.25rem`) совпадает с верхом шкалы `.t-body` — цель в том,
  чтобы текст шага читался как обычный основной текст: на крупных октагонах
  (колонка/планшет ~360–380px) он достигает body-размера. Минимумы clamp — для
  телефонов и сжатого «креста» на узких десктопах, где октагон мельче и текст
  плавно опускается ниже body. Октагон — фиксированный визуальный контейнер,
  поэтому это диаграммные акценты вне fluid-шкалы.

При добавлении нового плакатного исключения — допиши его сюда.

---

## 6. Анти-паттерны

Что нельзя делать (отлавливается grep'ом ниже):

```bash
# Запуск из корня репозитория
git grep -n -E 'text-(wire-text|white)/(60|70|75|80|85|90)' -- index.html
git grep -n -E 'tracking-\[-0\.0(05|1|25|3)em\]'            -- index.html
git grep -n -E 'font-(bold|extrabold)'                      -- index.html
git grep -n -E '\.h-section\b|\.modal-h2\b|\.caption-label\b' -- index.html
git grep -n -E 'text-\[(11|15)px\]'                         -- index.html
```

Все эти команды должны вернуть **0 строк** (исключение: одно вхождение
`text-[11px]` в `.feature-card__label` — задокументированное плакатное исключение).

| Анти-паттерн                        | Что писать вместо |
|-------------------------------------|-------------------|
| `text-wire-text/85`                 | `t-on-muted` |
| `text-white/70`                     | `t-on-dark-muted` |
| `font-bold` / `font-extrabold`      | `font-semibold` (600) или `font-black` (900) |
| `text-[15px]`                       | `t-body-sm` |
| `text-[11px]`                       | `t-eyebrow` (если uppercase-капслок) или `t-hint` (если просто мелкий) |
| `tracking-[-0.025em]`               | использовать роль (`t-h-section` уже даёт это значение) |
| `text-2xl md:text-3xl font-black`   | `t-h-section` или `t-h-section--compact` |
| `text-lg md:text-xl font-semibold`  | `t-h-sub` |
| `caption-label` / `h-section` / `modal-h2` | старые имена удалены, использовать `t-eyebrow` / `t-h-section` / `t-h-section t-h-section--compact` |

### `@apply group` в CSS-компонентах — не работает

Если CSS-компонент скрывает hover-логику внутри `@layer components` и в DOM
не пишется `group` руками — НЕ использовать `@apply group` + `group-hover:`.
Tailwind компилирует `group-hover:bg-white` в селектор
`.group:hover .group-hover\:bg-white { ... }` — ему нужен литеральный класс
`.group` на родителе. `@apply group` копирует (пустые) правила, но не делает
элемент носителем класса для селектора.

Вместо этого — обычный `:hover` на самом компоненте (а если нужно затронуть
потомка — селектор прямого потомка):

```css
.t-modal-list-item:hover { @apply bg-wire-surface; }
```

`group/group-hover:` остаются валидным паттерном, только если `group` пишется
прямо в DOM (utility-first) — не через `@apply`.

---

## 7. Чек-лист перед коммитом

- [ ] У каждого нового текстового элемента проставлен класс роли (`.t-*`),
      а не набор утилит.
- [ ] Цвет — один из 7 классов `.t-on-*`. Никаких `/NN` opacity на тексте.
- [ ] Размер — из шкалы. Если `text-[NNpx]` — это либо плакатное исключение
      (тогда задокументируй его в разделе 5), либо ошибка.
- [ ] Вес — один из четырёх (400/500/600/900). `font-bold`/`font-extrabold` нет.
- [ ] Tracking — `tracking-display` / `tracking-label` / по умолчанию 0.
- [ ] Прогнал 5 grep'ов из раздела 6 — все возвращают 0 (или одно
      задокументированное исключение).
- [ ] В JS не появилось новых хардкодов классов в строках. Если новый
      DOM-компонент — описан как `.t-*` в `@layer components`.

---

## 8. Cheatsheet

| Хочу…                                          | Класс |
|------------------------------------------------|-------|
| гигантский H1 героя                            | `t-display` |
| заголовок секции                               | `t-h-section t-on-strong` |
| тот же заголовок на тёмном фоне                | `t-h-section t-on-dark` |
| H2 внутри модалки                              | `t-h-section t-h-section--compact t-on-strong mt-14 mb-6` |
| H3 в длинном тексте                            | `t-h-sub t-on-strong mt-12 mb-5` |
| надзаголовок-капслок («Тренинг»)               | `t-eyebrow t-on-muted` |
| надзаголовок на тёмном фоне                    | `t-eyebrow t-on-dark-muted` |
| лид-абзац под H1                               | `t-lead t-on-dark` (или `t-on-default`) |
| абзац основного текста                         | `t-body` (внутри контейнера с `t-on-default`) |
| подпись/credit/атрибьюшн                       | `t-meta t-on-muted` |
| мелкая техническая пометка                     | `t-hint t-on-muted` |
| цитата `<blockquote>`                          | `t-quote t-on-strong` |
| ссылка-кнопка-«Скачать»                        | `t-body-sm t-on-muted hover:text-wire-dark transition-colors` |
| ударение в body                                | `<strong class="font-semibold t-on-strong">…</strong>` |
| курсив в body                                  | `<em class="italic">…</em>` (стандартное наследование) |

---

## Чек-фразы для Claude / AI-агента

Если AI собирается писать `text-wire-text/90`, `font-bold`, `text-[15px]`
или возрождать удалённые имена `caption-label`/`h-section`/`modal-h2` —
он работает в обход системы. Останови, попроси открыть этот документ.
