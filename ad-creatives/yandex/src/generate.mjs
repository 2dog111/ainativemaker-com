import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const sourceDir = join(root, 'src');
const combinatorialDir = join(root, 'combinatorial');
const graphicDir = join(root, 'graphic');
for (const dir of [sourceDir, combinatorialDir, graphicDir]) mkdirSync(dir, { recursive: true });

const formats = {
  combinatorial: [[1200, 1200], [1600, 1200], [1200, 1600], [1920, 1080]],
  graphic: [[240, 400], [300, 250], [300, 500], [300, 600], [320, 50], [320, 100], [320, 480], [336, 280], [480, 320], [728, 90], [970, 250]],
};

const concepts = [
  { id: '01-text-experience', name: 'TEXT EXPERIENCE', headline: ['10 лет с текстами', 'ваше преимущество в AI'], short: '10 лет с текстами → AI', offer: '14 дней бесплатно' },
  { id: '02-editors-eye', name: "EDITOR'S EYE", headline: ['Умеете видеть плохой текст?', 'Научите AI делать хорошую работу.'], short: 'Видите плохой текст?', offer: '' },
  { id: '03-text-ai-project', name: 'TEXT TO AI PROJECT', headline: ['Из работы с текстом', 'в AI-проекты'], short: 'Текст → AI-проекты', offer: '14 дней — 0 ₽' },
  { id: '04-not-a-prompt-course', name: 'NOT A PROMPT COURSE', headline: ['Не курс по промптам.', 'Собирайте работающие AI-проекты.'], short: 'Не курс по промптам.', offer: '' },
  { id: '05-hard-qualifier', name: 'HARD QUALIFIER', headline: ['Редакторы. Авторы.', 'Журналисты. Копирайтеры.'], short: 'Редакторам и авторам — в AI', offer: '14 дней — 0 ₽ · первый платный месяц — 8 800 ₽' },
];

