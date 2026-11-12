#!/usr/bin/env python3
"""Лінтер STE-UA: перевіряє тексти за правилами tools/ste/RULES.md.

Режими:
  check.py FILE...          перевірити .md і .html; код виходу 1, якщо є помилки
  check.py --stdin          перевірити текст зі stdin (як markdown)
  check.py --hook-file      PostToolUse-хук: JSON зі stdin, файл з tool_input.file_path
  check.py --chat           Stop-хук: JSON зі stdin, остання відповідь асистента
  check.py --all            перевірити всі .md і .html у репо (git ls-files)

Блоки поза перевіркою:
  - код (``` і `...`), URL, заголовки, цитати (> і <blockquote>);
  - <script>, <style>, <svg>, <pre>, <code>;
  - усе між <!-- ste-off --> і <!-- ste-on -->.
"""
import html as htmllib
import json
import os
import re
import subprocess
import sys
from html.parser import HTMLParser

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

MAX_WORDS = 25        # речення: помилка, якщо більше
WARN_WORDS = 20       # речення: попередження, якщо більше
MAX_SENTENCES = 6     # абзац або пункт списку

# Заборонені слова → дозволена заміна. Ключ — регулярний вираз (без урахування регістру).
BANNED = {
    r"здійсн\w*": "робити, вносити, платити",
    r"(?<![\w'’ʼ])(?:являє\s+собою|являєть?ся|являються)": "є",
    r"\bданн?(ий|а|е|ого|ої|ому|ою)\b": "цей, ця, це",
    r"\bнаразі\b": "зараз",
    r"\bна\s+даний\s+момент\b": "зараз",
    r"\bу\s+зв['’]язку\s+з\b|\bв\s+зв['’]язку\s+з\b": "тому що, через",
    r"\bз\s+метою\b": "щоб",
    r"\bзадля\b": "щоб, для",
    r"\bшляхом\s+\w+(нн|тт)я\b": "через, так:",
    r"\b[ув]\s+рамках\b": "у, під час",
    r"\bвідносно\b": "про, щодо",
    r"\bвищезазначен\w*|\bвищевказан\w*|\bвищенаведен\w*": "цей (назвіть річ)",
    r"\bнижчезазначен\w*|\bнижченаведен\w*": "такий (назвіть річ)",
    r"\bвищеописан\w*": "цей (назвіть річ)",
    r"\bі\s+т\.\s*д\.|\bі\s+т\.\s*п\.|\bтощо\b": "назвіть усі пункти",
    r"\bетц\.?|\betc\.?": "назвіть усі пункти",
    r"\bпевн\w+\s+чином\b": "так (назвіть як)",
    r"\bпо\s+суті\b|\bфактично\b": "приберіть",
    r"\bв\s+цілому\b|\bзагалом\b": "приберіть",
    r"\bнеобхідно\b": "треба",
    r"\bмає\s+місце\b|\bмали\s+місце\b|\bмав\s+місце\b": "є, був",
    r"\bпредставля\w*": "показувати, бути",
    r"\bзабезпечу\w*|\bзабезпечи\w*": "давати, робити",
    r"\bімплементу\w*|\bімплементац\w*": "робити, зробити",
    r"\bоптимальн\w*": "найкращий (назвіть критерій)",
    # Фразеологізми й метафори: пишіть буквально.
    r"\bнижн\w*\s+меж\w*|\bверхн\w*\s+меж\w*": "щонайменше, найбільше",
    r"\bзнаменник\w*": "загальна кількість (назвіть чого)",
    r"\bтупик\w*": "без виходу",
    r"\bсирот\w*": "екран без job, job без екрана",
    r"\b(біль|болю|болі|болем|болях|болями|болів)\b": "проблема",
    r"\bголос\w*\s+людей|\bголос\w*\s+користувач\w*": "слова людей, відгуки",
    r"\bщаслив\w*\s+шлях\w*": "основний шлях",
    r"\bза\s+раз\b": "за одну сесію, одразу",
    r"\b[ув]\s+голові\b": "пам'ятати",
    r"\bпід\s+капотом\b": "усередині (назвіть де)",
    r"\bв\s+один\s+клік\b|\bв\s+один\s+дотик\b": "однією дією",
    r"\bвузьк\w*\s+місц\w*": "проблема (назвіть яка)",
    r"\bсліп\w*\s+зон\w*|\bбіл\w*\s+плям\w*": "те, чого ми не знаємо",
    r"\bз\s+коробки\b|\bна\s+льоту\b": "одразу",
    r"\bчорн\w*\s+скриньк\w*": "незрозуміло (назвіть що)",
    r"\bточк\w*\s+(опори|відліку)\b|\bвідправн\w*\s+точк\w*": "початок, база",
    r"\bзолот\w*\s+середин\w*|\bчервон\w*\s+нит\w*|\bвершин\w*\s+айсберга\b": "назвіть буквально",
    r"\bморок\w*|\bзаморочк\w*": "зусилля, кроки (назвіть які)",
    r"\bна\s+пальцях\b|\bу\s+сухому\s+залишку\b|\bпо\s+факту\b": "назвіть буквально",
}
BANNED_RE = [(re.compile(k, re.I | re.U), v) for k, v in BANNED.items()]

