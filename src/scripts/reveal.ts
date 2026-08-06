// Единый scroll-reveal: появление блока при первом входе в кадр.
// Разметочный контракт (CSS — в global.css, секция «SCROLL-REVEAL»):
//
//   <div data-reveal>…</div>          — одиночный блок, появляется целиком
//   <div data-reveal="group">         — контейнер: появляются прямые потомки
//     <article style="--reveal-i:0">  — со стаггером по индексу
//
// Скрипт делает ровно одну вещь: ставит data-revealed. Вся анимация — CSS
// (transition на opacity/transform), то есть композитится и не занимает main
// thread. GSAP здесь сознательно не используется: покадровый твин нужен только
// там, где прогресс привязан к скроллу, — это диаграмма ПРП, отдельный модуль.
//
// Пре-стейт (opacity 0) приезжает из CSS-каскада по классу .js-reveal, который
// ставит синхронный inline-скрипт в <head> BaseLayout, — тот же приём, что и
// .js-prp-animate. Синхронно, потому что иначе блоки успевают отрисоваться
// видимыми и на глазах гаснут.

import { onceInView, prefersReducedMotion } from './in-view';

declare global {
  interface Window {
    /** Страховочный таймер снятия пре-стейта; взводится в <head> BaseLayout. */
    __revealGuard?: number;
  }
}

const html = document.documentElement;

// Модуль доехал — страховка больше не нужна. Таймер снимаем ДО всех проверок:
// даже если reveal ниже решит не запускаться, снимать пре-стейт будем сами,
// а не по таймауту.
if (window.__revealGuard !== undefined) {
  window.clearTimeout(window.__revealGuard);
  delete window.__revealGuard;
}

if (prefersReducedMotion()) {
  // При reduce весь контент виден сразу. Класс снимаем, а не полагаемся на
  // @media-ветку в CSS: так пре-стейта не остаётся вообще ни в каком виде.
  html.classList.remove('js-reveal');
} else {
  const targets = document.querySelectorAll<HTMLElement>('[data-reveal]');
  targets.forEach((el) => {
    onceInView(el, () => el.setAttribute('data-revealed', ''));
  });
}
