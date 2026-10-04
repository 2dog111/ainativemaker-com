import { readFile } from "node:fs/promises";
import { siteConfig } from "../src/config/site.js";

const posts = [
  ...JSON.parse(await readFile("src/content/diary.generated.json", "utf8")),
  ...JSON.parse(await readFile("src/content/chat-diary.generated.json", "utf8"))
];

const requireString = (value, path) => {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${path} must be a non-empty string`);
};

for (const key of ["brandName", "siteUrl", "communityUrl", "communityHandle", "currency", "latestJournalDate"]) requireString(siteConfig[key], `siteConfig.${key}`);
for (const key of ["trialDays", "monthlyPrice"]) {
  if (!Number.isFinite(siteConfig[key]) || siteConfig[key] <= 0) throw new TypeError(`siteConfig.${key} must be a positive number`);
}

for (const [index, post] of posts.entries()) {
  if (!Number.isInteger(post.id)) throw new TypeError(`posts[${index}].id must be an integer`);
  requireString(post.date, `posts[${index}].date`);
  if (!Array.isArray(post.paragraphs) || !post.paragraphs.length) throw new TypeError(`posts[${index}].paragraphs must be a non-empty array`);
}

console.log(`Typecheck passed: ${posts.length} posts`);
