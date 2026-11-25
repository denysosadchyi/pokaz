#!/usr/bin/env node
// Таблиця контрасту WCAG 2.2 AA для токенів concept/tokens.css.
// Читає тему :root (світла, єдина), рахує кожну пару
// і пише concept/contrast.md та таблицю в concept.html між мітками contrast:start / contrast:end.
// Запуск: node tools/contrast.mjs   (код виходу 1, якщо хоч одна пара не проходить)
//
// Пара = колір тексту або графіки, фон, поріг, де пара є на екранах.
// Пороги: текст 4.5; великий текст (≥ 24 px або ≥ 18.66 px жирний) 3; графіка і межі контролів 3.
// Напівпрозорий фон (тінь на фото) рахуємо для найгіршого випадку: тінь поверх білого пікселя фото.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "concept/tokens.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

function block(selector) {
  const i = css.indexOf(selector + " {");
  const body = css.slice(css.indexOf("{", i) + 1, css.indexOf("}", i));
  const vars = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  return vars;
}
const light = block(":root");

function parse(v) {
  v = v.trim();
  let m = v.match(/^#([0-9a-f]{6})$/i);
  if (m) return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4), 16), a: 1 };
  m = v.match(/^rgba?\(([^)]+)\)$/);
  if (m) { const [r, g, b, a = 1] = m[1].split(",").map(Number); return { r, g, b, a }; }
  throw new Error("Колір не розібрано: " + v);
}
const over = (c, bg) => ({ r: c.r * c.a + bg.r * (1 - c.a), g: c.g * c.a + bg.g * (1 - c.a), b: c.b * c.a + bg.b * (1 - c.a), a: 1 });
const lum = ({ r, g, b }) => [r, g, b].map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; })
  .reduce((s, x, i) => s + x * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => { const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x); return (l1 + 0.05) / (l2 + 0.05); };
const WHITE = { r: 255, g: 255, b: 255, a: 1 };

// [передній план, фон, поріг, вид, де]
const PAIRS = [
  ["--color-text", "--color-bg", 4.5, "текст", "заголовок екрана, текст на фоні"],
  ["--color-text", "--color-surface", 4.5, "текст", "текст у зоні"],
  ["--color-text", "--color-surface-2", 4.5, "текст", "поточний пункт меню, чип, плитка в зоні"],
  ["--color-text-muted", "--color-bg", 4.5, "текст", "рядок під заголовком екрана, період"],
  ["--color-text-muted", "--color-surface", 4.5, "текст", "підпис у зоні, мітка плитки, шкала графіка"],
  ["--color-text-muted", "--color-surface-2", 4.5, "текст", "підпис у плитці на підкладці"],
  ["--color-icon", "--color-surface", 3, "графіка", "іконка Solar у зоні"],
  ["--color-icon", "--color-surface-2", 3, "графіка", "іконка в поточному пункті меню"],
  ["--color-on-accent", "--color-accent", 4.5, "текст", "головна кнопка"],
  ["--color-on-accent", "--color-accent-hover", 4.5, "текст", "головна кнопка, наведення"],
  ["--color-accent-ink", "--color-surface", 3, "графіка", "знак продукту на шапці"],
  ["--color-focus", "--color-surface", 3, "графіка", "кільце фокуса на зоні"],
  ["--color-focus", "--color-bg", 3, "графіка", "кільце фокуса на фоні"],
  ["--color-line-strong", "--color-surface", 3, "графіка", "межа поля і вторинної кнопки"],
  ["--color-success-text", "--color-success-bg", 4.5, "текст", "статус «прийнято»"],
  ["--color-error-text", "--color-error-bg", 4.5, "текст", "підказка під полем з помилкою"],
  ["--color-error-text", "--color-surface", 4.5, "текст", "заголовок зони з помилкою"],
  ["--color-off", "--color-surface", 3, "графіка", "година без світла в графіку"],
  ["--color-off", "--color-on", 3, "графіка", "година без світла поруч з годиною зі світлом"],
  ["--color-on-photo", "--photo-shade", 4.5, "текст", "текст на фото (тінь поверх білого пікселя)"],
  ["--color-on-photo-muted", "--photo-shade", 4.5, "текст", "підпис на фото (тінь поверх білого пікселя)"],
  ["--color-on-accent", "--color-accent", 4.5, "текст", "головна кнопка на фото"],
];

function rows(vars, theme) {
  return PAIRS.map(([fg, bg, min, kind, where]) => {
    const f = parse(vars[fg]);
    let b = parse(vars[bg]);
    if (b.a < 1) b = over(b, WHITE);
    const r = ratio(over(f, b), b);
    return { theme, fg, fgv: vars[fg], bg, bgv: vars[bg], r, min, ok: r >= min, kind, where };
  });
}
const all = rows(light, "світла");
const fmt = r => r.toFixed(2).replace(".", ",");

const md = [
  "# Контраст токенів",
  "",
  "Таблицю пише скрипт `node tools/contrast.mjs` з [concept/tokens.css](tokens.css). Руками її не правимо.",
  "Пороги WCAG 2.2 AA: текст 4,5:1; великий текст, графіка і межі контролів 3:1.",
  "Тінь на фото напівпрозора. Ми рахуємо найгірший випадок: тінь поверх білого пікселя фото.",
  "",
  "| Колір тексту або графіки | Фон | Контраст | Поріг | Результат | Де |",
  "|---|---|---|---|---|---|",
  ...all.map(x => `| \`${x.fg}\` ${x.fgv} | \`${x.bg}\` ${x.bgv} | ${fmt(x.r)}:1 | ${fmt(x.min)} | ${x.ok ? "проходить" : "**не проходить**"} | ${x.where} |`),
  "",
].join("\n");
writeFileSync(join(root, "concept/contrast.md"), md);

const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const html = [
  '<table class="contrast">',
  "<thead><tr><th>Текст або графіка</th><th>Фон</th><th>Контраст</th><th>Поріг</th><th>Результат</th><th>Де</th></tr></thead>",
  "<tbody>",
  ...all.map(x => `<tr><td><i class="chip" style="background:${esc(x.fgv)}"></i><code>${x.fg}</code> ${esc(x.fgv)}</td><td><i class="chip" style="background:${esc(x.bgv)}"></i><code>${x.bg}</code> ${esc(x.bgv)}</td><td>${fmt(x.r)}:1</td><td>${fmt(x.min)}</td><td>${x.ok ? "проходить" : "<b>не проходить</b>"}</td><td>${x.where}</td></tr>`),
  "</tbody></table>",
].join("\n");
const page = join(root, "concept.html");
try {
  const src = readFileSync(page, "utf8");
  const out = src.replace(/(<!-- contrast:start -->)[\s\S]*?(<!-- contrast:end -->)/, `$1\n${html}\n$2`);
  writeFileSync(page, out);
} catch { /* сторінки ще немає */ }

const bad = all.filter(x => !x.ok);
console.log(`Пар: ${all.length}. Не проходять: ${bad.length}.`);
for (const x of bad) console.log(`  ${x.fg} на ${x.bg} = ${fmt(x.r)} < ${x.min}`);
process.exit(bad.length ? 1 : 0);
