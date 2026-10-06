import { readFile } from "node:fs/promises";
import { excludedJournalEntryIds, journalExclusions } from "../src/content/journal-exclusions.js";

const posts = JSON.parse(await readFile("src/content/diary.generated.json", "utf8"));
const chatPosts = JSON.parse(await readFile("src/content/chat-diary.generated.json", "utf8"));
const extraPosts = JSON.parse(await readFile("src/content/chat-diary.en-extra.generated.json", "utf8"));
const failures = [];
const ids = posts.map(({ id }) => id);
const bodies = posts.map(({ paragraphs }) => paragraphs.join("\n"));
const normalizedBodies = bodies.map((body) => body.normalize("NFKC").replace(/\s+/gu, " ").trim().toLocaleLowerCase("ru"));
const technicalPatterns = new Map([
  ["replacement character", /\uFFFD/u],
  ["control character", /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u],
  ["unpaired surrogate", /[\uD800-\uDFFF]/u],
  ["mojibake", /(?:Ã.|Â.|Ð.|Ñ.)/u],
  ["damaged URL", /https:\s|\.\s+(?:com|org|io|dev)\b/iu]
]);

console.log("Pass 1: technical integrity");
if (new Set(ids).size !== ids.length) failures.push("duplicate ids");
if (posts.some((post, index) => index && `${post.date} ${post.time ?? ""}` < `${posts[index - 1].date} ${posts[index - 1].time ?? ""}`)) failures.push("chronology is not sorted");
if (posts.some(({ paragraphs }) => !paragraphs.length || paragraphs.some((paragraph) => !paragraph.trim()))) failures.push("empty paragraph");
if (new Set(normalizedBodies).size !== normalizedBodies.length) failures.push("duplicate bodies");
for (const [label, pattern] of technicalPatterns) {
  const affected = posts.filter((_, index) => pattern.test(bodies[index])).map(({ id }) => id);
  if (affected.length) failures.push(`${label}: ${affected.join(", ")}`);
}
console.log(`Checked ${posts.length} source records: ids, order, paragraphs, duplicates, Unicode and URLs`);

console.log("Pass 2: public exclusions");
if (new Set(excludedJournalEntryIds).size !== excludedJournalEntryIds.length) failures.push("duplicate exclusion ids");
for (const exclusion of journalExclusions) {
  if (![...posts, ...chatPosts, ...extraPosts].some(({ id }) => id === exclusion.id)) failures.push(`missing excluded id ${exclusion.id}`);
  if (!exclusion.reason.trim()) failures.push(`missing reason for ${exclusion.id}`);
}
console.log(journalExclusions.map(({ id, reason }) => `${id}: ${reason}`).join("\n"));
console.log(`Public corpus: ${[...posts, ...chatPosts, ...extraPosts].filter(({ id }) => !excludedJournalEntryIds.includes(id)).length} records per language`);

if (failures.length) {
  console.error([...new Set(failures)].join("\n"));
  process.exit(1);
}

console.log("Diary audit passed twice");
