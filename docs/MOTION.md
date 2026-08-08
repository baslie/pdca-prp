# Движение и анимация — PDCA / ПРП

Этот документ — единственный источник правды по моушну: приёмы, токены
длительностей, контракт Lenis и scroll-reveal. Открыть ПЕРЕД любой правкой
анимаций, `transition-*` и скролла. Соседние документы: [STACKING.md](STACKING.md) —
слои и fixed-элементы hero; [VIDEO.md](VIDEO.md) — почему init-скрипты
не ждут `window.load`.

Моушн на сайте — **одна система с одним словарём**, а не набор эффектов.
Шесть приёмов, и у каждого ровно одна зона ответственности:

| Приём | Инструмент | Где живёт |
|---|---|---|
| Плавный инерционный скролл страницы | Lenis | `src/scripts/smooth-scroll.ts` (синглтон, импорт из `BaseLayout.astro`) |
| Scrub, привязанный к скроллу покадрово | GSAP + ScrollTrigger | **только** диаграмма ПРП (`src/scripts/prp-diagram-scroll.ts`) |
| Однократное появление при скролле | IntersectionObserver + CSS-transition | `src/scripts/reveal.ts` + `[data-reveal]` в разметке |
| Числовая интерполяция | GSAP core | **только** 4 цифры `#offer-stats` (`src/scripts/stats-counter.ts`) |
| Ховер / фокус / состояние | CSS-transition | `global.css` |
| Бесконечное движение + drag | GSAP ticker + Observer | конвейеры отзывов (`src/scripts/reviews-marquee.ts`); CSS `@keyframes` — no-JS-фолбэк |
| Бесконечное движение | CSS `@keyframes` | спиннер галереи |

## Плавный скролл (Lenis) — контракт

- **Режим только дефолтный** — виртуализация нативного window-скролла.
  Wrapper/content с transform на обёртке ЗАПРЕЩЁН: сломает fixed-слои hero,
  `mix-blend-*` и `background-attachment: fixed` (см. [STACKING.md](STACKING.md)).
  GSAP ScrollSmoother не использовать по той же причине.
- Синглтон `export const lenis: Lenis | null` — `null` при
  `prefers-reduced-motion` (тогда работает нативный фолбэк: CSS
  `scroll-behavior: smooth` и `body.modal-open`). Потребители — только через
  `lenis?.`.
- **Блокировка фона**: `modal.ts` (lock/unlock) и `header.ts` (бургер) зовут
  `lenis?.stop()` / `lenis?.start()` **вместе** с классом `modal-open` —
  класс не убирать, это reduce/no-JS-фолбэк.
- **Скроллящийся `<dialog>` обязан нести `data-lenis-prevent`** (все 5 модалок
  с прокруткой несут; у `#modal-gallery` скролла нет — атрибут не нужен).
  Без атрибута при `stop()` контент модалки не листается колесом.
- **Якоря** ведёт делегированный click-обработчик на `document`
  (bubble-фаза, НЕ capture — иначе сломается порядок с закрытием бургера
  в `header.ts`). Offset вручную не передавать: Lenis 1.3 сам вычитает
  вычисленный `scroll-padding-top` — ручной offset даст двойной отступ.
  Хеш обновляется `history.pushState` (не `location.hash` — тот даёт
  мгновенный нативный прыжок).
- CSS-правила Lenis живут в `global.css` (`@layer base`, рядом с
  `scroll-padding-top`), включая наше собственное
  `html.lenis { scroll-behavior: auto !important; }` — в поставке 1.3.x его
  нет, без него нативный smooth «резинит» каждую запись scrollTop.
- Связка с GSAP: `autoRaf: false`, raf крутится в `gsap.ticker`,
  `lagSmoothing(0)` — второй rAF-цикл не заводить. Тик конвейера отзывов
  (`reviews-marquee.ts`) живёт в том же `gsap.ticker`.

**Первый экран статичен.** В `Hero.astro` и `DenisFixed.astro` анимации нет и
быть не должно — решение заказчика: первый экран грузится быстро и лаконично.
`data-reveal` туда не ставится.

**Init-скрипты не ждут `window.load`** — зависший iframe BoomStream откладывал
бы load бесконечно. Причина и детали — в [VIDEO.md](VIDEO.md), раздел «Watchdog».

## Токены — единственный источник значений

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

## Scroll-reveal: разметочный контракт

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
   секцию проступают fixed-слои hero (см. [STACKING.md](STACKING.md)). Только на
   внутренние обёртки.
2. **На элементы, которыми уже владеет GSAP** — октагоны, стрелки и орнамент
   `#prp-steps`. Один элемент = один приём.
3. **На массовые списки** — 34 логотипа, 41 отзыв в конвейере, 93 фото
   галереи, 16 тренингов. У них либо свой моушн (marquee, hover-zoom), либо их
   слишком много: страница начнёт мерцать.
4. **Внутрь обрамлённых контейнеров как `="group"`.** Если рамку рисует
   контейнер (`border-y` вокруг списка, общий `border-x border-t` таблицы),
   стаггер сдвигает содержимое внутри неподвижной рамки. Такие блоки
   появляются одним `data-reveal`. Карточные сетки без общей рамки
   (категории `#examples`, регалии `#certificate`, offer-stats) — наоборот,
   штатный случай `="group"` со `--reveal-i`.

## Анти-паттерны

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
