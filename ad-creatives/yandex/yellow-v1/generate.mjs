// Жёлтая серия креативов ainativemaker.com под Яндекс Директ.
// Правила размеров и веса — в AGENTS.md проекта, раздел «Креативы для Директа».
// Ничего запрещённого на макете: нет псевдокнопок, нет адреса сайта, нет
// элементов интерфейса, которые можно принять за кликабельные.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('.', import.meta.url).pathname;
const srcDir = join(root, 'src');
const rsyaDir = join(root, 'rsya');
const graphicDir = join(root, 'graphic');
for (const dir of [srcDir, rsyaDir, graphicDir]) mkdirSync(dir, { recursive: true });

// РСЯ: 1:1 и 4:3/3:4 от 450 до 5000 px по стороне, 16:9 от 1080x607 до 5000x2812.
const RSYA = [[1200, 1200], [1600, 1200], [1200, 1600], [1920, 1080]];
// Графические объявления: только эти размеры, каждый файл не тяжелее 512 КБ.
const GRAPHIC = [[240, 400], [300, 250], [300, 500], [300, 600], [320, 50],
  [320, 100], [320, 480], [336, 280], [480, 320], [728, 90], [970, 250]];

const YELLOW = '#FFD64A';
const INK = '#1B1B1F';
const SUB = '#3F3F46';
const PAPER = '#FBF8F1';
const GREY = '#DEDAD1';
const GREY2 = '#C9C4B8';

const concepts = [
  {
    id: '01-rasshifrovka',
    name: 'РАСШИФРОВКА И ПРАВКА',
    head: ['Расшифровка, выжимка,', 'черновик, правка'],
    sub: ['Один AI-процесс для журналиста,', 'редактора и автора'],
    short: 'Расшифровка, выжимка, черновик, правка',
    art: 'wave',
  },
  {
    id: '02-pervaya-versiya',
    name: 'ПЕРВАЯ ВЕРСИЯ',
    head: ['Первая версия', 'за 14 дней'],
    sub: ['Приходите со своей задачей', 'или выберите один из 25 сценариев'],
    short: 'Первая версия за 14 дней',
    art: 'steps',
  },
  {
    id: '03-rabochiy-instrument',
    name: 'РАБОЧИЙ ИНСТРУМЕНТ',
    head: ['Не просто чат.', 'Рабочий AI-инструмент'],
    sub: ['Под вашу задачу — от контента', 'до редакторской рутины'],
    short: 'Не просто чат, а рабочий AI-инструмент',
    art: 'cards',
  },
  {
    id: '04-tekstov-mnogo',
    name: 'ТЕКСТОВ МНОГО',
    head: ['Текстов много.', 'Времени мало'],
    sub: ['Соберите AI-систему, которая помогает', 'писать, редактировать и исследовать'],
    short: 'Текстов много, времени мало',
    art: 'stack',
  },
  {
    id: '05-zhivyote-v-tekste',
    name: 'ЖИЗНЬ В ТЕКСТЕ',
    head: ['Если вы живёте', 'в тексте — вам сюда'],
    sub: ['Для авторов, редакторов,', 'журналистов и исследователей'],
    short: 'Авторам, редакторам и журналистам',
    art: 'pencil',
  },
];

const esc = (v) => v.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const widthOf = (line, size, weight) => line.length * size * (weight >= 700 ? 0.545 : 0.5);
const fit = (lines, avail, cap, weight) => {
  const longest = Math.max(...lines.map((l) => l.length));
  return Math.min(cap, avail / (longest * (weight >= 700 ? 0.545 : 0.5)));
};

const open = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
  + `<defs><filter id="sh" x="-25%" y="-25%" width="150%" height="150%">`
  + `<feDropShadow dx="0" dy="${Math.max(2, Math.round(w / 120))}" stdDeviation="${Math.max(3, Math.round(w / 90))}" flood-color="#7A5B00" flood-opacity=".18"/></filter>`
  + `<style>.s{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif}</style></defs>`
  + `<rect x="0" y="0" width="${w}" height="${h}" fill="${YELLOW}"/>`;