# Дієприслівник (-учи/-ючи/-ачи/-ячи/-вши/-вшись): одна дія на речення.
GERUND_RE = re.compile(r"\b[а-яіїєґʼ'’]{3,}(учи|ючи|ачи|ячи|вши|вшись)\b", re.I | re.U)
QUOTE_RE = re.compile(r"«(?:[^«»]|«[^«»]*»)*»", re.U)
GERUND_OK = {"речи", "ключи", "свічи"}

ABBR = r"(?:напр|т\. ч|т\. зв|див|прим|грн|тис|млн|млрд|ст|р|рр|с|вул|буд|кв|обл|м|хв|год|сек|пор|англ|укр|ім|проф|д-р|п|пп|рис|табл)"
ABBR_RE = re.compile(r"\b" + ABBR + r"\.(?=\s)", re.I | re.U)
WORD_RE = re.compile(r"[0-9A-Za-zА-Яа-яІіЇїЄєҐґʼ'’·%₴§№+\-]*[0-9A-Za-zА-Яа-яІіЇїЄєҐґ]+[0-9A-Za-zА-Яа-яІіЇїЄєҐґʼ'’·%₴]*", re.U)
SPLIT_RE = re.compile(r"(?<=[.!?…;])[\"»”)\]]*\s+(?=[\"«“(\[]?[A-ZА-ЯІЇЄҐ0-9])", re.U)


def strip_inline(text):
    text = re.sub(r"`[^`]*`", " код ", text)
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", text)
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"\[[^\]]+\]\[[^\]]*\]", " ", text)
    text = re.sub(r"https?://\S+|www\.\S+", " URL ", text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"[*_]{1,3}", "", text)
    return htmllib.unescape(text)


def sentences(block):
    protected = ABBR_RE.sub(lambda m: m.group(0)[:-1] + "\u2024", block)
    protected = re.sub(r"\b([A-ZА-ЯІЇЄҐ])\.(?=\s?[A-ZА-ЯІЇЄҐ])", "\\1\u2024", protected)
    parts = SPLIT_RE.split(protected)
    return [p.replace("\u2024", ".").strip() for p in parts if p.strip()]


def words(sentence):
    return WORD_RE.findall(sentence)


def check_block(block, where, out):
    """block — текст одного абзацу, пункту списку або клітинки таблиці."""
    block = re.sub(r"\s+", " ", block).strip()
    # Пряма мова й цитати в «…» — чужий текст, його не правимо.
    block = QUOTE_RE.sub("«цитата»", block)
    if not block or not re.search(r"[А-Яа-яІіЇїЄєҐґ]", block):
        return
    sents = sentences(block)
    if len(sents) > MAX_SENTENCES:
        out.append(("E", where, f"абзац має {len(sents)} речень (макс. {MAX_SENTENCES}): «{short(block)}»"))
    for s in sents:
        n = len(words(s))
        if n > MAX_WORDS:
            out.append(("E", where, f"речення має {n} слів (макс. {MAX_WORDS}): «{short(s)}»"))
        elif n > WARN_WORDS:
            out.append(("W", where, f"речення має {n} слів (бажано ≤ {WARN_WORDS}): «{short(s)}»"))
    for rx, repl in BANNED_RE:
        for m in rx.finditer(block):
            out.append(("E", where, f"заборонене слово «{m.group(0)}» → {repl}"))
    for m in GERUND_RE.finditer(block):
        if m.group(0).lower() not in GERUND_OK:
            out.append(("E", where, f"дієприслівник «{m.group(0)}» → окреме речення з дієсловом"))


