// Лайтбокс сертификата: открытие по превью в #certificate, закрытие крестиком,
// Esc и кликом мимо карточки. Вся механика (lock прокрутки, снятие lock при
// любом способе закрытия) — в общем хелпере setupModal.

import { setupModal } from './modal';

const dlg = document.getElementById('modal-certificate') as HTMLDialogElement | null;

setupModal(dlg, {
  trigger: document.getElementById('btn-certificate-open'),
  closeBtn: document.getElementById('modal-certificate-close'),
  getCard: () => dlg?.querySelector<HTMLElement>('.modal-certificate-card') ?? null,
});
