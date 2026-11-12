// Перемальовує Mermaid-flows із flows.md у статичні SVG-діаграми в ia.html.
// flows.md лишається джерелом правди; цей скрипт — збірка.
//
//   ELK_PATH=~/tools/elk/node_modules/elkjs node tools/flows-to-svg.mjs
//
// Розкладка — ELK (layered, ортогональні лінії), вигляд — власний:
// форма несе тип вузла, зелене — щасливий шлях, тупики — темний текст на рожевому.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";

const require = createRequire(import.meta.url);
const ELK = require((process.env.ELK_PATH || homedir() + "/tools/elk/node_modules/elkjs") + "/lib/elk.bundled.js");
const elk = new ELK();

const ROOT = new URL("..", import.meta.url).pathname;
const md = readFileSync(ROOT + "flows.md", "utf8");
const blocks = [...md.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((m) => m[1]);

// Щасливий шлях: точки, через які він проходить; між ними — найкоротший шлях.
const HAPPY = [
  { slug: "m", title: "M. Закрити місяць без сумніву", via: ["home", "reading", "fields", "photoOk", "accepted", "history", "wait", "bill", "paid", "okClosed"] },
  { slug: "r6", title: "R6. Знати, звідки взялися цифри", via: ["home", "okClear"] },
  { slug: "r2", title: "R2. Виправити помилку без мороки", via: ["home", "reading", "okFixed"] },
  { slug: "r7", title: "R7. Вести чужий рахунок", via: ["home", "connected", "okAccount"] },
];

// ---------- парсер підмножини Mermaid ----------
function parse(src) {
  const nodes = new Map();
  const edges = [];
  const shapeRe = /^([A-Za-z]\w*)(?:\(\["(.+?)"\]\)|\("(.+?)"\)|\{"(.+?)"\}|\[(.+?)\])?/;
  const def = (tok) => {
    const m = tok.trim().match(shapeRe);
    if (!m) throw new Error("bad token " + tok);
    const id = m[1];
    if (!nodes.has(id)) nodes.set(id, { id });
    const n = nodes.get(id);
    if (m[2]) Object.assign(n, { shape: "terminal", label: m[2] });
    else if (m[3]) Object.assign(n, { shape: "state", label: m[3] });
    else if (m[4]) Object.assign(n, { shape: "decision", label: m[4] });
    else if (m[5]) Object.assign(n, { shape: "screen", label: m[5] });
    return id;
  };
  for (const raw of src.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("flowchart") || line.startsWith("classDef") || line.startsWith("class ")) continue;
    const m = line.match(/^(.+?)\s*-->\s*(?:\|(.+?)\|\s*)?(.+)$/);
    if (!m) { def(line); continue; }
    edges.push({ from: def(m[1]), to: def(m[3]), label: m[2] || "" });
  }
  return { nodes, edges };
}

// ---------- семантика вузла ----------
const KINDS = [
  ["успіх кроку:", "step", "Успіх кроку"],
  ["успіх:", "ok", "Успіх"],
  ["тупик:", "dead", "Тупик"],
  ["loading:", "loading", "Завантаження"],
  ["error:", "error", "Помилка"],
  ["empty:", "empty", "Порожньо"],
  ["стан:", "state", "Стан"],
  ["перехід:", "link", "Перехід"],
];
function classify(n) {
  if (n.shape === "screen") return { kind: "screen", tag: "Екран", text: n.label };
  if (n.shape === "decision") return { kind: "decision", tag: "", text: n.label };
  for (const [p, kind, tag] of KINDS) {
    if (n.label.startsWith(p)) {
      let text = n.label.slice(p.length).trim();
      if (kind === "link") text = text.replace(/^flow /, "Flow ");
      return { kind, tag, text: text.charAt(0).toUpperCase() + text.slice(1) };
    }
  }
  return { kind: "state", tag: "", text: n.label };
}

