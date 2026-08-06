// Лид-форма блока #request (src/components/LeadForm.astro):
// проверка полей, состояния отправки, сборка payload вместе с реферальным
// хвостом.
//
// ЧЕГО ЗДЕСЬ ПОКА НЕТ: настоящей отправки. Бэкенда у статического сайта нет,
// заявка никуда не уходит — sendLead() ниже это заглушка с одним TODO.
// Всё остальное (валидация, состояния, хвост, антиспам) работает по-настоящему,
// чтобы подключение обработчика свелось к правке одной функции.
//
// Форма помечена novalidate: браузерные сообщения не стилизуются и на части
// платформ выводятся не по-русски. Тексты ошибок приезжают из data-атрибутов
// полей — они типографированы на сборке (см. typografAttr в LeadForm.astro).

import { formatReferral, getReferral, parseReferral, type ReferralParsed } from './referral';

/** То, что уйдёт на бэкенд, когда он появится. */
export interface LeadPayload {
  name: string;
  phone: string;
  email: string;
  comment: string;
  /** Реферальный хвост человекочитаемым текстом — для письма Денису. */
  referralText: string;
  /** Он же структурой — для аналитики и БД. */
  referral: ReferralParsed | null;
  /** Страница, с которой ушла заявка (не путать со страницей входа). */
  page: string;
  sentAt: string;
}

/** Минимум цифр в номере: 10 — это российский номер без кода страны. */
const MIN_PHONE_DIGITS = 10;

/** Нарочно нестрогая проверка: задача — поймать опечатку, а не отфильтровать RFC. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Мягкая нормализация телефона. Жёсткой маски нет намеренно: тренинги идут
 * в России, СНГ и Евросоюзе, и шаблон «+7 (___) ___-__-__» отсёк бы +375,
 * +49 и остальные. Приводим только очевидные российские случаи.
 */
function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith('+')) return trimmed;

  const digits = trimmed.replace(/\D/g, '');
  // 8 900 … и 7 900 … — 11 цифр с кодом страны в местной записи.
  if (digits.length === 11 && (digits[0] === '8' || digits[0] === '7')) {
    return `+7${digits.slice(1)}`;
  }
  // 900 … — мобильный без кода страны.
  if (digits.length === 10 && digits[0] === '9') {
    return `+7${digits}`;
  }
  return trimmed;
}

function countDigits(value: string): number {
  return (value.match(/\d/g) ?? []).length;
}

