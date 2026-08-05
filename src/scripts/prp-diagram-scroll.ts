// Анимация блока «Шаги по внедрению системы ПРП» (#prp-steps).
// Окраска октагонов привязана к СКРОЛЛУ (scrub), а не к таймеру: прогресс
// прокрутки = прогресс окраски, движение обратимо при скролле вверх.
//
// ≥1280px («крест»): один общий scrub-timeline на всю диаграмму —
//   октагон 1 → стрелка → … → октагон 5 → замыкающая стрелка → кайдзен-орнамент
//   (draw + fill). Без pin: stage выше viewport, пиннить нечего.
//   Путь скролла считается от высоты stage (см. desktopScrollDistance).
// 768–1279px и <768px (вертикальная колонка): у каждого октагона собственный
//   scrub-триггер — карточка прокрашивается, пока проходит через экран.
//   Планшет и мобилка отличаются только точками start/end: доля экрана,
//   которую занимает карточка, там разная.
// prefers-reduced-motion: reduce — без анимации (финальное состояние из CSS).
//
// Pre-state (opacity 0.15) задаётся синхронно из CSS-каскада через класс
// .js-prp-animate (ставится inline-script'ом в <head> BaseLayout).

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Все «магические» числа анимации собраны в один объект.
const A = {
  PRE_OPACITY: 0.15,
  OCT_START_SCALE: 0.85,

  // --- Десктоп: доли безразмерного timeline, который растягивается на весь
  //     scrub-диапазон. Важны их ПРОПОРЦИИ, не абсолютные значения.
  OCT_DURATION: 0.4,
  ARROW_DURATION: 0.3,
  ORN_DRAW_DURATION: 0.7,
  ORN_FILL_DURATION: 0.5,
  ORN_STROKE_FADE_DURATION: 0.35,
  ORN_DRAW_STAGGER: 0.03,
  ORN_FILL_STAGGER: 0.025,
  PAUSE_BEFORE_ORN: '+=0.05',
  ORN_FILL_OVERLAP: '-=0.3',
  ORN_STROKE_OVERLAP: '-=0.15',

  DESKTOP_START: 'top 80%',
  DESKTOP_SCRUB: 0.6,
  // Путь скролла десктопной анимации = высота stage − 15% viewport
  // (к финалу низ «креста» почти у нижней кромки экрана), но не короче
  // 0.6 экрана и не длиннее 1.2 экрана — иначе на очень высоких/низких
  // viewport'ах анимация выходит либо рваной, либо бесконечной.
  DESKTOP_END_VH_OFFSET: 0.15,
  DESKTOP_END_MIN_VH: 0.6,
  DESKTOP_END_MAX_VH: 1.2,

  // --- Колонка (планшет/мобилка): собственный триггер на каждый октагон.
  COLUMN_START_SCALE: 0.94,
  COLUMN_SCRUB: 0.4,
  // Планшет: карточка (до 380px) занимает ~⅓ высоты экрана — докрашиваем,
  // когда она встаёт примерно по центру.
  TABLET_START: 'top 85%',
  TABLET_END: 'bottom 62%',
  // Мобилка: карточка занимает ~45% экрана — старт ниже, финал чуть раньше,
  // иначе низ карточки уезжает за кромку недокрашенным.
  MOBILE_START: 'top 90%',
  MOBILE_END: 'bottom 70%',
};

const html = document.documentElement;
const dropPreState = () => html.classList.remove('js-prp-animate');

gsap.registerPlugin(ScrollTrigger);

const section = document.getElementById('prp-steps');
if (!section) {
  dropPreState();
} else {
  const stage = section.querySelector<HTMLElement>('.prp-diagram-stage');
  const octagons = section.querySelectorAll<HTMLElement>('.prp-octagon');
  const desktopPaths = section.querySelectorAll<SVGPathElement>('.prp-arrows--desktop path');
  const ornamentPaths = section.querySelectorAll<SVGPathElement>('.prp-ornament__path');

  if (!stage || octagons.length !== 5) {
    dropPreState();
  } else {
    // Откладываем инициализацию до window.load — шрифты Inter могут прилететь позже,
    // ScrollTrigger корректно посчитает позиции только когда вся вёрстка осела.
    const init = () => {
      const mm = gsap.matchMedia();
      mm.add(
        {
          desktopScrub: '(min-width: 1280px) and (prefers-reduced-motion: no-preference)',
          tabletScrub:
            '(min-width: 768px) and (max-width: 1279px) and (prefers-reduced-motion: no-preference)',
          mobileScrub: '(max-width: 767px) and (prefers-reduced-motion: no-preference)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        (ctx) => {
          const { desktopScrub, tabletScrub, mobileScrub, reduceMotion } = ctx.conditions ?? {};
          // При reduce-motion CSS @media reduce уже даёт финальное состояние.
          if (reduceMotion) return;
          if (desktopScrub) return setupDesktopScrub(stage, octagons, desktopPaths, ornamentPaths);
          if (tabletScrub) return setupColumnScrub(octagons, A.TABLET_START, A.TABLET_END);
          if (mobileScrub) return setupColumnScrub(octagons, A.MOBILE_START, A.MOBILE_END);
        },
      );

      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => ScrollTrigger.refresh());
      }
    };

    if (document.readyState === 'complete') init();
    else window.addEventListener('load', init, { once: true });
  }
}

