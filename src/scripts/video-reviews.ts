// Видеоотзывы (#reviews): слайдер Embla + модалка #modal-video-review.
// Слайдер сам не движется — листает пользователь (drag/свайп/стрелки).
// Клик по карточке открывает модалку: iframe ОДИН, src ставится здесь же
// (ничего не грузится заранее), автозапуск — postMessage play после loaded,
// VPN-фолбэк — registerDynamicPlayer из boomstream-watchdog.ts.
// Все слушатели вешаются один раз при загрузке модуля: лендинг — MPA без
// клиентского роутинга, слушатели живут ровно столько же, сколько DOM.

import EmblaCarousel from 'embla-carousel';
import { setupModal } from './modal';
import { registerDynamicPlayer } from './boomstream-watchdog';
import { prefersReducedMotion } from './in-view';

const BS_ORIGIN = 'https://play.boomstream.com';
// Параметры плеера те же, что у статического embed'а (BoomStreamPlayer.astro).
const srcFor = (code: string): string => `${BS_ORIGIN}/${code}?color=false&title=0`;

// Читается один раз при загрузке модуля — как и раньше.
const reduceMotion = prefersReducedMotion();

/* ===== Слайдер ===== */

const sliderRoot = document.querySelector<HTMLElement>('[data-video-slider]');
const viewport = sliderRoot?.querySelector<HTMLElement>('[data-vr-viewport]') ?? null;

if (sliderRoot && viewport) {
  // align start + trimSnaps: в покое первая карточка стоит по левому краю
  // заголовка (section-px задан паддингом embla-контейнера), в конце
  // прокрутки последняя упирается в правый паддинг. Подавление клика после
  // drag'а у Embla встроено (dragThreshold 10px).
  const embla = EmblaCarousel(viewport, { align: 'start', containScroll: 'trimSnaps' });

  const prevBtn = sliderRoot.querySelector<HTMLButtonElement>('[data-vr-prev]');
  const nextBtn = sliderRoot.querySelector<HTMLButtonElement>('[data-vr-next]');

  const updateArrows = (): void => {
    prevBtn?.toggleAttribute('disabled', !embla.canScrollPrev());
    nextBtn?.toggleAttribute('disabled', !embla.canScrollNext());
  };
  // При reduced-motion программный скролл — мгновенный jump без анимации.
  prevBtn?.addEventListener('click', () => embla.scrollPrev(reduceMotion));
  nextBtn?.addEventListener('click', () => embla.scrollNext(reduceMotion));

  updateArrows();
  embla.on('select', updateArrows);
  embla.on('reInit', updateArrows);
}

/* ===== Модалка с плеером ===== */

const dlg = document.getElementById('modal-video-review') as HTMLDialogElement | null;
const iframe = document.getElementById('modal-video-iframe') as HTMLIFrameElement | null;
const captionEl = document.getElementById('modal-video-caption');
const nameEl = document.getElementById('modal-video-name');
const metaEl = document.getElementById('modal-video-meta');
const transcriptEl = document.getElementById('modal-video-transcript');

const modal = setupModal(dlg, {
  closeBtn: document.getElementById('modal-video-close'),
  getCard: () => dlg?.querySelector<HTMLElement>('.modal-video-card') ?? null,
});

const watchdog = registerDynamicPlayer(
  document.querySelector<HTMLElement>('[data-bs-player-modal]'),
);

let currentCode: string | null = null;

// Автозапуск: плеер прислал loaded — шлём play. Без mute: открытие модалки —
// это клик пользователя, allow="autoplay" на iframe делегирует активацию.
// Если браузер всё же заблокирует звук (iOS Low Power и пр.) — плеер просто
// покажет постер со своей кнопкой play, деградация мягкая. Retry watchdog'а
// переустанавливает src => новый loaded => автозапуск повторится сам.
window.addEventListener('message', (e: MessageEvent) => {
  if (e.origin !== BS_ORIGIN) return;
  if (!dlg?.open || !currentCode || !iframe?.contentWindow) return;
  const data: unknown = e.data;
  if (typeof data !== 'object' || data === null) return;
  const { code, method } = data as { code?: unknown; method?: unknown };
  if (code !== currentCode || method !== 'loaded') return;
  iframe.contentWindow.postMessage(
    { code: currentCode, method: 'action', action: 'play', data: '' },
    BS_ORIGIN,
  );
});

// Делегирование клика по карточкам (паттерн reviews.ts). e.defaultPrevented —
// это подавленный Embla «клик» после drag'а: слайдер полистали, не открываем.
document.addEventListener('click', (e) => {
  if (e.defaultPrevented) return;
  const trigger = (e.target as Element | null)?.closest<HTMLElement>('[data-video-card]');
  if (!trigger || !modal || !iframe || !captionEl || !nameEl || !metaEl || !transcriptEl) return;

  const { code = '', name = '', meta = '', transcript = '' } = trigger.dataset;
  if (!code) return;

  // Подпись: только имеющиеся данные; нет ничего — блок скрыт целиком.
  nameEl.textContent = name;
  metaEl.textContent = meta;
  captionEl.hidden = !name && !meta;

  // Расшифровка приезжает готовыми <p> из инертного <template> карточки.
  const tpl = transcript ? document.getElementById(transcript) : null;
  if (tpl instanceof HTMLTemplateElement) {
    transcriptEl.replaceChildren(tpl.content.cloneNode(true));
  } else {
    transcriptEl.replaceChildren();
  }

  currentCode = code;
  iframe.src = srcFor(code);
  watchdog?.arm(code, iframe.src);
  modal.open(trigger);
});

// Закрытие любым способом (крестик, Esc, клик-мимо) проходит через событие
// close — единая точка остановки видео. src = about:blank мгновенно глушит
// звук; НЕ '' — пустая строка резолвится в URL самой страницы, и iframe
// загрузил бы лендинг внутрь себя.
dlg?.addEventListener('close', () => {
  watchdog?.disarm();
  currentCode = null;
  if (iframe) iframe.src = 'about:blank';
});
