// Логика подсказки к термину (TermTip.astro): держит пузырь внутри вьюпорта
// и гасит его по Esc, не закрывая <dialog> вокруг. Показ — CSS-only
// (:hover/:focus), стили — .termtip* в src/styles/global.css.

// Поля от краёв вьюпорта, за которые пузырь не должен заходить.
const EDGE_PAD = 12;

// Пузырь центрирован по значку, поэтому у термина в конце строки он вылезает
// за край экрана. Считаем сдвиг в момент показа: раскладка к этому времени
// финальная (шрифты загружены, строка разбита окончательно), а в покое пузырь
// скрыт через display: none и на прокрутку страницы уже не влияет.
//
// Базовую позицию берём арифметически — от центра значка и ширины пузыря,
// а не записью --termtip-shift: 0px с последующим замером. Chrome не обязан
// пересчитать transform от нетипизированного custom property к моменту
// getBoundingClientRect, и такой замер возвращал геометрию уже сдвинутого
// пузыря: значение накапливало ошибку от показа к показу.
function place(tip: HTMLElement, bubble: HTMLElement) {
  const anchor = tip.getBoundingClientRect();
  const width = bubble.offsetWidth;
  if (!width) return; // пузырь ещё не показан — мерить нечего

  const center = anchor.left + anchor.width / 2;
  const left = center - width / 2;
  const right = center + width / 2;
  // clientWidth, а не innerWidth: последний считает вместе с вертикальным
  // скроллбаром, и пузырь заезжал под него на его ширину.
  const vw = document.documentElement.clientWidth;

  let shift = 0;
  if (right > vw - EDGE_PAD) shift = vw - EDGE_PAD - right;
  else if (left < EDGE_PAD) shift = EDGE_PAD - left;
  bubble.style.setProperty('--termtip-shift', `${Math.round(shift)}px`);
}

document.querySelectorAll<HTMLElement>('.termtip').forEach((tip) => {
  const btn = tip.querySelector<HTMLButtonElement>('.termtip__btn');
  const bubble = tip.querySelector<HTMLElement>('.termtip__bubble');
  if (!btn || !bubble) return;

  // Оба события приходят уже после того, как браузер применил :hover/:focus,
  // то есть пузырь к этому моменту display: block и измеряем.
  tip.addEventListener('pointerenter', () => place(tip, bubble));
  btn.addEventListener('focus', () => place(tip, bubble));

  // Esc гасит открытую подсказку. preventDefault/stopPropagation обязательны:
  // без них тот же Esc закроет модалку «О методе», в которой значок тоже есть.
  btn.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    btn.blur();
  });
});
