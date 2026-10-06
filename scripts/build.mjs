import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { excludedJournalEntryIds } from "../src/content/journal-exclusions.js";
import { siteConfig } from "../src/config/site.js";
import { sanitizePosts } from "./lib/sanitize-diary.mjs";

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const linkifyPlainText = (value) => escapeHtml(value).replace(
  /(https?:\/\/[^\s<]+)/gu,
  '<a href="$1" rel="noreferrer">$1</a>'
);

const linkify = (value) => {
  const source = String(value);
  const markdownLink = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/gu;
  let html = "";
  let cursor = 0;

  for (const match of source.matchAll(markdownLink)) {
    html += linkifyPlainText(source.slice(cursor, match.index));
    html += `<a href="${escapeHtml(match[2])}" rel="noreferrer">${escapeHtml(match[1])}</a>`;
    cursor = match.index + match[0].length;
  }

  return html + linkifyPlainText(source.slice(cursor));
};

// Две языковые версии одного сайта. Английская — главная (`/`), русская
// живёт под `/ru/`. Обе версии показывают один набор записей: русский
// опубликованный текст и английский перевод из `diary.en.json` под тем же id.
const locales = {
  en: {
    lang: "en",
    hreflang: "en",
    dir: "",
    urlPrefix: "",
    template: "src/index.en.html",
    aiTemplate: "src/ai.en.html",
    intl: "en-US",
    yearHeading: (year) => year,
    formatEntryCount: (value) => `${value} ${value === 1 ? "entry" : "entries"}`,
    journalTitle: "AI-Native Founder's Diary"
  },
  ru: {
    lang: "ru",
    hreflang: "ru",
    dir: "ru",
    urlPrefix: "/ru",
    template: "src/index.html",
    aiTemplate: "src/ai.html",
    intl: "ru-RU",
    yearHeading: (year) => `${year} год`,
    formatEntryCount: (value) => {
      const mod100 = value % 100;
      const mod10 = value % 10;
      const noun = mod100 >= 11 && mod100 <= 14 ? "записей" : mod10 === 1 ? "запись" : mod10 >= 2 && mod10 <= 4 ? "записи" : "записей";
      return `${value} ${noun}`;
    },
    journalTitle: "Дневник AI-native предпринимателя"
  }
};

const formatDate = (locale, value) => {
  const text = new Intl.DateTimeFormat(locale.intl, { day: "numeric", month: "long", year: "numeric" })
    .format(new Date(`${value}T12:00:00Z`));
  return locale.lang === "ru" ? text.replace(" г.", " года") : text;
};

const monthName = (locale, value) => {
  const name = new Intl.DateTimeFormat(locale.intl, { month: "long" }).format(new Date(`${value}-15T12:00:00Z`));
  return name.charAt(0).toLocaleUpperCase(locale.lang) + name.slice(1);
};


const sourcePosts = JSON.parse(await readFile("src/content/diary.generated.json", "utf8"));
const chatPosts = JSON.parse(await readFile("src/content/chat-diary.generated.json", "utf8"));
const chatPostsEnExtra = JSON.parse(await readFile("src/content/chat-diary.en-extra.generated.json", "utf8"));
const translations = JSON.parse(await readFile("src/content/diary.en.json", "utf8"));
const excludedIds = new Set(excludedJournalEntryIds);
const channelPosts = sourcePosts.filter(({ id }) => !excludedIds.has(id));

const sortPosts = (list) => list
  .map((post) => ({ ...post, origin: post.origin ?? "channel" }))
  .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? "") || a.id - b.id)
  .map((post, index) => ({ ...post, number: index + 1 }));

