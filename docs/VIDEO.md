# Видео BoomStream — PDCA / ПРП

Этот документ — единственный источник правды по видео: компонент
`BoomStreamPlayer.astro`, embed, postMessage API, watchdog и muted-autoplay.
Открыть ПЕРЕД добавлением нового видео или правкой плеера. Секция-обёртка
подчиняется правилам слоёв — см. [STACKING.md](STACKING.md).

На сайте используется видеохостинг **BoomStream** (`play.boomstream.com`). Текущее видео — `nm7YeR0q` (Учебный курс «Профессиональное Решение Проблем», ~30 мин).

## Как добавить новое видео

Механизм унифицирован: `BoomStreamPlayer.astro` — переиспользуемый компонент, весь фолбэк (watchdog, оверлей «Видео не загрузилось», кнопка «Попробовать снова») приезжает с ним автоматически. Новое видео — это только:

```astro
---
import BoomStreamPlayer from '../components/BoomStreamPlayer.astro';
---
<BoomStreamPlayer code="КОД_ВИДЕО" title="Название видео (accessibility + подпись iframe)" />
```

- `code` — последний сегмент URL плеера (`play.boomstream.com/XXXX`), берётся из кабинета BoomStream.
- **Ничего дополнительно подключать не нужно**: `boomstream-watchdog.ts` обслуживает все экземпляры `[data-bs-player]` на странице разом (один message-листенер, один IntersectionObserver; Astro хойстит скрипт один раз). Несколько плееров с разными `code` работают независимо, таймер у каждого свой.
- Секцию-обёртку делает вызывающий — по правилам стэкинга (`relative z-10` + непрозрачный фон, см. [STACKING.md](STACKING.md)); образец — `src/components/Video.astro`.
- Опциональный флаг `autoplay` — muted-автостарт (см. «Muted-autoplay» ниже). Нюанс: его inline-скрипт ищет iframe по `src`, поэтому два плеера с **одинаковым** `code` и `autoplay` на одной странице не поддерживаются (случай гипотетический).
- Aspect ratio фиксирован 16:9 (`aspect-video`); для вертикальных видео компонент потребует доработки.

## Текущий embed

В `src/components/BoomStreamPlayer.astro` встроен **прямым `<iframe>`** по официальной рекомендации BoomStream: https://boomstream.ru/documentation/developers/adaptive-style. Без SDK biframesdk.js — адаптивность даёт CSS-контейнер. Внешний компонент `<Video />` (`src/components/Video.astro`) использует его как `<BoomStreamPlayer code="nm7YeR0q" />`.

```html
<div class="relative w-full aspect-video bg-panel overflow-hidden rounded-sm ...">
  <iframe class="absolute inset-0 w-full h-full"
          src="https://play.boomstream.com/nm7YeR0q?color=false&amp;title=0"
          frameborder="0"
          scrolling="no"
          allow="autoplay; fullscreen"
          loading="lazy"
          title="Учебный курс «Профессиональное Решение Проблем»"></iframe>
</div>
```

Ключевые моменты:
- **`aspect-video` (16:9)** — современный эквивалент CSS-хака `padding-bottom: 56.25%` из документации BoomStream. Резервирует место под плеер до его загрузки, CLS отсутствует.
- **Параметры плеера** (`color=false&title=0`) передаются в query-string `src` — без отдельного `config.jsonp`.
- **`allow="autoplay; fullscreen"`** — обязательно для muted-autoplay (Autoplay Policy браузеров) и для перехода в fullscreen. Поддерживается во всех браузерах с 2020 г.
- **БЕЗ устаревшего `allowfullscreen`** — атрибут-дубликат `allow`'а вызывал DevTools warning «Allow attribute will take precedence over 'allowfullscreen'». Удалён в пользу единственного современного `allow="...fullscreen"`.
- **`loading="lazy"`** — iframe (и связанные ~150 KB JS+медиа) грузятся, когда пользователь доскроллит до видео.
- **Без `biframesdk.js`** и без `config.jsonp` — минус 2 HTTP-запроса и минус JS-зависимость.

## Управление плеером через postMessage API

Документация: https://api.boomstream.com/player-api (англ.), https://boomstream.ru/documentation/api/player-api (рус.).

