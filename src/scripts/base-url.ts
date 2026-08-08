// Нормализованный BASE_URL — всегда со слешем на конце. Astro может отдавать
// BASE_URL и со слешем, и без — конкатенация без нормализации даёт
// «/pdca-prpfavicon.ico». Потребители: BaseLayout.astro (фавиконки, manifest,
// OG, canonical), TrainingPhotos.astro (JSON-LD ImageGallery).

const baseRaw = import.meta.env.BASE_URL;

/** База сайта с гарантированным «/» на конце. */
export const base = baseRaw.endsWith('/') ? baseRaw : `${baseRaw}/`;
