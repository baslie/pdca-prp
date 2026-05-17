# -*- coding: utf-8 -*-
"""
Расстановка неразрывных пробелов (U+00A0) в HTML-файле.

Подход:
1. Из исходного HTML «вынимаем» в плейсхолдеры участки, которые трогать нельзя:
   <head>...</head>, <script>...</script>, <style>...</style>, HTML-комментарии,
   а также <pre>/<code> (там вёрстка значима).
2. Затем разбиваем оставшийся HTML по тегам — каждый '<...>' становится отдельным
   фрагментом. Регулярки применяем ТОЛЬКО к фрагментам-текстам (вне тегов),
   поэтому атрибуты тегов остаются нетронутыми.
3. К каждому текстовому узлу применяем набор правил русской типографики.
4. Плейсхолдеры возвращаем на место.

Правила:
* Длинное тире "—" вокруг слов: пробел перед тире меняется на NBSP.
* Числа + единица измерения / слово: "100 руб" → "100 руб".
* Короткие служебные слова (предлоги, союзы, частицы) — NBSP к следующему слову,
  чтобы они не висели в конце строки.
* Инициалы: "А. С. Пушкин" → "А. С. Пушкин".
* "г. Москва" / "ул. Ленина" → с NBSP после сокращения.
* "т. е.", "и т. д.", "и т. п." — с NBSP внутри.

Запуск (из корня репо):
    python scripts/typography.py
Опции:
    --check  — не записывать файл, только показать diff и счётчик замен.
    --files  — список путей через запятую; по умолчанию index.html.
"""

import argparse
import re
import sys
from pathlib import Path

NBSP = " "

# Короткие служебные слова, после которых ставим NBSP, чтобы они «прилипли»
# к следующему слову (висячие предлоги — главный типографический баг).
SHORT_WORDS = sorted({
    # предлоги
    "в", "во", "на", "по", "с", "со", "к", "ко", "о", "об", "обо", "у",
    "из", "изо", "от", "ото", "до", "за", "над", "надо", "под", "подо",
    "при", "без", "для", "через", "между", "про", "перед", "вокруг",
    "вместо", "после", "вне", "вдоль", "сквозь", "около",
    # союзы
    "и", "а", "но", "да", "или", "либо", "то", "что", "чтобы", "если",
    "когда", "пока", "хотя", "чем",
    # частицы
    "не", "ни", "же", "бы", "ли", "уж", "ведь", "лишь",
    # местоимения
    "я", "ты", "мы", "вы", "он", "она", "оно", "они",
    "это", "то", "тот", "та", "те", "та", "тех", "тем",
    "мой", "моя", "моё", "мои", "наш", "ваш", "их", "её", "его",
    # короткие
    "как", "так", "там", "тут", "где", "куда", "уже", "ещё", "еще",
    "был", "была", "было", "были",
}, key=len, reverse=True)


def _make_short_words_re() -> re.Pattern:
    """
    Lookbehind: перед коротким словом — НЕ буква и НЕ цифра (то есть начало строки,
    пробел, дефис, скобка, кавычка и т. п.). Это исключает срабатывание внутри
    других слов (например, «в» в «верстак»).
    Lookahead: после пробела — буква, цифра или открывающая кавычка/скобка.
    Регистр игнорируем — но lookbehind/lookahead не пропустят середину слова.
    """
    alt = "|".join(SHORT_WORDS)
    return re.compile(
        r"(?<![А-Яа-яЁёA-Za-z0-9])(" + alt + r")(\s+)(?=[А-Яа-яЁёA-Za-z0-9«„(\[])",
        flags=re.IGNORECASE,
    )


SHORT_WORDS_RE = _make_short_words_re()

# 100 кг / 5 лет / 30 минут / 1000 рублей / 50 % / 2024 год
# Заменяем пробел между числом и следующим словом/символом единицы.
NUMBER_UNIT_RE = re.compile(
    r"(\d)(\s+)(?=[А-Яа-яЁёA-Za-z%°₽$€£])"
)

# Инициалы: «А. С. Пушкин» → «А.NBSPС.NBSPПушкин»
# Заглавная буква, точка, пробелы, заглавная буква, точка.
INITIALS_RE = re.compile(
    r"([А-ЯЁA-Z])\.(\s+)([А-ЯЁA-Z])\."
)
INITIALS_NAME_RE = re.compile(
    r"([А-ЯЁA-Z])\.(\s+)(?=[А-ЯЁA-Z][а-яёa-z])"
)

# Сокращения с обязательным NBSP после: «г. Москва», «ул. Ленина», «д. 5» и т. п.
ABBR_BEFORE_NAME_RE = re.compile(
    r"\b(г|ул|пр|пер|пл|обл|респ|с|д|стр|корп|оф|т|тел|см|стр)\.(\s+)(?=[А-ЯЁA-Z0-9])"
)