// Марка: четырёхлепестковый знак и название. Только собственный бренд, без адреса сайта.
const brand = (x, y, size) => {
  const r = size * 0.5;
  const c = size * 0.5;
  return `<g transform="translate(${x} ${y})">`
    + `<g fill="${INK}"><circle cx="${c - r * 0.42}" cy="${c - r * 0.42}" r="${r * 0.42}"/>`
    + `<circle cx="${c + r * 0.42}" cy="${c - r * 0.42}" r="${r * 0.42}"/>`
    + `<circle cx="${c - r * 0.42}" cy="${c + r * 0.42}" r="${r * 0.42}"/>`
    + `<circle cx="${c + r * 0.42}" cy="${c + r * 0.42}" r="${r * 0.42}"/></g>`
    + `<text class="s" x="${size * 1.35}" y="${size * 0.72}" font-size="${size * 0.78}" font-weight="700" fill="${INK}">AI Native Maker</text></g>`;
};

const card = (x, y, w, h, lines = 4, tint = PAPER) => {
  const r = Math.max(6, w * 0.06);
  let body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${tint}"/>`;
  for (let i = 0; i < lines; i += 1) {
    const ly = y + h * (0.26 + i * 0.15);
    const lw = w * [0.66, 0.78, 0.5, 0.72, 0.6][i % 5];
    body += `<rect x="${x + w * 0.12}" y="${ly}" width="${lw}" height="${Math.max(3, h * 0.045)}" rx="${Math.max(1.5, h * 0.022)}" fill="${i === 1 ? GREY2 : GREY}"/>`;
  }
  return `<g filter="url(#sh)">${body}</g>`;
};

// Иллюстрации рисуются в квадрате size x size. Ничего кликабельного.
const art = (kind, x, y, size) => {
  const S = (v) => v * size;
  if (kind === 'wave') {
    const bars = [0.30, 0.55, 0.80, 0.45, 0.95, 0.62, 0.35, 0.72, 0.50, 0.88, 0.40, 0.60, 0.28];
    const bw = S(0.035);
    const strip = bars.map((v, i) => {
      const bh = S(v * 0.28);
      return `<rect x="${x + S(0.04) + i * bw * 1.55}" y="${y + S(0.78) - bh / 2}" width="${bw}" height="${bh}" rx="${bw / 2}" fill="${INK}" opacity=".85"/>`;
    }).join('');
    return `${card(x + S(0.42), y + S(0.02), S(0.54), S(0.64), 5)}${strip}`;
  }
  if (kind === 'steps') {
    return [0, 1, 2].map((i) => card(x + S(0.10 + i * 0.10), y + S(0.06 + i * 0.28), S(0.72), S(0.22), 2)).join('')
      + [0, 1, 2].map((i) => `<circle cx="${x + S(0.19 + i * 0.10)}" cy="${y + S(0.17 + i * 0.28)}" r="${S(0.035)}" fill="${YELLOW}" stroke="${INK}" stroke-width="${S(0.008)}"/>`).join('');
  }
  if (kind === 'cards') {
    return `${card(x + S(0.06), y + S(0.20), S(0.62), S(0.62), 5)}`
      + `${card(x + S(0.60), y + S(0.02), S(0.34), S(0.26), 2)}`
      + `${card(x + S(0.66), y + S(0.60), S(0.30), S(0.24), 2)}`;
  }
  if (kind === 'stack') {
    return `${card(x + S(0.30), y + S(0.04), S(0.56), S(0.74), 4)}`
      + `${card(x + S(0.16), y + S(0.12), S(0.56), S(0.74), 4)}`
      + `${card(x + S(0.02), y + S(0.20), S(0.56), S(0.74), 5)}`;
  }
  // pencil
  return `${card(x + S(0.04), y + S(0.10), S(0.62), S(0.78), 5)}`
    + `<g filter="url(#sh)" transform="rotate(28 ${x + S(0.80)} ${y + S(0.48)})">`
    + `<rect x="${x + S(0.74)}" y="${y + S(0.14)}" width="${S(0.11)}" height="${S(0.60)}" rx="${S(0.02)}" fill="${PAPER}"/>`
    + `<path d="M${x + S(0.74)} ${y + S(0.74)}h${S(0.11)}l-${S(0.055)} ${S(0.10)}z" fill="${INK}"/>`
    + `<rect x="${x + S(0.74)}" y="${y + S(0.14)}" width="${S(0.11)}" height="${S(0.09)}" rx="${S(0.02)}" fill="${INK}"/></g>`;
};

