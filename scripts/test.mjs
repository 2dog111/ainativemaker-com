import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { excludedJournalEntryIds } from "../src/content/journal-exclusions.js";
import { siteConfig } from "../src/config/site.js";
import { sanitizePosts } from "./lib/sanitize-diary.mjs";

const html = await readFile("dist/index.html", "utf8");
const aiHtml = await readFile("dist/ai/index.html", "utf8");
const journal = JSON.parse(await readFile("dist/journal.json", "utf8"));
const llms = await readFile("dist/llms.txt", "utf8");
const aiInfo = await readFile("dist/ai-info.md", "utf8");
const agentContext = JSON.parse(await readFile("dist/agent-context.json", "utf8"));
const jsonLd = JSON.parse(await readFile("dist/jsonld.json", "utf8"));
const robots = await readFile("dist/robots.txt", "utf8");
const sitemap = await readFile("dist/sitemap.xml", "utf8");
const manifest = JSON.parse(await readFile("dist/site.webmanifest", "utf8"));
const app = await readFile("dist/app.js", "utf8");
const metrika = await readFile("dist/metrika.js", "utf8");
const css = await readFile("dist/styles.css", "utf8");
const caddy = await readFile("deploy/caddy-ainativemaker.conf", "utf8");
const sourcePosts = JSON.parse(await readFile("src/content/diary.generated.json", "utf8"));
const chatPosts = JSON.parse(await readFile("src/content/chat-diary.generated.json", "utf8"));
const extraPosts = JSON.parse(await readFile("src/content/chat-diary.en-extra.generated.json", "utf8"));
const translations = JSON.parse(await readFile("src/content/diary.en.json", "utf8"));
const excludedIds = new Set(excludedJournalEntryIds);
const channelPosts = sourcePosts.filter(({ id }) => !excludedIds.has(id));
const posts = sanitizePosts([...channelPosts, ...chatPosts.filter(({ id }) => !excludedIds.has(id)), ...extraPosts.filter(({ id }) => !excludedIds.has(id))])
  .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? "") || a.id - b.id);

assert.equal(siteConfig.latestJournalDate, posts.at(-1).date);
assert.equal(channelPosts.at(-1)?.id, 202608272142);
assert.equal(channelPosts.at(-1)?.paragraphs.length, 8);
assert.equal((html.match(/data-entry data-entry-id=/gu) ?? []).length, new Set(posts.map(({ date }) => date)).size);
assert.equal((html.match(/<time datetime="\d{4}-\d{2}-\d{2}">/gu) ?? []).length, new Set(posts.map(({ date }) => date)).size);
for (const post of posts) assert.match(html, new RegExp(`id="post-${post.id}"`, "u"));

assert.match(html, /^<!doctype html>\n<html lang="en">/u);
assert.equal((html.match(/<h1(?:\s|>)/gu) ?? []).length, 1);
assert.equal((aiHtml.match(/<h1(?:\s|>)/gu) ?? []).length, 1);
assert.match(html, /class="header-contact-link" href="mailto:5@111\.bz"/u);
assert.match(aiHtml, /class="header-contact-link" href="mailto:5@111\.bz"/u);
assert.match(html, /class="header-journal-link" href="#journal"/u);
assert.match(html, /<section class="journal" id="journal" aria-label="AI-Native Founder's Diary"/u);
assert.doesNotMatch(`${html}${aiHtml}${llms}${aiInfo}`, /href="\/ru|\/ru\/|По-русски|lang-switch|hreflang="ru"|journal\.en\.json/u);
assert.doesNotMatch(`${html}${aiHtml}${llms}${aiInfo}`, /[А-Яа-яЁё]/u);
const publicIntro = `${html.slice(0, html.indexOf('<section class="journal"'))}${aiHtml}`;
assert.doesNotMatch(publicIntro, /<form(?:\s|>)|community|membership|trial|pricing/iu);
assert.doesNotMatch(html, /<time datetime="[^"]*T/u);
assert.doesNotMatch(html, /entry-footer|entry-source|copy-link|Read more|data-year-link/u);
assert.match(html, /<progress class="reading-progress" data-progress max="100" value="0" aria-hidden="true"><\/progress>/u);
assert.match(app, /progress\.value = percent/u);
assert.doesNotMatch(app, /progress\.style/u);
assert.match(html, /\/styles\.css\?v=[a-f0-9]{12}/u);
assert.match(html, /\/app\.js\?v=[a-f0-9]{12}/u);
assert.match(html, /rel="alternate" href="\/journal\.json" type="application\/json"/u);
assert.match(html, /rel="alternate" href="\/llms\.txt" type="text\/plain"/u);
assert.doesNotMatch(html, /name="keywords"/u);