// Хронология собирается из двух источников: публичного канала и отобранных
// записей закрытого чата. Оба потока идут одной лентой по дате и времени.
// Публикуемый текст проходит очистку: ссылки, имена и место жительства.
// Исходные корпуса остаются дословными.
const ruPosts = sortPosts(sanitizePosts([...channelPosts, ...chatPosts.filter(({ id }) => !excludedIds.has(id)), ...chatPostsEnExtra.filter(({ id }) => !excludedIds.has(id))]));
const enSourcePosts = sortPosts(sanitizePosts([...channelPosts, ...chatPosts.filter(({ id }) => !excludedIds.has(id)), ...chatPostsEnExtra.filter(({ id }) => !excludedIds.has(id))]));

const allowUntranslated = process.env.ALLOW_UNTRANSLATED === "1";
const missingTranslations = [];
const enPosts = enSourcePosts.map((post) => {
  const translation = translations[String(post.id)];
  if (!translation) {
    missingTranslations.push(post.id);
    return { ...post, translated: false };
  }
  if (translation.paragraphs.length !== post.paragraphs.length) {
    throw new Error(`Translation of ${post.id} has ${translation.paragraphs.length} paragraphs, source has ${post.paragraphs.length}`);
  }
  return { ...post, paragraphs: translation.paragraphs, translated: true };
});
if (missingTranslations.length && !allowUntranslated) {
  throw new Error(`${missingTranslations.length} diary entries have no English translation: ${missingTranslations.slice(0, 10).join(", ")}${missingTranslations.length > 10 ? "…" : ""}`);
}
for (const id of Object.keys(translations)) {
  if (![...sourcePosts, ...chatPosts, ...chatPostsEnExtra].some((post) => String(post.id) === id)) throw new Error(`Translation ${id} has no source entry`);
}

for (const list of [ruPosts, enPosts]) {
  const seenIds = new Set();
  for (const post of list) {
    if (seenIds.has(post.id)) throw new Error(`Duplicate diary entry id ${post.id}`);
    seenIds.add(post.id);
  }
}

const css = await readFile("src/styles.css", "utf8");
const js = await readFile("src/app.js", "utf8");
const metrika = await readFile("src/metrika.js", "utf8");

const brandMark = await readFile("src/assets/brand-mark.svg");
const heroIllustration = await readFile("src/assets/hero-illustration.webp");
const assetVersion = createHash("sha256").update(css).update(js).update(metrika).update(brandMark).update(heroIllustration).digest("hex").slice(0, 12);
const builtJs = js;

if (!ruPosts.length) throw new Error("Diary is empty");
if (new Set([...sourcePosts, ...chatPosts, ...chatPostsEnExtra].filter(({ id }) => excludedIds.has(id)).map(({ id }) => id)).size !== excludedIds.size) throw new Error("Journal exclusion list is stale");
if (siteConfig.latestJournalDate !== ruPosts.at(-1).date) throw new Error("latestJournalDate does not match diary content");
const latestEnDate = enPosts.at(-1).date;
if (latestEnDate < siteConfig.latestJournalDate) throw new Error("English diary is older than the Russian one");

