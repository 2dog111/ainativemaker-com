import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { excludedJournalEntryIds, journalExclusions } from "../src/content/journal-exclusions.js";
import { siteConfig } from "../src/config/site.js";
import { sanitizePosts } from "./lib/sanitize-diary.mjs";

const sourceText = await readFile("src/content/diary.generated.json", "utf8");
const sourcePosts = JSON.parse(sourceText);
const chatPosts = JSON.parse(await readFile("src/content/chat-diary.generated.json", "utf8"));
const chatPostsEnExtra = JSON.parse(await readFile("src/content/chat-diary.en-extra.generated.json", "utf8"));
const excludedIds = new Set(excludedJournalEntryIds);
const channelPosts = sourcePosts.filter(({ id }) => !excludedIds.has(id));
// Публикуемый текст сверяется после той же очистки, что применяет сборка.
const posts = sanitizePosts([...channelPosts, ...chatPosts.filter(({ id }) => !excludedIds.has(id)), ...chatPostsEnExtra.filter(({ id }) => !excludedIds.has(id))])
  .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? "") || a.id - b.id);
const manifest = JSON.parse(await readFile("build/diary-manifest.json", "utf8"));
// Обе языковые версии публикуют один отбор; английская — главная.
// Русские текстовые проверки ниже идут по `html` = dist/ru/index.html,
// английские — по `enHtml` = dist/index.html.
const html = await readFile("dist/ru/index.html", "utf8");
const aiHtml = await readFile("dist/ru/ai/index.html", "utf8");
const enHtml = await readFile("dist/index.html", "utf8");
const enAiHtml = await readFile("dist/ai/index.html", "utf8");
const journalJson = JSON.parse(await readFile("dist/journal.json", "utf8"));
const enJournalJson = JSON.parse(await readFile("dist/journal.en.json", "utf8"));
const translations = JSON.parse(await readFile("src/content/diary.en.json", "utf8"));
const css = await readFile("dist/styles.css", "utf8");
const app = await readFile("dist/app.js", "utf8");
const metrika = await readFile("dist/metrika.js", "utf8");
const server = await readFile("server/index.mjs", "utf8");
const adminUi = await readFile("server/admin-ui.mjs", "utf8");
const nginx = await readFile("deploy/nginx.conf", "utf8");
const robots = await readFile("dist/robots.txt", "utf8");
const sitemap = await readFile("dist/sitemap.xml", "utf8");
const llms = await readFile("dist/llms.txt", "utf8");
const webManifest = JSON.parse(await readFile("dist/site.webmanifest", "utf8"));
const ogImage = await readFile("dist/og-image.png");
const appleTouchIcon = await readFile("dist/apple-touch-icon.png");
const brandMark = await readFile("dist/brand-mark.svg");
const agentRules = await readFile("AGENTS.md", "utf8");
const failures = [];
const ids = sourcePosts.map((post) => post.id);

