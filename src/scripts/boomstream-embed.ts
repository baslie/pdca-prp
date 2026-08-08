// Единственный источник правды про embed BoomStream: origin плеера и формула
// src iframe'а. Потребители — статический плеер (BoomStreamPlayer.astro),
// модалка видеоотзывов (video-reviews.ts) и watchdog VPN-фолбэка
// (boomstream-watchdog.ts). Разъедутся origin или параметры — postMessage
// перестанет проходить проверку e.origin и автозапуск/watchdog умрут молча.

export const BS_ORIGIN = 'https://play.boomstream.com';

/** src iframe'а плеера: color=false — без фирменной подкраски, title=0 — без заголовка. */
export const bsEmbedSrc = (code: string): string =>
  `${BS_ORIGIN}/${code}?color=false&title=0`;