- **Events от плеера**: `loaded`, `play`, `pause`, `stop`, `time`, `progress`, `fullScreen`, `event`. Ловятся через `window.addEventListener('message', …)`. Origin: `https://play.boomstream.com`. В `event.data` поля: `method`, `code`, `time`, `duration`.
- **Actions в плеер**: `play`, `pause`, `seek`, `mute`, `unmute`, `volume`, `useLastTime`, `previous`, `next`, `fullScreen`, `toggleFullScreenButtonState`. Отправляются через `frame.contentWindow.postMessage({ code: '<CODE>', method: 'action', action: '<ACTION>', data: '' }, 'https://play.boomstream.com')`.
- **iframe должен содержать** `allow="autoplay; fullscreen"` — в текущей разметке прописано вручную (см. блок «Текущий embed» выше).

## Watchdog: fallback при недоступности видеохостинга

У посетителей с VPN запрос к `play.boomstream.com` может «висеть» — iframe остаётся пустым, а поймать провал штатно нельзя (`load` у cross-origin iframe срабатывает даже на странице ошибки, `error` не срабатывает вовсе). Решение — `src/scripts/boomstream-watchdog.ts` (подключён в `BoomStreamPlayer.astro`):

- Сигнал успеха — **любой** postMessage плеера с нашим `code` (не только `loaded`).
- Когда обёртка `[data-bs-player]` приближается к вьюпорту (IntersectionObserver, rootMargin 200px), взводится таймер 5 с. Не пришло ни одного сообщения — поверх панели показывается оверлей `[data-bs-overlay]` («Видео не загрузилось… отключите VPN») с кнопкой `[data-bs-retry]` («Попробовать снова» = переустановка `src` + новый таймер). Позднее сообщение плеера снимает оверлей автоматически — поэтому короткий таймаут безопасен и для честно-медленных сетей.
- Кнопка — класс `.btn-video-retry` в `global.css` (палитра `.btn-primary`, габариты `.btn-modal-back`).

По той же причине `src/scripts/prp-diagram-scroll.ts` **не ждёт `window.load`** — init вызывается сразу (зависший iframe откладывал бы load бесконечно, и блок `#prp-steps` навсегда оставался бы в pre-state opacity 0.15). Пересчёт позиций после догрузки шрифтов обеспечивают `document.fonts.ready` + autoRefreshEvents самого ScrollTrigger. **Не возвращать ожидание load.**

## Muted-autoplay — как включить

Документация прямо говорит: *«muted required when auto-starting on load»* — автоплей со звуком блокируют сами браузеры (Autoplay Policy), это не ограничение BoomStream. Корректный паттерн — стартовать без звука, пользователь сам включает.

Встроен в `BoomStreamPlayer.astro` — включается флагом `autoplay`: `<BoomStreamPlayer code="..." autoplay />`. Готовый сниппет (для справки — он уже внутри компонента под `{autoplay && (<script>...)}`):

```html
<script>
  (function () {
    var MEDIA_CODE = 'nm7YeR0q';
    var BS_ORIGIN  = 'https://play.boomstream.com';
    var started    = false;

    function sendAction(action, data) {
      var frame = document.querySelector('iframe[src*="' + MEDIA_CODE + '"]');
      if (!frame || !frame.contentWindow) return;
      frame.contentWindow.postMessage(
        { code: MEDIA_CODE, method: 'action', action: action, data: data || '' },
        BS_ORIGIN
      );
    }

    window.addEventListener('message', function (e) {
      if (e.origin !== BS_ORIGIN) return;
      var d = e.data;
      if (!d || d.code !== MEDIA_CODE) return;
      if (d.method === 'loaded' && !started) {
        started = true;
        sendAction('mute');
        sendAction('play');
      }
    }, false);
  })();
</script>
```

Флаг `started` гарантирует одноразовое вмешательство — дальше пользователь сам управляет (unmute, pause, seek и т. д.).

## Edge-cases muted-autoplay

- iOS в режиме Low Power Mode — autoplay блокируется системно, даже muted.
- Firefox — может блокировать по доменной политике пользователя.
- Скрытая вкладка / `prefers-reduced-motion` — не влияет, но autoplay в фоне браузеры приостанавливают.

В этих случаях плеер просто покажет постер с кнопкой play — деградация мягкая.