const renderDiary = (locale, posts) => {
  const years = new Map();
  for (const post of [...posts].reverse()) {
    const year = post.date.slice(0, 4);
    const month = post.date.slice(0, 7);
    if (!years.has(year)) years.set(year, new Map());
    const months = years.get(year);
    if (!months.has(month)) months.set(month, []);
    months.get(month).push(post);
  }

  const diary = [...years.entries()].map(([year, months]) => {
    const monthSections = [...months.entries()].map(([month, monthPosts]) => {
      const days = new Map();
      for (const post of monthPosts) {
        if (!days.has(post.date)) days.set(post.date, []);
        days.get(post.date).push(post);
      }
      const entries = [...days.entries()].map(([date, dayPosts]) => {
        const first = dayPosts[0];
        const paragraphs = dayPosts.map((post, index) => {
          const body = post.paragraphs.map((paragraph) => `<p>${linkify(paragraph).replaceAll("\n", "<br>")}</p>`).join("");
          const anchor = index ? ` id="post-${post.id}"` : "";
          const langAttribute = locale.lang !== "ru" && post.translated === false ? ' lang="ru"' : "";
          return `<div class="entry-part"${anchor}${langAttribute}>${body}</div>`;
        }).join("");
        return `<article class="diary-entry" id="post-${first.id}" data-entry data-entry-id="post-${first.id}" data-year="${year}" data-origin="${first.origin}">
  <header class="entry-meta">
    <time datetime="${date}">${formatDate(locale, date)}</time>
  </header>
  <div class="entry-body">${paragraphs}</div>
</article>`;
      }).join("");
      return `<section class="journal-month" id="month-${month}" data-month="${month}" aria-labelledby="month-title-${month}">
  <header class="month-header"><h4 id="month-title-${month}">${monthName(locale, month)} ${year}</h4></header>
  ${entries}
</section>`;
    }).join("");
    return `<section class="journal-year" id="year-${year}" data-year-section="${year}" aria-labelledby="year-title-${year}">
  <h3 class="year-heading" id="year-title-${year}">${locale.yearHeading(year)}</h3>
  ${monthSections}
</section>`;
  }).join("");

  // Навигация по месяцам сгруппирована по годам и переносится на новые
  // строки: горизонтальной прокрутки нет ни на телефоне, ни на десктопе.
  const monthNav = [...years.entries()].map(([year, months]) => {
    const links = [...months.keys()].map((month) => `<a href="#month-${month}" data-month-link="${month}">${monthName(locale, month)}</a>`).join("");
    return `<div class="journal-nav-year" role="group" aria-label="${year}"><span class="journal-nav-year-label">${year}</span>${links}</div>`;
  }).join("");

  return { diary, monthNav };
};

const pageUrl = (locale, route = "") => `${siteConfig.siteUrl}${locale.urlPrefix}/${route}`;

const hreflangLinks = (route) => [
  `<link rel="alternate" hreflang="en" href="${pageUrl(locales.en, route)}">`,
  `<link rel="alternate" hreflang="ru" href="${pageUrl(locales.ru, route)}">`,
  `<link rel="alternate" hreflang="x-default" href="${pageUrl(locales.en, route)}">`
].join("\n  ");

const renderPages = (locale, posts) => {
  const { diary, monthNav } = renderDiary(locale, posts);
  const other = locale.lang === "en" ? locales.ru : locales.en;
  const replacements = new Map([
    ["{{SITE_URL}}", siteConfig.siteUrl],
    ["{{PAGE_URL}}", pageUrl(locale)],
    ["{{AI_PAGE_URL}}", pageUrl(locale, "ai/")],
    ["{{HOME_PATH}}", `${locale.urlPrefix}/`],
    ["{{AI_PATH}}", `${locale.urlPrefix}/ai/`],
    ["{{OTHER_HOME_PATH}}", `${other.urlPrefix}/`],
    ["{{OTHER_AI_PATH}}", `${other.urlPrefix}/ai/`],
    ["{{HREFLANG_HOME}}", hreflangLinks("")],
    ["{{HREFLANG_AI}}", hreflangLinks("ai/")],
    ["{{BRAND_NAME}}", siteConfig.brandName],
    ["{{ASSET_VERSION}}", assetVersion],
    ["{{LATEST_JOURNAL_DATE}}", posts.at(-1).date],
    ["{{JOURNAL_COUNT}}", String(posts.length)],
    ["{{JOURNAL_COUNT_LABEL}}", locale.formatEntryCount(posts.length)],
    ["{{JOURNAL_JSON_PATH}}", locale.lang === "en" ? "/journal.en.json" : "/journal.json"],
    ["{{MONTH_NAV}}", monthNav],
    ["{{DIARY_CONTENT}}", diary]
  ]);

  const apply = async (file, label) => {
    let html = await readFile(file, "utf8");
    for (const [token, value] of replacements) html = html.replaceAll(token, value);
    if (/\{\{[A-Z_]+\}\}/u.test(html)) throw new Error(`Unresolved ${label} template token in ${file}`);
    return html;
  };

  return Promise.all([apply(locale.template, "landing"), apply(locale.aiTemplate, "AI page")]);
};

