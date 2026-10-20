import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { excludedJournalEntryIds, journalExclusions } from "../src/content/journal-exclusions.js";
import { siteConfig } from "../src/config/site.js";
import { sanitizePosts } from "./lib/sanitize-diary.mjs";

const sourceText = await readFile("src/content/diary.generated.json", "utf8");
const sourcePosts = JSON.parse(sourceText);
const chatPosts = JSON.parse(await readFile("src/content/chat-diary.generated.json", "utf8"));
const extraPosts = JSON.parse(await readFile("src/content/chat-diary.en-extra.generated.json", "utf8"));
const translations = JSON.parse(await readFile("src/content/diary.en.json", "utf8"));
const excludedIds = new Set(excludedJournalEntryIds);
const channelPosts = sourcePosts.filter(({ id }) => !excludedIds.has(id));
const posts = sanitizePosts([...channelPosts, ...chatPosts.filter(({ id }) => !excludedIds.has(id)), ...extraPosts.filter(({ id }) => !excludedIds.has(id))])
  .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? "") || a.id - b.id);

const html = await readFile("dist/index.html", "utf8");
const aiHtml = await readFile("dist/ai/index.html", "utf8");
const journal = JSON.parse(await readFile("dist/journal.json", "utf8"));
const llms = await readFile("dist/llms.txt", "utf8");
const aiInfo = await readFile("dist/ai-info.md", "utf8");
const context = JSON.parse(await readFile("dist/agent-context.json", "utf8"));
const robots = await readFile("dist/robots.txt", "utf8");
const sitemap = await readFile("dist/sitemap.xml", "utf8");
const css = await readFile("dist/styles.css", "utf8");
const app = await readFile("dist/app.js", "utf8");
const server = await readFile("server/index.mjs", "utf8");
const adminUi = await readFile("server/admin-ui.mjs", "utf8");
const caddy = await readFile("deploy/caddy-ainativemaker.conf", "utf8");
const siteFacts = JSON.parse(await readFile("site.json", "utf8"));
const failures = [];

if (createHash("sha256").update(sourceText).digest("hex") !== "2e3fd28a321dc417fe76c7db77ced0e204d46b31e692522546df39cd49a8cafc") failures.push("Protected diary source changed");
if (new Set(sourcePosts.map(({ id }) => id)).size !== sourcePosts.length) failures.push("Duplicate source post ids");
if (journalExclusions.length !== excludedIds.size) failures.push("Public diary exclusions are duplicated");
if (excludedJournalEntryIds.some((id) => ![...sourcePosts, ...chatPosts, ...extraPosts].some((post) => post.id === id))) failures.push("Public diary exclusion id is stale");
if (siteConfig.latestJournalDate !== posts.at(-1)?.date) failures.push("latestJournalDate is stale");
if (posts.some((post) => !translations[String(post.id)])) failures.push("English translation is incomplete");
if (posts.some((post) => translations[String(post.id)]?.paragraphs.length !== post.paragraphs.length)) failures.push("Translation paragraph counts differ");

