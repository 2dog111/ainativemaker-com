import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { cleanText } from "./lib/clean-text.mjs";

const sourceRoot = "/Users/sergeiriazanov/antropic/GladkovChanel/razbor-kanala";
const outputPath = path.resolve("src/content/diary.generated.json");
const manifestPath = path.resolve("build/diary-manifest.json");
const startDate = "2026-03-01";
const endDate = "2026-08-31";
const excludedFiles = new Set(["README.md", "INDEX.md", "KONSPEKT.md"]);
const excludedFolders = new Set(["99-musor"]);
const primaryFolder = "05-instrumenty-i-agenty";
const explicitTopicPattern = /вайб.?код|вайбдроч|vibe.?cod|навайб/iu;

function parsePost(markdown, fileName, relativePath) {
  const match = fileName.match(/^(\d+)-(\d{4}-\d{2}-\d{2})-/u);
  if (!match) return null;
  const [, rawId, date] = match;
  if (date < startDate || date > endDate) return null;
  const headerMatch = markdown.match(/^#\s+\d+\s+·\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/u);
  const sourceLink = markdown.match(/\[Пост в канале\]\((https?:\/\/[^)]+)\)/u)?.[1] ?? null;
  const body = markdown.split("\n---\n", 2)[1]?.trim() ?? "";
  if (!body || body.length < 80) return null;
  const { text, edits } = cleanText(body);
  return {
    id: Number(rawId),
    date: headerMatch?.[1] ?? date,
    time: headerMatch?.[2] ?? null,
    paragraphs: text.split(/\n{2,}/u).filter(Boolean),
    sourceLink,
    sourceFile: relativePath,
    originalSha256: createHash("sha256").update(body).digest("hex"),
    edits
  };
}

const folders = (await readdir(sourceRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && !excludedFolders.has(entry.name))
  .map((entry) => entry.name)
  .sort();

const posts = [];
for (const folder of folders) {
  const folderPath = path.join(sourceRoot, folder);
  const files = (await readdir(folderPath)).filter((name) => name.endsWith(".md") && !excludedFiles.has(name)).sort();
  for (const fileName of files) {
    const relativePath = path.join(folder, fileName);
    const markdown = await readFile(path.join(folderPath, fileName), "utf8");
    const body = markdown.split("\n---\n", 2)[1]?.trim() ?? "";
    const cyrillicWords = body.match(/[А-Яа-яЁё]{2,}/gu)?.length ?? 0;
    const isNarrativeToolPost = folder === primaryFolder && cyrillicWords >= 20;
    const isExplicitVibePost = explicitTopicPattern.test(body);
    explicitTopicPattern.lastIndex = 0;
    if (!isNarrativeToolPost && !isExplicitVibePost) continue;
    const post = parsePost(markdown, fileName, relativePath);
    if (post) posts.push(post);
  }
}

posts.sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? "") || a.id - b.id);

const seen = new Set();
const uniquePosts = posts.filter((post) => {
  if (seen.has(post.id)) return false;
  seen.add(post.id);
  return true;
});

const publicPosts = uniquePosts.map(({ sourceFile, originalSha256, edits, ...post }, index) => ({
  ...post,
  number: index + 1
}));
const manifest = uniquePosts.map(({ id, date, time, sourceFile, originalSha256, edits }) => ({
  id,
  date,
  time,
  sourceFile,
  originalSha256,
  edits
}));

await mkdir(path.dirname(outputPath), { recursive: true });
await mkdir(path.dirname(manifestPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(publicPosts, null, 2)}\n`);
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Imported ${publicPosts.length} posts from ${publicPosts[0]?.date} to ${publicPosts.at(-1)?.date}`);