function setupDesktopScrub(
  stage: HTMLElement,
  octagons: NodeListOf<HTMLElement>,
  paths: NodeListOf<SVGPathElement>,
  ornamentPaths: NodeListOf<SVGPathElement>,
): void {
  try {
    setPreState(octagons, paths, ornamentPaths);
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: stage,
        start: A.DESKTOP_START,
        // Функция, а не строка: пересчитывается на каждом ScrollTrigger.refresh()
        // (resize, дозагрузка шрифтов, смена ориентации).
        end: () => `+=${desktopScrollDistance(stage)}`,
        scrub: A.DESKTOP_SCRUB,
        invalidateOnRefresh: true,
      },
    });
    buildArrowsTimeline(tl, octagons, paths);
    buildOrnamentTimeline(tl, ornamentPaths);
  } catch (e) {
    // Любая ошибка инициализации — возвращаем диаграмму в видимое состояние.
    dropPreState();
    forceVisibleState(octagons, paths, ornamentPaths);
    console.warn('[prp-diagram-scroll] desktop scrub init failed:', e);
  }
}

// Длина scrub-диапазона десктопной анимации в пикселях скролла.
// Старт — верх stage на 80% экрана; финал — низ stage почти у нижней кромки.
function desktopScrollDistance(stage: HTMLElement): number {
  const vh = window.innerHeight || 800;
  const raw = stage.offsetHeight - vh * A.DESKTOP_END_VH_OFFSET;
  const min = vh * A.DESKTOP_END_MIN_VH;
  const max = vh * A.DESKTOP_END_MAX_VH;
  return Math.round(Math.min(Math.max(raw, min), max));
}

function setPreState(
  octagons: NodeListOf<HTMLElement>,
  paths: NodeListOf<SVGPathElement>,
  ornamentPaths: NodeListOf<SVGPathElement>,
): void {
  gsap.set(octagons, {
    opacity: A.PRE_OPACITY,
    scale: A.OCT_START_SCALE,
    transformOrigin: 'center center',
  });
  gsap.set(paths, { opacity: A.PRE_OPACITY });
  if (ornamentPaths.length) {
    gsap.set(ornamentPaths, {
      strokeDasharray: 1,
      strokeDashoffset: 1,
      fillOpacity: 0,
      strokeOpacity: 1,
    });
  }
}

function buildArrowsTimeline(
  tl: gsap.core.Timeline,
  octagons: NodeListOf<HTMLElement>,
  paths: NodeListOf<SVGPathElement>,
): void {
  // paths[i] совпадает с порядком в SVG:
  //   [0] 1→2 прямая, [1] 2→3, [2] 3→4, [3] 4→5, [4] 5→2 замыкание цикла.
  const octTween = { opacity: 1, scale: 1, duration: A.OCT_DURATION, ease: 'power1.out' };
  const arrowTween = { opacity: 1, duration: A.ARROW_DURATION };
  tl.to(octagons[0], octTween)
    .to(paths[0], arrowTween)
    .to(octagons[1], octTween)
    .to(paths[1], arrowTween)
    .to(octagons[2], octTween)
    .to(paths[2], arrowTween)
    .to(octagons[3], octTween)
    .to(paths[3], arrowTween)
    .to(octagons[4], octTween)
    .to(paths[4], arrowTween)
    .set(paths, { opacity: 1 });
}

function buildOrnamentTimeline(
  tl: gsap.core.Timeline,
  ornamentPaths: NodeListOf<SVGPathElement>,
): void {
  if (!ornamentPaths.length) return;
  tl.to(
    ornamentPaths,
    {
      strokeDashoffset: 0,
      duration: A.ORN_DRAW_DURATION,
      stagger: A.ORN_DRAW_STAGGER,
      ease: 'power2.inOut',
    },
    A.PAUSE_BEFORE_ORN,
  )
    .to(
      ornamentPaths,
      {
        fillOpacity: 1,
        duration: A.ORN_FILL_DURATION,
        stagger: A.ORN_FILL_STAGGER,
        ease: 'power1.out',
      },
      A.ORN_FILL_OVERLAP,
    )
    .to(
      ornamentPaths,
      {
        strokeOpacity: 0,
        duration: A.ORN_STROKE_FADE_DURATION,
        ease: 'power1.out',
      },
      A.ORN_STROKE_OVERLAP,
    );
}

function forceVisibleState(
  octagons: NodeListOf<HTMLElement>,
  paths: NodeListOf<SVGPathElement>,
  ornamentPaths: NodeListOf<SVGPathElement>,
): void {
  gsap.set(octagons, { opacity: 1, scale: 1, clearProps: 'transform' });
  gsap.set(paths, { opacity: 1 });
  if (ornamentPaths.length) {
    gsap.set(ornamentPaths, {
      strokeDasharray: 'none',
      strokeDashoffset: 0,
      fillOpacity: 1,
      strokeOpacity: 0,
    });
  }
}

// Вертикальная колонка (<1280px): каждый октагон — свой scrub-триггер.
// Соединительная линия и стрелка вниз — псевдоэлементы самого <li>,
// поэтому прокрашиваются вместе с карточкой, отдельная анимация не нужна.
function setupColumnScrub(
  octagons: NodeListOf<HTMLElement>,
  start: string,
  end: string,
): void {
  try {
    octagons.forEach((oct) => {
      gsap.fromTo(
        oct,
        { opacity: A.PRE_OPACITY, scale: A.COLUMN_START_SCALE },
        {
          opacity: 1,
          scale: 1,
          ease: 'none',
          transformOrigin: 'center center',
          scrollTrigger: {
            trigger: oct,
            start,
            end,
            scrub: A.COLUMN_SCRUB,
            invalidateOnRefresh: true,
          },
        },
      );
    });
  } catch (e) {
    dropPreState();
    gsap.set(octagons, { opacity: 1, scale: 1, clearProps: 'transform' });
    console.warn('[prp-diagram-scroll] column scrub init failed:', e);
  }
}
