// Реферальный хвост: откуда посетитель пришёл на сайт.
//
// Задача — не потерять источник заявки. Человек приходит по рекламной ссылке
// с UTM-метками, ходит по страницам (сейчас лендинг один, дальше будут ещё),
// и к моменту отправки формы метки из адресной строки уже пропали. Поэтому
// хвост снимается ОДИН раз на входе и живёт в sessionStorage до конца сессии.
//
// Разделение ответственности:
//   - ЗАХВАТ сырья — синхронный is:inline-скрипт в <head> BaseLayout.astro.
//     Там он специально: если модуль не успеет догрузиться до того, как
//     посетитель уйдёт по ссылке, хвост будет потерян навсегда.
//   - РАЗБОР и форматирование — этот модуль. Он ничего не пишет, только читает.
//
// sessionStorage, а не localStorage: хвост привязан к одной сессии вкладки —
// переживает переходы между страницами и умирает вместе с вкладкой. Хранить
// его дольше не нужно и незачем.

/** Сырьё, которое кладёт в sessionStorage инлайн-скрипт из <head>. */
export interface ReferralRaw {
  /** Полный href страницы входа — вместе с query-строкой. */
  url: string;
  /** document.referrer на момент входа. Пустая строка = прямой заход. */
  referrer: string;
  /** ISO-дата первого визита в сессии. */
  ts: string;
  /** Были ли в query-строке маркетинговые метки. Нужен правилу перезаписи. */
  hasUtm: boolean;
}

/** Один GET-параметр, готовый к показу человеку. */
export interface ReferralParam {
  key: string;
  /** Человеческая подпись из словаря; для неизвестных ключей равна key. */
  label: string;
  value: string;
  /** false — ключа нет в словаре, показываем как есть. */
  known: boolean;
}

export interface ReferralParsed {
  /** Путь страницы входа без домена и query. */
  landing: string;
  /** Расшифрованный источник перехода: «Яндекс (поиск)», «прямой заход»… */
  source: string;
  /** Голый document.referrer — для машинной обработки на бэкенде. */
  referrer: string;
  /** Дата первого визита, отформатированная по-русски. */
  visitedAt: string;
  /** ISO-дата первого визита — для бэкенда. */
  ts: string;
  /** Все GET-параметры страницы входа, кроме служебных. */
  params: ReferralParam[];
}

/** Ключ в sessionStorage. Дублируется в инлайн-скрипте BaseLayout.astro. */
export const REFERRAL_KEY = 'pdca:ref';

/**
 * Человеческие подписи известных меток.
 *
 * Список закрытый намеренно: всё, чего здесь нет, всё равно попадёт в вывод —
 * просто под своим техническим именем. Терять параметры нельзя, заказчик
 * получает хвост целиком.
 *
 * ВНИМАНИЕ: состав связан с regex MARKS в инлайн-скрипте BaseLayout.astro —
 * тот решает, ПЕРЕЗАПИСЫВАТЬ ли сохранённый хвост при новом входе с метками.
 * Сейчас в MARKS нет ref/from (вход только с ними не считается «рекламным»
 * и хвост не обновляет) — известный рассинхрон, вынесен в docs/BACKLOG.md.
 * Добавляешь новую метку — реши, должна ли она попасть и в MARKS.
 */
const PARAM_LABELS: Record<string, string> = {
  utm_source: 'Источник',
  utm_medium: 'Канал',
  utm_campaign: 'Кампания',
  utm_content: 'Объявление',
  utm_term: 'Ключевая фраза',
  gclid: 'Google Ads (click id)',
  gbraid: 'Google Ads (click id, iOS)',
  wbraid: 'Google Ads (click id, web)',
  yclid: 'Яндекс.Директ (click id)',
  ymclid: 'Яндекс.Маркет (click id)',
  fbclid: 'Facebook (click id)',
  ttclid: 'TikTok (click id)',
  vk_click_id: 'ВКонтакте (click id)',
  erid: 'Маркировка рекламы (ERID)',
  roistat: 'Roistat',
  _openstat: 'Openstat',
  ref: 'Реферал',
  from: 'Откуда',
};

/**
 * Служебные параметры, которые в хвост не попадают: они наши собственные
 * и к источнику трафика отношения не имеют. `debug` включает отладочную
 * панель формы — см. lead-form.ts.
 */
const SERVICE_PARAMS = new Set(['debug']);

/**
 * Расшифровка домена-реферера. Порядок важен: `dzen.ru` и `zen.yandex.ru`
 * должны проверяться до общего `yandex`, иначе Дзен превратится в «поиск».
 */