if (!html.startsWith('<!doctype html>\n<html lang="en">') || !aiHtml.includes('<html lang="en">')) failures.push("Public HTML is not English");
if ((html.match(/<h1(?:\s|>)/gu) ?? []).length !== 1 || (aiHtml.match(/<h1(?:\s|>)/gu) ?? []).length !== 1) failures.push("Each page must contain exactly one H1");
if ((html.match(/data-entry data-entry-id=/gu) ?? []).length !== new Set(posts.map(({ date }) => date)).size) failures.push("Rendered diary day count differs");
if (posts.some(({ id }) => !html.includes(`id="post-${id}"`))) failures.push("A diary permalink is missing");
if (!html.includes('class="header-contact-link" href="mailto:5@111.bz"') || !aiHtml.includes('class="header-contact-link" href="mailto:5@111.bz"')) failures.push("Visible email contact is missing");
if (!html.includes('class="header-journal-link" href="#journal"')) failures.push("Journal header action is missing");
if (!html.includes('rel="alternate" href="/journal.json" type="application/json"') || !html.includes('rel="alternate" href="/llms.txt" type="text/plain"')) failures.push("AI resource discovery links are incomplete");
if (/\/ru\/|По-русски|lang-switch|hreflang="ru"|journal\.en\.json/u.test(`${html}${aiHtml}${llms}${aiInfo}`)) failures.push("Removed Russian public surface remains");
if (/[А-Яа-яЁё]/u.test(`${html}${aiHtml}${llms}${aiInfo}`)) failures.push("Cyrillic remains in the English public surface");
if (/community|комьюнит|сообществ|#join|data-lead-form|trial|membership/iu.test(`${html.slice(0, html.indexOf('<section class="journal"'))}${aiHtml}`)) failures.push("Removed public offer remains");
if (/entry-footer|entry-source|copy-link|data-year-link|sticky-cta/u.test(`${html}${app}`)) failures.push("Removed diary controls remain");
if (!/\.journal-nav\s*\{[^}]*position:\s*sticky/u.test(css) || /\.journal-nav\s*\{[^}]*overflow-x:\s*auto/u.test(css)) failures.push("Journal navigation contract changed");
if (/font-weight:\s*(?:[5-9]00|bold)/u.test(css)) failures.push("Bold text remains");
if (!/body\s*\{[^}]*font-size:\s*1\.125rem/u.test(css)) failures.push("Base visible text is below 18px");
if (/\.lang-switch/u.test(css)) failures.push("Removed language-switch styles remain");

if (journal.language !== "en" || journal.sourceLanguage !== "ru" || journal.ordering !== "newest-first") failures.push("Diary JSON metadata is wrong");
if (journal.count !== posts.length || journal.entries.length !== posts.length) failures.push("Diary JSON count differs from the page");
if (journal.entries.some((entry, index) => entry.id !== posts.toReversed()[index].id || entry.url !== `${siteConfig.siteUrl}/#post-${entry.id}` || JSON.stringify(entry.paragraphs) !== JSON.stringify(translations[String(entry.id)]?.paragraphs))) failures.push("Diary JSON content differs from the English diary");
if (/[А-Яа-яЁё]{4,}/u.test(JSON.stringify(journal.entries))) failures.push("Cyrillic words remain in the English diary JSON");

if (context.generator !== "ii-agent-modul/1.3.0" || context.site.url !== `${siteConfig.siteUrl}/` || context.site.language !== "en") failures.push("ii-agent context metadata is wrong");
if (context.site.verifiedAt !== siteFacts.verifiedAt || context.organization?.email !== "5@111.bz") failures.push("ii-agent verified facts are incomplete");
if (!llms.includes("Machine-readable resources") || !llms.includes(`${siteConfig.siteUrl}/journal.json`)) failures.push("ii-agent llms.txt is incomplete");
if (!aiInfo.includes("Email: 5@111.bz")) failures.push("ii-agent ai-info.md is incomplete");
if (!robots.includes("# >>> ii-agent:") || !robots.includes("User-agent: OAI-SearchBot") || !robots.includes("User-agent: GPTBot") || !robots.includes("Disallow: /admin/")) failures.push("ii-agent robots policy is incomplete");
if ((sitemap.match(/<loc>/gu) ?? []).length !== 2 || !sitemap.includes(`<loc>${siteConfig.siteUrl}/</loc>`) || !sitemap.includes(`<loc>${siteConfig.siteUrl}/ai/</loc>`) || /\/ru\//u.test(sitemap)) failures.push("English-only sitemap is wrong");

if (!aiHtml.includes('href="/journal.json"') || !aiHtml.includes('href="/ai-info.md"') || !aiHtml.includes('href="/agent-context.json"') || !aiHtml.includes("Structure of journal.json") || !aiHtml.includes("How to cite")) failures.push("AI guide is incomplete");
if (/Two languages|same in both languages/u.test(aiHtml)) failures.push("Bilingual guidance remains");
if (!caddy.includes("@russian path /ru /ru/*") || !caddy.includes("redir @russian / 308") || !caddy.includes("redir /journal.en.json /journal.json 308")) failures.push("Legacy language redirects are missing");
for (const file of ["dist/ru/index.html", "dist/ru/ai/index.html", "dist/journal.en.json"]) {
  try {
    await access(file);
    failures.push(`Removed public file still exists: ${file}`);
  } catch {}
}

if (!server.includes("appendFile(dataFile") || !server.includes('url.pathname === "/admin/api/leads"')) failures.push("Lead persistence or admin feed changed");
if (!server.includes("ADMIN_PASSWORD_SHA256") || !server.includes("ainm_admin") || !adminUi.includes("data-admin-notice")) failures.push("Admin authentication changed");
if (/\{\{[A-Z_]+\}\}/u.test(`${html}${aiHtml}`)) failures.push("Unresolved template token remains");
const documentIds = new Set([...html.matchAll(/\sid="([^"]+)"/gu)].map((match) => match[1]));
for (const match of html.matchAll(/href="#([^"]+)"/gu)) if (!documentIds.has(match[1])) failures.push(`Broken anchor: #${match[1]}`);

if (failures.length) {
  console.error([...new Set(failures)].join("\n"));
  process.exit(1);
}

console.log(`Checks passed: English-only site, ${posts.length} diary entries, ${context.generator}, ${context.site.verifiedAt}`);
