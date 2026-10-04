// Собирает английский перевод дневника из порций `src/content/diary-en/*.json`
// в один `src/content/diary.en.json`, который читает сборка. Ключ — id записи,
// значение — { paragraphs: [...] } с тем же числом абзацев, что в оригинале.
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const dir = "src/content/diary-en";
const merged = {};
for (const name of (await readdir(dir)).filter((file) => file.endsWith(".json")).sort()) {
  const batch = JSON.parse(await readFile(path.join(dir, name), "utf8"));
  for (const [id, entry] of Object.entries(batch)) {
    if (merged[id]) throw new Error(`Duplicate translation for ${id} in ${name}`);
    if (!Array.isArray(entry.paragraphs) || !entry.paragraphs.every((p) => typeof p === "string" && p.trim())) throw new Error(`Bad paragraphs for ${id} in ${name}`);
    merged[id] = { paragraphs: entry.paragraphs.map((p) => p.trim()) };
  }
}
const sorted = Object.fromEntries(Object.keys(merged).sort().map((id) => [id, merged[id]]));
await writeFile("src/content/diary.en.json", `${JSON.stringify(sorted, null, 2)}\n`);
console.log(`Merged ${Object.keys(sorted).length} translations`);