if (sourcePosts.length !== manifest.length) failures.push("Manifest and source post counts differ");
if (createHash("sha256").update(sourceText).digest("hex") !== "2e3fd28a321dc417fe76c7db77ced0e204d46b31e692522546df39cd49a8cafc") failures.push("Protected diary source changed");
if (createHash("sha256").update(JSON.stringify(sourcePosts.slice(0, -1))).digest("hex") !== "cf6b4450c477ac6e8349b10ad0896b198d88debeba6a195c15dfa25730e6965c") failures.push("Earlier protected diary records changed");
if (journalExclusions.length !== excludedIds.size) failures.push("Public diary exclusions are duplicated");
if (new Set(excludedJournalEntryIds).size !== excludedJournalEntryIds.length) failures.push("Duplicate public diary exclusions");
if (excludedJournalEntryIds.some((id) => ![...sourcePosts, ...chatPosts, ...chatPostsEnExtra].some((post) => post.id === id))) failures.push("Public diary exclusion id is stale");
if (new Set(ids).size !== ids.length) failures.push("Duplicate post ids");
if (sourcePosts.some((post, index) => index && `${post.date} ${post.time ?? ""}` < `${sourcePosts[index - 1].date} ${sourcePosts[index - 1].time ?? ""}`)) failures.push("Posts are not chronological");
if (sourcePosts.some((post) => post.date < "2025-02-01")) failures.push("Pre-vibe-coding records need a separate historical chapter");
if (siteConfig.latestJournalDate !== posts.at(-1)?.date) failures.push("latestJournalDate is stale");
if (channelPosts.at(-1)?.date !== "2026-08-27") failures.push("Channel diary tail changed");
if (channelPosts.at(-1)?.id !== 202608272142) failures.push("Latest user-supplied diary post is missing");
if (createHash("sha256").update(JSON.stringify(channelPosts.at(-1)?.paragraphs)).digest("hex") !== "396a5b41560f292fe6f78881e5d073151a15b770f465c7ae403faaba5b1a9973") failures.push("Latest user-supplied diary text changed");
if (/https:\s|\.\s+(?:com|org|io|dev)\b/iu.test(JSON.stringify(sourcePosts))) failures.push("A URL was damaged during cleanup");