// Постер: 1:1, 4:3, 3:4 и крупные вертикальные баннеры.
const poster = (c, w, h) => {
  const pad = Math.max(10, w * 0.075);
  const tiny = w < 340 || h < 300;
  const brandSize = Math.min(Math.max(w * 0.055, 14), 52);
  const headCap = tiny ? Math.min(w * 0.115, h * 0.10) : Math.min(w * 0.098, h * 0.11, 108);
  const headLines = tiny ? wrap(c.short, 16) : c.head;
  const headSize = fit(headLines, w - pad * 2, headCap, 700);
  const headTop = pad + brandSize * 1.6 + (tiny ? headSize * 0.5 : headSize * 0.9);
  const head = headLines.map((l, i) => `<text class="s" x="${pad}" y="${headTop + i * headSize * 1.16}" font-size="${headSize}" font-weight="700" fill="${INK}">${esc(l)}</text>`).join('');
  let y = headTop + headLines.length * headSize * 1.16;
  let sub = '';
  if (!tiny) {
    const subSize = Math.min(fit(c.sub, w - pad * 2, headSize * 0.46, 400), h * 0.045);
    sub = c.sub.map((l, i) => `<text class="s" x="${pad}" y="${y + subSize * (0.9 + i * 1.3)}" font-size="${subSize}" font-weight="400" fill="${SUB}">${esc(l)}</text>`).join('');
    y += subSize * (1.3 * c.sub.length + 0.9);
  }
  const artSize = Math.min(w - pad * 2, h - y - pad);
  const artBlock = artSize > w * 0.24 ? art(c.art, w - pad - artSize, h - pad - artSize, artSize) : '';
  return `${open(w, h)}${brand(pad, pad, brandSize)}${head}${sub}${artBlock}</svg>`;
};

// Полоса: 970x250, 728x90, 480x320, 320x100, 320x50.
const strip = (c, w, h) => {
  const pad = Math.max(6, h * 0.12);
  const artSize = Math.min(h - pad * 2, w * 0.22);
  const textWidth = w - pad * 3 - artSize;
  const showBrand = h >= 100;
  const brandSize = showBrand ? Math.min(h * 0.15, 24) : 0;
  const textAreaTop = pad;
  const textAreaH = h - pad * 2 - (showBrand ? brandSize * 1.9 : 0);
  let chosen = { lines: [c.short], size: 8 };
  for (let size = h * 0.36; size >= 7; size -= 0.5) {
    const lines = wrap(c.short, Math.max(6, Math.floor(textWidth / (size * 0.545))));
    if (lines.length * size * 1.18 <= textAreaH && lines.length <= 3) { chosen = { lines, size }; break; }
  }
  const { lines, size } = chosen;
  const blockH = lines.length * size * 1.18;
  const first = textAreaTop + (textAreaH - blockH) / 2 + size * 0.9;
  const text = lines.map((l, i) => `<text class="s" x="${pad}" y="${first + i * size * 1.18}" font-size="${size}" font-weight="700" fill="${INK}">${esc(l)}</text>`).join('');
  return `${open(w, h)}${text}`
    + (showBrand ? brand(pad, h - pad - brandSize, brandSize) : '')
    + art(c.art, w - pad - artSize, (h - artSize) / 2, artSize)
    + `</svg>`;
};

function wrap(text, maxChars) {
  const words = text.split(' ');
  const out = [];
  let line = '';
  for (const word of words) {
    if (!line) line = word;
    else if ((line + ' ' + word).length <= maxChars) line += ' ' + word;
    else { out.push(line); line = word; }
  }
  if (line) out.push(line);
  return out;
}

