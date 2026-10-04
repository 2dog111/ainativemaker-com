// Служебный дамп публикуемого русского текста дневника для перевода:
// те же записи и та же очистка, что в сборке, порциями по N записей.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { excludedJournalEntryIds } from "../src/content/journal-exclusions.js";
import { sanitizePosts } from "./lib/sanitize-diary.mjs";

const out = process.argv[2];
const size = Number(process.argv[3] ?? 10);
const sourcePosts = JSON.parse(await readFile("src/content/diary.generated.json", "utf8"));
const chatPosts = JSON.parse(await readFile("src/content/chat-diary.generated.json", "utf8"));
const extra = JSON.parse(await readFile("src/content/chat-diary.en-extra.generated.json", "utf8"));
const excluded = new Set(excludedJournalEntryIds);
const posts = sanitizePosts([...sourcePosts.filter(({ id }) => !excluded.has(id)), ...chatPosts, ...extra])
  .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? "") || a.id - b.id);
await mkdir(out, { recursive: true });
for (let i = 0; i < posts.length; i += size) {
  const batch = posts.slice(i, i + size);
  const text = batch.map((post) => `### ${post.id} | ${post.date} | ${post.paragraphs.length} paragraphs\n\n${post.paragraphs.map((p, k) => `[${k + 1}] ${p}`).join("\n\n")}`).join("\n\n\n");
  await writeFile(`${out}/batch-${String(i / size + 1).padStart(2, "0")}.txt`, text);
}
console.log(posts.length, "posts,", Math.ceil(posts.length / size), "batches");
