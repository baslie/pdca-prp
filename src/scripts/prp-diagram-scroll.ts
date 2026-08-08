// Анимация блока «Шаги по внедрению системы ПРП» (#prp-steps).
// Окраска октагонов привязана к СКРОЛЛУ (scrub), а не к таймеру: прогресс
// прокрутки = прогресс окраски, движение обратимо при скролле вверх.
//
// ДИАПАЗОН — один и тот же на всех ширинах:
//   финиш  — нижний край секции дошёл до нижней кромки окна ('bottom bottom');
//   старт  — на BLOCK_LEAD_VH экрана РАНЬШЕ, чем верх секции упрётся в верхнюю
//            кромку окна, то есть блок к этому моменту уже наполовину в кадре.
// Финиш прибит к 'bottom bottom' намеренно: растягивать диапазон в конец нельзя,
// иначе центр «креста» (кайдзен-орнамент рисуется последним) уезжает за верхнюю
// кромку и дорисовывается вне кадра. Поэтому вся добавочная длина — в начало.
// Путь = высота секции − высота окна + запас, считается функцией
// (blockScrollDistance) и пересматривается на каждом refresh.
// Разводить константы по брейкпоинтам не нужно: формула самомасштабируется —
// на десктопе путь ~1100px, на планшете ~2100px, на мобилке ~1850px.
//
// Содержимое timeline зависит от раскладки:
//   ≥1280px («крест»)  — октагон 1 → стрелка → … → октагон 5 → замыкающая
//                        стрелка → кайдзен-орнамент (draw + fill). Без pin:
//                        stage выше окна, пиннить нечего.
//   <1280px (колонка)  — только 5 октагонов равными долями. Красные
//                        соединители (псевдоэлементы <li>) видны сразу:
//                        они часть контурной схемы, скролл её лишь заливает.
// prefers-reduced-motion: reduce — без анимации (финальное состояние из CSS).
//
// Октагон анимируется «заливкой из центра»: слой .prp-octagon__shape--fill
// растёт scale 0 → 1, цвет текста на .prp-octagon__body тем же твином идёт
// из фирменного синего в белый. Pre-state (пустой контур + синий текст)
// задаётся синхронно из CSS-каскада через класс .js-prp-animate
// (ставится inline-script'ом в <head> BaseLayout).

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Все «магические» числа анимации собраны в один объект.
const A = {
  PRE_OPACITY: 0.15,

  // --- Диапазон скролла (общий для всех раскладок).
  // Насколько раньше 'top top' стартует окраска, в долях экрана. Это ручка
  // СКОРОСТИ: чем больше, тем длиннее путь и тем медленнее заливаются октагоны
  // (финиш при этом не двигается). 0.55 даёт ~96px скролла на октагон при
  // 1920×1080 против ~46px у варианта без запаса.
  BLOCK_LEAD_VH: 0.55,
  // Пол на случай, если секция окажется ниже окна (очень высокий viewport):
  // без него 'bottom bottom' наступил бы раньше старта и вся окраска
  // схлопнулась бы в один кадр.
  BLOCK_MIN_VH: 0.9,
  // Инерция догона: при быстрой прокрутке окраска доезжает плавно, а не рывком.
  SCRUB: 1,

  // --- Доли безразмерного timeline, который растягивается на весь диапазон.
  //     Важны их ПРОПОРЦИИ, не абсолютные значения.
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

  // --- Колонка: карточка крупная, равные доли на октагон.
  COLUMN_OCT_DURATION: 1,
};

const html = document.documentElement;
const dropPreState = () => html.classList.remove('js-prp-animate');

// Цвет пре-стейта текста — из токена, не хексом: правка --color-brand-blue
// в @theme не должна требовать правки скрипта.
const brandBlue = () =>
  getComputedStyle(html).getPropertyValue('--color-brand-blue').trim() || '#003154';

gsap.registerPlugin(ScrollTrigger);

