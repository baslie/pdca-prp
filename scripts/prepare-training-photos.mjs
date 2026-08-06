/**
 * Подготовка ассетов галереи «Фотографии с тренингов» (#training-photos).
 *
 * Зачем отдельный скрипт, а не getImage() внутри компонента: Astro эмитит
 * в dist/ ИСХОДНИК каждого импортированного изображения, и для картинок,
 * прогоняемых через getImage() (а не через <Image />), лишний оригинал из
 * сборки не вычищается. На 93 фотографиях это давало 35 МБ мёртвого груза
 * в dist/, который никто никогда не запрашивает.
 *
 * Поэтому кадры ужимаются ОДИН РАЗ здесь, а в репозиторий ложатся уже готовые
 * к отдаче WebP. Компонент импортирует их напрямую (`.src` / `.width` /
 * `.height`) — Astro эмитит ровно один файл на кадр.
 *
 * Превью скрипт НЕ трогает: они остаются .jpg и уходят в <Image />, который
 * сам печёт из них webp на 320/480/800. Перегонять их в webp заранее — лишний
 * цикл потерь (webp → webp) без выигрыша в весе.
 *
 * Как добавить новые фотографии:
 *   1. Положить исходники .jpg в src/assets/images/trainings/full/,
 *      уменьшенные превью с ТЕМИ ЖЕ именами — в .../trainings/preview/.
 *   2. node scripts/prepare-training-photos.mjs
 *   3. Скрипт переименует исходники в denis-bulgin-trening-NNN.webp, ужмёт
 *      до 1920px по длинной стороне и удалит исходные .jpg.
 *      Превью переименовать вручную по той же схеме — имена должны совпадать
 *      с full до расширения, компонент сопоставляет пары именно по ним.
 *
 * Имена приводятся к виду denis-bulgin-trening-NNN: осмысленный слаг сохраняется
 * в хешированном имени эмита и индексируется поиском по картинкам.
 */
import { readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const FULL = path.join(ROOT, 'src/assets/images/trainings/full');

/** Потолок длинной стороны для лайтбокса. withoutEnlargement не даёт растянуть
 *  кадры, которые изначально мельче, — иначе получили бы мыло тяжелее оригинала. */
const MAX_SIDE = 1920;
const SLUG = 'denis-bulgin-trening';

async function convert(dir, { maxSide, quality }) {
  // Порядок операций важен: сначала читаем список, только потом что-то удаляем.
  // Ранняя версия скрипта чистила папку назначения ДО чтения источника —
  // и на первой же ошибке уносила исходники с собой.
  const files = (await readdir(dir)).filter((f) => /\.jpe?g$/i.test(f)).sort();
  let bytes = 0;

  for (const file of files) {
    const num = path.basename(file).replace(/\.jpe?g$/i, '').replace(new RegExp(`^${SLUG}-`), '');
    const src = path.join(dir, file);
    const pipeline = sharp(src).rotate();

    if (maxSide) {
      const meta = await pipeline.metadata();
      const scale = Math.min(1, maxSide / Math.max(meta.width, meta.height));
      pipeline.resize(Math.round(meta.width * scale), Math.round(meta.height * scale), {
        withoutEnlargement: true,
      });
    }

    const info = await pipeline
      .webp({ quality, effort: 6 })
      .toFile(path.join(dir, `${SLUG}-${num}.webp`));
    bytes += info.size;
    await unlink(src);
  }

  return { count: files.length, mb: (bytes / 1024 / 1024).toFixed(1) };
}

const full = await convert(FULL, { maxSide: MAX_SIDE, quality: 80 });
console.log(`full: ${full.count} шт, ${full.mb} MB`);
