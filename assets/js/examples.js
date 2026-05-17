// Логика секции «Примеры решения проблем»:
// — данные категорий лежат в DOM (#examples-projects-data) для индексации поисковиками
//   и AI-краулерами (Google AI Overviews, ChatGPT, Perplexity, Gemini);
//   этот модуль только переносит их в модалку,
// — иконка категории клонируется из кнопки-триггера,
// — открытие компактной модалки по клику на любой [data-category] внутри секции,
// — lock/unlock прокрутки и закрытие — через общий хелпер PDCAModal.setupModal.
(function () {
  if (!window.PDCAModal) return;

  const dlg      = document.getElementById('modal-examples');
  const closeBtn = document.getElementById('modal-examples-close');
  const iconEl   = document.getElementById('modal-examples-icon');
  const titleEl  = document.getElementById('modal-examples-title');
  const countEl  = document.getElementById('modal-examples-count');
  const listEl   = document.getElementById('modal-examples-list');
  const dataRoot = document.getElementById('examples-projects-data');
  if (!dlg || !listEl || !dataRoot) return;

  // Русский плюрализатор: формы для 1 / 2-4 / 5+.
  function plural(n, forms) {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return forms[0];
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return forms[1];
    return forms[2];
  }

  function getCountLabel(n) {
    return n + ' ' + plural(n, ['реальный проект', 'реальных проекта', 'реальных проектов']);
  }

  function setTitle(source, trigger) {
    const h3 = source.querySelector('h3');
    if (h3) { titleEl.textContent = h3.textContent.trim(); return; }
    const fallback = trigger && trigger.querySelector('.category-row__title');
    titleEl.textContent = fallback ? fallback.textContent.trim() : '';
  }

  function setIcon(trigger) {
    iconEl.innerHTML = '';
    if (!trigger) return;
    const svg = trigger.querySelector('svg');
    if (svg) iconEl.appendChild(svg.cloneNode(true));
  }

  function renderItems(source) {
    // Сортировка А→Я для UX. Исходный DOM-порядок остаётся как есть — он удобен для краулеров.
    const items = Array.from(source.querySelectorAll('ul > li'))
      .sort((a, b) => a.textContent.trim().localeCompare(
        b.textContent.trim(), 'ru', { sensitivity: 'base' }
      ));

    countEl.textContent = getCountLabel(items.length);

    // Семантика DOM строится здесь, типографика и hover-эффекты живут в CSS:
    // классы .t-modal-list-item* определены в @layer components внутри
    // index.html (см. docs/TYPOGRAPHY.md). Размеры и hover менять там, не тут.
    listEl.innerHTML = '';
    items.forEach((srcLi) => {
      const li   = document.createElement('li');
      const dot  = document.createElement('span');
      const text = document.createElement('span');
      li.className   = 't-modal-list-item';
      dot.className  = 't-modal-list-item__dot';
      text.className = 't-modal-list-item__text';
      text.textContent = srcLi.textContent.trim();
      li.appendChild(dot);
      li.appendChild(text);
      listEl.appendChild(li);
    });
  }

  function populate(key, trigger) {
    const source = dataRoot.querySelector('article[data-category-data="' + key + '"]');
    if (!source) return false;
    setTitle(source, trigger);
    setIcon(trigger);
    renderItems(source);
    return true;
  }

  const modal = window.PDCAModal.setupModal(dlg, {
    closeBtn: closeBtn,
    getCard:  () => dlg.querySelector('.modal-examples-card'),
  });

  // Делегирование клика на любую [data-category] внутри страницы.
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-category]');
    if (!trigger) return;
    e.preventDefault();
    if (!populate(trigger.dataset.category, trigger)) return;
    // Скролл у самого <dialog> (overflow-y:auto) — сбрасываем, чтобы новая категория
    // всегда открывалась с верха.
    dlg.scrollTop = 0;
    modal.open(trigger);
  });
})();
