// Импорт отобранных записей закрытого чата в публичную хронологию.
//
// Дословный текст берётся из локального корпуса; здесь нет ни редактуры,
// ни пересказа — только та же чистка, что и у записей канала.
// Список записей задаётся в src/content/chat-diary-selection.js.

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cleanText } from "./lib/clean-text.mjs";
import { chatDiarySelection as ruSelection } from "../src/content/chat-diary-selection.js";
import { chatDiarySelectionEn } from "../src/content/chat-diary-selection.en.js";

// Две цели импорта: общий русский дневник и записи только для английской
// версии (`--en-extra`). Русская хронология с 21.09.2026 заморожена, поэтому
// новые записи идут отдельным файлом и не трогают защищённый json.
const enExtra = process.argv.includes("--en-extra");
const chatDiarySelection = enExtra ? chatDiarySelectionEn : ruSelection;

const corpusRoot = process.env.ANTON_CORPUS_ROOT ?? "/Users/sergeiriazanov/Documents/ChatGPT/Anton-All-Text-30-08-26";
const unitsPath = path.join(corpusRoot, "тредовые-диалоги", "units.json");
const outputPath = path.resolve(enExtra ? "src/content/chat-diary.en-extra.generated.json" : "src/content/chat-diary.generated.json");
const manifestPath = path.resolve(enExtra ? "build/chat-diary-en-extra-manifest.json" : "build/chat-diary-manifest.json");
let preservedManifest = [];
let preservedPublic = [];
if (enExtra) {
  try {
    preservedManifest = JSON.parse(await readFile(manifestPath, "utf8"));
    preservedPublic = JSON.parse(await readFile(outputPath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (preservedManifest.length !== preservedPublic.length || preservedManifest.some(({ id }, index) => id !== preservedPublic[index].id)) {
    throw new Error("Existing English diary and its source manifest do not match");
  }
}
const preservedUnitIds = new Set(preservedManifest.map(({ unitId }) => unitId));

const units = JSON.parse(await readFile(unitsPath, "utf8"));
const byId = new Map(units.map((unit) => [unit.unit_id, unit]));

// Сообщения закрытого чата по одному — реестр корпуса, который докачивается из
// панели tgwebparser (`CHAT-EVENTS.md` корпуса). Подряд идущие сообщения автора
// склеиваются в блок: в чате мысль идёт очередью коротких сообщений, и разрыв
// в двадцать минут — граница между разными разговорами. Блок называется по
// первому сообщению: `tgw-<msg_id>`.
const eventsPath = path.join(corpusRoot, "проверка-и-реестры", "chat-events", "events.jsonl");
const blockGapSeconds = 20 * 60;
const freshBlocks = new Map();
const messages = [];
for (const line of (await readFile(eventsPath, "utf8")).split("\n")) {
  if (!line.trim()) continue;
  const event = JSON.parse(line);
  const current = event.versions.find((version) => version.version_id === event.current_version);
  messages.push({
    msg_id: event.message_id,
    date: Date.parse(event.date_utc) / 1000,
    link: event.source_link,
    text: current.characters ? await readFile(path.join(corpusRoot, current.text_file), "utf8") : ""
  });
}
{
  let block = null;
  for (const message of messages.sort((a, b) => a.date - b.date)) {
    const text = (message.text ?? "").trim();
    if (!block || message.date - block.lastDate > blockGapSeconds) {
      block = { id: `tgw-${message.msg_id}`, date: message.date, lastDate: message.date, lines: [], link: message.link };
      freshBlocks.set(block.id, block);
    }
    block.lastDate = message.date;
    if (text) block.lines.push({ msgId: message.msg_id, date: message.date, text });
  }
}

const formatMoscow = (unix) => {
  const local = new Date(unix * 1000);
  const pad = (value) => String(value).padStart(2, "0");
  return [
    `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}`,
    `${pad(local.getHours())}:${pad(local.getMinutes())}`
  ];
};

const normalize = (value) => value.replace(/\s+/gu, " ").trim();

const entries = [...preservedPublic];
for (const { unitId, note, startMsgId, endMsgId } of chatDiarySelection.filter(({ unitId }) => !preservedUnitIds.has(unitId))) {
  if (unitId.startsWith("tgw-")) {
    const block = freshBlocks.get(unitId);
    if (!block) throw new Error(`Block ${unitId} is missing from the corpus chat events`);
    // Склейка по паузе иногда прихватывает хвост другого разговора; `endMsgId`
    // обрезает блок по последнему сообщению мысли. Текст внутри не меняется.
    const lines = block.lines.filter(({ msgId }) => (!startMsgId || msgId >= startMsgId) && (!endMsgId || msgId <= endMsgId));
    if (startMsgId && lines[0]?.msgId !== startMsgId) throw new Error(`Block ${unitId}: startMsgId ${startMsgId} is missing`);
    if (endMsgId && lines.at(-1)?.msgId !== endMsgId) throw new Error(`Block ${unitId}: endMsgId ${endMsgId} is missing`);
    const body = lines.map(({ text }) => text).join("\n").trim();
    if (!body) throw new Error(`Block ${unitId} is empty`);
    const { text, edits } = enExtra
      ? { text: body.normalize("NFC").replace(/\r\n?/g, "\n").trim(), edits: [] }
      : cleanText(body);
    const [date, time] = formatMoscow(lines[0].date);
    entries.push({
      id: Number(`${date.replaceAll("-", "")}${time.replace(":", "")}`),
      date,
      time,
      paragraphs: text.split(/\n+/u).map((line) => line.trim()).filter(Boolean),
      sourceLink: null,
      origin: "chat",
      unitId,
      note,
      originalSha256: createHash("sha256").update(body).digest("hex"),
      edits
    });
    continue;
  }

  const unit = byId.get(unitId);
  if (!unit) throw new Error(`Unit ${unitId} is missing from the corpus`);
  const verbatimFile = unit.reading_file || unit.author_file;
  if (!verbatimFile || !unit.context_file) throw new Error(`Unit ${unitId} has no verbatim text file`);

  // Дословный текст берём из контекстного файла: там подряд идущие сообщения
  // чата сохранены каждое своей строкой. Это единственная разница с плоским
  // файлом ответа — слова, порядок и пунктуация те же, что проверяет сверка ниже.
  const context = await readFile(path.join(corpusRoot, unit.context_file), "utf8");
  const answer = context.split(/^## Ответ Антона\s*$/mu)[1];
  if (!answer) throw new Error(`Unit ${unitId} has no answer section`);
  const body = answer.split(/^## /mu)[0].split(/^---\s*$/mu)[0].trim();
  const flat = (await readFile(path.join(corpusRoot, verbatimFile), "utf8")).trim();
  if (!body) throw new Error(`Unit ${unitId} is empty`);
  if (normalize(body) !== normalize(flat)) throw new Error(`Unit ${unitId}: context text differs from the verbatim answer`);

  const { text, edits } = cleanText(body);
  const [date, time] = unit.date.split(" ");
  entries.push({
    id: Number(`${date.replaceAll("-", "")}${time.replace(":", "")}`),
    date,
    time,
    paragraphs: text.split(/\n+/u).map((line) => line.trim()).filter(Boolean),
    sourceLink: null,
    origin: "chat",
    unitId,
    note,
    originalSha256: createHash("sha256").update(body).digest("hex"),
    edits
  });
}

entries.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

const ids = new Set();
for (const entry of entries) {
  if (ids.has(entry.id)) throw new Error(`Duplicate generated id ${entry.id}`);
  ids.add(entry.id);
}

const publicEntries = entries.map(({ unitId, note, originalSha256, edits, ...entry }) => entry);
const manifest = [...preservedManifest, ...entries.filter(({ unitId }) => unitId).map(({ id, date, time, unitId, note, originalSha256, edits }) => ({
  id,
  date,
  time,
  unitId,
  note,
  originalSha256,
  edits
}))].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

await mkdir(path.dirname(manifestPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(publicEntries, null, 2)}\n`);
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Imported ${publicEntries.length} chat entries from ${publicEntries[0]?.date} to ${publicEntries.at(-1)?.date}`);
