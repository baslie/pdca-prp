// Бегущие ряды блока «Отзывы» — JS-двигатель с драгом.
//
// CSS @keyframes marquee-l/r остаются в global.css как no-JS-фолбэк, но при
// живом скрипте лента едет отсюда: драг и бесконечный цикл в одном transform
// с CSS-анимацией не совместимы (двойной translateX). Класс .marquee.is-js
// снимает CSS-анимацию и ставит touch-action: pan-y (вертикальный свайп по
// ленте скроллит страницу нативно).
//
// Механика: позиция pos (px) оборачивается gsap.utils.wrap(-half, 0), где
// half — ширина одного набора карточек (трек их несёт ×2, см. Reviews.astro).
// Тик живёт в общем gsap.ticker (правило проекта: второй rAF-цикл не заводить,
// Lenis крутится там же). Скорость лерпится к цели: авто-ход ↔ 0 на
// hover/фокусе/драге, инерция броска затухает к авто-ходу сама.
//
// prefers-reduced-motion: скрипт не инициализируется вовсе — работает
// CSS-фолбэк (ряды статичны, overflow-x: auto, дубли скрыты).

import { gsap } from 'gsap';
import { Observer } from 'gsap/Observer';
import { prefersReducedMotion } from './in-view';

/** Порог, после которого жест считается драгом, а не кликом (px суммарно). */
const DRAG_THRESHOLD = 10;
/** Потолок скорости броска — защита от «улетевшей» ленты (px/s). */
const MAX_FLING = 4000;
/** Постоянная времени лерпа скорости: ~задаёт длительность разгона/торможения. */
const LERP_TAU_S = 0.45;

if (!prefersReducedMotion()) {
  gsap.registerPlugin(Observer);
  document.querySelectorAll<HTMLElement>('.marquee').forEach(initMarquee);
}

function initMarquee(marquee: HTMLElement): void {
  const track = marquee.querySelector<HTMLElement>('.marquee__track');
  if (!track) return;

  marquee.classList.add('is-js');

  // Скорость и направление — из тех же источников, что у CSS-анимации:
  // --marquee-dur (110s/150s/125s) и модификатор реверса.
  const durS = parseFloat(getComputedStyle(track).getPropertyValue('--marquee-dur')) || 120;
  const dir = track.classList.contains('marquee__track--r') ? 1 : -1;

  let half = track.scrollWidth / 2;
  let wrap = gsap.utils.wrap(-half, 0);
  let vBase = (dir * half) / durS;

  let pos = 0;
  let v = vBase; // текущая скорость, px/s
  let dragging = false;
  let hoverPaused = false;
  let focusPaused = false;
  let dragTotal = 0;
  let dragged = false;

  const vTarget = () => (dragging || hoverPaused || focusPaused ? 0 : vBase);

  // Брейкпоинт md меняет ширину карточек (300 → 360px) — половина трека
  // пересчитывается, позиция оборачивается заново, чтобы стык не порвался.
  new ResizeObserver(() => {
    half = track.scrollWidth / 2;
    wrap = gsap.utils.wrap(-half, 0);
    vBase = (dir * half) / durS;
    pos = wrap(pos);
  }).observe(track);

  gsap.ticker.add((_time, deltaMs) => {
    const dt = deltaMs / 1000;
    // Экспоненциальный лерп к целевой скорости: и плавная пауза на hover,
    // и затухание инерции броска — одна формула.
    v += (vTarget() - v) * (1 - Math.exp(-dt / LERP_TAU_S));
    if (v !== 0) {
      pos = wrap(pos + v * dt);
      gsap.set(track, { x: pos });
    }
  });

  Observer.create({
    target: marquee,
    type: 'pointer,touch',
    onPress: () => {
      dragging = true;
      dragTotal = 0;
      dragged = false;
      v = 0; // зажали — лента встала под пальцем
    },
    onDrag: (self) => {
      dragTotal += Math.abs(self.deltaX);
      if (dragTotal > DRAG_THRESHOLD) dragged = true;
      pos = wrap(pos + self.deltaX);
      gsap.set(track, { x: pos });
    },
    onRelease: (self) => {
      dragging = false;
      // Бросок: стартуем с его скоростью, лерп сам вернёт к авто-ходу.
      v = gsap.utils.clamp(-MAX_FLING, MAX_FLING, self.velocityX);
    },
  });

  // Драг не должен открывать модалку отзыва: гасим click, родившийся из
  // протяжки, в capture-фазе — раньше делегированного слушателя reviews.ts
  // (тот дополнительно проверяет e.defaultPrevented).
  marquee.addEventListener(
    'click',
    (e) => {
      if (!dragged) return;
      dragged = false;
      e.preventDefault();
      e.stopPropagation();
    },
    { capture: true },
  );

  // Пауза на наведении переезжает из CSS (animation-play-state не действует
  // на JS-transform). Гейт hover: на таче pointerenter фабрикуется тапом.
  if (window.matchMedia('(hover: hover)').matches) {
    marquee.addEventListener('pointerenter', () => {
      hoverPaused = true;
    });
    marquee.addEventListener('pointerleave', () => {
      hoverPaused = false;
    });
  }
  // Пауза и при клавиатурной фокусировке карточки внутри ряда.
  marquee.addEventListener('focusin', () => {
    focusPaused = true;
  });
  marquee.addEventListener('focusout', () => {
    focusPaused = false;
  });
}
