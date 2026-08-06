// Общий хелпер «элемент вошёл в кадр» — один порог на весь сайт.
//
// Им пользуются оба потребителя scroll-триггера, не привязанного к скроллу
// покадрово: reveal.ts (появление блоков) и stats-counter.ts (набегание цифр).
// Общий модуль здесь не ради экономии строк, а ради синхронности: цифры обязаны
// начинать набегать ровно в тот момент, когда появляются их карточки. Разъедутся
// пороги — разъедется и картинка.
//
// Покадровая привязка к скроллу (scrub) живёт отдельно, в prp-diagram-scroll.ts
// на GSAP ScrollTrigger, и сюда не заезжает. Разделение намеренное:
// scrub = GSAP, однократное появление = IntersectionObserver + CSS-transition.

const REDUCE_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** Системная настройка «меньше движения». Читается на момент вызова. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia(REDUCE_MOTION_QUERY).matches;
}

// -10% снизу: элемент считается «в кадре», только когда поднялся на десятую
// часть экрана выше нижней кромки. Без этого запаса блок отрабатывает появление
// ровно в момент, когда его край выглянул из-за края окна, — анимация проходит
// вне поля зрения и читается как «уже был здесь».
const OBSERVER_OPTIONS: IntersectionObserverInit = {
  rootMargin: '0px 0px -10% 0px',
  threshold: 0,
};

/**
 * Вызывает cb один раз — когда элемент впервые оказался в кадре — и отписывается.
 * Если IntersectionObserver недоступен, cb вызывается сразу: лучше показать
 * контент без анимации, чем не показать вовсе.
 */
export function onceInView(el: Element, cb: () => void): void {
  if (typeof IntersectionObserver === 'undefined') {
    cb();
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      cb();
    }
  }, OBSERVER_OPTIONS);

  observer.observe(el);
}
