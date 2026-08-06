// @ts-check
import { Buffer } from 'node:buffer';
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import compress from '@playform/compress';
import {
  typografHtmlOnly,
  TYPOGRAF_OPTIONS,
  TYPOGRAF_SELECTOR,
} from './astro-typograf.config.mjs';

export default defineConfig({
  site: 'https://roman-purtow.ru',
  base: '/pdca-prp',
  trailingSlash: 'ignore',
  integrations: [
    icon(),
    compress({
      CSS: false,
      HTML: false,
      JavaScript: false,
      JSON: false,
      Image: {
        sharp: {
          jpeg: {
            mozjpeg: true,
            quality: 82,
            trellisQuantisation: true,
            overshootDeringing: true,
            optimiseScans: true,
            chromaSubsampling: '4:2:0',
          },
          png: {
            compressionLevel: 9,
            palette: true,
          },
          webp: { effort: 6 },
          avif: { effort: 6 },
        },
      },
      SVG: true,
      // Кадры галереи (#training-photos) уже ужаты: full — скриптом
      // scripts/prepare-training-photos.mjs (webp q80, effort 6), превью —
      // самим Astro через <Image />. Повторный проход sharp с effort: 6 по
      // 372 файлам занимал больше минуты и не давал выигрыша в весе.
      Exclude: [(File) => File.includes('denis-bulgin-trening-')],
      Action: {
        // Заменять файл только если сжатая версия реально меньше исходной.
        // Buffer здесь — union: string | ArrayBufferView | Iterable |
        // AsyncIterable | Stream. Размер известен только у первых двух;
        // для потоковых вариантов считаем, что выигрыша нет.
        Passed: async ({ Before, Buffer: buf }) => {
          const after =
            typeof buf === 'string'
              ? Buffer.byteLength(buf, 'utf-8')
              : ArrayBuffer.isView(buf)
                ? buf.byteLength
                : Number.POSITIVE_INFINITY;
          return Before > after;
        },
      },
    }),
    // Микротипографика по готовому HTML — последней в цепочке, поверх всего.
    // Конфликта с compress нет: у того HTML: false, до разметки он не доходит.
    // Правила, селектор и обоснования — в astro-typograf.config.mjs.
    typografHtmlOnly({
      selector: TYPOGRAF_SELECTOR,
      typografOptions: TYPOGRAF_OPTIONS,
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