const [enHtml, enAiHtml] = await renderPages(locales.en, enPosts);
const [ruHtml, ruAiHtml] = await renderPages(locales.ru, ruPosts);

const journalJson = (locale, posts, extra = {}) => ({
  version: 3,
  site: siteConfig.siteUrl,
  title: locale.journalTitle,
  language: locale.lang,
  ...extra,
  ordering: "newest-first",
  dateModified: posts.at(-1).date,
  count: posts.length,
  entries: [...posts].reverse().map((post) => ({
    id: post.id,
    date: post.date,
    url: `${pageUrl(locale)}#post-${post.id}`,
    paragraphs: post.paragraphs
  }))
});

const ruJournalJson = journalJson(locales.ru, ruPosts, { alternate: `${siteConfig.siteUrl}/journal.en.json` });
const enJournalJson = journalJson(locales.en, enPosts, {
  sourceLanguage: "ru",
  translation: "Entries are translated from the published Russian text with the same ids and paragraph breaks.",
  alternate: `${siteConfig.siteUrl}/journal.json`
});

const llmsText = `# AI Native Maker

> An AI-native founder's diary about making projects with AI. The newest entries come first.

## Canonical resources

- [Home page (English)](${siteConfig.siteUrl}/): English diary and latest entries
- [Home page (Russian)](${siteConfig.siteUrl}/ru/): Russian diary with the latest entries first
- [Map for AI agents (English)](${siteConfig.siteUrl}/ai/): content structure and citation guidance
- [Map for AI agents (Russian)](${siteConfig.siteUrl}/ru/ai/)
- [Diary JSON, English](${siteConfig.siteUrl}/journal.en.json): ${locales.en.formatEntryCount(enPosts.length)}, dates, translated paragraphs and permalinks
- [Diary JSON, Russian original](${siteConfig.siteUrl}/journal.json): ${locales.ru.formatEntryCount(ruPosts.length)}, original paragraphs, dates and permalinks
- [Sitemap](${siteConfig.siteUrl}/sitemap.xml)

## Working with the diary

- Entries are ordered newest-first in HTML and JSON.
- English translations share ids and paragraph breaks with the published Russian text. Both versions contain the same selected entries.
- The paragraphs field holds one paragraph per element; order matters.
- To cite, use the url field of the specific entry and give its date.
- Entries are the author's dated experience; judgements about models and prices may become outdated.
- Names of people and the home city in older entries were changed.

---

# AI Native Maker (по-русски)

> Дневник AI-native предпринимателя о создании проектов с ИИ. Свежие записи идут первыми.

## Канонические ресурсы

- [Главная страница (русская)](${siteConfig.siteUrl}/ru/): исходный дневник на русском
- [Карта для AI-агентов](${siteConfig.siteUrl}/ru/ai/): структура контента и правила цитирования
- [Публичная хронология JSON](${siteConfig.siteUrl}/journal.json): ${locales.ru.formatEntryCount(ruPosts.length)}, исходные абзацы, даты и постоянные ссылки
- [Английский дневник JSON](${siteConfig.siteUrl}/journal.en.json): перевод тех же отобранных записей

## Работа с хронологией

- В обеих версиях HTML и JSON записи идут от новых к старым; поле ordering равно newest-first.
- Для цитирования используйте поле url конкретной записи и указывайте её date.
- Записи передают датированный опыт автора; оценки моделей и цен могут устареть.
- Имена людей и место действия в старых записях изменены.
`;