def check_banned(text, where, out):
    """Заголовки й підписи: лише заборонені слова, без довжини речень."""
    text = QUOTE_RE.sub("«цитата»", re.sub(r"\s+", " ", text))
    for rx, repl in BANNED_RE:
        for m in rx.finditer(text):
            out.append(("E", where, f"заборонене слово «{m.group(0)}» → {repl}"))


def short(s, n=90):
    s = s.strip()
    return s if len(s) <= n else s[: n - 1] + "…"


def remove_off(text):
    return re.sub(r"<!--\s*ste-off\s*-->.*?<!--\s*ste-on\s*-->", lambda m: "\n" * m.group(0).count("\n"), text, flags=re.S)


# ---------- Markdown ----------

def check_markdown(text, name):
    out = []
    text = remove_off(text)
    lines = text.split("\n")
    i = 0
    if lines and lines[0].strip() == "---":
        j = 1
        while j < len(lines) and lines[j].strip() != "---":
            j += 1
        i = j + 1
    para, start = [], 0
    fence = None

    def flush():
        nonlocal para
        if para:
            check_block(strip_inline(" ".join(para)), f"{name}:{start}", out)
        para = []

    while i < len(lines):
        raw = lines[i]
        line = raw.strip()
        ln = i + 1
        i += 1
        if fence:
            if line.startswith(fence):
                fence = None
            continue
        m = re.match(r"^(```+|~~~+)", line)
        if m:
            flush(); fence = m.group(1); continue
        if re.match(r"^#{1,6}\s", line):
            flush(); check_banned(strip_inline(line.lstrip("#")), f"{name}:{ln}", out); continue
        if not line or re.match(r"^(#{1,6}\s|>|<!--|-{3,}$|\*{3,}$|<\/?[a-z]+[^>]*>$)", line):
            flush(); continue
        if line.startswith("|"):
            flush()
            if re.match(r"^\|[\s:\-|]+\|?$", line):
                continue
            for cell in re.split(r"(?<!\\)\|", line.strip("|")):
                check_block(strip_inline(cell), f"{name}:{ln}", out)
            continue
        if re.match(r"^([-*+]|\d+[.)])\s+", line):
            flush(); para = [re.sub(r"^([-*+]|\d+[.)])\s+(\[[ x]\]\s+)?", "", line)]; start = ln; continue
        if not para:
            start = ln
        para.append(line)
    flush()
    return out


# ---------- HTML ----------