const REFERRER_HOSTS: Array<[RegExp, string]> = [
  [/(^|\.)dzen\.ru$|^zen\.yandex\./, 'Дзен'],
  [/(^|\.)market\.yandex\./, 'Яндекс.Маркет'],
  [/(^|\.)yandex\./, 'Яндекс (поиск)'],
  [/(^|\.)google\./, 'Google (поиск)'],
  [/(^|\.)mail\.ru$/, 'Mail.ru (поиск)'],
  [/(^|\.)bing\.com$/, 'Bing (поиск)'],
  [/(^|\.)duckduckgo\.com$/, 'DuckDuckGo (поиск)'],
  [/(^|\.)rambler\.ru$/, 'Рамблер (поиск)'],
  [/(^|\.)vk\.(com|ru)$/, 'ВКонтакте'],
  [/(^|\.)t\.me$|(^|\.)telegram\.(org|me)$/, 'Telegram'],
  [/(^|\.)ok\.ru$/, 'Одноклассники'],
  [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, 'YouTube'],
  [/(^|\.)rutube\.ru$/, 'RuTube'],
  [/(^|\.)linkedin\.com$/, 'LinkedIn'],
  [/(^|\.)facebook\.com$/, 'Facebook'],
  [/(^|\.)instagram\.com$/, 'Instagram'],
  [/(^|\.)whatsapp\.com$/, 'WhatsApp'],
  [/(^|\.)hh\.ru$/, 'HeadHunter'],
];

/** Читает сырой хвост из sessionStorage. null — хвоста нет или он битый. */
export function getReferral(): ReferralRaw | null {
  try {
    const raw = sessionStorage.getItem(REFERRAL_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const r = parsed as Partial<ReferralRaw>;
    if (typeof r.url !== 'string') return null;
    return {
      url: r.url,
      referrer: typeof r.referrer === 'string' ? r.referrer : '',
      ts: typeof r.ts === 'string' ? r.ts : '',
      hasUtm: r.hasUtm === true,
    };
  } catch {
    // Приватный режим, отключённое хранилище, повреждённый JSON — трекинг
    // не критичен, заявка должна уйти в любом случае.
    return null;
  }
}

/** «Яндекс (поиск)» вместо «https://yandex.ru/search/?text=…». */
function describeReferrer(referrer: string): string {
  if (!referrer) return 'прямой заход или закладка';
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return referrer;
  }
  // Переход внутри самого сайта источником не является: значит, хвост сняли
  // не на первой странице визита.
  if (typeof location !== 'undefined' && host === location.hostname) {
    return 'внутренний переход';
  }
  for (const [pattern, label] of REFERRER_HOSTS) {
    if (pattern.test(host)) return `${label} — ${host}`;
  }
  return host;
}

/** ISO-дата → «6 августа 2026, 15:44». Пустая строка, если даты нет. */
function formatDate(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** Раскладывает сырой хвост на понятные части. */
export function parseReferral(raw: ReferralRaw): ReferralParsed {
  let landing = raw.url;
  const params: ReferralParam[] = [];

  try {
    const url = new URL(raw.url);
    landing = url.pathname;
    url.searchParams.forEach((value, key) => {
      if (SERVICE_PARAMS.has(key)) return;
      const label = PARAM_LABELS[key];
      params.push({ key, label: label ?? key, value, known: label !== undefined });
    });
  } catch {
    // Битый URL — оставляем как есть, лучше сырая строка, чем ничего.
  }

  // Известные метки вперёд: в письме сначала должно идти «Источник: yandex»,
  // а не случайный технический параметр из рекламной ссылки.
  params.sort((a, b) => Number(b.known) - Number(a.known));

  return {
    landing,
    source: describeReferrer(raw.referrer),
    referrer: raw.referrer,
    visitedAt: formatDate(raw.ts),
    ts: raw.ts,
    params,
  };
}

/**
 * Хвост в том виде, в котором его будет читать человек — Денис в письме
 * с заявкой. Многострочный текст, по строке на факт.
 */
export function formatReferral(raw: ReferralRaw | null): string {
  if (!raw) return 'Прямой заход, метки перехода отсутствуют.';

  const parsed = parseReferral(raw);
  const lines: string[] = [`Страница входа: ${parsed.landing}`, `Переход: ${parsed.source}`];

  if (parsed.visitedAt) lines.push(`Первый визит: ${parsed.visitedAt}`);
  for (const p of parsed.params) lines.push(`${p.label}: ${p.value}`);
  if (parsed.params.length === 0) lines.push('Метки в ссылке: нет');

  return lines.join('\n');
}
