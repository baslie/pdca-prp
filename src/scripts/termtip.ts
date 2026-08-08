// Логика подсказки к термину (TermTip.astro): держит пузырь внутри вьюпорта
// и гасит его по Esc, не закрывая <dialog> вокруг. Показ — CSS-only
// (:hover/:focus), стили — .termtip* в src/styles/global.css.

// Поля от краёв вьюпорта, за которые пузырь не должен заходить.
const EDGE_PAD = 12;

// Пузырь центрирован по значку, поэтому у термина в конце строки он вылезает
// за край экрана. Считаем сдвиг ДО показа: visibility: hidden не убирает
// элемент из layout, getBoundingClientRect уже знает итоговую геометрию.
function place(bubble: HTMLElement) {
  bubble.style.setProperty('--termtip-shift', '0px');
  const r = bubble.getBoundingClientRect();
  // clientWidth, а не innerWidth: последний считает вместе с вертикальным
  // скроллбаром, и пузырь заезжал под него на его ширину.
  const vw = document.documentElement.clientWidth;
  let shift = 0;
  if (r.right > vw - EDGE_PAD) shift = vw - EDGE_PAD - r.right;
  else if (r.left < EDGE_PAD) shift = EDGE_PAD - r.left;
  bubble.style.setProperty('--termtip-shift', `${Math.round(shift)}px`);
}

const bubbles: HTMLElement[] = [];

document.querySelectorAll<HTMLElement>('.termtip').forEach((tip) => {
  const btn = tip.querySelector<HTMLButtonElement>('.termtip__btn');
  const bubble = tip.querySelector<HTMLElement>('.termtip__bubble');
  if (!btn || !bubble) return;

  bubbles.push(bubble);
  tip.addEventListener('pointerenter', () => place(bubble));
  btn.addEventListener('focus', () => place(bubble));

  // Esc гасит открытую подсказку. preventDefault/stopPropagation обязательны:
  // без них тот же Esc закроет модалку «О методе», в которой значок тоже есть.
  btn.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    btn.blur();
  });
});

// Раскладка сразу, не дожидаясь наведения: visibility: hidden не убирает
// пузырь из потока, и у термина в конце строки он торчал за правый край —
// страница получала лишние ~60px горизонтальной прокрутки на мобильном.
// Пересчёт после загрузки шрифтов (ширина текста меняется) и на resize.
const placeAll = () => bubbles.forEach(place);
placeAll();
document.fonts?.ready.then(placeAll);
let resizeTimer = 0;
window.addEventListener('resize', () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(placeAll, 150);
});
