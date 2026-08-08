// Блок «Отзывы»: клик по карточке бегущего ряда открывает полный текст
// в модалке #modal-review. Вся механика диалога (lock прокрутки, Esc,
// клик мимо карточки, снятие lock при любом закрытии) — в общем setupModal.
// Сам конвейер ведёт reviews-marquee.ts (GSAP ticker + Observer, драг);
// CSS-анимация .marquee в global.css — no-JS-фолбэк.

import { setupModal } from './modal';

const dlg = document.getElementById('modal-review') as HTMLDialogElement | null;
const textEl = document.getElementById('modal-review-text');
const nameEl = document.getElementById('modal-review-name');
const metaEl = document.getElementById('modal-review-meta');

const modal = setupModal(dlg, {
  closeBtn: document.getElementById('modal-review-close'),
  getCard: () => dlg?.querySelector<HTMLElement>('.modal-review-card') ?? null,
});

// Делегирование: карточек 82 (41 × 2 из-за дубликата бесшовного цикла),
// один слушатель на документ вместо адресных подписок.
document.addEventListener('click', (e) => {
  // Клик, рождённый протяжкой ленты, гасит reviews-marquee.ts (preventDefault
  // в capture) — паритет с video-reviews.ts.
  if (e.defaultPrevented) return;
  const trigger = (e.target as Element | null)?.closest<HTMLElement>('[data-review-card]');
  if (!trigger || !modal || !textEl || !nameEl || !metaEl) return;

  // Полный текст живёт в DOM карточки — line-clamp обрезает его только визуально.
  const text = trigger.querySelector('.review-card__text')?.textContent?.trim() ?? '';
  const { name = '', role = '', city = '' } = trigger.dataset;

  textEl.textContent = text;
  // Короткий отзыв — кегль цитаты, длинный — обычный body: 90-словный абзац
  // в .t-quote (до 26px) превращается в простыню. Порог подобран в вайрфрейме.
  const long = text.length > 280;
  textEl.classList.toggle('t-quote', !long);
  textEl.classList.toggle('t-on-strong', !long);
  textEl.classList.toggle('t-body', long);
  textEl.classList.toggle('t-on-default', long);

  nameEl.textContent = name;
  // Точка-разделитель привязана к предыдущему слову неразрывным пробелом.
  // Строка собирается в рантайме, Типограф до неё не дотягивается.
  metaEl.textContent = [role, city].filter(Boolean).join('\u00A0· ');

  // Скролл сбрасывает сам setupModal — после showModal(), иначе не применится.
  modal.open(trigger);
});
