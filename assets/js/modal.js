// Общая инфраструктура для нативных <dialog>:
// — lock прокрутки <body> на время открытия,
// — закрытие по клику вне «карточки» (если такая определена через getCard),
// — снятие lock при любом способе закрытия — кнопка, Esc, клик-вне.
//
// API:
//   window.PDCAModal.setupModal(dlg, {
//     trigger?:  HTMLElement,        // одиночный триггер открытия
//     triggers?: HTMLElement[],      // или несколько
//     closeBtn?: HTMLElement,        // одиночная кнопка закрытия
//     closeBtns?: HTMLElement[],     // или несколько
//     getCard:   () => HTMLElement | null,  // элемент-карточка внутри dialog;
//                                            // для fullscreen-модалок верните null.
//     onOpen?:   (trigger) => void,  // хук перед dlg.showModal()
//   }) → { open(trigger?), close() }
//
// Возвращаемый контроллер нужен, когда открытие идёт не через прямой клик,
// а через делегирование (как в examples.js).
(function () {
  // Класс блокировки скролла на <body> — парный с правилом
  // `body.modal-open { overflow: hidden; }` в <style> внутри index.html.
  const LOCK_CLASS = 'modal-open';

  function setupModal(dlg, opts) {
    if (!dlg) return null;
    opts = opts || {};

    const triggers  = opts.triggers  || (opts.trigger  ? [opts.trigger]  : []);
    const closeBtns = opts.closeBtns || (opts.closeBtn ? [opts.closeBtn] : []);
    const getCard   = typeof opts.getCard === 'function' ? opts.getCard : () => null;
    const onOpen    = typeof opts.onOpen  === 'function' ? opts.onOpen  : null;

    const lock   = () => document.body.classList.add(LOCK_CLASS);
    const unlock = () => document.body.classList.remove(LOCK_CLASS);

    function open(trigger) {
      if (onOpen) onOpen(trigger);
      dlg.showModal();
      lock();
    }
    function close() { dlg.close(); }

    triggers.forEach((t) => t && t.addEventListener('click', () => open()));
    closeBtns.forEach((b) => b && b.addEventListener('click', close));

    // Клик в пустую зону вокруг карточки → закрытие. Для fullscreen-модалок
    // getCard вернёт null — условие никогда не сработает (поведение исходника).
    dlg.addEventListener('click', (e) => {
      const card = getCard();
      if (card && !card.contains(e.target)) close();
    });
    dlg.addEventListener('close',  unlock);
    dlg.addEventListener('cancel', unlock);

    return { open, close };
  }

  window.PDCAModal = { setupModal };
})();