const esc = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const svgOpen = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#202733" flood-opacity=".13"/></filter><style>.sans{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif}.ink{fill:#202733}.muted{fill:#5c6470}.blue{fill:#2864dc}.line{stroke:#d8d1c3}</style></defs><rect width="100%" height="100%" fill="#f7f4ec"/>`;
const logo = (x, y, scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})"><rect x="0" y="0" width="42" height="42" rx="12" fill="#eef3ff" stroke="#cbd8fb"/><circle cx="21" cy="21" r="8" fill="#2864dc"/><circle cx="9" cy="12" r="4" fill="#64d4a0"/><circle cx="33" cy="12" r="4" fill="#9255e8"/><circle cx="9" cy="30" r="4" fill="#ef74ad"/><circle cx="33" cy="30" r="4" fill="#e6c44f"/><text class="sans ink" x="53" y="29" font-size="23" font-weight="400">AI Native Maker</text></g>`;
const arrow = (x1, y1, x2, y2) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="#2864dc" stroke-width="5" stroke-linecap="round"/><path d="M${x2 - 11} ${y2 - 8} L${x2} ${y2} L${x2 - 11} ${y2 + 8}" fill="none" stroke="#2864dc" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
const page = (x, y, w, h, raw = false) => `<g filter="url(#s)"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#fffdf8" stroke="#d8d1c3" stroke-width="2"/><path d="M${x+w-36} ${y}v28h36" fill="#e8eefc" stroke="#d8d1c3" stroke-width="2"/>${[.22,.34,.46,.58,.70].map((p,i)=>`<path d="M${x+22} ${y+h*p}h${w*(raw ? [.62,.76,.48,.71,.58][i] : [.68,.54,.76,.44,.64][i])}" stroke="${raw && i===1 ? '#b54a4a' : '#5c6470'}" stroke-width="${raw && i===1 ? 5 : 4}" stroke-linecap="round"/>`).join('')}${raw ? `<path d="M${x+30} ${y+h*.35}l${w*.55} ${h*.16}M${x+30} ${y+h*.55}l${w*.53} -${h*.12}" stroke="#b54a4a" stroke-width="4"/>` : ''}</g>`;
const workflow = (x, y, w, h) => `<g filter="url(#s)"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#eef3ff" stroke="#bfd0fb" stroke-width="2"/><rect x="${x+20}" y="${y+20}" width="${w-40}" height="30" rx="7" fill="#2864dc"/><circle cx="${x+36}" cy="${y+35}" r="5" fill="#64d4a0"/><circle cx="${x+54}" cy="${y+35}" r="5" fill="#e6c44f"/><rect x="${x+24}" y="${y+75}" width="${w*.46}" height="${h*.28}" rx="9" fill="#fffdf8"/><rect x="${x+w*.58}" y="${y+75}" width="${w*.22}" height="${h*.28}" rx="9" fill="#64d4a0"/><path d="M${x+38} ${y+h*.7}C${x+w*.3} ${y+h*.44},${x+w*.55} ${y+h*.9},${x+w*.8} ${y+h*.57}" fill="none" stroke="#9255e8" stroke-width="5" stroke-linecap="round"/><circle cx="${x+w*.8}" cy="${y+h*.57}" r="10" fill="#ef74ad"/></g>`;
const books = (x,y,s) => `<g filter="url(#s)"><rect x="${x}" y="${y+50*s}" width="${160*s}" height="${30*s}" rx="7" fill="#2864dc"/><rect x="${x+12*s}" y="${y+20*s}" width="${150*s}" height="${30*s}" rx="7" fill="#e6c44f"/><rect x="${x+25*s}" y="${y-10*s}" width="${140*s}" height="${30*s}" rx="7" fill="#9255e8"/><path d="M${x+35*s} ${y+5*s}h112" stroke="#fffdf8" stroke-width="4" opacity=".8"/></g>`;
const desk = (x,y,s) => `<g filter="url(#s)"><ellipse cx="${x+180*s}" cy="${y+190*s}" rx="${180*s}" ry="${28*s}" fill="#ede8dc"/><rect x="${x}" y="${y+150*s}" width="${360*s}" height="${24*s}" rx="8" fill="#9a7659"/><rect x="${x+110*s}" y="${y+50*s}" width="${170*s}" height="${105*s}" rx="9" fill="#202733"/><rect x="${x+122*s}" y="${y+62*s}" width="${146*s}" height="${76*s}" rx="5" fill="#e8eefc"/><path d="M${x+145*s} ${y+115*s}h90" stroke="#2864dc" stroke-width="7"/><path d="M${x+190*s} ${y+155*s}v32" stroke="#202733" stroke-width="12"/><circle cx="${x+55*s}" cy="${y+117*s}" r="26" fill="#b97356"/><path d="M${x+26*s} ${y+145*s}q28-42 59 0v35H26z" fill="#5d708f"/><path d="M${x+35*s} ${y+163*s}L${x+95*s} ${y+128*s}" stroke="#b97356" stroke-width="10" stroke-linecap="round"/><rect x="${x+286*s}" y="${y+105*s}" width="${48*s}" height="${56*s}" rx="4" fill="#fffdf8" stroke="#d8d1c3"/></g>`;
const art = (concept, x, y, w, h) => {
  const s = Math.min(w / 900, h / 430);
  if (concept.id.startsWith('01')) return `${page(x+40*s,y+40*s,180*s,250*s)}${arrow(x+235*s,y+164*s,x+325*s,y+164*s)}${workflow(x+345*s,y+25*s,265*s,285*s)}${arrow(x+630*s,y+164*s,x+705*s,y+164*s)}<g filter="url(#s)"><rect x="${x+730*s}" y="${y+80*s}" width="110" height="220" rx="16" fill="#fffdf8"/><path d="M${x+755*s} ${y+250*s}l26 -45 28 20 36-76" fill="none" stroke="#64d4a0" stroke-width="10" stroke-linecap="round"/><circle cx="${x+840*s}" cy="${y+147*s}" r="13" fill="#ef74ad"/></g>`;
  if (concept.id.startsWith('02')) return `${page(x+45*s,y+25*s,260*s,300*s,true)}<path d="M${x+345*s} ${y+20*s}v320" stroke="#d8d1c3" stroke-width="4"/>${workflow(x+420*s,y+45*s,300*s,260*s)}${arrow(x+315*s,y+170*s,x+400*s,y+170*s)}`;
  if (concept.id.startsWith('03')) return `${books(x+30*s,y+130*s,1.25*s)}${arrow(x+245*s,y+168*s,x+330*s,y+168*s)}${workflow(x+355*s,y+35*s,255*s,270*s)}${arrow(x+625*s,y+168*s,x+700*s,y+168*s)}<g filter="url(#s)"><rect x="${x+725*s}" y="${y+72*s}" width="130*s" height="190*s" rx="14" fill="#fffdf8" stroke="#d8d1c3"/><path d="M${x+750*s} ${y+210*s}h80M${x+750*s} ${y+185*s}h50" stroke="#2864dc" stroke-width="8"/><circle cx="${x+790*s}" cy="${y+125*s}" r="24" fill="#64d4a0"/></g>`;
  if (concept.id.startsWith('04')) return desk(x+160*s,y+45*s,1.5*s);
  return `${page(x+55*s,y+35*s,230*s,260*s)}${arrow(x+305*s,y+160*s,x+390*s,y+160*s)}${desk(x+410*s,y+50*s,1.05*s)}`;
};
const headline = (lines, w, h, compact, wide) => {
  const isWide = w / h > 4;
  const use = isWide ? [lines.join(' ')] : lines;
  const availableWidth = isWide ? w * .62 : w * .84;
  const textBound = availableWidth / (Math.max(...use.map(line => line.length)) * .55);
  const size = Math.min(isWide ? Math.min(h * .34, 44) : compact ? Math.min(w * .095, h * .09, 34) : Math.min(w * .092, h * .075, 70), textBound);
  const firstY = isWide ? h * .42 : h * .18;
  const gap = size * 1.13;
  return `<g class="sans ink" text-anchor="middle" font-weight="400" font-size="${size}">${use.map((line, i) => `<text x="${w/2}" y="${firstY + i*gap}">${esc(line)}</text>`).join('')}</g>`;
};
const graphicSvg = (concept, w, h) => {
  const wide = w / h > 3.5;
  const compact = w < 340 || h < 140;
  const artH = wide ? h * .74 : h * .42;
  const brandScale = wide ? .43 : Math.min(w / 700, .65);
  const offer = compact ? '' : concept.offer;
  const lines = wide ? [concept.short] : concept.headline;
  return `${svgOpen(w,h)}${headline(lines,w,h,compact,wide)}${wide ? art(concept, w*.72, h*.08, w*.24, h*.82) : art(concept,w*.08,h*.47,w*.84,h*.44)}${logo(wide ? 16 : 18, wide ? 12 : h-42*brandScale-16, brandScale)}${offer ? `<g><rect x="${wide ? w*.36 : w*.5-w*.22}" y="${wide ? h*.67 : h*.90}" width="${wide ? w*.25 : w*.44}" height="${wide ? h*.2 : Math.min(h*.06,32)}" rx="${Math.min(h*.03,14)}" fill="#fff5bd" stroke="#e5bd40"/><text class="sans ink" text-anchor="middle" x="${wide ? w*.485 : w*.5}" y="${wide ? h*.80 : h*.945}" font-size="${Math.min(w*.032,h*.035,24)}">${esc(offer)}</text></g>` : ''}</svg>`;
};
const combinatorialSvg = (concept, w, h) => `${svgOpen(w,h)}${logo(32,32,Math.min(w/800,.9))}<text class="sans muted" x="${w/2}" y="${h*.16}" text-anchor="middle" font-size="${Math.min(w*.028,h*.045,42)}">${concept.name}</text>${art(concept,w*.08,h*.22,w*.84,h*.66)}</svg>`;
const filename = (concept, [w,h], kind) => `${concept.id}-${kind}-${w}x${h}`;
const writeSvg = (path, source) => writeFileSync(path, source);
const rasterize = (svg, raster, quality = 86) => execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', String(quality), svg, '--out', raster], { stdio: 'ignore' });