assert.equal(journal.language, "en");
assert.equal(journal.sourceLanguage, "ru");
assert.equal(journal.ordering, "newest-first");
assert.equal(journal.count, posts.length);
assert.equal(journal.entries.length, posts.length);
assert.equal(journal.entries[0].date, "2026-10-05");
for (const [index, post] of posts.toReversed().entries()) {
  const translation = translations[String(post.id)];
  assert.ok(translation, `translation for ${post.id}`);
  assert.equal(translation.paragraphs.length, post.paragraphs.length, `paragraph count for ${post.id}`);
  assert.equal(journal.entries[index].id, post.id);
  assert.equal(journal.entries[index].url, `${siteConfig.siteUrl}/#post-${post.id}`);
  assert.deepEqual(journal.entries[index].paragraphs, translation.paragraphs);
}
assert.doesNotMatch(JSON.stringify(journal.entries), /[А-Яа-яЁё]{4,}/u);

assert.match(llms, /^# AI Native Maker/mu);
assert.match(llms, /https:\/\/ainativemaker\.com\/journal\.json/u);
assert.match(llms, /Machine-readable resources/u);
assert.match(aiInfo, /Email: 5@111\.bz/u);
assert.match(agentContext.generator, /^ii-agent-modul\/1\.3\.0$/u);
assert.equal(agentContext.site.language, "en");
assert.equal(agentContext.site.verifiedAt, "2026-10-20");
assert.equal(agentContext.organization.email, "5@111.bz");
assert.equal(agentContext.pages.length, 3);
assert.equal(agentContext.ask.length, 2);
assert.equal(agentContext.askBrand.length, 2);
assert.equal(jsonLd["@graph"].find((item) => item["@type"] === "Organization")?.email, "5@111.bz");
assert.equal(jsonLd["@graph"].find((item) => item["@type"] === "WebSite")?.inLanguage, "en");

assert.match(robots, /# >>> ii-agent:/u);
assert.match(robots, /User-agent: OAI-SearchBot[\s\S]*Allow: \//u);
assert.match(robots, /User-agent: GPTBot[\s\S]*Disallow: \//u);
assert.match(robots, /Disallow: \/admin\//u);
assert.match(robots, /Sitemap: https:\/\/ainativemaker\.com\/sitemap\.xml/u);
assert.equal((sitemap.match(/<loc>/gu) ?? []).length, 2);
assert.match(sitemap, /<loc>https:\/\/ainativemaker\.com\/<\/loc>[\s\S]*<lastmod>2026-10-20<\/lastmod>/u);
assert.match(sitemap, /<loc>https:\/\/ainativemaker\.com\/ai\/<\/loc>/u);
assert.doesNotMatch(sitemap, /\/ru\/|journal\.json/u);

assert.match(aiHtml, /Guide for AI agents|for AI agents/u);
assert.match(aiHtml, /href="\/journal\.json"/u);
assert.match(aiHtml, /href="\/ai-info\.md"/u);
assert.match(aiHtml, /href="\/agent-context\.json"/u);
assert.match(aiHtml, /Structure of journal\.json/u);
assert.match(aiHtml, /How to cite/u);
assert.doesNotMatch(aiHtml, /Two languages/u);

assert.match(caddy, /@russian path \/ru \/ru\/\*/u);
assert.match(caddy, /redir @russian \/ 308/u);
assert.match(caddy, /redir \/journal\.en\.json \/journal\.json 308/u);
await assert.rejects(access("dist/ru/index.html"));
await assert.rejects(access("dist/ru/ai/index.html"));
await assert.rejects(access("dist/journal.en.json"));

assert.match(metrika, /mc\.yandex\.ru\/metrika\/tag\.js\?id=111975649/u);
assert.match(css, /font-weight: 400/u);
assert.doesNotMatch(css, /font-weight:\s*(?:[5-9]00|bold)/u);
assert.match(css, /min-height: 2\.75rem/u);
assert.doesNotMatch(css, /\.lang-switch/u);
assert.equal(manifest.lang, "en");
assert.equal(manifest.icons.length, 3);

console.log(`Tests passed: English-only site, ${posts.length} translated diary entries, ii-agent ${agentContext.generator}`);
