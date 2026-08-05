// Модалка «О методе». Fullscreen-окно: getCard возвращает null,
// чтобы клик-вне-карточки не срабатывал — кликать «вне» там негде.
// Lock/unlock прокрутки <body>, Esc, кнопки закрытия — через общий хелпер.
//
// onOpen считает центр кнопки-триггера и радиус до дальнего угла viewport
// и кладёт их в CSS-переменные --reveal-x/y/r. Саму анимацию (clip-path
// circle + @starting-style) описывает src/styles/global.css.

import { setupModal } from './modal';

const dlg = document.getElementById('modal-about') as HTMLDialogElement | null;

if (dlg) {
  setupModal(dlg, {
    trigger: document.getElementById('btn-about-open'),
    closeBtns: [
      document.getElementById('btn-about-close'),
      document.getElementById('btn-about-back-top'),
      document.getElementById('btn-about-back-bottom'),
    ],
    getCard: () => null,
    onOpen: (trigger) => {
      const rect = trigger?.getBoundingClientRect();
      const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
      // Точный радиус вместо запаса в 150%: круг доходит ровно до дальнего
      // угла и останавливается — без «пересвета» в конце анимации.
      const radius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      );
      dlg.style.setProperty('--reveal-x', `${x}px`);
      dlg.style.setProperty('--reveal-y', `${y}px`);
      dlg.style.setProperty('--reveal-r', `${Math.ceil(radius)}px`);
    },
  });
}