const rows = [];
for (const concept of concepts) {
  for (const dim of formats.combinatorial) {
    const name = filename(concept, dim, 'combinatorial');
    const svg = join(sourceDir, `${name}.svg`); const out = join(combinatorialDir, `${name}.jpg`);
    writeSvg(svg, combinatorialSvg(concept, ...dim)); rasterize(svg, out, 90);
    rows.push([out, concept, dim, '', '', '']);
  }
  for (const dim of formats.graphic) {
    const name = filename(concept, dim, 'graphic');
    const svg = join(sourceDir, `${name}.svg`); const out = join(graphicDir, `${name}.jpg`);
    writeSvg(svg, graphicSvg(concept, ...dim)); rasterize(svg, out, 86);
    rows.push([out, concept, dim, concept.headline.join(' '), concept.offer, '']);
  }
}

const identify = (path) => execFileSync('magick', ['identify', '-format', '%w,%h,%b', path], { encoding: 'utf8' }).split(',');
const rel = (path) => path.slice(root.length);
const report = [];
for (const [path, concept, [width,height], headlineText, offer] of rows) {
  const [actualW, actualH, bytes] = identify(path);
  const kb = Math.round(Number.parseInt(bytes, 10) / 1024);
  const graphic = path.includes('/graphic/');
  const pass = Number(actualW) === width && Number(actualH) === height && (!graphic || kb <= 512);
  report.push({ filename: rel(path), concept: concept.name, format: `${width}x${height}`, width: actualW, height: actualH, file_size_kb: kb, headline: headlineText, offer, status: pass ? 'PASS' : 'FAIL' });
}
const headers = Object.keys(report[0]);
const csv = [headers.join(','), ...report.map(row => headers.map(key => `"${String(row[key]).replaceAll('"','""')}"`).join(','))].join('\n');
writeFileSync(join(root, 'manifest.csv'), csv);
const groups = concepts.map(concept => `<section><h1>Concept ${concept.id.slice(0,2)} — ${concept.name}</h1><div class="grid">${report.filter(row=>row.concept===concept.name).map(row=>`<figure><img src="${row.filename.replace('graphic/','graphic/').replace('combinatorial/','combinatorial/')}" alt="${row.filename}"><figcaption>${row.format} · ${row.file_size_kb} KB · ${row.status}</figcaption></figure>`).join('')}</div></section>`).join('');
writeFileSync(join(root, 'contact-sheet.html'), `<!doctype html><html lang="ru"><meta charset="utf-8"><title>AI Native Maker — Yandex Direct creatives</title><style>body{margin:0;background:#f7f4ec;color:#202733;font-family:system-ui,sans-serif}main{max-width:1600px;margin:auto;padding:32px}h1{font-weight:400;border-top:1px solid #d8d1c3;padding-top:28px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}figure{margin:0;background:#fffdf8;border:1px solid #d8d1c3;padding:10px}img{width:100%;height:180px;object-fit:contain;background:#ede8dc}figcaption{font-size:12px;margin-top:8px;color:#5c6470}</style><main><h1>AI Native Maker — Яндекс Директ</h1>${groups}</main></html>`);
const failures = report.filter(row => row.status === 'FAIL');
writeFileSync(join(root, 'validation.json'), JSON.stringify({ total: report.length, passed: report.length - failures.length, failed: failures }, null, 2));
if (failures.length) process.exitCode = 1;
