// Тач-состояние блока «Нам доверяют» (Clients.astro): логотип раскрашивается,
// а плашка инвертируется в синий, пока палец прижат.
//
// Оба эффекта в CSS живут под @media (hover: hover) — на тач-устройствах они
// не срабатывали никогда, и ковёр логотипов оставался серым при любом тапе.
// Чистого :active мало: на <li> в iOS Safari он отрабатывает ненадёжно,
// поэтому состояние передаётся классом. Сами переходы остаются в CSS
// (docs/MOTION.md): здесь только переключение .is-pressed.

// Гейт: где есть мышь, работает ховер — второй механизм там лишний и давал бы
// двойное срабатывание на клике.
if (!window.matchMedia('(hover: hover)').matches) {
  const section = document.getElementById('clients');
  if (section) {
    const TARGETS = '.client-logo-cell, .client-pill';
    // Удержание после отпускания: без него быстрый тап зажигает цвет на ~50 мс
    // и гаснет раньше, чем глаз успевает поймать. Совпадает с --dur-hover.
    const HOLD_MS = 200;

    let pressed: HTMLElement | null = null;
    let releaseTimer = 0;

    const release = () => {
      if (!pressed) return;
      const el = pressed;
      pressed = null;
      window.clearTimeout(releaseTimer);
      releaseTimer = window.setTimeout(() => el.classList.remove('is-pressed'), HOLD_MS);
    };

    section.addEventListener('pointerdown', (e) => {
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>(TARGETS);
      if (!target) return;
      // Предыдущий элемент мог ещё догорать удержание — гасим сразу, иначе
      // при быстром переборе плашек подсвеченными окажутся две.
      window.clearTimeout(releaseTimer);
      if (pressed && pressed !== target) pressed.classList.remove('is-pressed');
      pressed = target;
      target.classList.add('is-pressed');
    });

    // pointercancel прилетает, когда жест перехватывает прокрутка страницы:
    // без него логотип залипал бы подсвеченным после свайпа по ковру.
    section.addEventListener('pointerup', release);
    section.addEventListener('pointercancel', release);
    section.addEventListener('pointerleave', release);
  }
}