// ---------- текст ----------
const FS = 11, LH = 14, TAG_FS = 11;
const cw = (s, size = FS, k = 0.6) => s.length * size * k;
function wrap(text, maxChars) {
  const words = text.split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + " " + w).length <= maxChars) cur += " " + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function measure(n) {
  const c = classify(n);
  Object.assign(n, c);
  if (c.kind === "decision") {
    n.lines = wrap(c.text, 16);
    const tw = Math.max(...n.lines.map((l) => cw(l))) + 8;
    const th = n.lines.length * LH + 4;
    // вписаний прямокутник: tw/W + th/H <= 1
    n.w = Math.ceil((tw * 1.45) / 4) * 4;
    n.h = Math.ceil((th * 2.5) / 4) * 4;
    return;
  }
  const max = c.kind === "screen" ? 22 : 26;
  n.lines = wrap(c.text, max);
  const tagW = 0;
  const textW = Math.max(...n.lines.map((l) => cw(l, FS, c.kind === "screen" ? 0.64 : 0.6)), tagW);
  const padX = c.kind === "ok" || c.kind === "dead" ? 18 : 12;
  n.w = Math.max(100, Math.ceil((textW + padX * 2) / 4) * 4);
  n.h = Math.ceil((n.lines.length * LH + 18) / 4) * 4;
}

// ---------- щасливий шлях ----------
function shortest(adj, a, b) {
  const prev = new Map([[a, null]]);
  const q = [a];
  while (q.length) {
    const x = q.shift();
    if (x === b) break;
    for (const e of adj.get(x) || []) if (!prev.has(e.to)) { prev.set(e.to, e); q.push(e.to); }
  }
  if (!prev.has(b)) throw new Error(`немає шляху ${a} → ${b}`);
  const path = [];
  for (let e = prev.get(b); e; e = prev.get(e.from)) path.unshift(e);
  return path;
}

// ---------- геометрія ----------
function diamondClip(n, x, y0, y1) {
  // вертикальний сегмент x, що входить у ромб згори або знизу
  const cx = n.x + n.w / 2, cy = n.y + n.h / 2;
  const dy = (n.h / 2) * (1 - Math.min(1, Math.abs(x - cx) / (n.w / 2)));
  return y1 > y0 ? cy - dy : cy + dy;
}
function diamondClipH(n, y, x0, x1) {
  const cx = n.x + n.w / 2, cy = n.y + n.h / 2;
  const dx = (n.w / 2) * (1 - Math.min(1, Math.abs(y - cy) / (n.h / 2)));
  return x1 > x0 ? cx - dx : cx + dx;
}
function clipEnd(pts, n, atStart) {
  if (n.kind !== "decision") return;
  const i = atStart ? 0 : pts.length - 1;
  const j = atStart ? 1 : pts.length - 2;
  const p = pts[i], q = pts[j];
  if (Math.abs(p.x - q.x) < 0.5) p.y = diamondClip(n, p.x, q.y, p.y);
  else p.x = diamondClipH(n, p.y, q.x, p.x);
}
function roundedPath(pts, r = 8) {
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], b = pts[i], c = pts[i + 1];
    const l1 = Math.hypot(b.x - a.x, b.y - a.y), l2 = Math.hypot(c.x - b.x, c.y - b.y);
    const rr = Math.min(r, l1 / 2, l2 / 2);
    const p1 = { x: b.x - ((b.x - a.x) / l1) * rr, y: b.y - ((b.y - a.y) / l1) * rr };
    const p2 = { x: b.x + ((c.x - b.x) / l2) * rr, y: b.y + ((c.y - b.y) / l2) * rr };
    d += ` L${p1.x},${p1.y} Q${b.x},${b.y} ${p2.x},${p2.y}`;
  }
  const z = pts[pts.length - 1];
  return d + ` L${z.x},${z.y}`;
}
const f = (v) => Math.round(v * 10) / 10;

// ---------- кольори (ролі з палітри сторінки) ----------
const C = {
  paper: "#ffffff", ink: "#1f1d1a", muted: "#5f5b53", line: "#8f897d", rule: "#dcd7cb",
  surface2: "#f6f3ec",
  ok: "#2f6b3a", okTint: "#e8f3ea",
  dead: "#9f1239", deadTint: "#fdecee",
  err: "#9f1239", errTint: "#fff6f6",
  link: "#2e5aa8", linkTint: "#f1f5fc",
};

