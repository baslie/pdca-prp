// @ts-check
/**
 * Пост-обработка собранного HTML — чистка того, что нужно людям, но не браузеру.
 *
 * Работает на хуке `astro:build:done`, по готовым файлам в dist/. Две задачи:
 *   1) вырезать HTML-комментарии — 109 штук, ~33 КБ из 384 КБ index.html;
 *   2) минифицировать инлайновые <script> — до Vite они не доезжают по
 *      определению: `is:inline` означает «отдать браузеру как есть».
 *
 * Исходники .astro НЕ трогает. Комментарии в src/ — документация вёрстки,
 * они остаются на месте; чистка живёт ровно на границе «сборка → dist».
 *
 * Замер на сборке от 08.08.2026: 384 548 → 350 796 Б (−8,8%), в gzip
 * 66,1 → 53,7 КБ (−18,8%). В сжатом виде выигрыш процентно вдвое больше:
 * русская проза комментариев жмётся хуже повторяющейся разметки.
 *
 * Почему своя интеграция, а не HTML-ветка @playform/compress: у того
 * html-minifier-terser включает вместе с removeComments ещё collapseWhitespace,
 * minifyJS, removeAttributeQuotes, sortAttributes и sortClassName — то есть
 * переписывает разметку целиком. Плюс в его дефолтном ignoreCustomComments
 * лежит паттерн «любой знак доллара», который сохранил бы такие комментарии
 * в проде. Здесь нужен скальпель на два разреза, а не бульдозер.
 *
 * ПОРЯДОК В astro.config.mjs: строго ПОСЛЕ typografHtmlOnly(). Хуки
 * `astro:build:done` Astro выполняет последовательно, в порядке массива
 * integrations (astro/dist/integrations/hooks.js, runHookBuildDone), так что
 * гонки за файл нет. Но Типограф обрабатывает innerHTML элемента целиком,
 * вместе с комментариями внутри <li> и <div>, а его правила висячих предлогов
 * работают по строке — вырезав комментарии раньше, мы поменяли бы его вход.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { Buffer } from 'node:buffer';
import { load } from 'cheerio';
import { transform } from 'esbuild';

/**
 * Комментарии, которые остаются в проде.
 *
 * Конвенция «восклицательный знак сразу после дефисов» — прямой аналог
 * `legalComments` в esbuild и `ignoreCustomComments` в html-minifier-terser:
 * там тем же способом берегут лицензионные баннеры. Сегодня в dist таких
 * комментариев ноль, то есть на результат это не влияет ни на байт, — но
 * escape hatch стоит одну строку и снимает целый класс будущих правок:
 * понадобится копирайт стороннего кода или маркер для внешнего инструмента
 * (верификация Яндекса/Google иногда просит комментарий) — не придётся
 * трогать эту интеграцию.
 *
 * Пример в .astro:  <!--! (c) Acme Inc. MIT -->
 */
const KEEP_COMMENT = /^!/;

/**
 * Цель трансляции для инлайновых скриптов.
 *
 * Значение — развёрнутый дефолтный `build.target` Vite 8
 * ('baseline-widely-available', константа ESBUILD_BASELINE_WIDELY_AVAILABLE_TARGET
 * в vite/dist/node/chunks/node.js). Совпадение с бандлом принципиально: рядом
 * на странице уже лежат модули, собранные под эту цель, и инлайновым скриптам
 * незачем быть консервативнее.
 *
 * Понижать синтаксис esbuild умеет, повышать — нет: вывод minify для es5,
 * es2019, baseline и esnext на текущих скриптах побайтово одинаков. То есть
 * цель влияет только на будущий код с современным синтаксисом — под baseline
 * `?.` и `??` останутся как есть.
 *
 * При мажорном апгрейде Vite значение сверить — Vite бампает его каждый мажор.
 */
const INLINE_SCRIPT_TARGET = ['chrome111', 'edge111', 'firefox114', 'safari16.4', 'ios16.4'];

/** Типы <script>, содержимое которых — исполняемый JS, а не данные. */
const JS_SCRIPT_TYPES = new Set(['', 'module', 'text/javascript']);

/**
 * Интеграция Astro: чистка dist/*.html после сборки.
 *
 * @returns {import('astro').AstroIntegration}
 */
export function htmlPostprocess() {
  return {
    name: 'html-postprocess',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const start = performance.now();
        const paths = await collectHtmlFiles(fileURLToPath(dir));

        let comments = 0;
        let scripts = 0;
        let before = 0;
        let after = 0;

        // Последовательно, а не Promise.all: файл сегодня ровно один, esbuild
        // и так работает пулом воркеров, а при последовательном проходе
        // сообщение об ошибке однозначно указывает на виновный файл.
        for (const path of paths) {
          const stats = await processHtmlFile(path, logger);
          comments += stats.comments;
          scripts += stats.scripts;
          before += stats.before;
          after += stats.after;
        }

        const saved = before - after;
        const percent = before > 0 ? ((saved / before) * 100).toFixed(1) : '0.0';
        logger.info(
          `${paths.length} файл(ов): вырезано комментариев — ${comments}, ужато скриптов — ${scripts}. ` +
            `${formatKb(before)} → ${formatKb(after)} (−${formatKb(saved)}, −${percent}%) ` +
            `за ${Math.round(performance.now() - start)} мс`,
        );
      },
    },
  };
}

