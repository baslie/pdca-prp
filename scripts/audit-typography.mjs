// @ts-check
/**
 * Аудит покрытия микротипографики.
 *
 * Обходит собранный HTML и ищет видимый русский текст, до которого НЕ дотянулся
 * селектор из astro-typograf.config.mjs. Такой текст остаётся без неразрывных
 * пробелов и правильных тире — то есть выпадает из системы.
 *
 * Запуск (после `npm run build`):
 *   node scripts/audit-typography.mjs
 *
 * Выход: 0 — всё покрыто, 1 — есть непокрытый текст (список печатается).
 *
 * Когда гонять: после добавления нового блока или секции. Если скрипт ругается,
 * решений два — либо навесить на элемент роль .t-* из docs/TYPOGRAPHY.md,
 * либо дописать класс в TYPOGRAF_SELECTOR.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'cheerio';
import { TYPOGRAF_SELECTOR } from '../astro-typograf.config.mjs';

const DIST_FILE = join(process.cwd(), 'dist', 'index.html');

/** Текстовые узлы внутри этих тегов — не контент, а код или сырые данные. */
const IGNORED_TAGS = new Set(['script', 'style', 'noscript', 'head', 'title']);

/** Кириллица — маркер того, что перед нами живой текст, а не разметка. */
const CYRILLIC = /[а-яёА-ЯЁ]/;

if (!existsSync(DIST_FILE)) {
  console.error('dist/index.html не найден. Сначала: npm run build');
  process.exit(1);
}

const $ = load(readFileSync(DIST_FILE, 'utf-8'));

/**
 * Короткий путь до узла — чтобы было понятно, где искать в разметке.
 *
 * @param {import('domhandler').Element} el
 * @returns {string}
 */
function describe(el) {
  /** @type {string[]} */
  const chain = [];
  for (let node = /** @type {any} */ (el); node && node.type === 'tag'; node = node.parent) {
    const id = node.attribs?.id ? `#${node.attribs.id}` : '';
    const cls = String(node.attribs?.class ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((c) => `.${c}`)
      .join('');
    chain.unshift(`${node.name}${id}${cls}`);
    if (id) break; // ближайший id — достаточный ориентир
  }
  return chain.slice(-4).join(' > ');
}

const covered = new Set($(TYPOGRAF_SELECTOR).toArray());

/** @type {{ where: string; text: string }[]} */
const uncovered = [];

/** @param {any} node */
function walk(node) {
  if (node.type === 'text') {
    const text = node.data ?? '';
    if (!CYRILLIC.test(text)) return;
    for (let p = node.parent; p; p = p.parent) {
      if (p.type === 'tag' && covered.has(p)) return;
    }
    uncovered.push({
      where: node.parent ? describe(node.parent) : '(корень)',
      text: text.replace(/\s+/g, ' ').trim(),
    });
    return;
  }
  // У <script> и <style> в domhandler собственные типы узла ('script'/'style'),
  // а не 'tag' — поэтому фильтруем по имени, не по типу.
  if (IGNORED_TAGS.has(node.name)) return;
  for (const child of node.children ?? []) walk(child);
}

for (const node of $('body').toArray()) walk(node);

if (uncovered.length === 0) {
  console.log(`✓ Весь видимый текст покрыт селектором (${covered.size} элементов).`);
  process.exit(0);
}

console.log(`✗ Текст вне селектора — ${uncovered.length} фрагмент(ов):\n`);
for (const { where, text } of uncovered) {
  console.log(`  ${where}`);
  console.log(`    «${text.length > 100 ? `${text.slice(0, 100)}…` : text}»\n`);
}
process.exit(1);
