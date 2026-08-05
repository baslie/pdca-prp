// Общая инфраструктура для нативных <dialog>:
// — lock прокрутки <body> на время открытия,
// — закрытие по клику вне «карточки» (если такая определена через getCard),
// — снятие lock при любом способе закрытия — кнопка, Esc, клик-вне.

export interface SetupModalOptions {
  trigger?: HTMLElement | null;
  triggers?: (HTMLElement | null | undefined)[];
  closeBtn?: HTMLElement | null;
  closeBtns?: (HTMLElement | null | undefined)[];
  getCard: () => HTMLElement | null;
  onOpen?: (trigger?: HTMLElement | null) => void;
}

export interface ModalController {
  open: (trigger?: HTMLElement | null) => void;
  close: () => void;
}

// Класс блокировки скролла на <body> — парный с правилом
// body.modal-open { overflow: hidden; } в src/styles/global.css.
const LOCK_CLASS = 'modal-open';

export function setupModal(
  dlg: HTMLDialogElement | null,
  opts: SetupModalOptions,
): ModalController | null {
  if (!dlg) return null;

  const triggers = opts.triggers ?? (opts.trigger ? [opts.trigger] : []);
  const closeBtns = opts.closeBtns ?? (opts.closeBtn ? [opts.closeBtn] : []);
  const getCard = opts.getCard;
  const onOpen = opts.onOpen;

  const lock = () => document.body.classList.add(LOCK_CLASS);
  const unlock = () => document.body.classList.remove(LOCK_CLASS);

  function open(trigger?: HTMLElement | null) {
    onOpen?.(trigger);
    dlg!.showModal();
    // Сброс прокрутки — строго ПОСЛЕ showModal(): у скрытого <dialog>
    // нет скролл-бокса, присвоение scrollTop до открытия игнорируется.
    dlg!.scrollTop = 0;
    lock();
  }
  function close() {
    dlg!.close();
  }

  // Триггер передаём в open() — по нему onOpen считает, откуда «расти» модалке.
  triggers.forEach((t) => t && t.addEventListener('click', () => open(t)));
  closeBtns.forEach((b) => b && b.addEventListener('click', close));

  // Клик в пустую зону вокруг карточки → закрытие. Для fullscreen-модалок
  // getCard вернёт null — условие никогда не сработает.
  dlg.addEventListener('click', (e) => {
    const card = getCard();
    if (card && e.target instanceof Node && !card.contains(e.target)) close();
  });
  dlg.addEventListener('close', unlock);
  dlg.addEventListener('cancel', unlock);

  return { open, close };
}
