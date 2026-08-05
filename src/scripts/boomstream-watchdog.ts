// Watchdog для BoomStream-плееров (src/components/BoomStreamPlayer.astro).
// Проблема: при VPN у посетителя запрос к play.boomstream.com «висит» — iframe
// вечно пустой, а поймать провал стандартными средствами нельзя: DOM-событие
// load у cross-origin iframe срабатывает даже на странице ошибки, error не
// срабатывает вовсе. Единственный надёжный сигнал успеха — postMessage-события
// плеера (loaded/play/time/...; поля method, code, time, duration; см.
// CLAUDE.md, раздел «Видео BoomStream»).
//
// Логика: плеер приблизился к вьюпорту (IntersectionObserver) → таймер 12 с.
// Ни одного сообщения с нашим code за это время → показать оверлей с подсказкой
// про VPN и кнопкой «Попробовать снова» (переустановка src + повторный таймер).
// Любое сообщение плеера — в том числе пришедшее ПОЗЖЕ таймаута — снимает
// оверлей автоматически.
//
// Компонент переиспользуемый: скрипт обслуживает все [data-bs-player] на
// странице (Astro хойстит <script> с import один раз на страницу).

const BS_ORIGIN = 'https://play.boomstream.com';
const WATCHDOG_TIMEOUT_MS = 12_000;
// Взводим таймер чуть раньше входа в кадр. Порог браузерного loading=lazy
// заметно больше (Chrome начинает грузить iframe за ~1000+px), так что к
// старту таймера запрос уже идёт — 12 с отсчитываются «с запасом» в пользу
// медленных, но живых соединений.
const IO_ROOT_MARGIN = '200px';

interface PlayerWatch {
  root: HTMLElement;
  iframe: HTMLIFrameElement;
  overlay: HTMLElement;
  /** Код медиа — сверяется с полем code входящих postMessage. */
  code: string;
  /** src на момент инициализации — для перезагрузки iframe кнопкой retry. */
  originalSrc: string;
  timerId: number | null;
  /** Пришло хотя бы одно сообщение от этого плеера — он жив. */
  alive: boolean;
}

const watches: PlayerWatch[] = [];

function startTimer(watch: PlayerWatch): void {
  stopTimer(watch);
  watch.timerId = window.setTimeout(() => {
    watch.timerId = null;
    if (!watch.alive) showOverlay(watch);
  }, WATCHDOG_TIMEOUT_MS);
}

function stopTimer(watch: PlayerWatch): void {
  if (watch.timerId !== null) {
    window.clearTimeout(watch.timerId);
    watch.timerId = null;
  }
}

function showOverlay(watch: PlayerWatch): void {
  watch.overlay.classList.remove('hidden');
  watch.overlay.classList.add('flex');
  watch.overlay.setAttribute('aria-hidden', 'false');
}

function hideOverlay(watch: PlayerWatch): void {
  watch.overlay.classList.add('hidden');
  watch.overlay.classList.remove('flex');
  watch.overlay.setAttribute('aria-hidden', 'true');
}

document.querySelectorAll<HTMLElement>('[data-bs-player]').forEach((root) => {
  const iframe = root.querySelector<HTMLIFrameElement>('iframe[data-bs-code]');
  const overlay = root.querySelector<HTMLElement>('[data-bs-overlay]');
  const retryBtn = root.querySelector<HTMLButtonElement>('[data-bs-retry]');
  const code = iframe?.dataset.bsCode;
  if (!iframe || !overlay || !code) return;

  const watch: PlayerWatch = {
    root,
    iframe,
    overlay,
    code,
    originalSrc: iframe.src,
    timerId: null,
    alive: false,
  };
  watches.push(watch);

  retryBtn?.addEventListener('click', () => {
    hideOverlay(watch);
    watch.alive = false;
    // Присвоение src — даже того же значения — заставляет браузер заново
    // выполнить навигацию iframe. loading=lazy уже не мешает: плеер в кадре.
    watch.iframe.src = watch.originalSrc;
    startTimer(watch);
  });
});

if (watches.length > 0) {
  // Один message-листенер на все плееры страницы. Не отписываемся: лендинг —
  // MPA без клиентского роутинга, листенер живёт ровно столько же, сколько DOM.
  window.addEventListener('message', (e: MessageEvent) => {
    if (e.origin !== BS_ORIGIN) return;
    const data: unknown = e.data;
    if (typeof data !== 'object' || data === null) return;
    const code = (data as { code?: unknown }).code;
    if (typeof code !== 'string') return;
    // Не фильтруем по method: ЛЮБОЕ событие плеера (loaded/play/time/...) —
    // доказательство, что iframe загрузился. Один code может стоять в
    // нескольких экземплярах — снимаем оверлей у всех совпавших.
    watches.forEach((watch) => {
      if (watch.code !== code) return;
      watch.alive = true;
      stopTimer(watch);
      hideOverlay(watch);
    });
  });

  // Один observer на все плееры; взведение одноразовое (unobserve сразу).
  // Повторные входы/выходы из вьюпорта таймер не перезапускают — после
  // первого взведения жизненным циклом управляют message-листенер и retry.
  const io = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        const watch = watches.find((w) => w.root === entry.target);
        // Сообщение могло прийти раньше взведения (быстрая сеть) — не взводим.
        if (!watch || watch.alive) return;
        startTimer(watch);
      });
    },
    { rootMargin: IO_ROOT_MARGIN },
  );
  watches.forEach((w) => io.observe(w.root));
}
