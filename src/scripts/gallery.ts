// Блок «Фотографии с тренингов» (#training-photos): раскрытие свёрнутой ленты
// и лайтбокс #modal-gallery с листанием. Lock прокрутки, Esc и возврат фокуса
// на превью — из общего setupModal (нативный <dialog> даёт это бесплатно).
//
// Клик мимо карточки здесь реализован вручную (getCard: () => null), а не штатным
// механизмом setupModal: стрелки и крестик прижаты к вьюпорту и лежат ВНЕ
// .modal-gallery-card — штатная проверка «target не внутри карточки» закрывала бы
// модалку при попытке пролистать.

import { setupModal } from './modal';

const gallery = document.getElementById('training-gallery');
const moreBtn = document.getElementById('training-gallery-more') as HTMLButtonElement | null;
const dlg = document.getElementById('modal-gallery') as HTMLDialogElement | null;
const img = document.getElementById('modal-gallery-img') as HTMLImageElement | null;
const card = dlg?.querySelector<HTMLElement>('[data-gallery-card]') ?? null;
const counter = dlg?.querySelector<HTMLElement>('[data-gallery-counter]') ?? null;

// «Показать ещё» — снимаем клип (см. .gallery-masonry[data-collapsed] в global.css).
// Обратной свёртки нет намеренно: после раскрытия кнопка уезжает на 60+ кадров
// вниз, и «Свернуть» выбросил бы читателя далеко за пределы секции.
moreBtn?.addEventListener('click', () => {
  gallery?.removeAttribute('data-collapsed');
  moreBtn.hidden = true;
});

const items = gallery
  ? Array.from(gallery.querySelectorAll<HTMLButtonElement>('[data-gallery-item]'))
  : [];

const modal = setupModal(dlg, {
  closeBtn: document.getElementById('modal-gallery-close'),
  getCard: () => null,
});

if (gallery && dlg && img && card && counter && modal && items.length) {
  let current = 0;
  // Токен гонки: при быстром листании decode() предыдущего кадра резолвится
  // позже — без сверки он снимал бы спиннер с уже другой картинки.
  let token = 0;

  function preload(index: number): void {
    for (const k of [index - 1, index + 1]) {
      const neighbour = items[(k + items.length) % items.length];
      const url = neighbour?.dataset.full;
      if (url) new Image().src = url;
    }
  }

  function show(index: number): void {
    const i = (index + items.length) % items.length;
    const trigger = items[i];
    const url = trigger?.dataset.full;
    if (!trigger || !url) return;

    current = i;
    const my = ++token;

    // Габариты ставим ДО src: пока кадр летит по сети, браузер уже знает
    // пропорцию и держит место — карточка не дёргается при подгрузке.
    img!.removeAttribute('src');
    img!.width = Number(trigger.dataset.w) || 0;
    img!.height = Number(trigger.dataset.h) || 0;
    img!.alt = trigger.dataset.alt ?? '';
    card!.setAttribute('data-loading', '');
    counter!.textContent = `${i + 1} / ${items.length}`;
    img!.src = url;

    img!
      .decode()
      .catch(() => {})
      .then(() => {
        if (my !== token) return;
        card!.removeAttribute('data-loading');
        preload(i);
      });
  }

  // Делегирование: 93 превью — один слушатель вместо 93 подписок.
  gallery.addEventListener('click', (e) => {
    const trigger = (e.target as Element | null)?.closest<HTMLButtonElement>('[data-gallery-item]');
    if (!trigger) return;
    show(items.indexOf(trigger));
    modal.open(trigger);
  });

  document.getElementById('modal-gallery-prev')?.addEventListener('click', () => show(current - 1));
  document.getElementById('modal-gallery-next')?.addEventListener('click', () => show(current + 1));

  // Esc обрабатывает сам <dialog> (событие cancel), нам остаются стрелки.
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(current - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(current + 1); }
  });

  // Свайп по кадру. Порог 40px отсекает дрожание пальца при обычном тапе.
  let startX: number | null = null;
  let swiped = false;

  dlg.addEventListener('pointerdown', (e) => {
    startX = e.clientX;
    swiped = false;
  });
  dlg.addEventListener('pointerup', (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) < 40) return;
    swiped = true;
    show(dx < 0 ? current + 1 : current - 1);
  });

  // Клик мимо карточки закрывает — кроме кликов по стрелкам/крестику
  // и кроме «клика», который на самом деле был свайпом.
  dlg.addEventListener('click', (e) => {
    if (swiped) { swiped = false; return; }
    const t = e.target as Element | null;
    if (t?.closest('[data-gallery-card]') || t?.closest('[data-gallery-ctl]')) return;
    modal.close();
  });

  // Сброс при закрытии: пустая строка в src резолвится в URL самой страницы
  // и браузер тянет HTML как картинку (тот же нюанс — в video-reviews.ts).
  dlg.addEventListener('close', () => {
    token++;
    img.removeAttribute('src');
    card.removeAttribute('data-loading');
  });
}
