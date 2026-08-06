// Набегание четырёх цифр в блоке «Мы предлагаем» (#offer-stats):
// 22 / 17 / 850 / 13 000 растут от нуля, когда группа карточек входит в кадр.
//
// Единственный «эффект» на сайте помимо диаграммы ПРП, и он смысловой: цифры
// здесь — аргумент, набегание заставляет их прочитать, а не проскочить.
//
// GSAP взят потому, что он уже в бандле (диаграмма ПРП) — Vite отдаёт общий
// чанк, новых килобайт ноль. Интерполировать число CSS-транзишном нельзя,
// так что это единственное место на сайте, где появление считает JS.
//
// В разметке лежит УЖЕ финальное значение (см. OfferStats.astro): без JS,
// при ошибке загрузки чанка и для краулеров цифра сразу правильная.

import { gsap } from 'gsap';
import { onceInView, prefersReducedMotion } from './in-view';

const DURATION = 1.2;
// power2.out: почти весь путь проходится в начале, финиш мягкий. Число должно
// быстро стать «крупным» и спокойно доехать до точного значения, а не ползти
// равномерно все 1,2 с.
const EASE = 'power2.out';

// Тот же разделитель разрядов, что и в OfferStats.astro. Разъедутся формулы —
// цифра дёрнется в момент финиша, когда JS-значение сменится вёрсточным.
const format = (n: number): string =>
  String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const group = document.querySelector<HTMLElement>('[data-stats]');
const numbers = group
  ? Array.from(group.querySelectorAll<HTMLElement>('[data-count-to]'))
  : [];

// Ничего не делаем и при reduce: в разметке уже стоит финальное значение.
if (group && numbers.length && !prefersReducedMotion()) {
  onceInView(group, () => {
    numbers.forEach((el) => {
      const target = Number(el.dataset.countTo);
      if (!Number.isFinite(target)) return;

      const state = { value: 0 };
      el.textContent = format(0);

      gsap.to(state, {
        value: target,
        duration: DURATION,
        ease: EASE,
        onUpdate: () => {
          el.textContent = format(Math.round(state.value));
        },
        // Финальный кадр ставим явно: округление промежуточного значения
        // может не дать ровно target на последнем тике.
        onComplete: () => {
          el.textContent = format(target);
        },
      });
    });
  });
}
