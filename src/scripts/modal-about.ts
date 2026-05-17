// Модалка «О методе». Fullscreen-окно: getCard возвращает null,
// чтобы клик-вне-карточки не срабатывал — кликать «вне» там негде.
// Lock/unlock прокрутки <body>, Esc, кнопка закрытия — через общий хелпер.

import { setupModal } from './modal';

const dlg = document.getElementById('modal-about') as HTMLDialogElement | null;
setupModal(dlg, {
  trigger: document.getElementById('btn-about-open'),
  closeBtn: document.getElementById('btn-about-close'),
  getCard: () => null,
});
