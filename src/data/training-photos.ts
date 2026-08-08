// Кадры блока «Фотографии с тренингов» (#training-photos). Единственный
// потребитель — TrainingPhotos.astro.
//
// Два комплекта файлов с совпадающими именами (до расширения):
// — preview/*.jpg  — 800px по длинной стороне, идут в сетку через <Image />;
// — full/*.webp    — ≤1920px, уже готовы к отдаче, уходят в лайтбокс как есть.
// Превью грузятся сразу (lazy), большой кадр — только по клику.
//
// Почему full НЕ прогоняется через getImage(): Astro эмитит в dist/ исходник
// каждого импортированного изображения, и для картинок, идущих через getImage()
// (а не через <Image />), лишний оригинал из сборки не вычищается — на 93 кадрах
// это давало 35 МБ мёртвого груза. Поэтому кадры ужаты заранее скриптом
// scripts/prepare-training-photos.mjs, а здесь просто импортируются.

import type { ImageMetadata } from 'astro';

const previewFiles = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/images/trainings/preview/*.jpg',
  { eager: true },
);
const fullFiles = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/images/trainings/full/*.webp',
  { eager: true },
);

/* Alt-тексты: нейтральные формулировки, ротация по индексу. Пофайлового описания
   намеренно нет — 93 кадра, содержательной разницы между «участники за работой»
   на снимке 14 и 61 нет, а выдуманная конкретика в alt хуже обобщённой правды. */
const ALTS: string[] = [
  'Денис Булгин ведёт корпоративный тренинг для группы участников',
  'Участники тренинга разбирают рабочий кейс в малой группе',
  'Разбор задачи у флипчарта на очном тренинге Дениса Булгина',
  'Групповая работа участников корпоративного тренинга',
  'Денис Булгин объясняет инструмент методики участникам тренинга',
  'Команда представляет результаты практического задания',
  'Обсуждение решения проблемы в ходе корпоративного обучения',
  'Практическое упражнение на очном тренинге для сотрудников компании',
  'Участники тренинга за работой над проектом улучшений',
  'Денис Булгин отвечает на вопросы участников тренинга',
  'Работа с раздаточными материалами тренинга в аудитории',
  'Рабочий момент корпоративного тренинга Дениса Булгина',
];

const slugs = Object.keys(previewFiles)
  .map((p) => p.split('/').pop()!.replace(/\.jpg$/, ''))
  .sort();

export const photos = slugs.map((slug, i) => {
  const preview = previewFiles[`../assets/images/trainings/preview/${slug}.jpg`];
  const full = fullFiles[`../assets/images/trainings/full/${slug}.webp`];
  if (!preview || !full) {
    throw new Error(`training-photos.ts: нет пары preview/full для ${slug}`);
  }

  return {
    preview: preview.default,
    alt: ALTS[i % ALTS.length],
    fullUrl: full.default.src,
    fullWidth: full.default.width,
    fullHeight: full.default.height,
  };
});