const section = document.getElementById('prp-steps');
if (!section) {
  dropPreState();
} else {
  const stage = section.querySelector<HTMLElement>('.prp-diagram-stage');
  const octagons = section.querySelectorAll<HTMLElement>('.prp-octagon');
  // Индексы fills/bodies совпадают с octagons: по одному слою на <li>.
  const fills = section.querySelectorAll<SVGSVGElement>('.prp-octagon__shape--fill');
  const bodies = section.querySelectorAll<HTMLElement>('.prp-octagon__body');
  // Только прямые потомки <svg>. Без '>' первым в выборку попадал <path>
  // наконечника внутри <defs><marker> — он забирал индекс [0], всё смещалось
  // на единицу, и замыкающая стрелка 5->2 выпадала из timeline: вместо того,
  // чтобы приехать по очереди, она вспыхивала разом на финальном .set().
  // Тот же селектор продублирован в CSS-пре-стейте (global.css).
  const desktopPaths = section.querySelectorAll<SVGPathElement>('.prp-arrows--desktop > path');
  const ornamentPaths = section.querySelectorAll<SVGPathElement>('.prp-ornament__path');

  if (!stage || octagons.length !== 5 || fills.length !== 5 || bodies.length !== 5) {
    dropPreState();
  } else {
    // Инициализируем СРАЗУ: бандл — type=module, выполняется после парсинга DOM.
    // Ждать window.load нельзя — зависший субресурс (iframe BoomStream при VPN
    // у посетителя) откладывает load бесконечно, и блок навсегда остался бы
    // в pre-state (opacity 0.15). Поздняя догрузка шрифтов не страшна:
    //  - ScrollTrigger сам делает refresh() по window.load (autoRefreshEvents);
    //  - document.fonts.ready ниже даёт ещё один refresh после шрифтов;
    //  - end задан функцией + invalidateOnRefresh — диапазон пересчитывается
    //    на каждом refresh.
    const init = () => {
      const mm = gsap.matchMedia();
      // Порог 1280px обязан байт-в-байт совпадать с @media композиции «КРЕСТ»
      // в global.css (поэтому оба в px, а не в rem). Меняешь — меняй синхронно.
      mm.add(
        {
          desktopScrub: '(min-width: 1280px) and (prefers-reduced-motion: no-preference)',
          columnScrub: '(max-width: 1279px) and (prefers-reduced-motion: no-preference)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        (ctx) => {
          const { desktopScrub, columnScrub, reduceMotion } = ctx.conditions ?? {};
          // При reduce-motion CSS @media reduce уже даёт финальное состояние.
          if (reduceMotion) return;
          if (desktopScrub) {
            return setupDesktopScrub(section, fills, bodies, desktopPaths, ornamentPaths);
          }
          if (columnScrub) return setupColumnScrub(section, fills, bodies);
        },
      );

      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => ScrollTrigger.refresh());
      }
    };

    init();
  }
}

// Общий scroll-диапазон: стартует, когда верх секции ещё не дошёл до верхней
// кромки на BLOCK_LEAD_VH экрана, финиширует на «низ секции у низа окна».
// Возвращает готовый timeline, к которому вызывающий доклеивает свои tween'ы.
function createBlockTimeline(section: HTMLElement): gsap.core.Timeline {
  return gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: section,
      // start и end считаются из одной константы, чтобы запас, добавленный в
      // начало, ровно на столько же удлинял путь — и финиш оставался на
      // 'bottom bottom'.
      start: `top ${Math.round(A.BLOCK_LEAD_VH * 100)}%`,
      // Функции, а не строки: пересчитываются на каждом ScrollTrigger.refresh()
      // (resize, дозагрузка шрифтов, смена ориентации).
      end: () => `+=${blockScrollDistance(section)}`,
      scrub: A.SCRUB,
      invalidateOnRefresh: true,
    },
  });
}

// Длина диапазона в пикселях скролла: от старта до момента 'bottom bottom',
// но не короче BLOCK_MIN_VH экрана.
function blockScrollDistance(section: HTMLElement): number {
  const vh = window.innerHeight || 800;
  const toBottom = section.offsetHeight - vh + vh * A.BLOCK_LEAD_VH;
  return Math.round(Math.max(toBottom, vh * A.BLOCK_MIN_VH));
}

