// Шапка (Header.astro): три обязанности одного модуля.
//   1. Sticky-переключение top ↔ scrolled — IntersectionObserver на сентинел,
//      без scroll-листенера (их в проекте нет намеренно).
//   2. Бургер-оверлей — свой, не <dialog>/setupModal: закрытый dialog —
//      display:none, а <nav> обязан жить в DOM одним экземпляром для всех
//      трёх состояний (SEO-требование). Лок скролла переиспользует
//      body.modal-open из modal.ts/global.css.
//   3. Scrollspy — повторяющийся IntersectionObserver (onceInView из
//      in-view.ts не годится: он одноразовый).

import { lenis } from './smooth-scroll';

const header = document.getElementById('site-header');
const nav = document.getElementById('site-nav');
const sentinel = document.getElementById('header-sentinel');
const burger = header?.querySelector<HTMLButtonElement>('.site-burger') ?? null;
const panel = nav?.querySelector<HTMLElement>('.site-nav__panel') ?? null;

if (header && nav && burger && panel) {
  // ---------- 1. Sticky: top <-> scrolled ----------

  const setState = (scrolled: boolean) => {
    const next = scrolled ? 'scrolled' : 'top';
    if (header.dataset.state !== next) header.dataset.state = next;
  };

  // Транзишены шапки включаются классом .is-armed кадром ПОЗЖЕ применения
  // начального состояния: F5 в середине страницы показывает компактную
  // панель сразу, без анимации «съезжания».
  const arm = () => {
    if (!header.classList.contains('is-armed')) {
      requestAnimationFrame(() => header.classList.add('is-armed'));
    }
  };

  if (sentinel && typeof IntersectionObserver !== 'undefined') {
    new IntersectionObserver(
      (entries) => {
        const e = entries[entries.length - 1]!;
        if (e.intersectionRatio >= 0.999) setState(false); // полоса видна целиком — у верха
        else if (!e.isIntersecting) setState(true); // полоса ушла — скролл начался
        // Частичное пересечение — гистерезис: состояние держится, мерцания нет.
        arm();
      },
      { threshold: [0, 1] },
    ).observe(sentinel);
  } else {
    // Без IO жертвуем анимацией, но не навигацией: панель всегда компактная.
    setState(true);
    arm();
  }

  // ---------- 2. Бургер ----------

  const mqDesktop = window.matchMedia('(min-width: 80rem)');
  const isOpen = () => header.dataset.menu === 'open';

  // inert на всё, кроме шапки: фокус и скринридер не проваливаются под
  // открытый оверлей. Скрипты не трогаем — inert им безразличен, но чужие
  // атрибуты аккуратнее не множить.
  let inerted: Element[] = [];
  const setInert = (on: boolean) => {
    if (on) {
      inerted = [...document.body.children].filter(
        (el) => el !== header && !(el instanceof HTMLScriptElement),
      );
      inerted.forEach((el) => el.setAttribute('inert', ''));
    } else {
      inerted.forEach((el) => el.removeAttribute('inert'));
      inerted = [];
    }
  };

  const openMenu = () => {
    header.dataset.menu = 'open';
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Закрыть меню');
    document.body.classList.add('modal-open'); // body.modal-open { overflow: hidden }
    lenis?.stop(); // класс — фолбэк (reduce-ветка); wheel держит сам Lenis
    setInert(true);
    // Фокус — следующим кадром: в этот момент оверлей ещё visibility: hidden
    // (браузер не успел пересчитать стиль), а focus() по невидимому элементу
    // молча игнорируется.
    requestAnimationFrame(() => panel.querySelector<HTMLAnchorElement>('a')?.focus());
  };

  const closeMenu = (returnFocus = true) => {
    if (!isOpen()) return;
    header.dataset.menu = 'closed';
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Открыть меню');
    document.body.classList.remove('modal-open');
    lenis?.start();
    setInert(false);
    if (returnFocus) burger.focus();
  };

  burger.addEventListener('click', () => (isOpen() ? closeMenu() : openMenu()));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) closeMenu();
  });

  // Клик в пустую зону оверлея (мимо блока пунктов) — закрыть.
  nav.addEventListener('click', (e) => {
    if (isOpen() && e.target instanceof Node && !panel.contains(e.target)) closeMenu();
  });

  // Клик по ЛЮБОЙ ссылке шапки при открытом меню (пункт, телефон, почта,
  // мини-лого «Наверх») — закрыть ДО перехода: лок снят (lenis.start()),
  // а обработчик якорей из smooth-scroll.ts висит на document и по всплытию
  // сработает ПОСЛЕ этого — скролл стартует на разблокированной странице.
  header.addEventListener('click', (e) => {
    const link = e.target instanceof Element ? e.target.closest('a') : null;
    if (link && isOpen()) closeMenu(false);
  });

  // Ресайз через брейкпоинт при открытом меню: на xl+ оверлея не существует —
  // закрываем, чтобы не остаться с локом скролла и inert без видимого меню.
  mqDesktop.addEventListener('change', (e) => {
    if (e.matches) closeMenu(false);
  });

  // ---------- 3. Scrollspy ----------

  const links = [...nav.querySelectorAll<HTMLAnchorElement>('.site-nav__link')];
  const targets = links
    .map((a) => document.getElementById(a.hash.slice(1)))
    .filter((el): el is HTMLElement => el !== null);

  // Активен ПОСЛЕДНИЙ пункт, чья секция началась выше линии 30% вьюпорта.
  // Так промежуточные секции без своего пункта (#video, #offer-stats,
  // #certificate, #clients, #training-photos) держат подсветку предыдущего
  // пункта, а не гасят её. IO — лишь триггер на пересечении границ,
  // пересчёт по rect'ам шести элементов дёшев.
  const recompute = () => {
    const line = window.innerHeight * 0.3;
    let active: string | null = null;
    for (const el of targets) {
      if (el.getBoundingClientRect().top <= line) active = el.id;
    }
    links.forEach((a) => {
      if (active && a.hash === `#${active}`) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  };

  if (targets.length > 0 && typeof IntersectionObserver !== 'undefined') {
    const spy = new IntersectionObserver(recompute, {
      // Зона наблюдения — от линии 30% до низа вьюпорта. Колбэк приходит,
      // когда секция входит в неё снизу или выходит сверху, то есть ровно
      // на границах секций, а не на каждый пиксель скролла.
      // Узкая полоса вокруг самой линии тут не годится: мгновенный прыжок
      // (переход по якорю, восстановление позиции при F5) может её
      // перескочить, набор пересечений не изменится — и подсветка залипнет.
      rootMargin: '-30% 0px 0px 0px',
      threshold: 0,
    });
    targets.forEach((el) => spy.observe(el));
    window.addEventListener('resize', recompute, { passive: true });
    // Прыжок по якорю внутри одной секции набора пересечений не меняет —
    // IO промолчит, поэтому пересчитываем ещё и по смене хэша.
    window.addEventListener('hashchange', recompute);
    // Заход сразу по якорю (…/#reviews): к моменту первого расчёта ленивые
    // картинки ленты ещё не догружены, секции доезжают до своих мест позже.
    // Позиция скролла при этом уже конечная, событий IO больше не будет —
    // поэтому финальный пересчёт по load.
    window.addEventListener('load', recompute);
    recompute();
  }
}
