// Анимация появления блока «Шаги по внедрению системы ПРП» (#prp-steps).
//
// Десктоп ≥1280px: при попадании stage в viewport проигрывается ОДИН РАЗ
// автоматический timeline (5 октагонов → 5 стрелок цикла → центральный
// кайдзен-орнамент с drawing-эффектом). Без pin, без scrub.
// Mobile/планшет: fade-in + slide каждого октагона при входе в viewport
// (один раз). prefers-reduced-motion: reduce — без анимации.
//
// Pre-state (opacity 0.15) задаётся синхронно из CSS-каскада через класс
// .js-prp-animate (ставится inline-script'ом в <head> BaseLayout).

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Все «магические» числа анимации собраны в один объект.
const A = {
  PRE_OPACITY: 0.15,
  OCT_START_SCALE: 0.85,
  OCT_DURATION: 0.4,
  ARROW_DURATION: 0.3,
  ORN_DRAW_DURATION: 0.7,
  ORN_FILL_DURATION: 0.5,
  ORN_STROKE_FADE_DURATION: 0.35,
  ORN_DRAW_STAGGER: 0.03,
  ORN_FILL_STAGGER: 0.025,
  MOBILE_DURATION: 0.6,
  MOBILE_STAGGER: 0.1,
  MOBILE_Y: 30,
  DESKTOP_TRIGGER: 'top 60%',
  MOBILE_TRIGGER: 'top 85%',
  PAUSE_BEFORE_ORN: '+=0.05',
  ORN_FILL_OVERLAP: '-=0.3',
  ORN_STROKE_OVERLAP: '-=0.15',
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
          desktopIntro: '(min-width: 1280px) and (prefers-reduced-motion: no-preference)',
          mobileFadeIn: '(max-width: 1279px) and (prefers-reduced-motion: no-preference)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        (ctx) => {
          const { desktopIntro, mobileFadeIn, reduceMotion } = ctx.conditions ?? {};
          // При reduce-motion CSS @media reduce уже даёт финальное состояние.
          if (reduceMotion) return;
          if (desktopIntro) return setupDesktopIntro(stage, octagons, desktopPaths, ornamentPaths);
          if (mobileFadeIn) return setupMobileFadeIn(octagons);
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

function setupDesktopIntro(
  stage: HTMLElement,
  octagons: NodeListOf<HTMLElement>,
  paths: NodeListOf<SVGPathElement>,
  ornamentPaths: NodeListOf<SVGPathElement>,
): void {
  try {
    setPreState(octagons, paths, ornamentPaths);
    const tl = gsap.timeline({ paused: true });
    buildArrowsTimeline(tl, octagons, paths);
    buildOrnamentTimeline(tl, ornamentPaths);
    ScrollTrigger.create({
      trigger: stage,
      start: A.DESKTOP_TRIGGER,
      once: true,
      onEnter: () => tl.play(),
    });
  } catch (e) {
    // Любая ошибка инициализации — возвращаем диаграмму в видимое состояние.
    dropPreState();
    forceVisibleState(octagons, paths, ornamentPaths);
    console.warn('[prp-diagram-scroll] desktop intro init failed:', e);
  }
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
  const octTween = { opacity: 1, scale: 1, duration: A.OCT_DURATION, ease: 'power2.out' };
  const arrowTween = { opacity: 1, duration: A.ARROW_DURATION, ease: 'power1.out' };
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

function setupMobileFadeIn(octagons: NodeListOf<HTMLElement>): void {
  gsap.set(octagons, { opacity: A.PRE_OPACITY, y: A.MOBILE_Y });
  ScrollTrigger.batch(octagons, {
    start: A.MOBILE_TRIGGER,
    once: true,
    onEnter: (els) =>
      gsap.to(els, {
        opacity: 1,
        y: 0,
        duration: A.MOBILE_DURATION,
        stagger: A.MOBILE_STAGGER,
        ease: 'power2.out',
        overwrite: true,
      }),
  });
}
