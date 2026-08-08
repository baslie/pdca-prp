// Контакты компании — единственный источник правды.
// Потребители: Header.astro (телефон/почта в шапке), LeadForm.astro
// (контактная колонка), BaseLayout.astro (JSON-LD Organization).
//
// Два формата телефона НАМЕРЕННО: schema.org требует международный формат
// с «+7», видимый текст на сайте — привычный посетителю «8 495…».
// Это не рассинхрон, а два представления одного номера.

export const PHONE_HREF = 'tel:+74957408340';
export const PHONE_DISPLAY = '8 495 740-83-40';
export const PHONE_SCHEMA = '+7 495 740-83-40';

export const EMAIL = 'info@pdca-consulting.ru';

export const TELEGRAM_HANDLE = '@SnegKres';
export const TELEGRAM_URL = 'https://t.me/SnegKres';
