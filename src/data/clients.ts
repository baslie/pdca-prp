// Данные секции «Нам доверяют» (#clients): логотипы организаций, чьих
// сотрудников обучал Денис, и перечень тех, у кого логотипа нет.
// Единственный потребитель — Clients.astro.
//
// Файлы логотипов подготовлены пакетно: обрезаны по фактическим границам знака,
// выровнены по визуальной массе (а не по высоте — иначе длинный вордмарк
// «ВТБ Страхование» задавил бы компактный ромб «Феликса») и уложены в единый
// канвас 480×240 px с равным защитным полем. Белый фон вырезан заливкой
// от краёв, поэтому выворотка внутри знаков цела.

import type { ImageMetadata } from 'astro';

const logoFiles = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/images/logos/*.png',
  { eager: true },
);

export interface Logo {
  slug: string;
  name: string;
}

/* Порядок — по узнаваемости бренда: чем весомее компания, тем раньше она
   попадает в ковёр (первый ряд читают все, последний — почти никто).
   Менять порядок здесь, файлы переименовывать не нужно. */
const LOGOS: Logo[] = [
  { slug: 'sber',                name: 'Сбербанк' },
  { slug: 'vtb',                 name: 'Банк ВТБ' },
  { slug: 'lukoil',              name: 'Лукойл' },
  { slug: 'roche',               name: 'Roche' },
  { slug: 'basf',                name: 'BASF' },
  { slug: 'takeda',              name: 'Takeda' },
  { slug: 'whirlpool',           name: 'Whirlpool' },
  { slug: 'tekhnonikol',         name: 'ТехноНИКОЛЬ' },
  { slug: 'eldorado',            name: 'Эльдорадо' },
  { slug: 'mgimo',               name: 'МГИМО' },
  { slug: 'msu-business-school', name: 'Высшая школа бизнеса МГУ' },
  { slug: 'aurus',               name: 'Aurus' },
  { slug: 'komus',               name: 'Комус' },
  { slug: 'russian-helicopters', name: 'Вертолёты России' },
  { slug: 'abbvie',              name: 'AbbVie' },
  { slug: 'veeam',               name: 'Veeam Software' },
  { slug: 'schindler',           name: 'Schindler' },
  { slug: 'vtb-strahovanie',     name: 'ВТБ Страхование' },
  { slug: 'dzm-moscow',          name: 'Департамент здравоохранения города Москвы' },
  { slug: 'expobank',            name: 'Экспобанк' },
  { slug: 'nami',                name: 'НАМИ' },
  { slug: 'ekspeditsiya',        name: 'Экспедиция' },
  { slug: 'promet',              name: 'Промет' },
  { slug: 'mettler-toledo',      name: 'Mettler Toledo' },
  { slug: 'ipsen',               name: 'Ipsen' },
  { slug: 'rittal',              name: 'Rittal' },
  { slug: 'dentsply-sirona',     name: 'Dentsply Sirona' },
  { slug: 'hubert-burda-media',  name: 'Hubert Burda Media' },
  { slug: 'boots-healthcare',    name: 'Boots Healthcare International' },
  { slug: 'jgl',                 name: 'JGL (Jadran)' },
  { slug: 'soteks',              name: 'Сотекс' },
  { slug: 'feliks',              name: 'Компания Феликс' },
  { slug: 'express-office',      name: 'Экспресс Офис' },
  { slug: 'aero-mebel',          name: 'Аэро Мебель' },
];

/* Организации без логотипа — тем же порядком по узнаваемости.
   Те, чьи логотипы показаны выше, из перечня убраны, чтобы блок не повторял
   сам себя. Полный список до разделения (54 позиции) — в истории git,
   коммит с удалением полосы из AboutTrainer.astro. */
export const CLIENTS: string[] = [
  'РЖД',
  'Ростелеком',
  'Авито',
  'Sanofi',
  'Janssen (Johnson & Johnson)',
  'Novo Nordisk',
  'MSD',
  'Abbott',
  'Japan Tobacco International',
  'Makita',
  'Billa',
  'Министерство финансов',
  'Министерство культуры',
  'Министерство экологии',
  'Министерство соц. защиты',
  'РАНХиГС',
  'MPA-ИГСУ',
  'Мособлгаз',
  'Tikkurila (PPG)',
  'Recordati',
  'Cersanit',
  'ЛокоТех',
  'Freedom International Group',
  'Сапсан-недвижимость',
  'Пиканта',
];

export const logos = LOGOS.map((l) => {
  const mod = logoFiles[`../assets/images/logos/${l.slug}.png`];
  if (!mod) throw new Error(`clients.ts: не найден логотип ${l.slug}.png`);
  return { ...l, image: mod.default };
});
