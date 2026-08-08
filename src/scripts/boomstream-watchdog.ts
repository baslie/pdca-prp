// Watchdog для BoomStream-плееров (src/components/BoomStreamPlayer.astro).
// Проблема: при VPN у посетителя запрос к play.boomstream.com «висит» — iframe
// вечно пустой, а поймать провал стандартными средствами нельзя: DOM-событие
// load у cross-origin iframe срабатывает даже на странице ошибки, error не
// срабатывает вовсе. Единственный надёжный сигнал успеха — postMessage-события
// плеера (loaded/play/time/...; поля method, code, time, duration; см.
// docs/VIDEO.md).
//
// Логика: плеер приблизился к вьюпорту (IntersectionObserver) → таймер 5 с.
// Ни одного сообщения с нашим code за это время → показать оверлей с подсказкой
// про VPN и кнопкой «Попробовать снова» (переустановка src + повторный таймер).
// Любое сообщение плеера — в том числе пришедшее ПОЗЖЕ таймаута — снимает
// оверлей автоматически.
//
// Компонент переиспользуемый: скрипт обслуживает все [data-bs-player] на
// странице (Astro хойстит <script> с import один раз на страницу).
//
// Помимо автоскана статических плееров модуль экспортирует
// registerDynamicPlayer() — для плеера в модалке видеоотзывов
// (src/scripts/video-reviews.ts): src у него устанавливается при открытии,
// таймер взводится arm()/снимается disarm() вручную, без IntersectionObserver.
// Vite дедуплицирует модуль, поэтому массив watches и message-листенер общие.

import { BS_ORIGIN } from './boomstream-embed';

const WATCHDOG_TIMEOUT_MS = 5_000;
// Взводим таймер чуть раньше входа в кадр. Порог браузерного loading=lazy
// заметно больше (Chrome начинает грузить iframe за ~1000+px), так что к
// старту таймера запрос уже идёт. Медленным, но живым соединениям 5 с может
// не хватить — не страшно: позднее сообщение плеера снимает оверлей само.
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

let messageListenerInstalled = false;

// Один message-листенер на все плееры страницы. Не отписываемся: лендинг —
// MPA без клиентского роутинга, листенер живёт ровно столько же, сколько DOM.
// Установка идемпотентная — вызывается из register() при первом плеере.
function ensureMessageListener(): void {
  if (messageListenerInstalled) return;
  messageListenerInstalled = true;
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
}

// Общая регистрация плеера: поиск элементов, создание watch, retry-кнопка.
// Код у динамического (модального) плеера на этот момент пустой — его
// проставляет arm(); статический автоскан требует code до вызова register().
function register(root: HTMLElement): PlayerWatch | null {
  const iframe = root.querySelector<HTMLIFrameElement>('iframe[data-bs-code]');
  const overlay = root.querySelector<HTMLElement>('[data-bs-overlay]');
  const retryBtn = root.querySelector<HTMLButtonElement>('[data-bs-retry]');
  if (!iframe || !overlay) return null;

  const watch: PlayerWatch = {
    root,
    iframe,
    overlay,
    code: iframe.dataset.bsCode ?? '',
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

  ensureMessageListener();
  return watch;
}

/** Ручное управление watchdog'ом плеера, чей src задаётся динамически. */
export interface DynamicPlayerHandle {
  /** При открытии модалки: новый код + актуальный src, скрыть оверлей, взвести таймер. */
  arm(code: string, src: string): void;
  /** При закрытии: снять таймер, скрыть оверлей, обнулить код (поздние сообщения не матчатся). */
  disarm(): void;
}

// Регистрация плеера модалки (обёртка [data-bs-player-modal] — намеренно БЕЗ
// [data-bs-player], чтобы автоскан и IntersectionObserver её не трогали).
export function registerDynamicPlayer(root: HTMLElement | null): DynamicPlayerHandle | null {
  if (!root) return null;
  const watch = register(root);
  if (!watch) return null;
  return {
    arm(code: string, src: string): void {
      watch.code = code;
      // Актуальный src — чтобы существующий обработчик retry перезагружал
      // именно текущее видео.
      watch.originalSrc = src;
      watch.alive = false;
      hideOverlay(watch);
      startTimer(watch);
    },
    disarm(): void {
      stopTimer(watch);
      hideOverlay(watch);
      watch.code = '';
      watch.alive = false;
    },
  };
}

// ===== Автоскан статических плееров ([data-bs-player]) =====

const staticWatches: PlayerWatch[] = [];
document.querySelectorAll<HTMLElement>('[data-bs-player]').forEach((root) => {
  // Гард как и раньше: плеер без кода не наблюдаем вовсе.
  const code = root.querySelector<HTMLIFrameElement>('iframe[data-bs-code]')?.dataset.bsCode;
  if (!code) return;
  const watch = register(root);
  if (watch) staticWatches.push(watch);
});

if (staticWatches.length > 0) {
  // Один observer на все статические плееры; взведение одноразовое (unobserve
  // сразу). Повторные входы/выходы из вьюпорта таймер не перезапускают — после
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
  staticWatches.forEach((w) => io.observe(w.root));
}
