// Логика секции «Примеры решения проблем»:
// — данные категорий лежат в DOM (#examples-projects-data) для индексации поисковиками
//   и AI-краулерами (Google AI Overviews, ChatGPT, Perplexity, Gemini);
// — иконка категории клонируется из заранее отрендеренного шаблона
//   (#examples-icons-templates [data-icon-for=KEY]),
// — открытие компактной модалки по клику на любой [data-category],
// — lock/unlock прокрутки и закрытие — через общий хелпер setupModal.

import { setupModal } from './modal';

const dlg = document.getElementById('modal-examples') as HTMLDialogElement | null;
const closeBtn = document.getElementById('modal-examples-close');
const iconEl = document.getElementById('modal-examples-icon');
const titleEl = document.getElementById('modal-examples-title');
const countEl = document.getElementById('modal-examples-count');
const listEl = document.getElementById('modal-examples-list');
const dataRoot = document.getElementById('examples-projects-data');
const iconTemplates = document.getElementById('examples-icons-templates');

if (dlg && listEl && dataRoot && iconEl && titleEl && countEl) {
  // Русский плюрализатор: формы для 1 / 2-4 / 5+.
  function plural(n: number, forms: [string, string, string]): string {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return forms[0];
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return forms[1];
    return forms[2];
  }

  function getCountLabel(n: number): string {
    return `${n} ${plural(n, ['реальный проект', 'реальных проекта', 'реальных проектов'])}`;
  }

  function setTitle(source: Element, trigger: HTMLElement | null): void {
    const h3 = source.querySelector('h3');
    if (h3) {
      titleEl!.textContent = (h3.textContent ?? '').trim();
      return;
    }
    const fallback = trigger?.querySelector('.category-row__title');
    titleEl!.textContent = fallback ? (fallback.textContent ?? '').trim() : '';
  }

  function setIcon(key: string): void {
    iconEl!.innerHTML = '';
    // Заранее отрендеренные шаблоны (build-time через astro-icon) — клонируем нужный.
    const tpl = iconTemplates?.querySelector(`[data-icon-for="${key}"] svg`);
    if (tpl) iconEl!.appendChild(tpl.cloneNode(true));
  }

  function renderItems(source: Element): void {
    // Сортировка А→Я для UX. Исходный DOM-порядок остаётся как есть — он удобен для краулеров.
    const items = Array.from(source.querySelectorAll('ul > li')).sort((a, b) =>
      (a.textContent ?? '')
        .trim()
        .localeCompare((b.textContent ?? '').trim(), 'ru', { sensitivity: 'base' }),
    );

    countEl!.textContent = getCountLabel(items.length);

    listEl!.innerHTML = '';
    items.forEach((srcLi, i) => {
      const li = document.createElement('li');
      const num = document.createElement('span');
      const text = document.createElement('span');
      li.className = 't-modal-list-item';
      num.className = 't-modal-list-item__num';
      // Нумерация по видимому (отсортированному) порядку. Точка после числа
      // рисуется через ::after в CSS — здесь только само число.
      num.textContent = String(i + 1);
      text.className = 't-modal-list-item__text';
      text.textContent = (srcLi.textContent ?? '').trim();
      li.appendChild(num);
      li.appendChild(text);
      listEl!.appendChild(li);
    });
  }

  function populate(key: string, trigger: HTMLElement | null): boolean {
    const source = dataRoot!.querySelector(`article[data-category-data="${key}"]`);
    if (!source) return false;
    setTitle(source, trigger);
    setIcon(key);
    renderItems(source);
    return true;
  }

  const modal = setupModal(dlg, {
    closeBtn,
    getCard: () => dlg.querySelector<HTMLElement>('.modal-examples-card'),
  });

  // Делегирование клика на любую [data-category] внутри страницы.
  document.addEventListener('click', (e) => {
    const target = e.target as Element | null;
    const trigger = target?.closest<HTMLElement>('[data-category]') ?? null;
    if (!trigger || !modal) return;
    e.preventDefault();
    const key = trigger.dataset.category;
    if (!key || !populate(key, trigger)) return;
    // Скролл сбрасывает сам setupModal — после showModal(), иначе не применится.
    modal.open(trigger);
  });
}