// Широкая раскладка для 16:9 и 4:3: текст слева, иллюстрация справа.
const wide = (c, w, h) => {
  const pad = Math.max(12, w * 0.045);
  const brandSize = Math.min(Math.max(h * 0.055, 16), 52);
  const colWidth = w * 0.52 - pad;
  const headSize = fit(c.head, colWidth, Math.min(h * 0.13, 104), 700);
  const subSize = Math.min(fit(c.sub, colWidth, headSize * 0.44, 400), h * 0.05);
  const blockHeight = c.head.length * headSize * 1.16 + subSize * (1.35 * c.sub.length + 1.1);
  const top = (h - blockHeight) / 2 + headSize * 0.85;
  const head = c.head.map((l, i) => `<text class="s" x="${pad}" y="${top + i * headSize * 1.16}" font-size="${headSize}" font-weight="700" fill="${INK}">${esc(l)}</text>`).join('');
  const subTop = top + c.head.length * headSize * 1.16 + subSize * 0.6;
  const sub = c.sub.map((l, i) => `<text class="s" x="${pad}" y="${subTop + i * subSize * 1.35}" font-size="${subSize}" font-weight="400" fill="${SUB}">${esc(l)}</text>`).join('');
  const artSize = Math.min(h - pad * 2 - brandSize, w * 0.42);
  return `${open(w, h)}${brand(pad, pad, brandSize)}${head}${sub}`
    + art(c.art, w - pad - artSize, (h - artSize) / 2, artSize) + `</svg>`;
};

const render = (c, w, h) => {
  const ratio = w / h;
  if (ratio >= 2 || h <= 120) return strip(c, w, h);
  if (ratio >= 1.25 && w >= 600) return wide(c, w, h);
  return poster(c, w, h);
};

// sips рисует SVG системным рендерером macOS: шрифты и кириллица на месте.
const rasterize = (svg, out, quality) =>
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', String(quality), svg, '--out', out], { stdio: 'ignore' });

const rows = [];
for (const c of concepts) {
  for (const [w, h] of RSYA) {
    const name = `${c.id}-rsya-${w}x${h}`;
    const svg = join(srcDir, `${name}.svg`);
    const out = join(rsyaDir, `${name}.jpg`);
    writeFileSync(svg, render(c, w, h));
    rasterize(svg, out, 92);
    rows.push({ path: out, concept: c, w, h, kind: 'rsya' });
  }
  for (const [w, h] of GRAPHIC) {
    const name = `${c.id}-graphic-${w}x${h}`;
    const svg = join(srcDir, `${name}.svg`);
    const out = join(graphicDir, `${name}.jpg`);
    writeFileSync(svg, render(c, w, h));
    rasterize(svg, out, 88);
    rows.push({ path: out, concept: c, w, h, kind: 'graphic' });
  }
}

const identify = (p) => execFileSync('magick', ['identify', '-format', '%w,%h,%b', p], { encoding: 'utf8' }).split(',');
const rel = (p) => p.slice(root.length);
const report = rows.map(({ path, concept, w, h, kind }) => {
  const [aw, ah, bytes] = identify(path);
  const kb = Math.round(Number.parseInt(bytes, 10) / 1024);
  const sizeOk = Number(aw) === w && Number(ah) === h;
  const weightOk = kind === 'graphic' ? kb <= 512 : kb <= 10 * 1024;
  return {
    filename: rel(path), concept: concept.name, kind, format: `${w}x${h}`,
    width: aw, height: ah, file_size_kb: kb, status: sizeOk && weightOk ? 'PASS' : 'FAIL',
  };
});
const headers = Object.keys(report[0]);
writeFileSync(join(root, 'manifest.csv'),
  [headers.join(','), ...report.map((r) => headers.map((k) => `"${r[k]}"`).join(','))].join('\n') + '\n');
writeFileSync(join(root, 'validation.json'), JSON.stringify({
  total: report.length,
  passed: report.filter((r) => r.status === 'PASS').length,
  failed: report.filter((r) => r.status !== 'PASS'),
}, null, 2) + '\n');
console.log(`${report.filter((r) => r.status === 'PASS').length}/${report.length} PASS`);