/**
 * Обработка одного HTML-файла: прочитать → почистить → записать.
 *
 * Опции cheerio совпадают с теми, что использует astro-typograf
 * (node_modules/astro-typograf/lib/index.js, fixHtmlTypography). Это не
 * совпадение, а требование: `xmlMode: false` + `decodeEntities: false` дают
 * парсер htmlparser2, который НЕ «чинит» разметку — не оборачивает в
 * html/head/body, не вставляет tbody, не раскрывает самозакрывающиеся
 * SVG-теги и не декодирует сущности. Проверено: round-trip load → $.html()
 * на dist/index.html возвращает побайтово тот же файл, все 1159 `&nbsp;`
 * целы. Дефолтный parse5-режим переписал бы и разметку, и расставленные
 * Типографом сущности.
 *
 * @param {string} path
 * @param {import('astro').AstroIntegrationLogger} logger
 * @returns {Promise<{ comments: number; scripts: number; before: number; after: number }>}
 */
async function processHtmlFile(path, logger) {
  const source = await readFile(path, 'utf-8');
  const $ = load(source, { xml: { xmlMode: false, decodeEntities: false } });

  const comments = stripComments($);
  const scripts = await minifyInlineScripts($, path, logger);

  const output = $.html();
  await writeFile(path, output);

  return {
    comments,
    scripts,
    before: Buffer.byteLength(source, 'utf-8'),
    after: Buffer.byteLength(output, 'utf-8'),
  };
}

/**
 * Вырезает все comment-узлы документа.
 *
 * Обход идёт от `$.root()`, а не через `$('*').contents()`, по двум причинам.
 * Первая: селектор `*` находит только элементы, поэтому комментарий-сосед
 * <html> (между doctype и корневым тегом) в выборку не попал бы — он ребёнок
 * корня документа, а не какого-либо элемента. Сегодня таких нет, но обход от
 * корня закрывает вопрос навсегда. Вторая: рекурсия от корня по определению
 * достаёт вложенные узлы — в том числе внутри <svg><symbol> (там сейчас два
 * комментария) и внутри <template> (12 штук в файле).
 *
 * Узлы сначала собираются в массив и только потом удаляются: правка children
 * прямо во время рекурсии по этому же массиву пропускает элементы.
 *
 * Внутрь <script> и <style> заглядывать не нужно: их содержимое htmlparser2
 * держит одним сырым text-узлом, comment-узлов там не бывает по устройству
 * парсера. <!DOCTYPE html> — узел типа `directive`, обход его не трогает.
 *
 * @param {import('cheerio').CheerioAPI} $
 * @returns {number} сколько комментариев удалено
 */
function stripComments($) {
  /** @type {import('domhandler').AnyNode[]} */
  const doomed = [];

  /** @param {import('domhandler').AnyNode} node */
  function collect(node) {
    const children = /** @type {{ children?: import('domhandler').AnyNode[] }} */ (node).children;
    for (const child of children ?? []) {
      if (child.type === 'comment') {
        if (!KEEP_COMMENT.test(String(child.data ?? ''))) doomed.push(child);
        continue; // у комментария детей нет
      }
      collect(child);
    }
  }

  collect($.root()[0]);
  for (const node of doomed) $(node).remove();
  return doomed.length;
}

/**
 * Минификация содержимого инлайновых <script>.
 *
 * Разделение блоков:
 *   - есть `src`  → внешний бандл, тело пустое, минифицировать нечего;
 *   - type = application/ld+json → данные, JS-парсер их не возьмёт;
 *   - type пустой / module / text/javascript → исполняемый JS;
 *   - всё прочее (importmap, speculationrules, text/x-template) → не трогаем.
 *
 * Уже минифицированный бандл отдельным условием НЕ отсеивается: инлайненный
 * Vite-чанк TermTip после повторного прохода даёт ровно ту же длину, и
 * охранник «пиши, только если стало короче» отбрасывает результат сам. Это
 * лучше проверки по типу: будущий рукописный `is:inline type="module"`
 * (например, ещё один анти-FOUC guard) минификацию получит.
 *
 * @param {import('cheerio').CheerioAPI} $
 * @param {string} path
 * @param {import('astro').AstroIntegrationLogger} logger
 * @returns {Promise<number>} сколько блоков реально ужато
 */