if ((html.match(/data-entry data-entry-id=/gu) ?? []).length !== new Set(posts.map(({ date }) => date)).size) failures.push("Rendered day count differs");
if ((html.match(/<time datetime="\d{4}-\d{2}-\d{2}">/gu) ?? []).length !== new Set(posts.map(({ date }) => date)).size) failures.push("Rendered diary dates differ");
if (posts.some(({ id }) => !html.includes(`id="post-${id}"`))) failures.push("A diary permalink is missing");
if (/<time datetime="[^"]*T/u.test(html)) failures.push("Diary time remains visible");
if (/entry-footer|entry-source|copy-link|Скопировать ссылку|>Запись \d{3}</u.test(html)) failures.push("Diary entry controls or numbering remain");
if (/class="eyebrow"|journal-actions|journal-filters|data-journal-search|data-year-filter|data-clear-filter|data-filter-status/u.test(html)) failures.push("Redundant labels or journal controls remain");
if (/Начать с первой записи|Перейти к последней|Продолжить с места, где остановились/u.test(html)) failures.push("Redundant journal navigation remains");
if (/<header class="month-header"><p>/u.test(html)) failures.push("Monthly entry counts remain");
if (!html.includes("<h2 id=\"journal-title\">Дневник AI-native предпринимателя</h2>")) failures.push("Journal heading is missing");
if (/вайб-кодеров|вайбкодеров/u.test(`${html.slice(0, html.indexOf('<section class="journal"'))}${enHtml.slice(0, enHtml.indexOf('<section class="journal"'))}${aiHtml}${enAiHtml}${llms}`)) failures.push("Old 'vibe coders' naming remains outside the diary");
if (html.includes("Записи из канала и из закрытого чата") || html.includes("правлены только имена людей и город")) failures.push("Removed journal intro sentence remains");
if (/data-year-link|>Начало<|>Последняя запись</u.test(html)) failures.push("Extra journal navigation buttons remain");
if (!html.includes('class="journal-nav"') || !/\.journal-nav\s*\{[^}]*position:\s*sticky/u.test(css)) failures.push("Pinned journal navigation is missing");
if (/\.journal-nav\s*\{[^}]*overflow-x:\s*auto/u.test(css) || !html.includes('class="journal-nav-year"') || !enHtml.includes('class="journal-nav-year-label">2026<')) failures.push("Journal navigation must wrap by year instead of scrolling horizontally");
if (/journal-rail|journal-layout|mobile-month-picker/u.test(`${html}${css}`)) failures.push("Old side rail journal navigation remains");
if (!/\.journal-nav a\s*\{[^}]*min-height:\s*2\.75rem/u.test(css)) failures.push("Journal navigation targets are below 44px");
if (chatPosts.length < 20) failures.push("Closed-chat diary entries are missing");
if (html.includes('class="entry-origin"')) failures.push("Closed-chat badge remains in the rendered diary");
if (!html.includes("Хмм, за последние пару месяцев я потратил всю свою кровь до последней капли") || !html.includes("То бишь Kimi больше никакой работы не осталось") || !html.includes("Всем кто ведется на посты очкариков в одноклассниках и линкедине") || !html.includes("это sci-fi уровня &quot;Паровозика Томаса&quot;") || !html.includes("Как делать дизайн и UI, если вы вообще в нем ничего не понимаете") || !html.includes("чтобы он не превращал интерфейс в мультик")) failures.push("Latest user-supplied diary text is missing");
if (!html.includes("Вчера написал пост про страдания из-за того") || html.includes("[написал пост про страдания](") || html.includes("t.me/prompt_design")) failures.push("Personal Telegram link was not stripped from the diary");
// Ссылки остаются только на общеизвестные сервисы; личные посты, приглашения
// и партнёрские программы снимаются вместе с адресом.
const journalHtml = html.slice(html.indexOf('<section class="journal"'), html.indexOf("</main>"));
if (/https?:\/\/(?!(?:www\.)?(?:github\.com|youtube\.com|npmjs\.com|openai\.com|code\.claude\.com)\/)[^\s"<]+/u.test(journalHtml)) failures.push("A non-allowlisted link remains in the diary");
if (/x\.com\/|facebook\.com\/|yunwu\.ai\/register|invitation_code=|qiita\.com|therouter\.ai/u.test(html)) failures.push("Personal or affiliate links remain in the diary");
if (html.includes("Читайте, как опытные вайб-кодеры принимают решения")) failures.push("Old journal reading hook remains");
if (/Хроника людей, которые вайб-кодят по 16 часов в сутки|Хочу разобрать эту задачу|case-cta|automation_case_cta_click/u.test(`${html}${css}${app}`)) failures.push("Removed case CTA or old journal hook remains");
if (/sticky-cta|data-sticky-cta/u.test(html)) failures.push("Reading overlay remains");
if ((html.match(/<h1(?:\s|>)/gu) ?? []).length !== 1) failures.push("The page must contain exactly one H1");
if ((aiHtml.match(/<h1(?:\s|>)/gu) ?? []).length !== 1) failures.push("The AI page must contain exactly one H1");
if (!html.includes('name="viewport"')) failures.push("Viewport meta is missing");
if (!html.includes('<progress class="reading-progress" data-progress max="100" value="0" aria-hidden="true"></progress>') || !app.includes("progress.value = percent") || /progress\.style/u.test(app)) failures.push("CSP-safe reading progress is incomplete");
if (!css.includes("min(64ch, calc(100% - var(--page-gutter)))")) failures.push("Reading measure is missing");
if (!css.includes("1.1875rem")) failures.push("iPhone reading size is below 19px");
if (!css.includes("font-weight: 400")) failures.push("Regular reading weight is missing");
if (/font-size:[^;]*?(?<![\d.])(?:0\.[0-9]+|1(?:\.0[0-9]*)?)rem/u.test(css) || /font-size:\s*(?:[0-9]|1[0-7])px/u.test(css)) failures.push("Visible text below 18px remains");
if (!/body\s*\{[^}]*font-size:\s*1\.125rem/u.test(css)) failures.push("Base reading size is below 18px");
if (/font-weight:\s*(?:[5-9]00|bold)/u.test(css)) failures.push("Bold text remains");
if ((css.match(/font-family:/gu) ?? []).length !== 2 || !css.includes('--font-ui: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif') || !css.includes('--font-read: Charter, "Bitstream Charter", "Sitka Text", Cambria, "Iowan Old Style", Georgia, serif')) failures.push("Typography is not using the two native font stacks");
if (/@font-face|fonts\.googleapis|fonts\.gstatic/u.test(css) || /fonts\.googleapis|fonts\.gstatic/u.test(html)) failures.push("A downloaded web font was added");
if (!css.includes("--paper: #f7f4ec") || !css.includes("--journal-paper: #f7f4ec") || !css.includes("--ink: #202733")) failures.push("Long-reading palette is missing");
if (!css.includes("min-height: 2.75rem")) failures.push("44px interaction target is missing");
if (!html.includes(`<link rel="canonical" href="${siteConfig.siteUrl}/ru/">`) || !enHtml.includes(`<link rel="canonical" href="${siteConfig.siteUrl}/">`)) failures.push("Canonical domain is missing");
if (!html.includes(`<meta property="og:url" content="${siteConfig.siteUrl}/ru/">`) || !enHtml.includes(`<meta property="og:url" content="${siteConfig.siteUrl}/">`)) failures.push("Open Graph domain is missing");
if (!html.includes(`<meta property="og:image" content="${siteConfig.siteUrl}/og-image.png">`)) failures.push("Open Graph image is missing");
if (!html.includes('name="twitter:card" content="summary_large_image"')) failures.push("Twitter card is missing");
if (!html.includes('name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1"')) failures.push("Current robots preview directives are missing");
if (/name="keywords"/u.test(`${html}${aiHtml}`)) failures.push("Obsolete keywords metadata remains");
for (const [route, pageHtml] of [["/ru/", html], ["/ru/ai/", aiHtml], ["/", enHtml], ["/ai/", enAiHtml]]) {
  if ((pageHtml.match(/src="\/metrika\.js\?v=[a-f0-9]{12}"/gu) ?? []).length !== 1 || !pageHtml.includes("https://mc.yandex.ru/watch/111975649")) failures.push(`Yandex Metrika counter is incomplete on ${route}`);
}
if (!metrika.includes("https://mc.yandex.ru/metrika/tag.js?id=111975649") || !metrika.includes('ym(111975649,"init",{ssr:true,webvisor:true,clickmap:true,ecommerce:"dataLayer",referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true})')) failures.push("Yandex Metrika initializer is incomplete");
if (!html.includes('rel="manifest" href="/site.webmanifest"') || !html.includes('rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180"')) failures.push("Install and iPhone icon metadata is incomplete");
if (!html.includes('rel="alternate" href="/journal.json" type="application/json"') || !html.includes('rel="alternate" href="/llms.txt" type="text/plain"')) failures.push("AI resource discovery links are incomplete");
if (ogImage.readUInt32BE(16) !== 1200 || ogImage.readUInt32BE(20) !== 630) failures.push("Open Graph image dimensions are wrong");
if (!robots.includes(`Sitemap: ${siteConfig.siteUrl}/sitemap.xml`)) failures.push("Sitemap is missing from robots.txt");
if (!robots.includes("User-agent: OAI-SearchBot\nAllow: /") || !robots.includes("User-agent: ChatGPT-User\nAllow: /")) failures.push("OpenAI search and user-agent access is incomplete");
if (!sitemap.includes(`<loc>${siteConfig.siteUrl}/</loc>`)) failures.push("Production URL is missing from sitemap.xml");
if (!sitemap.includes(`<loc>${siteConfig.siteUrl}/ai/</loc>`) || !sitemap.includes(`<loc>${siteConfig.siteUrl}/ru/</loc>`) || !sitemap.includes(`<loc>${siteConfig.siteUrl}/ru/ai/</loc>`) || (sitemap.match(/hreflang="x-default"/gu) ?? []).length !== 4) failures.push("Localized pages are missing from sitemap.xml");
if (!html.includes('href="/ru/ai/">Для AI-агентов') || !enHtml.includes('href="/ai/">For AI agents')) failures.push("AI page discovery link is missing");
if (!aiHtml.includes("ainativemaker.com для AI-агентов") || !aiHtml.includes('href="/journal.json"') || !aiHtml.includes('href="/llms.txt"') || !aiHtml.includes("Как цитировать") || !aiHtml.includes("Структура journal.json")) failures.push("AI agent guide is incomplete");
if (html.includes("Что важно знать до заявки") || /class="faq"/u.test(`${html}${css}`)) failures.push("Removed FAQ block remains");

if (/\{\{[A-Z_]+\}\}/u.test(aiHtml)) failures.push("Unresolved AI page template token remains");
if (!llms.includes("Карта для AI-агентов") || !llms.includes("Публичная хронология JSON") || !llms.includes("Map for AI agents (English)") || !llms.includes("/journal.en.json")) failures.push("LLMS resource map is incomplete");
if (journalJson.count !== posts.length || journalJson.entries.length !== posts.length || journalJson.ordering !== "newest-first") failures.push("Journal JSON metadata differs from the public diary");
if (journalJson.entries.some((entry, index) => entry.id !== posts.toReversed()[index].id || entry.date !== posts.toReversed()[index].date || entry.url !== `${siteConfig.siteUrl}/ru/#post-${posts.toReversed()[index].id}` || JSON.stringify(entry.paragraphs) !== JSON.stringify(posts.toReversed()[index].paragraphs))) failures.push("Journal JSON content differs from the public diary");
if (webManifest.name !== "AI Native Maker" || webManifest.icons.length !== 3) failures.push("Web manifest is incomplete");
if (appleTouchIcon.readUInt32BE(16) !== 180 || appleTouchIcon.readUInt32BE(20) !== 180) failures.push("Apple touch icon dimensions are wrong");
if (!html.includes('class="button-journal"') || !css.includes(".button-journal")) failures.push("Prominent journal entry button is missing");
if (!/\.button-journal\s*\{[^}]*min-height:\s*3\.25rem/u.test(css)) failures.push("Journal button is smaller than the primary action");
if (/class="pricing"|price-steps/u.test(`${html}${css}`)) failures.push("Duplicated pricing block remains");
if (html.includes("Отказаться можно в любой день")) failures.push("Removed opt-out reassurance remains");
const publicDiaryText = posts.flatMap((post) => post.paragraphs).join("\n");
if (/Антох|Гладков|Кирилл|Новиков|Машк|Саян|Санек|Кост[ья]н?(?![\p{L}])|Ксюш|Наст[юя](?![\p{L}])|Кристин|Алинин|Лондон|Ноттинг|Строуфорд|Валь(?![\p{L}])/u.test(publicDiaryText)) failures.push("A personal name or home city remains in the public diary");
if (!/Сан-Франциско/u.test(publicDiaryText)) failures.push("Home city was not replaced with San Francisco");
for (const kept of ["Слава Богу", "Славы КПСС", "Николаев", "Прошка", "Альтман"]) {
  if (!publicDiaryText.includes(kept)) failures.push(`Public figure or model nickname was wrongly replaced: ${kept}`);
}
if (html.includes("Оставьте имя и выберите, куда ответить") || html.includes("вы успеете прочитать архив")) failures.push("Removed #join paragraphs remain");
if (!/h1,\s*h2,\s*h3,\s*h4,?\s*\{[^}]*font-weight:\s*200/u.test(css)) failures.push("Large headings are not using the extra-light weight");
if (!/\.hero h1\s*\{[^}]*font-weight:\s*200/u.test(css)) failures.push("Hero headline weight is not extra-light");
if (!/\.entry-body\s*\{[^}]*font-weight:\s*400/u.test(css)) failures.push("Diary body must remain regular for long reading");
if (html.includes("Сообщество об AI для тех, кто много")) failures.push("Old hero headline remains");
if (/Я складываю сюда модели, API, промпты, ошибки и деплои|hero-lead/u.test(`${html}${css}`)) failures.push("Removed hero lead remains");
if (/Посмотреть, что внутри|text-link|hero_tasks_click/u.test(`${html}${css}${app}`)) failures.push("Removed hero text link remains");
if (!css.includes("width: min(calc(100% - var(--page-gutter)), 87rem)")) failures.push("Safe responsive page gutters are missing");
if (!css.includes("--safe-inline: max(1.2rem, env(safe-area-inset-left), env(safe-area-inset-right))")) failures.push("iPhone safe-area gutters are missing");
if (!/\.button,\s*\n\s*\.button-journal\s*\{[^}]*width:\s*min\(20rem, calc\(100% - 2rem\)\)/u.test(css)) failures.push("Mobile CTA side gutters are missing");
if (!html.includes("brand-mark.svg") || !html.includes("AI Native Maker.com")) failures.push("New brand lockup is missing");
if (!html.includes('class="header-journal-link" href="#journal"') || !html.includes("Дневник AI-native предпринимателя")) failures.push("Journal header button is missing");
if (!brandMark.toString().startsWith("<svg") || !brandMark.toString().includes('viewBox="0 0 128 128"')) failures.push("Brand mark is invalid");
if (!css.includes("width: clamp(5.4rem, 9.6vw, 8.4rem)") || !css.includes("@keyframes header-journal-sheen")) failures.push("Brand header styling is incomplete");
if (html.includes("Банковская карта для первых")) failures.push("Unconfirmed card statement is visible");
if (/Read more|Показать полностью/iu.test(html)) failures.push("Diary text is collapsed");
if (/\{\{[A-Z_]+\}\}/u.test(html)) failures.push("Unresolved template token remains");
if (!/\/styles\.css\?v=[a-f0-9]{12}/u.test(html) || !/\/app\.js\?v=[a-f0-9]{12}/u.test(html)) failures.push("Versioned assets are missing");
if (!app.includes("IntersectionObserver")) failures.push("Journal position observer is missing");
if (!app.includes('localStorage.setItem("lastReadEntryId"')) failures.push("Reading continuation is missing");
for (const [route, page] of [["/", enHtml], ["/ru/", html], ["/ai/", enAiHtml], ["/ru/ai/", aiHtml]]) {
  const publicCopy = route === "/" || route === "/ru/" ? page.slice(0, page.indexOf('<section class="journal"')) + page.slice(page.indexOf("</main>")) : page;
  if (/community|комьюнит|сообществ|#join|data-lead-form|trial|пробн|membership|участия|monthly price/iu.test(publicCopy)) failures.push(`Community offer remains on ${route}`);
}
if (enHtml.includes("<form") || html.includes("<form")) failures.push("Lead form remains on a public page");
if (!enHtml.includes("AI-Native Founder's Diary") || !html.includes("Дневник AI-native предпринимателя")) failures.push("Diary title is missing");
if (enJournalJson.entries[0]?.date !== "2026-10-05" || !enHtml.includes('id="month-2026-10"')) failures.push("Latest October entries are missing");
if (!server.includes("appendFile(dataFile")) failures.push("Lead persistence is missing");
if (!server.includes('url.pathname === "/admin/api/leads"')) failures.push("Admin lead feed is missing");
if (!server.includes("ADMIN_PASSWORD_SHA256") || !server.includes("ainm_admin") || !server.includes('url.pathname === "/admin/login"') || !server.includes("lead-statuses.json") || !adminUi.includes("response.status===401") || !adminUi.includes("data-admin-notice")) failures.push("Admin authentication, recovery or lead statuses are incomplete");
if (!adminUi.includes("data-count-attention") || !adminUi.includes("data-follow-up") || !adminUi.includes("data-note") || !adminUi.includes("tg://resolve") || !adminUi.includes("whatsapp://send")) failures.push("Admin attention, follow-up, notes or native contact workflow is incomplete");
if (!nginx.includes("proxy_pass http://127.0.0.1:8787/api/leads")) failures.push("Nginx lead proxy is missing");
if (!nginx.includes("location ^~ /admin") || !nginx.includes("proxy_pass http://127.0.0.1:8787;")) failures.push("Protected admin proxy is missing");
if (!nginx.includes("try_files $uri $uri/ =404;") || nginx.includes("try_files $uri $uri/ /index.html;")) failures.push("Static routes still produce soft 404 responses");
if (!nginx.includes("script-src 'self' https://mc.yandex.ru") || !nginx.includes("https://mc.yandex.md") || !nginx.includes("https://yastatic.net") || !nginx.includes("connect-src 'self' https://mc.yandex.ru") || !nginx.includes("frame-src blob: https://mc.yandex.ru")) failures.push("Yandex Metrika CSP permissions are incomplete");
if (!agentRules.includes("Никогда не применять к хронологии навыки Anton, Gary, Bovari")) failures.push("Diary protection rule is missing");
if (!agentRules.includes("Никогда не располагать смысловой заголовок слева, а относящееся к нему описание справа")) failures.push("Mobile-first content order rule is missing");
if (!agentRules.includes("Основные CTA и кнопки отправки формы никогда не растягивать полосой на всю ширину")) failures.push("Compact CTA rule is missing");
if (!agentRules.includes("Крупные заголовки и название сайта могут использовать `font-weight: 200`")) failures.push("Extra-light heading rule is missing");
if (!agentRules.includes("Основной текст, кнопки, ссылки, подписи и текст дневника использовать с `font-weight: 400`")) failures.push("Regular-body rule is missing");

// Английская версия: главная и карта для агентов.
const enLandingHtml = enHtml.slice(0, enHtml.indexOf('<section class="journal"'));
const enPosts = sanitizePosts([...channelPosts, ...chatPosts.filter(({ id }) => !excludedIds.has(id)), ...chatPostsEnExtra.filter(({ id }) => !excludedIds.has(id))])
  .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? "") || a.id - b.id);
if (!enHtml.startsWith("<!doctype html>\n<html lang=\"en\">") || !enAiHtml.includes('<html lang="en">')) failures.push("English pages must declare lang=en");
if (!html.includes('<html lang="ru">')) failures.push("Russian page must declare lang=ru");
if ((enHtml.match(/<h1(?:\s|>)/gu) ?? []).length !== 1 || (enAiHtml.match(/<h1(?:\s|>)/gu) ?? []).length !== 1) failures.push("English pages must contain exactly one H1");
if (!enHtml.includes('<h2 id="journal-title">AI-Native Founder\'s Diary</h2>') || !enHtml.includes('class="header-journal-link" href="#journal" data-event="header_journal_click">AI-Native Founder\'s Diary</a>')) failures.push("English journal naming is missing");
if (!enHtml.includes('class="journal-translation-note"') || !enHtml.includes('href="/ru/#journal" hreflang="ru"')) failures.push("Translation notice with a link to the Russian original is missing");
if (!enHtml.includes('class="lang-switch" href="/ru/" hreflang="ru" lang="ru"') || !html.includes('class="lang-switch" href="/" hreflang="en" lang="en"')) failures.push("Language switch is missing");
for (const [route, page] of [["/", enHtml], ["/ai/", enAiHtml], ["/ru/", html], ["/ru/ai/", aiHtml]]) {
  if (!page.includes(`<link rel="alternate" hreflang="en" href="${siteConfig.siteUrl}${route.startsWith("/ru") ? route.slice(3) : route}">`) || !page.includes(`<link rel="alternate" hreflang="ru" href="${siteConfig.siteUrl}/ru${route.startsWith("/ru") ? route.slice(3) : route}">`) || !page.includes('hreflang="x-default"')) failures.push(`hreflang links are incomplete on ${route}`);
}
if (/[А-Яа-яЁё]/u.test(enLandingHtml.replace(/По-русски/gu, "").replace(/lang="ru"/gu, ""))) failures.push("Russian text remains in the English landing copy");
if (/[А-Яа-яЁё]/u.test(enAiHtml.replace(/По-русски/gu, ""))) failures.push("Russian text remains in the English AI page");
if ((enHtml.match(/data-entry data-entry-id=/gu) ?? []).length !== new Set(enPosts.map(({ date }) => date)).size) failures.push("English rendered day count differs");
if (enPosts.length !== posts.length || enPosts.some((post, index) => post.id !== posts[index].id)) failures.push("Language versions must contain the same selected entries");
if (chatPostsEnExtra.some((post) => post.date < "2026-09-01")) failures.push("Later additions must belong to the September update or later");
if (enPosts.some((post) => !translations[String(post.id)])) failures.push(`English translation is incomplete: ${enPosts.filter((post) => !translations[String(post.id)]).length} entries untranslated`);
if (enPosts.some((post) => translations[String(post.id)] && translations[String(post.id)].paragraphs.length !== post.paragraphs.length)) failures.push("Translation paragraph counts differ from the source");
if (/<article[^>]* lang="ru"/u.test(enHtml)) failures.push("Untranslated entries remain on the English page");
const enDiaryText = Object.values(translations).flatMap((entry) => entry.paragraphs).join("\n");
if (/[А-Яа-яЁё]{4,}/u.test(enDiaryText)) failures.push("Cyrillic words remain inside the English translation");
if (/Антох|Гладков|Кирилл|Новиков|Машк|Anton Gladkov|Gladkov/u.test(enDiaryText)) failures.push("A real name leaked into the English translation");
if (!/San Francisco/u.test(enDiaryText)) failures.push("Home city must read San Francisco in the English translation");
if (enJournalJson.language !== "en" || enJournalJson.sourceLanguage !== "ru" || enJournalJson.count !== enPosts.length || enJournalJson.entries.length !== enPosts.length || enJournalJson.ordering !== "newest-first") failures.push("English journal JSON metadata differs from the English diary");
if (enJournalJson.entries.some((entry, index) => entry.id !== enPosts.toReversed()[index].id || entry.date !== enPosts.toReversed()[index].date || entry.url !== `${siteConfig.siteUrl}/#post-${enPosts.toReversed()[index].id}` || JSON.stringify(entry.paragraphs) !== JSON.stringify(translations[String(entry.id)]?.paragraphs))) failures.push("English journal JSON entries differ from the translations");
if (journalJson.language !== "ru" || journalJson.alternate !== `${siteConfig.siteUrl}/journal.en.json` || enJournalJson.alternate !== `${siteConfig.siteUrl}/journal.json`) failures.push("Journal JSON files must point at each other");
if (!enAiHtml.includes("ainativemaker.com for AI agents") || !enAiHtml.includes('href="/journal.en.json"') || !enAiHtml.includes('href="/journal.json"') || !enAiHtml.includes("How to cite") || !enAiHtml.includes("Two languages")) failures.push("English AI agent guide is incomplete");
if (!aiHtml.includes("Две языковые версии") || !aiHtml.includes('href="/journal.en.json"')) failures.push("Russian AI agent guide does not mention the English version");
if (!server.includes('input?.lang === "en"') || !server.includes("Enter a contact for the reply.")) failures.push("Lead API errors are not localized");
if (!webManifest.lang || webManifest.lang !== "en") failures.push("Web manifest language is missing");
const enDocumentIds = new Set([...enHtml.matchAll(/\sid="([^"]+)"/gu)].map((match) => match[1]));
for (const match of enHtml.matchAll(/href="#([^"]+)"/gu)) {
  if (!enDocumentIds.has(match[1])) failures.push(`Broken English anchor: #${match[1]}`);
}

const documentIds = new Set([...html.matchAll(/\sid="([^"]+)"/gu)].map((match) => match[1]));
for (const match of html.matchAll(/href="#([^"]+)"/gu)) {
  if (!documentIds.has(match[1])) failures.push(`Broken anchor: #${match[1]}`);
}

if (failures.length) {
  console.error([...new Set(failures)].join("\n"));
  process.exit(1);
}

console.log(`Checks passed: ${posts.length} public posts (ru), ${enPosts.length} (en) (${channelPosts.length} из канала, ${posts.length - channelPosts.length} из чата), ${posts[0].date} → ${posts.at(-1).date}`);
