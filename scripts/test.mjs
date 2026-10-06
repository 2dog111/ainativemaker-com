import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { excludedJournalEntryIds } from "../src/content/journal-exclusions.js";
import { siteConfig } from "../src/config/site.js";
import { sanitizePosts } from "./lib/sanitize-diary.mjs";

// Русская версия — `/ru/`, английская — главная. Русские проверки идут по
// `html`, английские — по `enHtml`.
const html = await readFile("dist/ru/index.html", "utf8");
const aiHtml = await readFile("dist/ru/ai/index.html", "utf8");
const enHtml = await readFile("dist/index.html", "utf8");
const enAiHtml = await readFile("dist/ai/index.html", "utf8");
const enJournalJson = JSON.parse(await readFile("dist/journal.en.json", "utf8"));
const translations = JSON.parse(await readFile("src/content/diary.en.json", "utf8"));
const chatPostsEnExtra = JSON.parse(await readFile("src/content/chat-diary.en-extra.generated.json", "utf8"));
const app = await readFile("dist/app.js", "utf8");
const metrika = await readFile("dist/metrika.js", "utf8");
const journalJson = JSON.parse(await readFile("dist/journal.json", "utf8"));
const llms = await readFile("dist/llms.txt", "utf8");
const robots = await readFile("dist/robots.txt", "utf8");
const sitemap = await readFile("dist/sitemap.xml", "utf8");
const manifest = JSON.parse(await readFile("dist/site.webmanifest", "utf8"));
const appleTouchIcon = await readFile("dist/apple-touch-icon.png");
const nginx = await readFile("deploy/nginx.conf", "utf8");
const sourcePosts = JSON.parse(await readFile("src/content/diary.generated.json", "utf8"));
const chatPosts = JSON.parse(await readFile("src/content/chat-diary.generated.json", "utf8"));
const excludedIds = new Set(excludedJournalEntryIds);
const channelPosts = sourcePosts.filter(({ id }) => !excludedIds.has(id));
const posts = [...channelPosts, ...chatPosts.filter(({ id }) => !excludedIds.has(id)), ...chatPostsEnExtra.filter(({ id }) => !excludedIds.has(id))]
  .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? "") || a.id - b.id);
// Публикуемая версия: та же очистка, что применяет сборка.
const publicPosts = sanitizePosts(posts);

