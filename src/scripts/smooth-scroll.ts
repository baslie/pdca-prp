// Плавный скролл (Lenis) — синглтон страницы.
//
// РЕЖИМ: только дефолтный — виртуализация нативного window-скролла.
// Wrapper/content с transform на обёртке ЗАПРЕЩЁН: fixed-слои hero
// (#sky-fixed, #denis-fixed, #mountain-fixed), mix-blend-difference и
// background-attachment: fixed трёх панорам живут на настоящем скролле;
// transform на предке создал бы containing block и сломал бы всё разом.
//
// Связка с остальной системой:
//   - modal.ts и header.ts импортируют { lenis } и зовут stop()/start()
//     при блокировке фона (модалки, бургер-оверлей);
//   - скроллящиеся <dialog> помечены data-lenis-prevent — события из них
//     Lenis игнорирует, контент листается нативно даже при stop();
//   - CSS-правила Lenis (html.lenis и пр.) — в global.css, @layer base.
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './in-view';

// При reduce Lenis не создаётся вовсе — конвенция проекта: каждый моушн-скрипт
// сам не инициализируется. Класса .lenis на <html> нет → работает нативный
// фолбэк (scroll-behavior из global.css, body.modal-open в модалках).
export const lenis: Lenis | null = createLenis();

function createLenis(): Lenis | null {
  if (prefersReducedMotion()) return null;

  const instance = new Lenis({
    autoRaf: false, // raf крутит gsap.ticker ниже — один цикл на страницу
    allowNestedScroll: true, // textarea лид-формы и будущие вложенные скроллы
    // anchors НЕ включаем — свой делегированный обработчик ниже: offset
    // динамический (шапка меняет высоту на 48rem), плюс есть href="#".
    // Остальное дефолты: smoothWheel true, syncTouch false (тач нативный),
    // autoResize true (ResizeObserver подхватит раскрытие галереи).
  });

  // Канонический паттерн Lenis + GSAP: ScrollTrigger обновляется в кадр
  // со скроллом, lagSmoothing выключен, чтобы scrub не отставал.
  gsap.registerPlugin(ScrollTrigger); // повторная регистрация безопасна
  instance.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => instance.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  return instance;
}

// ---------- Якоря ----------
// Lenis перехватывает wheel, а html.lenis глушит CSS scroll-behavior: smooth,
// поэтому переходы по якорям ведёт он сам. Слушатель ОБЯЗАН висеть на
// document в bubble-фазе (не capture): клик по пункту открытого бургера
// сначала всплывает через #site-header (header.ts закрывает меню и снимает
// лок → lenis.start()), и только потом доходит сюда — скролл стартует
// на уже разблокированной странице.
if (lenis) {
  const l = lenis;
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    const link =
      e.target instanceof Element
        ? e.target.closest<HTMLAnchorElement>('a[href^="#"]')
        : null;
    if (!link || link.hasAttribute('download') || link.target === '_blank') return;
    // href="#" внутри модалки (PDF-плейсхолдер в ModalAbout) — фон залочен,
    // скроллить его нельзя.
    if (link.closest('dialog')) return;

    const hash = link.getAttribute('href')!;
    const target = hash === '#' ? 0 : document.getElementById(hash.slice(1));
    if (target === null) return; // битый якорь — отдать браузеру

    e.preventDefault();
    l.scrollTo(target, {
      // offset НЕ передаём: Lenis 1.3 при элементе-цели сам вычитает
      // вычисленный scroll-padding-top контейнера (global.css) — ручной
      // offset давал бы двойной отступ от шапки.
      // Scrollspy (header.ts) слушает hashchange, а pushState его не бросает —
      // синтетическое событие для паритета (recompute поля события не читает).
      onComplete: () => window.dispatchEvent(new Event('hashchange')),
    });
    // pushState, НЕ location.hash: присвоение hash — нативный мгновенный
    // прыжок, который подрал бы анимацию Lenis.
    history.pushState(null, '', hash === '#' ? location.pathname + location.search : hash);
  });
}