function setupDesktopScrub(
  section: HTMLElement,
  fills: NodeListOf<SVGSVGElement>,
  bodies: NodeListOf<HTMLElement>,
  paths: NodeListOf<SVGPathElement>,
  ornamentPaths: NodeListOf<SVGPathElement>,
): void {
  try {
    setPreState(fills, bodies, paths, ornamentPaths);
    const tl = createBlockTimeline(section);
    buildArrowsTimeline(tl, fills, bodies, paths);
    buildOrnamentTimeline(tl, ornamentPaths);
  } catch (e) {
    // Любая ошибка инициализации — возвращаем диаграмму в видимое состояние.
    dropPreState();
    forceVisibleState(fills, bodies, paths, ornamentPaths);
    console.warn('[prp-diagram-scroll] desktop scrub init failed:', e);
  }
}

// Вертикальная колонка (<1280px): те же 5 октагонов, но равными долями
// диапазона. Позиции карточек в колонке распределены равномерно, поэтому
// равномерный timeline попадает почти в такт: карточка начинает заливаться,
// когда выходит из-за нижней кромки, и дозаливается вскоре после того,
// как оказалась в кадре целиком.
function setupColumnScrub(
  section: HTMLElement,
  fills: NodeListOf<SVGSVGElement>,
  bodies: NodeListOf<HTMLElement>,
): void {
  try {
    gsap.set(fills, { scale: 0, transformOrigin: '50% 50%' });
    gsap.set(bodies, { color: brandBlue() });
    const tl = createBlockTimeline(section);
    fills.forEach((fill, i) => {
      tl.to(fill, { scale: 1, duration: A.COLUMN_OCT_DURATION, ease: 'power1.out' }).to(
        bodies[i],
        { color: '#fff', duration: A.COLUMN_OCT_DURATION, ease: 'none' },
        '<',
      );
    });
  } catch (e) {
    dropPreState();
    gsap.set(fills, { clearProps: 'transform' });
    gsap.set(bodies, { clearProps: 'color' });
    console.warn('[prp-diagram-scroll] column scrub init failed:', e);
  }
}

// Стартовое состояние заливки/текста дублирует CSS-пре-стейт .js-prp-animate
// явным set'ом: scrub-таймлайн с invalidateOnRefresh перечитывает старты,
// и они должны быть детерминированы, а не зависеть от момента снятия класса.
function setPreState(
  fills: NodeListOf<SVGSVGElement>,
  bodies: NodeListOf<HTMLElement>,
  paths: NodeListOf<SVGPathElement>,
  ornamentPaths: NodeListOf<SVGPathElement>,
): void {
  gsap.set(fills, { scale: 0, transformOrigin: '50% 50%' });
  gsap.set(bodies, { color: brandBlue() });
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
  fills: NodeListOf<SVGSVGElement>,
  bodies: NodeListOf<HTMLElement>,
  paths: NodeListOf<SVGPathElement>,
): void {
  // paths[i] совпадает с порядком в SVG (селектор берёт только прямых
  // потомков <svg>, наконечник из <defs><marker> в выборку не попадает):
  //   [0] 1→2 прямая, [1] 2→3, [2] 3→4, [3] 4→5, [4] 5→2 замыкание цикла.
  // Наконечники отдельно не гасим: marker рисуется в контексте своей линии,
  // её opacity распространяется и на него — стрелка приезжает целиком.
  // Заливка и цвет текста октагона идут парой на одну позицию ('<'):
  // текст белеет ровно пока растёт синий фон под ним.
  const arrowTween = { opacity: 1, duration: A.ARROW_DURATION };
  const step = (i: number) =>
    tl
      .to(fills[i], { scale: 1, duration: A.OCT_DURATION, ease: 'power1.out' })
      .to(bodies[i], { color: '#fff', duration: A.OCT_DURATION, ease: 'none' }, '<');
  step(0).to(paths[0], arrowTween);
  step(1).to(paths[1], arrowTween);
  step(2).to(paths[2], arrowTween);
  step(3).to(paths[3], arrowTween);
  step(4).to(paths[4], arrowTween);
  tl.set(paths, { opacity: 1 });
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

// Аварийный сброс: clearProps снимает inline-стили GSAP, а dropPreState
// (вызывается рядом) убирает класс — базовый CSS и есть финальное «залито».
function forceVisibleState(
  fills: NodeListOf<SVGSVGElement>,
  bodies: NodeListOf<HTMLElement>,
  paths: NodeListOf<SVGPathElement>,
  ornamentPaths: NodeListOf<SVGPathElement>,
): void {
  gsap.set(fills, { clearProps: 'transform' });
  gsap.set(bodies, { clearProps: 'color' });
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
