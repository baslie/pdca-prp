// @ts-check
import { Buffer } from 'node:buffer';
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import compress from '@playform/compress';

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
      Action: {
        Passed: async ({ Before, Buffer: buf }) => {
          const after =
            typeof buf === 'string'
              ? Buffer.byteLength(buf, 'utf-8')
              : buf.byteLength;
          return Before > after;
        },
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