BLOCK = {"p", "li", "td", "th", "dd", "dt", "figcaption", "caption", "summary", "div", "section",
         "article", "header", "footer", "main", "aside", "nav", "ul", "ol", "table", "tr", "br",
         "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "details", "figure", "label", "button", "option"}
SKIP = {"script", "style", "svg", "pre", "code", "blockquote", "head", "title", "kbd", "math"}
BLOCK_CLASS = {"when", "meta"}  # окремі рядки в картках (job, персона)
HEAD = {"h1", "h2", "h3", "h4", "h5", "h6"}


class Extract(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.blocks, self.buf, self.skip, self.head = [], [], 0, 0
        self.headings = []
        self.start_line = 1

    def flush(self):
        t = "".join(self.buf)
        if t.strip():
            self.blocks.append((self.start_line, t))
        self.buf = []
        self.start_line = self.getpos()[0]

    def handle_starttag(self, tag, attrs):
        if tag in SKIP:
            self.skip += 1
            return
        cls = set((dict(attrs).get("class") or "").split())
        if tag in BLOCK or cls & BLOCK_CLASS:
            self.flush()
        if tag in HEAD:
            self.head += 1
        if tag in {"a", "span", "b", "strong", "em", "i"}:
            self.buf.append(" ")

    def handle_startendtag(self, tag, attrs):
        if tag == "br":
            self.flush()

    def handle_endtag(self, tag):
        if tag in SKIP:
            self.skip = max(0, self.skip - 1)
            return
        if tag in HEAD:
            self.headings.append((self.start_line, "".join(self.buf)))
            self.buf = []
            self.head = max(0, self.head - 1)
        if tag in BLOCK:
            self.flush()

    def handle_data(self, data):
        if self.skip:
            return
        if not self.buf:
            self.start_line = self.getpos()[0]
        self.buf.append(data)


def check_html(text, name):
    out = []
    text = remove_off(text)
    p = Extract()
    p.feed(text)
    p.flush()
    for ln, h in p.headings:
        check_banned(h, f"{name}:{ln}", out)
    for ln, block in p.blocks:
        block = re.sub(r"https?://\S+", " URL ", block)
        check_block(block, f"{name}:{ln}", out)
    return out


def check_file(path):
    rel = os.path.relpath(path, ROOT)
    try:
        text = open(path, encoding="utf-8").read()
    except OSError:
        return []
    if path.endswith(".html"):
        return check_html(text, rel)
    if path.endswith(".md"):
        return check_markdown(text, rel)
    return []


def report(issues, limit=40, warnings=False):
    rows = [x for x in issues if warnings or x[0] == "E"]
    lines = [f"{'помилка' if k == 'E' else 'увага'} {w}: {msg}" for k, w, msg in rows[:limit]]
    if len(rows) > limit:
        lines.append(f"… і ще {len(rows) - limit}")
    return "\n".join(lines)


def errors(issues):
    return [x for x in issues if x[0] == "E"]


# ---------- Режими хуків ----------

def last_assistant_text(data):
    if data.get("last_assistant_message"):
        msg = data["last_assistant_message"]
        return msg if isinstance(msg, str) else json.dumps(msg, ensure_ascii=False)
    path = data.get("transcript_path")
    if not path or not os.path.exists(path):
        return ""
    last = ""
    with open(path, encoding="utf-8") as f:
        for line in f:
            try:
                e = json.loads(line)
            except ValueError:
                continue
            if e.get("type") == "user" and not e.get("isMeta"):
                content = e.get("message", {}).get("content")
                if isinstance(content, str) or (isinstance(content, list) and any(
                        c.get("type") == "text" for c in content if isinstance(c, dict))):
                    last = ""
            if e.get("type") != "assistant":
                continue
            content = e.get("message", {}).get("content", [])
            if isinstance(content, str):
                last = content
                continue
            texts = [c.get("text", "") for c in content if isinstance(c, dict) and c.get("type") == "text"]
            if any(t.strip() for t in texts):
                last = "\n".join(texts)
    return last


def main(argv):
    if "--chat" in argv:
        data = json.load(sys.stdin)
        text = last_assistant_text(data)
        issues = errors(check_markdown(text, "чат"))
        if not issues:
            return 0
        msg = "Відповідь не відповідає STE-UA (tools/ste/RULES.md). Перепишіть її:\n" + report(issues, 15)
        if data.get("stop_hook_active"):
            print(json.dumps({"systemMessage": "STE-UA: у відповіді лишились порушення (" + str(len(issues)) + ")."}, ensure_ascii=False))
            return 0
        print(json.dumps({"decision": "block", "reason": msg}, ensure_ascii=False))
        return 0
    if "--hook-file" in argv:
        data = json.load(sys.stdin)
        path = (data.get("tool_input") or {}).get("file_path") or (data.get("tool_response") or {}).get("filePath") or ""
        if not re.search(r"\.(md|html)$", path):
            return 0
        path = os.path.abspath(path)
        if not path.startswith(ROOT + os.sep):
            return 0
        issues = errors(check_file(path))
        if issues:
            print(json.dumps({"decision": "block", "reason": f"STE-UA: {os.path.relpath(path, ROOT)} має {len(issues)} порушень. Виправте:\n" + report(issues, 20)}, ensure_ascii=False))
        return 0
    if "--stdin" in argv:
        issues = check_markdown(sys.stdin.read(), "stdin")
        if issues:
            print(report(issues, 200, warnings="-w" in argv))
        return 1 if errors(issues) else 0
    files = [a for a in argv if not a.startswith("-")]
    if "--all" in argv:
        files = subprocess.run(["git", "-C", ROOT, "ls-files", "*.md", "*.html"], capture_output=True, text=True).stdout.split()
        files = [os.path.join(ROOT, f) for f in files]
    total = 0
    for f in files:
        issues = check_file(f)
        if "--count" in argv:
            print(f"{len(errors(issues)):5d}  {os.path.relpath(f, ROOT)}")
        elif issues:
            r = report(issues, 10_000, warnings="-w" in argv)
            if r:
                print(r)
        total += len(errors(issues))
    if total and "--count" not in argv:
        print(f"\nSTE-UA: {total} помилок. Правила: tools/ste/RULES.md", file=sys.stderr)
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
