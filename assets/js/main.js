// Модалка «О методе». Fullscreen-окно: getCard возвращает null,
// чтобы клик-вне-карточки не срабатывал — кликать «вне» там негде.
// Lock/unlock прокрутки <body>, Esc, кнопка закрытия — через общий хелпер.
(function () {
  if (!window.PDCAModal) return;
  const dlg = document.getElementById('modal-about');
  window.PDCAModal.setupModal(dlg, {
    trigger:  document.getElementById('btn-about-open'),
    closeBtn: document.getElementById('btn-about-close'),
    getCard:  () => null,
  });
})();

// Lucide Icons — заменяем все <i data-lucide="..."></i> на инлайн-SVG.
// Запуск после DOMContentLoaded гарантирует, что разметка уже распарсена.
(function () {
  function renderIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }
  // PDCAUtils.onReady — общий хелпер, см. assets/js/utils.js. Fallback на
  // прямой вызов — на случай, если utils.js не загрузился.
  if (window.PDCAUtils) window.PDCAUtils.onReady(renderIcons);
  else renderIcons();
})();
