// Builds the logo set as pure vector SVG (text converted to outlines, no font needed).
// Usage: node tools/make-logos.mjs <fontsource-dir> <out-dir>
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const ot = require(process.env.OPENTYPE || "opentype.js");

const [, , FONTS, OUT] = process.argv;
const load = (p) => { const b = fs.readFileSync(path.join(FONTS, p)); return ot.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)); };
const bel = load("bellefair/files/bellefair-hebrew-400-normal.woff");
const cin = load("cinzel/files/cinzel-latin-500-normal.woff");
const kar = load("karantina/files/karantina-hebrew-300-normal.woff");
const karB = load("karantina/files/karantina-hebrew-400-normal.woff");

const markSrc = fs.readFileSync(path.join(OUT, "..", "logo.svg"), "utf8");
const markD = [...markSrc.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join(" ");
const MARK_W = 1106, MARK_H = 1094;

/* glyph → path data, serialized here (opentype's own serializer can emit NaN) */
const n2 = (v) => { if (!Number.isFinite(v)) throw new Error("bad coord"); return (Math.round(v * 100) / 100).toString(); };
function glyphD(g, x, size) {
  return g.getPath(0, 0, size).commands.map((c) => {
    if (c.type === "M" || c.type === "L") return c.type + n2(c.x + x) + " " + n2(c.y);
    if (c.type === "Q") return "Q" + n2(c.x1 + x) + " " + n2(c.y1) + " " + n2(c.x + x) + " " + n2(c.y);
    if (c.type === "C") return "C" + n2(c.x1 + x) + " " + n2(c.y1) + " " + n2(c.x2 + x) + " " + n2(c.y2) + " " + n2(c.x + x) + " " + n2(c.y);
    return "Z";
  }).join("");
}
/* text → outline path; rtl reverses Hebrew order; tracking in em */
function text(font, str, size, { rtl = false, tracking = 0 } = {}) {
  const chars = [...(rtl ? [...str].reverse().join("") : str)];
  let x = 0; let d = "";
  chars.forEach((ch, i) => {
    const g = font.charToGlyph(ch);
    d += glyphD(g, x, size) + " ";
    x += (g.advanceWidth / font.unitsPerEm) * size + (i < chars.length - 1 ? tracking * size : 0);
  });
  const bb = new ot.Path(); // width only
  return { d, w: x };
}
const at = (t, x, y) => `<path transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" d="${t.d}"/>`;
const mark = (x, y, h) => { const s = h / MARK_H; return `<path transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(5)})" d="${markD}"/>`; };
const svg = (w, h, body, fill, title) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${title}"><title>${title}</title><g fill="${fill}">${body}</g></svg>\n`;

const COLORS = { ink: "#1B262C", blue: "#0F4C75", white: "#FFFFFF", olive: "#5F6A29" };
const out = (name, w, h, body, title) => {
  for (const [k, c] of Object.entries(COLORS)) {
    if (k === "olive" && !name.startsWith("mark")) continue;
    fs.writeFileSync(path.join(OUT, `${name}-${k}.svg`), svg(w, h, body, c, title));
  }
};

/* 1. horizontal lockup (RTL: mark on the right) */
{
  const he = text(bel, "תמרה", 92, { rtl: true });
  const la = text(cin, "TAMARA", 17, { tracking: 0.62 });
  const sub = text(kar, "צימרים ווילות", 25, { rtl: true, tracking: 0.08 });
  const markH = 112, pad = 6, gap = 26;
  const textW = Math.max(he.w, la.w + 0, sub.w);
  const W = Math.ceil(pad + textW + gap + 1 + gap + markH * (MARK_W / MARK_H) + pad);
  const H = 132;
  const markX = W - pad - markH * (MARK_W / MARK_H);
  const ruleX = markX - gap;
  const right = ruleX - gap;
  let b = mark(markX, (H - markH) / 2 - 2, markH);
  b += `<rect x="${ruleX.toFixed(1)}" y="16" width="1.2" height="${H - 32}"/>`;
  b += at(he, right - he.w, 76);
  b += at(la, right - la.w, 112);
  out("logo-horizontal", W, H, b, "תמרה – צימרים ווילות");
}
/* 2. stacked lockup, centered */
{
  const W = 420;
  const he = text(bel, "תמרה", 112, { rtl: true });
  const sub = text(kar, "צימרים ווילות", 34, { rtl: true, tracking: 0.1 });
  const la = text(cin, "TAMARA", 15, { tracking: 0.75 });
  const markH = 150;
  let y = 14;
  let b = mark((W - markH * (MARK_W / MARK_H)) / 2, y, markH);
  y += markH + 100;
  b += at(he, (W - he.w) / 2, y);
  y += 30;
  const ruleW = 70, cx = W / 2;
  b += `<rect x="${cx - 14 - ruleW}" y="${y}" width="${ruleW}" height="1.2"/><rect x="${cx + 14}" y="${y}" width="${ruleW}" height="1.2"/><path d="M${cx} ${y - 5} l5 5.6 -5 5.6 -5 -5.6z"/>`;
  y += 44;
  b += at(sub, (W - sub.w) / 2, y);
  y += 32;
  b += at(la, (W - la.w + 0.75 * 15) / 2, y);
  out("logo-stacked", W, Math.ceil(y + 16), b, "תמרה – צימרים ווילות");
}
/* 3. seal / emblem */
{
  const S = 480, c = S / 2, R1 = 229, R2 = 225.5, R3 = 170, R4 = 168.3;
  let b = `<path fill-rule="evenodd" d="M${c} ${c - R1}a${R1} ${R1} 0 1 0 0.01 0zM${c} ${c - R2}a${R2} ${R2} 0 1 1 -0.01 0z"/>`;
  b += `<path fill-rule="evenodd" d="M${c} ${c - R3}a${R3} ${R3} 0 1 0 0.01 0zM${c} ${c - R4}a${R4} ${R4} 0 1 1 -0.01 0z"/>`;
  const ring = "TAMARA  ·  VILLAS & ZIMMERS  ·  ISRAEL  ·  ";
  const size = 21, track = 0.32, rText = 186;
  const glyphs = [...ring].map((ch) => cin.charToGlyph(ch));
  const adv = glyphs.map((g) => (g.advanceWidth / 1000) * size + track * size);
  const total = adv.reduce((a, v) => a + v, 0);
  const circ = 2 * Math.PI * rText;
  const scale = circ / total;
  let s = -Math.PI / 2 - (adv[0] * scale) / rText / 2;
  glyphs.forEach((g, i) => {
    const a = adv[i] * scale;
    const mid = s + a / rText / 2;
    const gw = (g.advanceWidth / 1000) * size;
    const p = glyphD(g, -gw / 2, size);
    const x = c + rText * Math.cos(mid), y = c + rText * Math.sin(mid);
    const deg = (mid * 180) / Math.PI + 90;
    if (p) b += `<path transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${deg.toFixed(2)}) translate(0 ${(size * 0.36).toFixed(2)})" d="${p}"/>`;
    s += a / rText;
  });
  const markH = 150;
  b += mark(c - (markH * (MARK_W / MARK_H)) / 2, c - 118, markH);
  const he = text(bel, "תמרה", 60, { rtl: true });
  b += at(he, c - he.w / 2, c + 92);
  const dots = [-1, 1].map((k) => `<path d="M${c + k * 205} ${c - 4} l4 4 -4 4 -4 -4z"/>`).join("");
  out("logo-seal", S, S, b + dots, "תמרה – חותם");
}
/* 4. mark only */
out("mark", MARK_W, MARK_H, `<path d="${markD}"/>`, "תמרה");
console.log("logos written to", OUT);