assert.equal(siteConfig.latestJournalDate, posts.at(-1).date);
assert.equal(channelPosts.at(-1).date, "2026-08-27");
assert.equal(channelPosts.at(-1)?.id, 202608272142);
assert.equal(channelPosts.at(-1)?.paragraphs.length, 8);
assert.equal(channelPosts.at(-1)?.paragraphs[0], "Как делать дизайн и UI, если вы вообще в нем ничего не понимаете");
assert.match(channelPosts.at(-1)?.paragraphs.at(-1) ?? "", /^—  ui-skills\.com[\s\S]*— emilkowal\.ski\/ui\/you-dont-need-animations[\s\S]*интерфейс в мультик$/u);
assert.equal(channelPosts.at(-1)?.paragraphs.at(-1)?.split("\n").length, 9);
assert.equal((html.match(/data-entry data-entry-id=/gu) ?? []).length, new Set(posts.map(({ date }) => date)).size);
assert.equal((html.match(/<time datetime="\d{4}-\d{2}-\d{2}">/gu) ?? []).length, new Set(posts.map(({ date }) => date)).size);
for (const post of posts) assert.match(html, new RegExp(`id="post-${post.id}"`, "u"));
assert.doesNotMatch(html, /<time datetime="[^"]*T/u);
assert.doesNotMatch(html, /entry-footer|entry-source|copy-link|Скопировать ссылку|>Запись \d{3}</u);
assert.doesNotMatch(html, /class="eyebrow"|journal-actions|journal-filters|data-journal-search|data-year-filter|data-clear-filter|data-filter-status/u);
assert.doesNotMatch(html, /Начать с первой записи|Перейти к последней|Продолжить с места, где остановились/u);
assert.doesNotMatch(html, /<header class="month-header"><p>/u);
assert.equal((html.match(/<h1(?:\s|>)/gu) ?? []).length, 1);
assert.equal((aiHtml.match(/<h1(?:\s|>)/gu) ?? []).length, 1);
assert.match(html, /<progress class="reading-progress" data-progress max="100" value="0" aria-hidden="true"><\/progress>/u);
assert.match(app, /progress\.value = percent/u);
for (const page of [enHtml, html, enAiHtml, aiHtml]) {
  const copy = page.includes('<section class="journal"') ? page.slice(0, page.indexOf('<section class="journal"')) + page.slice(page.indexOf('</main>')) : page;
  assert.doesNotMatch(copy, /community|комьюнит|сообществ|#join|data-lead-form|trial|пробн|membership|участия/iu);
}
assert.equal(enJournalJson.ordering, "newest-first");
assert.equal(journalJson.ordering, "newest-first");
assert.equal(enJournalJson.entries[0].date, "2026-10-05");
assert.match(enHtml, /id="month-2026-10"/u);
assert.ok(enHtml.indexOf('id="month-2026-10"') < enHtml.indexOf('id="month-2026-09"'));
assert.ok(html.indexOf('id="month-2026-10"') < html.indexOf('id="month-2026-09"'));
assert.doesNotMatch(app, /progress\.style/u);
for (const pageHtml of [html, aiHtml]) {
  assert.equal((pageHtml.match(/src="\/metrika\.js\?v=[a-f0-9]{12}"/gu) ?? []).length, 1);
  assert.match(pageHtml, /mc\.yandex\.ru\/watch\/111975649/u);
  assert.doesNotMatch(pageHtml, /<noscript>[\s\S]*?style=/u);
}
assert.match(metrika, /mc\.yandex\.ru\/metrika\/tag\.js\?id=111975649/u);
assert.match(metrika, /ym\(111975649,"init",\{ssr:true,webvisor:true,clickmap:true,ecommerce:"dataLayer",referrer:document\.referrer,url:location\.href,accurateTrackBounce:true,trackLinks:true\}\)/u);
assert.match(html, /content="https:\/\/ainativemaker\.com\/ru\/"/u);
assert.match(html, /name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1"/u);
assert.match(html, /rel="manifest" href="\/site\.webmanifest"/u);
assert.match(html, /rel="apple-touch-icon" href="\/apple-touch-icon\.png" sizes="180x180"/u);
assert.match(html, /rel="alternate" href="\/journal\.json" type="application\/json"/u);
assert.match(html, /rel="alternate" href="\/llms\.txt" type="text\/plain"/u);
assert.doesNotMatch(html, /name="keywords"/u);
assert.doesNotMatch(html.slice(0, html.indexOf('<section class="journal"')), /Закрытое комьюнити/u);
assert.doesNotMatch(html, /8(?:\s| )?800|3(?:\s| )?800|₽|Первый платный месяц|платный месяц дороже/u);
assert.doesNotMatch(html, /людей, которые много работают с текстом/u);
assert.doesNotMatch(html, /кто читает, пишет или редактирует тексты/u);
assert.doesNotMatch(html, /у кого перед глазами почти всегда документ/u);
assert.doesNotMatch(html, /Сообщество об AI для тех, кто много/u);
assert.doesNotMatch(html, /Я складываю сюда модели, API, промпты, ошибки и деплои|class="hero-lead"/u);
assert.doesNotMatch(html, /Посмотреть, что внутри|class="text-link"|hero_tasks_click/u);
assert.match(html, /brand-mark\.svg\?v=[a-f0-9]{12}/u);
assert.match(html, /AI Native Maker\.com/u);
assert.match(html, /class="header-journal-link" href="#journal"[^>]*>Дневник AI-native предпринимателя</u);
assert.doesNotMatch(html, /\{\{[A-Z_]+\}\}/u);
assert.doesNotMatch(html, /Банковская карта для первых/u);
assert.doesNotMatch(html, /Вы всю жизнь объясняете словами/u);
assert.doesNotMatch(html, /Отказаться можно в любой день/u);
assert.doesNotMatch(html, /Оставьте имя и выберите, куда ответить|вы успеете прочитать архив/u);
assert.match(html, /class="button-journal"/u);
assert.match(html, /<h2 id="journal-title">Дневник AI-native предпринимателя<\/h2>/u);
assert.doesNotMatch(html, /Записи из канала и из закрытого чата|правлены только имена людей и город/u);
assert.match(html, /class="journal-nav"/u);
assert.doesNotMatch(html, /data-year-link|>Начало<|>Последняя запись</u);
assert.doesNotMatch(html.slice(0, html.indexOf('<section class="journal"')), /journal-rail|journal-layout|mobile-month-picker|class="pricing"|25 сценариев|case-detail/u);
assert.ok(chatPosts.length >= 20);
assert.doesNotMatch(html, /class="entry-origin"/u);
assert.doesNotMatch(html, /t\.me\/prompt_design|x\.com\/|facebook\.com\/|invitation_code=|yunwu\.ai/u);
assert.match(html, /Вчера написал пост про страдания из-за того/u);
assert.doesNotMatch(html, /Антох|Гладков|Кирилл|Новиков|Машк|Лондон|Ноттинг/u);
assert.match(html, /Сан-Франциско/u);
assert.match(html, /Слава Богу/u);
assert.doesNotMatch(html, /Что важно знать до заявки|class="faq"/u);
assert.match(aiHtml, /Структура journal\.json/u);
assert.match(aiHtml, /Как цитировать/u);
assert.doesNotMatch(html, /Читайте, как опытные вайб-кодеры принимают решения/u);
assert.match(html, /Хмм, за последние пару месяцев я потратил всю свою кровь до последней капли/u);
assert.match(html, /То бишь Kimi больше никакой работы не осталось/u);
assert.match(html, /Всем кто ведется на посты очкариков в одноклассниках и линкедине/u);
assert.match(html, /это sci-fi уровня &quot;Паровозика Томаса&quot;\./u);
assert.match(html, /Как делать дизайн и UI, если вы вообще в нем ничего не понимаете/u);
assert.doesNotMatch(html, /\[написал пост про страдания\]\(/u);
assert.match(html, /—  ui-skills\.com[\s\S]*<br>— ui\.shadcn\.com[\s\S]*<br>— emilkowal\.ski\/ui\/you-dont-need-animations/u);
assert.match(html, /href="\/ru\/ai\/">Для AI-агентов</u);
assert.match(nginx, /https:\/\/mc\.yandex\.md/u);

const homeStructuredData = JSON.parse(html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/u)[1]);
assert.equal(homeStructuredData["@context"], "https://schema.org");
assert.equal(homeStructuredData["@graph"].find((item) => item["@type"] === "WebSite")?.name, "AI Native Maker");
assert.equal(homeStructuredData["@graph"].find((item) => item["@type"] === "WebPage")?.dateModified, siteConfig.latestJournalDate);

assert.match(aiHtml, /ainativemaker\.com для AI-агентов/u);
assert.match(aiHtml, /Две языковые версии/u);
assert.doesNotMatch(aiHtml, /закрытое платное сообщество для людей/u);
assert.match(aiHtml, /Имена людей и место действия в старых записях изменены/u);
assert.match(aiHtml, /href="\/journal\.json"/u);
assert.match(aiHtml, /href="\/llms\.txt"/u);
assert.doesNotMatch(aiHtml, /\{\{[A-Z_]+\}\}/u);

assert.equal(journalJson.count, posts.length);
assert.equal(journalJson.ordering, "newest-first");
assert.equal(journalJson.entries.length, posts.length);
for (const [index, post] of publicPosts.toReversed().entries()) {
  assert.equal(journalJson.entries[index].id, post.id);
  assert.equal(journalJson.entries[index].date, post.date);
  assert.equal(journalJson.entries[index].url, `${siteConfig.siteUrl}/ru/#post-${post.id}`);
  assert.deepEqual(journalJson.entries[index].paragraphs, post.paragraphs);
}

assert.match(llms, /Карта для AI-агентов/u);
assert.match(llms, /Публичная хронология JSON/u);
assert.match(robots, /User-agent: OAI-SearchBot\nAllow: \//u);
assert.match(robots, /User-agent: ChatGPT-User\nAllow: \//u);
assert.match(sitemap, /<loc>https:\/\/ainativemaker\.com\/ai\/<\/loc>/u);
assert.match(sitemap, /<loc>https:\/\/ainativemaker\.com\/ru\/<\/loc>/u);
assert.match(sitemap, /<loc>https:\/\/ainativemaker\.com\/ru\/ai\/<\/loc>/u);
assert.equal((sitemap.match(/<loc>/gu) ?? []).length, 4);

// Английская версия.
const enPosts = sanitizePosts([...channelPosts, ...chatPosts.filter(({ id }) => !excludedIds.has(id)), ...chatPostsEnExtra.filter(({ id }) => !excludedIds.has(id))])
  .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? "") || a.id - b.id);
assert.match(enHtml, /^<!doctype html>\n<html lang="en">/u);
assert.equal((enHtml.match(/<h1(?:\s|>)/gu) ?? []).length, 1);
assert.equal((enAiHtml.match(/<h1(?:\s|>)/gu) ?? []).length, 1);
assert.match(enHtml, /<h2 id="journal-title">AI-Native Founder's Diary<\/h2>/u);
assert.match(enHtml, /AI-Native Founder.s Diary/u);
assert.match(enHtml, /class="lang-switch" href="\/ru\/" hreflang="ru" lang="ru"/u);
assert.match(html, /class="lang-switch" href="\/" hreflang="en" lang="en"/u);
assert.match(enHtml, /<link rel="alternate" hreflang="x-default" href="https:\/\/ainativemaker\.com\/">/u);
assert.match(html, /<link rel="alternate" hreflang="en" href="https:\/\/ainativemaker\.com\/">/u);
assert.equal((enHtml.match(/data-entry data-entry-id=/gu) ?? []).length, new Set(enPosts.map(({ date }) => date)).size);
assert.deepEqual(enPosts.map((post) => post.id), posts.map((post) => post.id), "Both languages carry the same selected entries");
assert.equal((enHtml.match(/<h1(?:\s|>)/gu) ?? []).length, 1);
assert.doesNotMatch(enHtml.slice(0, enHtml.indexOf('<section class="journal"')).replace(/По-русски/gu, ""), /[А-Яа-яЁё]/u);
assert.equal(enJournalJson.language, "en");
assert.equal(enJournalJson.count, enPosts.length);
for (const [index, post] of enPosts.toReversed().entries()) {
  assert.equal(enJournalJson.entries[index].id, post.id);
  assert.equal(enJournalJson.entries[index].date, post.date);
  assert.equal(enJournalJson.entries[index].url, `${siteConfig.siteUrl}/#post-${post.id}`);
  assert.ok(translations[String(post.id)], `translation for ${post.id}`);
  assert.equal(translations[String(post.id)].paragraphs.length, post.paragraphs.length, `paragraph count for ${post.id}`);
  assert.deepEqual(enJournalJson.entries[index].paragraphs, translations[String(post.id)].paragraphs);
}
assert.match(enAiHtml, /ainativemaker\.com for AI agents/u);
assert.match(enAiHtml, /href="\/journal\.en\.json"/u);
assert.doesNotMatch(enAiHtml, /\{\{[A-Z_]+\}\}/u);
assert.match(llms, /Map for AI agents \(English\)/u);
assert.equal(manifest.name, "AI Native Maker");
assert.equal(manifest.icons.length, 3);
assert.equal(appleTouchIcon.readUInt32BE(16), 180);
assert.equal(appleTouchIcon.readUInt32BE(20), 180);
assert.match(nginx, /try_files \$uri \$uri\/ =404;/u);
assert.doesNotMatch(nginx, /try_files \$uri \$uri\/ \/index\.html;/u);
assert.match(nginx, /script-src 'self' https:\/\/mc\.yandex\.ru[^;]*https:\/\/yastatic\.net/u);
assert.match(nginx, /connect-src 'self' https:\/\/mc\.yandex\.ru/u);
assert.match(nginx, /frame-src blob: https:\/\/mc\.yandex\.ru/u);

console.log(`Tests passed: ${posts.length} public posts (${channelPosts.length} из канала, ${posts.length - channelPosts.length} из чата), one H1`);
