// @ts-check
/**
 * Конфигурация микротипографики — единственный источник правды.
 *
 * Импортируется из двух мест:
 *   - astro.config.mjs           — подключает интеграцию в сборку;
 *   - scripts/audit-typography.mjs — проверяет, что селектор ничего не пропустил.
 *
 * Типограф работает ТОЛЬКО на сборке (`astro build`), по готовому HTML в dist/.
 * Исходники .astro он не трогает — в `npm run dev` типографики не будет.
 * Подробности и правила игры — в CLAUDE.md, раздел «Микротипографика».
 */
import typograf from 'astro-typograf';
import Typograf from 'typograf';

/**
 * Интеграция astro-typograf регистрирует два хука: `astro:build:done`
 * (типографирование готового HTML — то, ради чего пакет и ставили) и
 * `astro:config:setup`, который дописывает в конфиг `markdown.remarkPlugins`.
 *
 * Astro 7 заменил remark/rehype на процессор Sätteri, а markdown в проекте
 * нет вообще: ни .md/.mdx, ни контент-коллекций, ни секции `markdown`
 * в конфиге. Remark-хук здесь бесполезен и при этом трогает ветку конфига,
 * которой в Astro 7 может не быть, — поэтому оставляем только сборочный хук.
 *
 * @param {Parameters<typeof typograf>[0]} options
 * @returns {import('astro').AstroIntegration}
 */
export function typografHtmlOnly(options) {
  const base = typograf(options);
  const onBuildDone = base.hooks['astro:build:done'];
  if (!onBuildDone) {
    throw new Error(
      'astro-typograf больше не регистрирует хук astro:build:done — ' +
        'проверь версию пакета и обнови обёртку в astro-typograf.config.mjs',
    );
  }
  return { name: base.name, hooks: { 'astro:build:done': onBuildDone } };
}

/**
 * Правила Типографа.
 *
 * Принцип отбора: включено всё, что меняет ПРОБЕЛЫ и ЗНАКИ; отключено всё,
 * что меняет СЛОВА и АВТОРСКУЮ ПУНКТУАЦИЮ. Тексты отзывов и расшифровок
 * видеоотзывов хранятся дословно (см. комментарии в Reviews.astro
 * и VideoReviews.astro) — редактировать их сборкой нельзя.
 *
 * Полный список правил: https://github.com/typograf/typograf/blob/dev/docs/RULES.ru.md
 *
 * @type {import('typograf').TypografPrefs}
 */
export const TYPOGRAF_OPTIONS = {
  locale: ['ru', 'en-US'],
  // Неразрывный пробел — именованной сущностью (&nbsp;), чтобы его было видно
  // в собранном HTML при отладке. Видимые символы («», —, …, ×, ©) остаются
  // живыми символами: onlyInvisible: true.
  htmlEntity: { type: 'name', onlyInvisible: true },
  disableRule: [
    // --- Меняют авторскую пунктуацию ---
    'ru/punctuation/ano', // сам расставляет запятые перед «а» и «но»
    'ru/punctuation/exclamation', // !! → ! — срезал бы «…пять лет в институте!!!»
    'ru/punctuation/exclamationQuestion', // !? → ?!
    'common/punctuation/delDoublePunctuation',
    // --- Меняют сами слова ---
    'ru/typo/switchingKeyboardLayout', // латиница → кириллица: PDCA, Kawasaki, BoomStream
    'ru/number/ordinals', // 25-ый → 25-й
    // --- Переформатируют данные ---
    'ru/other/phone-number', // телефон в Hero свёрстан вручную
    'ru/number/comma', // «Astro 7.1» → «7,1»
    'ru/date/fromISO',
    'ru/date/weekday',
    // --- Обрезка краёв innerHTML: может склеить инлайн-элементы ---
    'common/space/trimLeft',
    'common/space/trimRight',
  ],
};

/**
 * Куда Типограф заглядывает.
 *
 * Селектор применяется к готовому HTML в dist/. Всё, что в него не попало,
 * остаётся нетронутым — в том числе намеренно: SEO-мета, JSON-LD, alt,
 * aria-label и title лежат либо в <head>, либо в атрибутах, куда селектор
 * не достаёт по определению.
 *
 * Проверить покрытие: `node scripts/audit-typography.mjs` после сборки.
 *
 * Голые `a` и `button` в список НЕ входят намеренно: в Hero.astro в ссылках
 * живут e-mail и телефон, их типографировать нельзя. Кнопки перечислены
 * поимённо через классы .btn-*.
 */
export const TYPOGRAF_SELECTOR = [
  // Блочные контейнеры текста
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'li',
  'blockquote',
  'figcaption',
  // Роли из docs/TYPOGRAPHY.md — ловят текст, лежащий на <span> и <div>
  '.t-display',
  '.t-h-section',
  '.t-h-sub',
  '.t-lead',
  '.t-body',
  '.t-body-sm',
  '.t-quote',
  '.t-eyebrow',
  '.t-meta',
  '.t-hint',
  // Компоненты, текст которых живёт на <span>
  '.category-row__title',
  '.category-row__caption',
  '.review-card__text',
  '.review-card__name',
  '.review-card__meta',
  '.termtip__bubble',
  '.certificate-doc__hint',
  '.gallery-item__hint',
  '.trainer-pill',
  // Кнопки и ссылки-CTA
  '.btn-primary',
  '.btn-secondary',
  '.btn-modal-back',
  '.btn-video-retry',
].join(', ');

/** @type {InstanceType<typeof Typograf> | null} */
let attrTypograf = null;

/**
 * Типографирование одной строки на этапе сборки — для текста, который живёт
 * в `data-*` атрибуте, а в видимый DOM попадает уже из JS.
 *
 * Зачем отдельная функция. Плагин обрабатывает СОДЕРЖИМОЕ элементов и по
 * устройству Типографа не трогает атрибуты (они спрятаны как safe-tags).
 * Но `data-role` в Reviews.astro и `data-name`/`data-meta` в VideoReviews.astro —
 * это источник видимого текста модалок: reviews.ts и video-reviews.ts
 * перекладывают их в `textContent`. Без этой функции роли вида
 * «Директор по маркетингу» остались бы с висячим предлогом.
 *
 * Правила те же, что у плагина, но БЕЗ `htmlEntity`: в атрибут должен попасть
 * живой символ U+00A0, а не сущность. Astro экранирует значения атрибутов,
 * и `&nbsp;` превратился бы в `&amp;nbsp;` — пользователь увидел бы её текстом.
 *
 * @param {string | undefined | null} text
 * @returns {string}
 */
export function typografAttr(text) {
  if (!text) return '';
  if (!attrTypograf) {
    const { htmlEntity: _drop, ...rest } = TYPOGRAF_OPTIONS;
    attrTypograf = new Typograf(rest);
  }
  return attrTypograf.execute(text);
}