# «т. е.», «и т. д.», «и т. п.» — стандартные обороты.
TE_RE = re.compile(r"\bт\.(\s+)е\.", re.IGNORECASE)
ITD_RE = re.compile(r"\bи(\s+)т\.(\s+)д\.", re.IGNORECASE)
ITP_RE = re.compile(r"\bи(\s+)т\.(\s+)п\.", re.IGNORECASE)


def apply_nbsp(text: str) -> str:
    if not text or not text.strip():
        return text

    # 1) Длинное тире: « — » → «<NBSP>— ». Тире прижимается к слову слева.
    text = re.sub(r"(\S) +— +", r"\1" + NBSP + "— ", text)
    text = re.sub(r"(\S) +–\s+", r"\1" + NBSP + "– ", text)  # короткое тире/en-dash

    # 2) Числа + единица.
    text = NUMBER_UNIT_RE.sub(lambda m: m.group(1) + NBSP, text)

    # 3) Инициалы: «А. С. Пушкин».
    #    Сначала пара «А. С.» → «А.<NBSP>С.», затем «С. Пушкин» → «С.<NBSP>Пушкин».
    text = INITIALS_RE.sub(lambda m: f"{m.group(1)}.{NBSP}{m.group(3)}.", text)
    text = INITIALS_NAME_RE.sub(lambda m: f"{m.group(1)}.{NBSP}", text)

    # 4) Сокращения перед именем.
    text = ABBR_BEFORE_NAME_RE.sub(lambda m: f"{m.group(1)}.{NBSP}", text)

    # 5) «т. е.», «и т. д.», «и т. п.».
    text = TE_RE.sub("т." + NBSP + "е.", text)
    text = ITD_RE.sub("и" + NBSP + "т." + NBSP + "д.", text)
    text = ITP_RE.sub("и" + NBSP + "т." + NBSP + "п.", text)

    # 6) Короткие слова (предлоги, союзы, частицы) — последним, чтобы не перетереть
    #    уже расставленные NBSP в сокращениях.
    text = SHORT_WORDS_RE.sub(lambda m: m.group(1) + NBSP, text)

    return text


# Маскирование участков, которые нельзя трогать.
MASK_PATTERNS = [
    # head целиком — атрибуты meta/title/link там часто содержат описания на русском,
    # но пользователь явно просил трогать только body.
    re.compile(r"<head\b[^>]*>[\s\S]*?</head>", re.IGNORECASE),
    re.compile(r"<script\b[^>]*>[\s\S]*?</script>", re.IGNORECASE),
    re.compile(r"<style\b[^>]*>[\s\S]*?</style>", re.IGNORECASE),
    re.compile(r"<pre\b[^>]*>[\s\S]*?</pre>", re.IGNORECASE),
    re.compile(r"<code\b[^>]*>[\s\S]*?</code>", re.IGNORECASE),
    re.compile(r"<!--[\s\S]*?-->"),
]

TAG_RE = re.compile(r"<[^>]+>")


def process_html(html: str) -> tuple[str, int]:
    holders: list[str] = []

    def hold(m: re.Match) -> str:
        holders.append(m.group(0))
        return f"\x00H{len(holders) - 1}\x00"

    masked = html
    for pat in MASK_PATTERNS:
        masked = pat.sub(hold, masked)

    # Разбиваем по тегам: тег / текст / тег / текст / ...
    parts = TAG_RE.split(masked)
    tags = TAG_RE.findall(masked)

    # Считаем количество вставленных NBSP, чтобы показать пользователю.
    nbsp_before = sum(p.count(NBSP) for p in parts)
    parts = [apply_nbsp(p) for p in parts]
    nbsp_after = sum(p.count(NBSP) for p in parts)

    # Сборка: parts[0] + tags[0] + parts[1] + tags[1] + ...
    out: list[str] = []
    for i, part in enumerate(parts):
        out.append(part)
        if i < len(tags):
            out.append(tags[i])
    rebuilt = "".join(out)

    # Возвращаем заглушки.
    def restore(m: re.Match) -> str:
        idx = int(m.group(1))
        return holders[idx]

    rebuilt = re.sub(r"\x00H(\d+)\x00", restore, rebuilt)
    return rebuilt, nbsp_after - nbsp_before


def main() -> int:
    parser = argparse.ArgumentParser(description="Расстановка NBSP в HTML.")
    parser.add_argument(
        "--files",
        default="index.html",
        help="Список путей через запятую (default: index.html)",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Не записывать файл, только посчитать вставки.",
    )
    args = parser.parse_args()

    files = [Path(p.strip()) for p in args.files.split(",") if p.strip()]
    total_inserted = 0

    for path in files:
        if not path.exists():
            print(f"[SKIP] {path}: not found", file=sys.stderr)
            continue
        original = path.read_text(encoding="utf-8")
        processed, inserted = process_html(original)
        total_inserted += inserted
        verb = "would insert" if args.check else "inserted"
        print(f"[{path}] {verb} {inserted} NBSP")
        if not args.check and processed != original:
            path.write_text(processed, encoding="utf-8")
    print(f"Total: {total_inserted} NBSP")
    return 0


if __name__ == "__main__":
    sys.exit(main())