async function minifyInlineScripts($, path, logger) {
  let count = 0;

  for (const element of $('script').toArray()) {
    const $script = $(element);
    if ($script.attr('src') !== undefined) continue;

    const raw = $script.text();
    if (!raw.trim()) continue;

    const type = ($script.attr('type') ?? '').trim().toLowerCase();

    /** @type {string | null} */
    let minified = null;
    if (type === 'application/ld+json') minified = minifyJsonLd(raw, path);
    else if (JS_SCRIPT_TYPES.has(type)) minified = await minifyInlineJs(raw, path, logger);

    if (minified === null || minified.length >= raw.length) continue;

    // ТОЛЬКО .text(), никогда .html(). `.html(str)` разбирает строку как HTML:
    // проверено — `if(a<b&&c>d){x=1}` превращается в `if(a<b&&c>d){x=1}</b&&c>`,
    // то есть код молча ломается. `.text()` кладёт строку одним text-узлом,
    // а dom-serializer держит script в списке unencodedElements и печатает
    // содержимое сырым — ни `<`, ни `&` не экранируются.
    $script.text(minified);
    count += 1;
  }

  return count;
}

/**
 * Минификация одного JS-блока через esbuild.
 *
 * Политика ошибок намеренно двухуровневая.
 *
 * Ошибка разбора (`errors` непустой) — это НЕ «минификатор не справился».
 * Парсер esbuild соответствует стандарту, и код, который он не берёт, не
 * возьмёт и браузер. Такой блок сейчас уехал бы в прод сломанным, а is:inline
 * скрипты в проекте несут пре-стейт против FOUC, захват реферального хвоста и
 * свёртку галереи — тихо отдать битый JS хуже, чем красный билд. Валим сборку.
 *
 * Всё остальное — беда самого esbuild: нет бинаря под платформу, рассинхрон
 * версий после npm i, упавший воркер. Скрипт при этом рабочий, просто неужатый.
 * Блокировать деплой ради 800 байт нельзя: предупреждаем и едем дальше.
 *
 * `legalComments` не задаём — дефолт 'inline' бережёт баннерные JS-комментарии,
 * ровно как KEEP_COMMENT бережёт HTML-баннеры.
 *
 * @param {string} code
 * @param {string} path
 * @param {import('astro').AstroIntegrationLogger} logger
 * @returns {Promise<string | null>}
 */
async function minifyInlineJs(code, path, logger) {
  try {
    const result = await transform(code, {
      loader: 'js',
      minify: true,
      target: INLINE_SCRIPT_TARGET,
    });
    // esbuild всегда завершает вывод переводом строки — в HTML он лишний
    // и делает уже минифицированный бандл на байт длиннее оригинала.
    return result.code.trim();
  } catch (error) {
    const errors =
      /** @type {{ errors?: { text: string; location?: { line: number; column: number } | null }[] }} */ (
        error
      )?.errors;

    if (errors?.length) {
      const at = errors[0].location
        ? ` (строка ${errors[0].location.line}, колонка ${errors[0].location.column})`
        : '';
      throw new Error(
        `Инлайновый <script> в ${path}${at} не разбирается: ${errors[0].text}\n` +
          'Это не проблема минификатора — такой код сломается и в браузере. ' +
          'Чинить в исходнике: is:inline блоки живут в BaseLayout.astro и TrainingPhotos.astro.',
      );
    }

    logger.warn(
      `esbuild не отработал на ${path}: ${String(error)}. ` +
        'Инлайновые скрипты остались неминифицированными — сборка валидна, но тяжелее.',
    );
    return null;
  }
}

/**
 * Нормализация JSON-LD.
 *
 * Байтов это сегодня не экономит: Astro отдаёт схемы через
 * `set:html={JSON.stringify(jsonLd)}` — они уже без отступов. Ветка нужна ради
 * второго эффекта, который дороже байтов: JSON.parse ВАЛИДИРУЕТ схему на
 * сборке. Битый JSON-LD Google игнорирует молча, и заметить это можно только
 * внешним валидатором раз в полгода; здесь сборка падает сразу. А если
 * кто-нибудь переведёт схему на JSON.stringify(x, null, 2) ради читаемости
 * исходника — сжатие включится само, без правок здесь.
 *
 * @param {string} raw
 * @param {string} path
 * @returns {string}
 */
function minifyJsonLd(raw, path) {
  /** @type {unknown} */
  let data;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Битый JSON-LD в ${path}: ${String(error)}\n` +
        'Источник — set:html={JSON.stringify(...)} в BaseLayout.astro или TrainingPhotos.astro.',
    );
  }

  // Последовательность «меньше-слэш» внутри строкового значения закрыла бы
  // <script> раньше времени: содержимое script — сырой текст, HTML-экранирования
  // там нет. `\/` — легальный escape в JSON, парсер вернёт исходный символ.
  // (В JS-ветке то же самое esbuild делает сам.)
  return JSON.stringify(data).replace(/<\//g, '<\\/');
}

/**
 * Все *.html внутри dist/, рекурсивно.
 *
 * Обход повторяет тот, что делает astro-typograf: список файлов у двух проходов
 * обязан совпадать, иначе часть страниц окажется типографированной, но
 * непочищенной. Сегодня файл ровно один — dist/index.html.
 *
 * @param {string} root
 * @returns {Promise<string[]>}
 */
async function collectHtmlFiles(root) {
  /** @type {string[]} */
  const paths = [];
  /** @type {string[]} */
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) continue;
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && full.endsWith('.html')) paths.push(full);
    }
  }

  return paths;
}

/**
 * @param {number} bytes
 * @returns {string}
 */
function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} КБ`;
}