async function render(src, cfg) {
  const { nodes, edges } = parse(src);
  for (const n of nodes.values()) measure(n);
  const adj = new Map();
  edges.forEach((e, i) => { e.id = "e" + i; (adj.get(e.from) || adj.set(e.from, []).get(e.from)).push(e); });
  const happy = new Set();
  for (let i = 0; i < cfg.via.length - 1; i++) shortest(adj, cfg.via[i], cfg.via[i + 1]).forEach((e) => happy.add(e.id));
  const happyNodes = new Set(cfg.via);
  edges.forEach((e) => { if (happy.has(e.id)) { happyNodes.add(e.from); happyNodes.add(e.to); } });
  // Інші успішні кінці: гілка від найближчого вузла щасливого шляху, повз помилки й тупики.
  const blocked = (id) => ["error", "dead", "link"].includes(nodes.get(id).kind);
  for (const t of [...nodes.values()].filter((n) => n.kind === "ok" && !happyNodes.has(n.id))) {
    const prev = new Map([...happyNodes].map((id) => [id, null]));
    const q = [...happyNodes];
    while (q.length && !prev.has(t.id)) {
      const x = q.shift();
      for (const e of adj.get(x) || []) if (!prev.has(e.to) && !blocked(e.to)) { prev.set(e.to, e); q.push(e.to); }
    }
    for (let e = prev.get(t.id); e; e = prev.get(e.from)) { happy.add(e.id); happyNodes.add(e.from); happyNodes.add(e.to); }
  }

  const graph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.layered.spacing.nodeNodeBetweenLayers": "28",
      "elk.spacing.nodeNode": "24",
      "elk.layered.spacing.edgeNodeBetweenLayers": "20",
      "elk.layered.spacing.edgeEdgeBetweenLayers": "14",
      "elk.spacing.edgeEdge": "14",
      "elk.spacing.edgeNode": "18",
      "elk.spacing.edgeLabel": "6",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.layered.cycleBreaking.strategy": "DEPTH_FIRST",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
      "elk.padding": "[top=8,left=8,bottom=8,right=8]",
    },
    children: [...nodes.values()].map((n) => ({ id: n.id, width: n.w, height: n.h })),
    edges: edges.map((e) => ({
      id: e.id, sources: [e.from], targets: [e.to],
      layoutOptions: happy.has(e.id)
        ? { "elk.layered.priority.straightness": "20", "elk.layered.priority.direction": "20", "elk.layered.priority.shortness": "20" }
        : {},
    })),
  };
  const out = await elk.layout(graph);
  for (const c of out.children) Object.assign(nodes.get(c.id), { x: c.x, y: c.y });
  const W = Math.ceil(out.width), H0 = Math.ceil(out.height);

  // ребра
  const edgeSvg = [], labelSvg = [];
  for (const oe of out.edges) {
    const e = edges.find((x) => x.id === oe.id);
    const s = oe.sections[0];
    const pts = [s.startPoint, ...(s.bendPoints || []), s.endPoint].map((p) => ({ ...p }));
    clipEnd(pts, nodes.get(e.from), true);
    clipEnd(pts, nodes.get(e.to), false);
    const isHappy = happy.has(e.id);
    const back = pts[pts.length - 1].y < pts[0].y - 1; // повернення вгору — пунктир
    const da = ` data-from="${esc(e.from)}" data-to="${esc(e.to)}"${back ? ' data-back="1"' : ""}`;
    edgeSvg.push(`<path class="fl-edge"${da} d="${roundedPath(pts.map((p) => ({ x: f(p.x), y: f(p.y) })))}" fill="none" stroke="${isHappy ? C.ok : C.line}" stroke-width="${isHappy ? 2.4 : 1.2}"${back && !isHappy ? ' stroke-dasharray="5,4"' : ""} marker-end="url(#${cfg.slug}-${isHappy ? "ah" : "a"})"/>`);
    if (e.label) {
      // підпис — біля виходу з розвилки, збоку від першого сегмента, з відступом 8px
      const t = e.label.toUpperCase();
      const tw = cw(t, 11, 0.62) + 8;
      const a = pts[0], b = pts[1];
      let cx, cy;
      if (Math.abs(a.x - b.x) < 0.5) {
        const src = nodes.get(e.from);
        const len = Math.abs(b.y - a.y);
        const want = src.y + src.h + 12 - a.y; // нижче за рамку вузла
        cy = a.y + Math.sign(b.y - a.y) * Math.max(8, Math.min(want, len - 10));
        const left = a.x < src.x + src.w / 2 - 1 || (Math.abs(a.x - (src.x + src.w / 2)) <= 1 && pts.length > 2 && pts[2].x < a.x);
        cx = left ? a.x - 8 - tw / 2 : a.x + 8 + tw / 2;
      } else {
        const len = Math.abs(b.x - a.x);
        cx = a.x + Math.sign(b.x - a.x) * Math.min(14 + tw / 2, len / 2);
        cy = a.y - 8 - 7;
      }
      labelSvg.push(`<g class="fl-edge"${da}><rect x="${f(cx - tw / 2)}" y="${f(cy - 7)}" width="${f(tw)}" height="14" rx="2" fill="${C.paper}"/>` +
        `<text x="${f(cx)}" y="${f(cy + 3.6)}" text-anchor="middle" class="fl-lbl"${isHappy ? ` fill="${C.ok}" font-weight="600"` : ""}>${esc(t)}</text></g>`);
    }
  }

  // вузли
  const nodeSvg = [];
  for (const n of nodes.values()) {
    const { x, y, w, h } = n;
    const onHappy = happyNodes.has(n.id);
    let shape, fill = C.paper, stroke = C.line, sw = 1, tagFill = C.muted, dash = "";
    switch (n.kind) {
      case "screen": stroke = C.ink; sw = 1.4; break;
      case "decision": fill = C.surface2; stroke = C.muted; break;
      case "ok": case "step": fill = C.okTint; stroke = C.ok; sw = n.kind === "ok" ? 2 : 1.2; tagFill = C.ok; break;
      case "dead": fill = C.deadTint; stroke = C.dead; sw = 2; tagFill = C.dead; break;
      case "error": fill = C.errTint; stroke = "#d9a3ab"; tagFill = C.err; break;
      case "link": fill = C.linkTint; stroke = C.link; tagFill = C.link; dash = ' stroke-dasharray="4,3"'; break;
      default: fill = C.surface2; stroke = C.rule; break;
    }
    if (onHappy && (n.kind === "screen" || n.kind === "decision" || n.kind === "loading" || n.kind === "state")) { stroke = C.ok; sw = Math.max(sw, 1.6); }
    if (n.kind === "decision") {
      shape = `<polygon points="${f(x + w / 2)},${f(y)} ${f(x + w)},${f(y + h / 2)} ${f(x + w / 2)},${f(y + h)} ${f(x)},${f(y + h / 2)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    } else {
      const rx = n.kind === "ok" || n.kind === "dead" ? Math.min(h / 2, 22) : 6;
      shape = `<rect x="${f(x)}" y="${f(y)}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash}/>`;
    }
    let ty = y + h / 2 - ((n.lines.length - 1) * LH) / 2 + 3.8;
    // тип вузла не друкується в боксі — він з'являється підказкою при наведенні
    let tag = "";
    if (n.tag) {
      const label = n.tag.toUpperCase();
      const tw = Math.ceil(cw(label, TAG_FS, 0.66) + 16);
      const tx = x + w / 2 - tw / 2, tyy = y - 24;
      tag = `<title>${esc(n.tag)}</title><g class="fl-tip"><rect x="${f(tx)}" y="${f(tyy)}" width="${tw}" height="20" rx="4" fill="#ffffff" stroke="${tagFill}"/>` +
        `<text x="${f(x + w / 2)}" y="${f(tyy + 14)}" text-anchor="middle" class="fl-tag" fill="${tagFill}">${esc(label)}</text></g>`;
    }
    const cls = n.kind === "screen" || n.kind === "ok" || n.kind === "dead" ? "fl-name" : "fl-text";
    const text = n.lines.map((l, i) => `<tspan x="${f(x + w / 2)}" y="${f(ty + i * LH)}">${esc(l)}</tspan>`).join("");
    nodeSvg.push(`<g class="fl-node" data-id="${esc(n.id)}">${shape}<text text-anchor="middle" class="${cls}">${text}</text>${tag}</g>`);
  }

  // легенда — горизонтальна смуга знизу
  const LEG_Y = H0 + 24;
  const items = [
    ["screen", "екран"], ["decision", "розвилка"], ["state", "стан"], ["error", "помилка"],
    ["link", "перехід"], ["ok", "успіх"], ["dead", "тупик"], ["happy", "щасливий шлях"], ["back", "повернення"],
  ];
  let lx = 8;
  const leg = items.map(([k, t]) => {
    const g = [];
    if (k === "happy") g.push(`<line x1="${lx}" y1="${LEG_Y}" x2="${lx + 22}" y2="${LEG_Y}" stroke="${C.ok}" stroke-width="2.4"/>`);
    else if (k === "back") g.push(`<line x1="${lx}" y1="${LEG_Y}" x2="${lx + 22}" y2="${LEG_Y}" stroke="${C.line}" stroke-width="1.2" stroke-dasharray="5,4"/>`);
    else if (k === "decision") g.push(`<polygon points="${lx + 11},${LEG_Y - 7} ${lx + 22},${LEG_Y} ${lx + 11},${LEG_Y + 7} ${lx},${LEG_Y}" fill="${C.surface2}" stroke="${C.muted}"/>`);
    else {
      const st = { screen: [C.paper, C.ink, 1.4], state: [C.surface2, C.rule, 1], error: [C.errTint, "#d9a3ab", 1], link: [C.linkTint, C.link, 1], ok: [C.okTint, C.ok, 2], dead: [C.deadTint, C.dead, 2] }[k];
      g.push(`<rect x="${lx}" y="${LEG_Y - 7}" width="22" height="14" rx="${k === "ok" || k === "dead" ? 7 : 3}" fill="${st[0]}" stroke="${st[1]}" stroke-width="${st[2]}"${k === "link" ? ' stroke-dasharray="4,3"' : ""}/>`);
    }
    g.push(`<text x="${lx + 30}" y="${LEG_Y + 4}" class="fl-leg">${t}</text>`);
    lx += 30 + cw(t, 11, 0.62) + 22;
    return g.join("");
  });
  const legW = lx;
  const VW = Math.max(W, Math.ceil(legW)), VH = LEG_Y + 20;

  const id = `flow-${cfg.slug}`;
  const nTotal = nodes.size;
  const nDead = [...nodes.values()].filter((n) => n.kind === "dead").length;
  const nOk = [...nodes.values()].filter((n) => n.kind === "ok").length;
  return `<svg class="flow-svg" viewBox="0 0 ${VW} ${VH}" width="${VW}" height="${VH}" role="img" aria-labelledby="${id}-title ${id}-desc" xmlns="http://www.w3.org/2000/svg">` +
    `<title id="${id}-title">${esc(cfg.title)}</title>` +
    `<desc id="${id}-desc">Блок-схема з ${nTotal} вузлів: ${nOk} успішні кінці, ${nDead} тупики; зеленим виділено щасливий шлях. Словесний опис — під діаграмою.</desc>` +
    `<defs>` +
    `<marker id="${cfg.slug}-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,1 L9,5 L0,9 z" fill="${C.line}"/></marker>` +
    `<marker id="${cfg.slug}-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,1 L9,5 L0,9 z" fill="${C.ok}"/></marker>` +
    `</defs>` +
    `<rect width="${VW}" height="${VH}" fill="${C.paper}"/>` +
    edgeSvg.join("") + labelSvg.join("") + nodeSvg.join("") + leg.join("") + `</svg>`;
}

let html = readFileSync(ROOT + "ia.html", "utf8");
const svgs = [];
for (let i = 0; i < HAPPY.length; i++) svgs.push(await render(blocks[i], HAPPY[i]));
let k = 0;
html = html.replace(/(<div class="diagram"[^>]*>)([\s\S]*?)(<\/div><!-- \/diagram -->|<\/pre><\/div>)/g, (m, open) => {
  return `${open}${svgs[k++]}</div><!-- /diagram -->`;
});
if (k !== HAPPY.length) throw new Error(`замінено ${k} діаграм, очікувалось ${HAPPY.length}`);
writeFileSync(ROOT + "ia.html", html);
console.log("ok:", svgs.map((s) => s.match(/viewBox="0 0 (\d+) (\d+)"/).slice(1).join("×")).join(", "));