function init(): void {
  const form = document.getElementById('lead-form') as HTMLFormElement | null;
  if (!form) return;

  const phone = document.getElementById('lead-phone') as HTMLInputElement | null;
  const email = document.getElementById('lead-email') as HTMLInputElement | null;
  const consent = document.getElementById('lead-consent') as HTMLInputElement | null;
  const honeypot = document.getElementById('lead-company-site') as HTMLInputElement | null;
  const nameInput = document.getElementById('lead-name') as HTMLInputElement | null;
  const comment = document.getElementById('lead-comment') as HTMLTextAreaElement | null;
  const referralField = document.getElementById('lead-referral') as HTMLInputElement | null;
  const referralJsonField = document.getElementById('lead-referral-json') as HTMLInputElement | null;
  const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const status = document.getElementById('lead-status');
  const success = document.getElementById('lead-success');

  if (!phone || !consent || !submitBtn) return;

  // ---------- Реферальный хвост ----------
  // Считывается один раз при загрузке: в sessionStorage он уже лежит, его
  // положил синхронный скрипт из <head> BaseLayout.astro.
  const referralRaw = getReferral();
  const referralParsed = referralRaw ? parseReferral(referralRaw) : null;
  const referralText = formatReferral(referralRaw);

  if (referralField) referralField.value = referralText;
  if (referralJsonField) {
    referralJsonField.value = referralParsed ? JSON.stringify(referralParsed) : '';
  }

  // Отладочная панель: ?debug=referral. Способ проверить парсинг меток глазами,
  // пока заявки никуда не уходят.
  if (new URLSearchParams(location.search).get('debug') === 'referral') {
    const panel = document.getElementById('lead-debug');
    const out = document.getElementById('lead-debug-out');
    if (panel && out) {
      panel.hidden = false;
      panel.setAttribute('open', '');
      out.textContent = `${referralText}\n\n— — —\n\n${
        referralParsed ? JSON.stringify(referralParsed, null, 2) : 'хвоста нет'
      }`;
    }
  }

  // ---------- Валидация ----------
  /** Ошибки показываем только после первой попытки отправки — до неё форма молчит. */
  let attempted = false;

  function wrapOf(control: HTMLElement): HTMLElement | null {
    return control.closest<HTMLElement>('.field');
  }

  function setFieldError(control: HTMLElement, message: string | null): void {
    const wrap = wrapOf(control);
    if (!wrap) return;
    const errorEl = wrap.querySelector<HTMLElement>('.field__error');

    if (message) {
      wrap.setAttribute('data-invalid', '');
      control.setAttribute('aria-invalid', 'true');
      if (errorEl) errorEl.textContent = message;
    } else {
      wrap.removeAttribute('data-invalid');
      control.removeAttribute('aria-invalid');
      if (errorEl) errorEl.textContent = '';
    }
  }

  function validatePhone(): boolean {
    const value = phone!.value.trim();
    if (!value) {
      setFieldError(phone!, phone!.dataset.errorEmpty ?? 'Укажите телефон');
      return false;
    }
    if (countDigits(value) < MIN_PHONE_DIGITS) {
      setFieldError(phone!, phone!.dataset.errorInvalid ?? 'Проверьте номер');
      return false;
    }
    setFieldError(phone!, null);
    return true;
  }

  function validateEmail(): boolean {
    if (!email) return true;
    const value = email.value.trim();
    // Поле необязательное: пустое — не ошибка.
    if (!value) {
      setFieldError(email, null);
      return true;
    }
    if (!EMAIL_RE.test(value)) {
      setFieldError(email, email.dataset.errorInvalid ?? 'Проверьте адрес');
      return false;
    }
    setFieldError(email, null);
    return true;
  }

  function validateConsent(): boolean {
    if (!consent!.checked) {
      setFieldError(consent!, consent!.dataset.errorEmpty ?? 'Нужно согласие на обработку данных');
      return false;
    }
    setFieldError(consent!, null);
    return true;
  }

  // Живая перепроверка — только после первой неудачной отправки. Иначе форма
  // ругалась бы на недописанный номер прямо во время набора.
  phone.addEventListener('input', () => { if (attempted) validatePhone(); });
  email?.addEventListener('input', () => { if (attempted) validateEmail(); });
  consent.addEventListener('change', () => { if (attempted) validateConsent(); });

  // Нормализуем номер, когда человек уходит из поля: во время набора это
  // переставляло бы каретку.
  phone.addEventListener('blur', () => {
    const normalized = normalizePhone(phone.value);
    if (normalized !== phone.value) phone.value = normalized;
  });

  // ---------- Состояния отправки ----------
  const labelIdle = submitBtn.textContent ?? 'Отправить заявку';
  const labelSending = submitBtn.dataset.labelSending ?? 'Отправляем…';

  function setSending(sending: boolean): void {
    submitBtn!.disabled = sending;
    submitBtn!.textContent = sending ? labelSending : labelIdle;
    if (sending) submitBtn!.setAttribute('aria-busy', 'true');
    else submitBtn!.removeAttribute('aria-busy');
  }

  function showStatus(visible: boolean): void {
    if (!status) return;
    if (visible) status.setAttribute('data-visible', '');
    else status.removeAttribute('data-visible');
  }

  function showSuccess(): void {
    if (!success) return;
    form!.hidden = true;
    success.hidden = false;
    // Фокус уводим на экран благодарности: иначе он остаётся на кнопке,
    // которой в DOM уже не видно.
    success.focus();
  }

  /**
   * TODO(backend): здесь появится реальный обработчик — Formspree / Getform
   * либо serverless-функция, отправляющая письмо на info@pdca-consulting.ru.
   * Сигнатуру не менять: форма уже умеет ждать промис и разводить успех
   * и ошибку сети. Реджект промиса = показ блока «не получилось отправить».
   */
  async function sendLead(payload: LeadPayload): Promise<void> {
    console.info('[lead-form] payload', payload);
    console.info(`[lead-form] реферальный хвост:\n${payload.referralText}`);
    await new Promise((resolve) => setTimeout(resolve, 900));
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    attempted = true;
    showStatus(false);

    // Проверяем всё разом, а не по короткому замыканию: человек должен увидеть
    // сразу все проблемы, а не по одной за отправку.
    const okPhone = validatePhone();
    const okEmail = validateEmail();
    const okConsent = validateConsent();

    if (!okPhone || !okEmail || !okConsent) {
      const firstInvalid = form.querySelector<HTMLElement>('[aria-invalid="true"]');
      firstInvalid?.focus();
      return;
    }

    // Honeypot заполнен — это бот. Показываем ему успех и ничего не отправляем:
    // так он не поймёт, что отсеян, и не станет подбирать обход.
    if (honeypot && honeypot.value.trim() !== '') {
      showSuccess();
      return;
    }

    phone.value = normalizePhone(phone.value);

    const payload: LeadPayload = {
      name: nameInput?.value.trim() ?? '',
      phone: phone.value.trim(),
      email: email?.value.trim() ?? '',
      comment: comment?.value.trim() ?? '',
      referralText,
      referral: referralParsed,
      page: location.pathname,
      sentAt: new Date().toISOString(),
    };

    setSending(true);
    sendLead(payload)
      .then(() => {
        showSuccess();
      })
      .catch((error: unknown) => {
        console.error('[lead-form] отправка не удалась', error);
        showStatus(true);
      })
      .finally(() => {
        setSending(false);
      });
  });
}

init();