const webManifest = {
  name: "AI Native Maker",
  short_name: "AI Native Maker",
  description: "Turn an idea into a working first version with AI",
  lang: "en",
  start_url: "/",
  scope: "/",
  display: "browser",
  background_color: "#f7f4ec",
  theme_color: "#f4f1e9",
  icons: [
    { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
    { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png" }
  ]
};

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await mkdir(path.join("dist", "ai"), { recursive: true });
await mkdir(path.join("dist", "ru", "ai"), { recursive: true });
await writeFile(path.join("dist", "index.html"), enHtml);
await writeFile(path.join("dist", "ai", "index.html"), enAiHtml);
await writeFile(path.join("dist", "ru", "index.html"), ruHtml);
await writeFile(path.join("dist", "ru", "ai", "index.html"), ruAiHtml);
await writeFile(path.join("dist", "styles.css"), css);
await writeFile(path.join("dist", "app.js"), builtJs);
await writeFile(path.join("dist", "metrika.js"), metrika);
await copyFile("src/assets/favicon.svg", path.join("dist", "favicon.svg"));
await copyFile("src/assets/favicon.ico", path.join("dist", "favicon.ico"));
await copyFile("src/assets/apple-touch-icon.png", path.join("dist", "apple-touch-icon.png"));
await copyFile("src/assets/icon-192.png", path.join("dist", "icon-192.png"));
await copyFile("src/assets/icon-512.png", path.join("dist", "icon-512.png"));
await copyFile("src/assets/og-image.svg", path.join("dist", "og-image.svg"));
await copyFile("src/assets/og-image.png", path.join("dist", "og-image.png"));
await copyFile("src/assets/ai-native-maker-mark.png", path.join("dist", "ai-native-maker-mark.png"));
await copyFile("src/assets/ai-native-maker-mark-v2.webp", path.join("dist", "ai-native-maker-mark-v2.webp"));
await copyFile("src/assets/brand-mark.svg", path.join("dist", "brand-mark.svg"));
await copyFile("src/assets/hero-illustration.webp", path.join("dist", "hero-illustration.webp"));
await writeFile(path.join("dist", "journal.json"), `${JSON.stringify(ruJournalJson, null, 2)}\n`);
await writeFile(path.join("dist", "journal.en.json"), `${JSON.stringify(enJournalJson, null, 2)}\n`);
await writeFile(path.join("dist", "llms.txt"), llmsText);
await writeFile(path.join("dist", "site.webmanifest"), `${JSON.stringify(webManifest, null, 2)}\n`);
// IndexNow: ключ лежит в deploy/indexnow.key, файл с ним должен отдаваться с корня,
// тогда Bing и Яндекс принимают пинги об изменённых URL (см. DEPLOY.md).
const indexNowKey = (await readFile("deploy/indexnow.key", "utf8")).trim();
await writeFile(path.join("dist", `${indexNowKey}.txt`), `${indexNowKey}\n`);
await writeFile(path.join("dist", "robots.txt"), `User-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: ChatGPT-User\nAllow: /\n\nUser-agent: *\nAllow: /\n\nSitemap: ${siteConfig.siteUrl}/sitemap.xml\n`);

const sitemapEntry = (route) => {
  const lastmod = route === "" || route === "ai/" ? latestEnDate : siteConfig.latestJournalDate;
  return [locales.en, locales.ru].map((locale) => `  <url>
    <loc>${pageUrl(locale, route)}</loc>
    <lastmod>${locale.lang === "en" ? lastmod : siteConfig.latestJournalDate}</lastmod>
    <xhtml:link rel="alternate" hreflang="en" href="${pageUrl(locales.en, route)}"/>
    <xhtml:link rel="alternate" hreflang="ru" href="${pageUrl(locales.ru, route)}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl(locales.en, route)}"/>
  </url>`).join("\n");
};
await writeFile(path.join("dist", "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${sitemapEntry("")}
${sitemapEntry("ai/")}
</urlset>
`);

const translatedCount = enPosts.filter((post) => post.translated).length;
console.log(`Built dist/index.html (en, ${enPosts.length} entries, ${translatedCount} translated) and dist/ru/index.html (ru, ${ruPosts.length} entries: ${channelPosts.length} из канала, ${ruPosts.length - channelPosts.length} из закрытого чата)`);
if (missingTranslations.length) console.warn(`WARNING: ${missingTranslations.length} entries are still shown in Russian on the English page`);
