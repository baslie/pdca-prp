// Общий init-helper. Дублирующийся в проекте паттерн «if loading add listener
// else run now» сведён в одну точку.
//   PDCAUtils.onReady(fn) — для скриптов, которым достаточно DOMContentLoaded.
//   PDCAUtils.onLoad(fn)  — для скриптов, которым нужны посчитанные размеры
//                           (Tailwind JIT, шрифты Inter, Lucide-замены <i>
//                           могут двигать layout до события 'load').
(function () {
  window.PDCAUtils = window.PDCAUtils || {};

  window.PDCAUtils.onReady = function (fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, { once: true });
  };

  window.PDCAUtils.onLoad = function (fn) {
    if (document.readyState === 'complete') fn();
    else window.addEventListener('load', fn, { once: true });
  };
})();
