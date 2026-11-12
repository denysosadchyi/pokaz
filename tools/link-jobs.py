#!/usr/bin/env python3
"""Перелінковує коди jobs (M, R1–R8, E1–E4) на всіх сторінках сайту.
Визначення jobs — у personas.html (id="job-m", "job-r1"…). Кожна згадка коду
в тексті стає посиланням туди. Не чіпає: <a>, <svg>, <script>, <style>, <code>,
заголовки h1–h6 і саме визначення job. Ідемпотентний: запускати після правок."""
import re, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = ["index.html", "personas.html", "ia.html", "research/research.html"]
CODE = re.compile(r'(?<![\w·-])(M|R[1-8]|E[1-4])(?![\w-])')
SKIP = {"a", "svg", "script", "style", "code", "h1", "h2", "h3", "h4", "h5", "h6", "title", "head", "textarea"}
TAG = re.compile(r'<(/?)([a-zA-Z][\w-]*)([^>]*)>', re.S)
VOID = {"br", "img", "meta", "link", "input", "hr", "source", "wbr"}

def add_ids(s):
    s = s.replace('<div class="main-job">', '<div class="main-job" id="job-m">', 1)
    return re.sub(r'<div class="job"><b>((R|E)\d) ·',
                  lambda m: f'<div class="job" id="job-{m.group(1).lower()}"><b>{m.group(1)} ·', s)

def link(s, prefix):
    out, pos, stack, skipdepth = [], 0, [], 0
    defjob = 0  # усередині визначення job
    for m in TAG.finditer(s):
        text = s[pos:m.start()]
        if skipdepth == 0 and defjob == 0:
            text = CODE.sub(lambda c: f'<a class="job-ref" href="{prefix}#job-{c.group(1).lower()}">{c.group(1)}</a>', text)
        out.append(text); out.append(m.group(0)); pos = m.end()
        close, name, attrs = m.group(1), m.group(2).lower(), m.group(3)
        if name in VOID or attrs.rstrip().endswith("/"): continue
        if not close:
            mark = name in SKIP
            isdef = name == "div" and re.search(r'id="job-', attrs) is not None
            isdef = isdef or (name == "div" and 'class="label"' in attrs)
            stack.append((name, mark, isdef)); skipdepth += mark; defjob += isdef
        else:
            while stack:
                n, mark, isdef = stack.pop(); skipdepth -= mark; defjob -= isdef
                if n == name: break
    out.append(s[pos:])
    return "".join(out)

for page in PAGES:
    p = ROOT / page; s = p.read_text()
    if page == "personas.html": s = add_ids(s)
    # старі посилання на jtbd.md на GitHub → на визначення в personas.html
    target = "personas.html" if "/" not in page else "../personas.html"
    if page == "personas.html": target = ""
    s = re.sub(r'https://github\.com/denysosadchyi/pokaz/blob/main/jtbd\.md#(main-job|([re]\d)-[^"]*)',
               lambda m: f'{target}#job-{"m" if m.group(1)=="main-job" else m.group(2)}', s)
    s = link(s, target)
    p.write_text(s)
    print(page, s.count('class="job-ref"'))
