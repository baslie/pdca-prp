// Анимация появления блока «Шаги по внедрению системы ПРП» (#prp-steps).
//
// Десктоп ≥1280px: при попадании stage в viewport проигрывается ОДИН РАЗ
// автоматический timeline (5 октагонов → 5 стрелок цикла → центральный
// кайдзен-орнамент с drawing-эффектом). Без pin, без scrub — секция не
// залипает при скролле, повторного проигрывания при возврате нет.
// Mobile/планшет: fade-in + slide каждого октагона при входе в viewport
// (один раз). prefers-reduced-motion: reduce — без анимации.
//
// Pre-state (opacity 0.15) задаётся синхронно из CSS-каскада через класс
// .js-prp-animate (ставится inline-script'ом в <head>, см. index.html).
// Это даёт пользователю при F5 увидеть призрачную полупрозрачную схему,
// а не вспышку «финальное → пустота → отрисовка заново». Этот же файл
// СНИМАЕТ класс, если GSAP/ScrollTrigger не загрузились или init упал —
// тогда CSS-каскад уберёт 15% и пользователь увидит обычный полный блок.
//
// Орнамент (.prp-ornament — inline SVG с 12 path'ами .prp-ornament__path):
// 3 фазы — обводка лучей по очереди (stroke-dashoffset 1→0, stagger),
// проявление заливки (fill-opacity 0→1), растворение обводки (stroke-opacity
// 1→0). Финальная картинка неотличима от исходного symbol.svg.
(function () {
  // Все «магические» числа анимации собраны в один объект — править тайминги
  // и точки триггера в одной точке, не выискивая по файлу. Имена коротких
  // префиксом: A.* — animation/tuning, без сокращений.
  const A = {
    PRE_OPACITY:              0.15,  // парный с CSS-правилом .js-prp-animate
    OCT_START_SCALE:          0.85,  // лёгкое «приближение» октагона
    OCT_DURATION:             0.4,
    ARROW_DURATION:           0.3,
    ORN_DRAW_DURATION:        0.7,
    ORN_FILL_DURATION:        0.5,
    ORN_STROKE_FADE_DURATION: 0.35,
    ORN_DRAW_STAGGER:         0.03,
    ORN_FILL_STAGGER:         0.025,
    MOBILE_DURATION:          0.6,
    MOBILE_STAGGER:           0.1,
    MOBILE_Y:                 30,   // лёгкий слайд снизу для мобильного fade-in
    DESKTOP_TRIGGER:          'top 60%',
    MOBILE_TRIGGER:           'top 85%',
    PAUSE_BEFORE_ORN:         '+=0.05',  // микропауза перед обводкой орнамента
    ORN_FILL_OVERLAP:         '-=0.3',   // заливка стартует до конца обводки
    ORN_STROKE_OVERLAP:       '-=0.15'   // растворение обводки — внахлёст с заливкой
  };

  const html = document.documentElement;
  const dropPreState = () => html.classList.remove('js-prp-animate');

  if (!window.gsap || !window.ScrollTrigger) { dropPreState(); return; }
  gsap.registerPlugin(ScrollTrigger);

  const section = document.getElementById('prp-steps');
  if (!section) { dropPreState(); return; }
  const stage         = section.querySelector('.prp-diagram-stage');
  const octagons      = section.querySelectorAll('.prp-octagon');
  const desktopPaths  = section.querySelectorAll('.prp-arrows--desktop path');
  const ornamentPaths = section.querySelectorAll('.prp-ornament__path');
  if (!stage || octagons.length !== 5) { dropPreState(); return; }

  // Откладываем инициализацию до window.load — Tailwind CDN JIT-компилирует
  // стили в браузере, шрифты Inter могут прилететь позже, Lucide заменяет
  // <i data-lucide> на SVG (меняет высоту страницы выше секции). На load
  // всё это уже зафиксировано — ScrollTrigger корректно посчитает позиции.
  const init = () => {
    const mm = gsap.matchMedia();
    mm.add({
      desktopIntro: '(min-width: 1280px) and (prefers-reduced-motion: no-preference)',
      mobileFadeIn: '(max-width: 1279px) and (prefers-reduced-motion: no-preference)',
      reduceMotion: '(prefers-reduced-motion: reduce)'
    }, (ctx) => {
      const { desktopIntro, mobileFadeIn, reduceMotion } = ctx.conditions;
      // При reduce-motion CSS @media reduce уже даёт финальное состояние
      // поверх pre-state (см. <style> в index.html) — JS не вмешивается.
      if (reduceMotion)  return;
      if (desktopIntro)  return setupDesktopIntro(stage, octagons, desktopPaths, ornamentPaths);
      if (mobileFadeIn)  return setupMobileFadeIn(octagons);
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => ScrollTrigger.refresh());
    }
  };
  // PDCAUtils.onLoad — общий хелпер, см. assets/js/utils.js. Fallback на
  // прежнюю логику — на случай, если utils.js не загрузился.
  if (window.PDCAUtils) window.PDCAUtils.onLoad(init);
  else if (document.readyState === 'complete') init();
  else window.addEventListener('load', init, { once: true });

  function setupDesktopIntro(stage, octagons, paths, ornamentPaths) {
    try {
      setPreState(octagons, paths, ornamentPaths);
      const tl = gsap.timeline({ paused: true });
      buildArrowsTimeline(tl, octagons, paths);
      buildOrnamentTimeline(tl, ornamentPaths);
      // Один раз: trigger по stage, start = верх stage пересёк 60% viewport
      // (т.е. ~треть схемы уже в видимости — пользователь визуально «в блоке»,
      // а не только-только заметил его край). Раньше было 'top 75%' — на F5
      // выше блока + быстром скролле вниз триггер срабатывал ещё до того,
      // как пользователь сфокусировался, и казалось, что часть октагонов уже
      // проявилась. once: true — после первого срабатывания ScrollTrigger
      // самоуничтожается, обратный/повторный скролл уже ничего не запускает.
      ScrollTrigger.create({
        trigger: stage,
        start:   A.DESKTOP_TRIGGER,
        once:    true,
        onEnter: () => tl.play()
      });
    } catch (e) {
      // Любая ошибка инициализации — снимаем класс (CSS-пре-стейт уходит)
      // и явно возвращаем всё в видимое состояние, чтобы пользователь видел
      // статичную диаграмму, а не призрачную 15%-копию.
      dropPreState();
      forceVisibleState(octagons, paths, ornamentPaths);
      if (window.console) console.warn('[prp-diagram-scroll] desktop intro init failed:', e);
    }
  }

  function setPreState(octagons, paths, ornamentPaths) {
    // Pre-state: opacity 0.15 (а не 0) — синхронизировано с CSS .js-prp-animate.
    // GSAP анимирует 0.15→1, не «возникновение из пустоты». scale 0.85 — лёгкое
    // увеличение, добавляет «приближения». Орнамент остаётся спрятанным
    // (fill 0, dashoffset 1) — drawing-эффект нарисует его с нуля.
    gsap.set(octagons, { opacity: A.PRE_OPACITY, scale: A.OCT_START_SCALE, transformOrigin: 'center center' });
    // Стрелки — простой fade-in opacity. Пробовал «рисующуюся линию» через
    // stroke-dasharray + dashoffset, но .prp-arrows--desktop имеет
    // preserveAspectRatio="none" — координаты path и реальный stroke в
    // разных масштабах. Ни getTotalLength(), ни pathLength="1" не дают
    // надёжного результата во всех браузерах. Fade-in проще и визуально
    // не уступает на таких коротких отрезках.
    gsap.set(paths, { opacity: A.PRE_OPACITY });
    if (ornamentPaths.length) {
      gsap.set(ornamentPaths, {
        strokeDasharray:  1,
        strokeDashoffset: 1,
        fillOpacity:      0,
        strokeOpacity:    1
      });
    }
  }

  function buildArrowsTimeline(tl, octagons, paths) {
    // paths[i] совпадает с порядком в SVG (см. index.html ~1250):
    //   [0] 1→2 прямая, [1] 2→3, [2] 3→4, [3] 4→5, [4] 5→2 замыкание цикла.
    // Чёткая эстафета: каждый шаг полностью завершается ДО старта следующего
    // (без '-=' offset'ов). Default-sequencing GSAP ставит каждый .to(...)
    // сразу после конца предыдущего. Глаз чётко считывает «октагон → стрелка
    // → следующий октагон». Duration умышленно укорочена, чтобы общая
    // эстафета (5×O + 5×A) уложилась в 3.5 сек.
    const octTween   = { opacity: 1, scale: 1, duration: A.OCT_DURATION,   ease: 'power2.out' };
    const arrowTween = { opacity: 1,            duration: A.ARROW_DURATION, ease: 'power1.out' };
    tl.to(octagons[0], octTween)
      .to(paths[0],    arrowTween)
      .to(octagons[1], octTween)
      .to(paths[1],    arrowTween)
      .to(octagons[2], octTween)
      .to(paths[2],    arrowTween)
      .to(octagons[3], octTween)
      .to(paths[3],    arrowTween)
      .to(octagons[4], octTween)
      .to(paths[4],    arrowTween)
      // Страховка: явно фиксируем opacity:1 на ВСЕХ пяти стрелках. Если
      // одна из .to() выше по любой причине не доехала до 1 (overwrite,
      // race, баг GSAP) — этот set гарантированно зафиксирует финал.
      .set(paths, { opacity: 1 });
  }

  function buildOrnamentTimeline(tl, ornamentPaths) {
    // Центральный кайдзен-орнамент — символ цикличности. Стартует ПОСЛЕ
    // полной сборки цикла стрелок (чтобы не пересекаться по таймингу с
    // tween'ами paths и исключить любые потенциальные взаимовлияния).
    // 3 фазы: обводка лучей по очереди → заливка → растворение обводки.
    if (!ornamentPaths.length) return;
    tl.to(ornamentPaths, {
      strokeDashoffset: 0,
      duration: A.ORN_DRAW_DURATION,
      stagger:  A.ORN_DRAW_STAGGER,
      ease:     'power2.inOut'
    }, A.PAUSE_BEFORE_ORN)
      .to(ornamentPaths, {
        fillOpacity: 1,
        duration:    A.ORN_FILL_DURATION,
        stagger:     A.ORN_FILL_STAGGER,
        ease:        'power1.out'
      }, A.ORN_FILL_OVERLAP)
      .to(ornamentPaths, {
        strokeOpacity: 0,
        duration:      A.ORN_STROKE_FADE_DURATION,
        ease:          'power1.out'
      }, A.ORN_STROKE_OVERLAP);
  }

  function forceVisibleState(octagons, paths, ornamentPaths) {
    gsap.set(octagons, { opacity: 1, scale: 1, clearProps: 'transform' });
    gsap.set(paths, { opacity: 1 });
    if (ornamentPaths.length) {
      gsap.set(ornamentPaths, {
        strokeDasharray:  'none',
        strokeDashoffset: 0,
        fillOpacity:      1,
        strokeOpacity:    0
      });
    }
  }

  function setupMobileFadeIn(octagons) {
    // Pre-state opacity 0.15 совпадает с CSS — устраняет FOUC на мобиле
    // (раньше gsap.set ставил opacity 0, и при F5 пользователь видел
    // вспышку полной диаграммы перед обнулением). y: 30 — лёгкий слайд.
    gsap.set(octagons, { opacity: A.PRE_OPACITY, y: A.MOBILE_Y });
    ScrollTrigger.batch(octagons, {
      start: A.MOBILE_TRIGGER,
      once:  true,
      onEnter: (els) => gsap.to(els, {
        opacity: 1,
        y: 0,
        duration: A.MOBILE_DURATION,
        stagger:  A.MOBILE_STAGGER,
        ease: 'power2.out',
        overwrite: true
      })
    });
  }
})();
