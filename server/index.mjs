import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import http from "node:http";
import { adminCss as redesignedAdminCss, adminHtml as redesignedAdminHtml, adminJs as redesignedAdminJs, loginHtml as redesignedLoginHtml } from "./admin-ui.mjs";

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 8787);
const dataFile = process.env.DATA_FILE || "/var/lib/ainativemaker/leads.jsonl";
const statusFile = process.env.STATUS_FILE || "/var/lib/ainativemaker/lead-statuses.json";
const adminUser = process.env.ADMIN_USER || "";
const adminPasswordSha256 = process.env.ADMIN_PASSWORD_SHA256 || "";
const allowedOrigins = new Set((process.env.ALLOWED_ORIGINS || "https://ainativemaker.com").split(",").map((value) => value.trim()).filter(Boolean));
const rateWindowMs = 15 * 60 * 1000;
const rateLimit = 6;
const rateBuckets = new Map();
const loginRateBuckets = new Map();
const adminSessionSeconds = 12 * 60 * 60;
const secureCookie = process.env.COOKIE_SECURE !== "false";
let statusWrites = Promise.resolve();

const sendJson = (response, status, payload) => {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(payload));
};

const clean = (value, max) => String(value ?? "").trim().slice(0, max);
const hash = (value) => createHash("sha256").update(value).digest("hex");
const equal = (left, right) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

const adminSessionSignature = (payload) => createHmac("sha256", adminPasswordSha256).update(payload).digest("base64url");

const createAdminSession = () => {
  const payload = Buffer.from(JSON.stringify({ user: adminUser, expiresAt: Date.now() + adminSessionSeconds * 1000 })).toString("base64url");
  return `${payload}.${adminSessionSignature(payload)}`;
};

const readCookie = (request, name) => String(request.headers.cookie || "").split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) || "";

const isAdmin = (request) => {
  if (!adminUser || !adminPasswordSha256) return false;
  const [payload, signature] = readCookie(request, "ainm_admin").split(".");
  if (!payload || !signature || !equal(signature, adminSessionSignature(payload))) return false;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return equal(String(session.user || ""), adminUser) && Number(session.expiresAt) > Date.now();
  } catch {
    return false;
  }
};

const requireAdmin = (request, response) => {
  if (isAdmin(request)) return true;
  sendJson(response, 401, { error: "Требуется вход." });
  return false;
};

const readBody = (request) => new Promise((resolve, reject) => {
  let body = "";
  request.setEncoding("utf8");
  request.on("data", (chunk) => {
    body += chunk;
    if (Buffer.byteLength(body) > 16_384) {
      reject(Object.assign(new Error("Payload too large"), { status: 413 }));
      request.destroy();
    }
  });
  request.on("end", () => resolve(body));
  request.on("error", reject);
});

const readLeads = async () => {
  try {
    const content = await readFile(dataFile, "utf8");
    return content.split("\n").filter(Boolean).map((line) => JSON.parse(line));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
};

const readStatuses = async () => {
  try {
    return JSON.parse(await readFile(statusFile, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
};

const normalizeLeadMeta = (value) => {
  if (typeof value === "string") return { status: value, note: "", followUpAt: "", updatedAt: "" };
  if (!value || typeof value !== "object" || Array.isArray(value)) return { status: "new", note: "", followUpAt: "", updatedAt: "" };
  return {
    status: ["new", "telegram", "whatsapp", "deal"].includes(value.status) ? value.status : "new",
    note: clean(value.note, 2000),
    followUpAt: clean(value.followUpAt, 40),
    updatedAt: clean(value.updatedAt, 40)
  };
};

const validateLeadMeta = (input) => {
  const status = clean(input.status, 20);
  const note = clean(input.note, 2000);
  const followUpAt = clean(input.followUpAt, 40);
  if (!["new", "telegram", "whatsapp", "deal"].includes(status)) return { error: "Неизвестный статус." };
  if (followUpAt && Number.isNaN(Date.parse(followUpAt))) return { error: "Проверьте дату следующего действия." };
  return { meta: { status, note, followUpAt, updatedAt: new Date().toISOString() } };
};

const writeStatuses = async (statuses) => {
  await mkdir(dirname(statusFile), { recursive: true, mode: 0o700 });
  const temporaryFile = `${statusFile}.${process.pid}.tmp`;
  await writeFile(temporaryFile, `${JSON.stringify(statuses)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporaryFile, statusFile);
};

const updateLeadMeta = (leadId, nextMeta) => {
  statusWrites = statusWrites.then(async () => {
    const statuses = await readStatuses();
    statuses[leadId] = nextMeta;
    await writeStatuses(statuses);
  });
  return statusWrites;
};

const allowRequest = (request) => {
  const key = clean(request.headers["x-forwarded-for"]?.split(",")[0] || request.socket.remoteAddress || "unknown", 80);
  const now = Date.now();
  const bucket = rateBuckets.get(key) || [];
  const current = bucket.filter((time) => now - time < rateWindowMs);
  if (current.length >= rateLimit) return false;
  current.push(now);
  rateBuckets.set(key, current);
  return true;
};

const allowAdminLogin = (request) => {
  const key = clean(request.headers["x-forwarded-for"]?.split(",")[0] || request.socket.remoteAddress || "unknown", 80);
  const now = Date.now();
  const bucket = loginRateBuckets.get(key) || [];
  const current = bucket.filter((time) => now - time < rateWindowMs);
  if (current.length >= 10) return false;
  current.push(now);
  loginRateBuckets.set(key, current);
  return true;
};

// Ошибки формы отдаются на языке страницы: английская главная шлёт
// `lang: "en"`, русская `/ru/` — `"ru"`. Язык сохраняется в заявке, чтобы в
// админке было видно, откуда пришёл человек.
const leadMessages = {
  ru: {
    name: "Укажите имя.",
    contact: "Укажите контакт для ответа.",
    method: "Выберите Telegram, WhatsApp или SMS.",
    email: "Проверьте email или оставьте поле пустым.",
    origin: "Источник запроса не разрешён.",
    json: "Ожидается JSON.",
    rate: "Слишком много попыток. Попробуйте позже или напишите в Telegram."
  },
  en: {
    name: "Enter your name.",
    contact: "Enter a contact for the reply.",
    method: "Choose Telegram, WhatsApp or SMS.",
    email: "Check the email address or leave the field empty.",
    origin: "Request origin is not allowed.",
    json: "JSON expected.",
    rate: "Too many attempts. Try again later or message me on Telegram."
  }
};
const leadLang = (input) => (input?.lang === "en" ? "en" : "ru");

const validateLead = (input) => {
  const t = leadMessages[leadLang(input)];
  const lead = {
    name: clean(input.name, 80),
    email: clean(input.email, 254),
    contactMethod: clean(input.contactMethod, 20),
    contact: clean(input.contact, 100),
    task: clean(input.task, 1000),
    caseId: clean(input.caseId, 80),
    lang: leadLang(input)
  };
  if (!lead.name) return { error: t.name };
  if (!lead.contact) return { error: t.contact };
  if (!["Telegram", "WhatsApp", "SMS"].includes(lead.contactMethod)) return { error: t.method };
  if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(lead.email)) return { error: t.email };
  return { lead };
};

const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

  try {
    if (request.method === "GET" && url.pathname === "/health") return sendJson(response, 200, { ok: true });

    if (request.method === "POST" && url.pathname === "/api/leads") {
      const origin = request.headers.origin;
      // Язык ошибки до разбора тела берём из Referer: с `/ru/` — русский.
      const refererLang = String(request.headers.referer || "").includes("/ru/") ? "ru" : "en";
      const early = leadMessages[refererLang];
      if (!origin || !allowedOrigins.has(origin)) return sendJson(response, 403, { error: early.origin });
      if (!String(request.headers["content-type"] || "").startsWith("application/json")) return sendJson(response, 415, { error: early.json });
      if (!allowRequest(request)) return sendJson(response, 429, { error: early.rate });
      const input = JSON.parse(await readBody(request));
      if (clean(input.website, 200)) return sendJson(response, 200, { ok: true });
      const validation = validateLead(input);
      if (validation.error) return sendJson(response, 422, { error: validation.error });
      const record = { id: randomUUID(), createdAt: new Date().toISOString(), ...validation.lead };
      await mkdir(dirname(dataFile), { recursive: true, mode: 0o700 });
      await appendFile(dataFile, `${JSON.stringify(record)}\n`, { encoding: "utf8", mode: 0o600 });
      return sendJson(response, 201, { ok: true, id: record.id });
    }

    if (request.method === "GET" && url.pathname === "/admin/styles.css") {
      response.writeHead(200, { "Content-Type": "text/css; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
      return response.end(redesignedAdminCss);
    }

    if (request.method === "POST" && url.pathname === "/admin/login") {
      if (!allowAdminLogin(request)) return sendJson(response, 429, { error: "Слишком много попыток. Попробуйте позже." });
      if (!String(request.headers["content-type"] || "").startsWith("application/x-www-form-urlencoded")) return sendJson(response, 415, { error: "Неверный формат формы." });
      const input = new URLSearchParams(await readBody(request));
      const validUser = equal(clean(input.get("username"), 80), adminUser);
      const validPassword = equal(hash(String(input.get("password") || "")), adminPasswordSha256);
      if (!adminUser || !adminPasswordSha256 || !validUser || !validPassword) {
        response.writeHead(303, { Location: "/admin/?error=1", "Cache-Control": "no-store" });
        return response.end();
      }
      response.writeHead(303, {
        Location: "/admin/",
        "Cache-Control": "no-store",
        "Set-Cookie": `ainm_admin=${createAdminSession()}; Path=/admin; Max-Age=${adminSessionSeconds}; HttpOnly;${secureCookie ? " Secure;" : ""} SameSite=Strict`
      });
      return response.end();
    }

    if (request.method === "POST" && url.pathname === "/admin/logout") {
      response.writeHead(303, { Location: "/admin/", "Cache-Control": "no-store", "Set-Cookie": "ainm_admin=; Path=/admin; Max-Age=0; HttpOnly; Secure; SameSite=Strict" });
      return response.end();
    }

    if (request.method === "GET" && (url.pathname === "/admin" || url.pathname === "/admin/")) {
      if (!isAdmin(request)) {
        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Frame-Options": "DENY", "X-Content-Type-Options": "nosniff" });
        return response.end(redesignedLoginHtml(url.searchParams.get("error") === "1"));
      }
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Frame-Options": "DENY", "X-Content-Type-Options": "nosniff" });
      return response.end(redesignedAdminHtml);
    }

    if (url.pathname.startsWith("/admin") && !requireAdmin(request, response)) return;

    if (request.method === "GET" && url.pathname === "/admin/app.js") {
      response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
      return response.end(redesignedAdminJs);
    }

    if (request.method === "GET" && url.pathname === "/admin/api/leads") {
      const statuses = await readStatuses();
      const leads = (await readLeads()).reverse().map((lead) => ({ ...lead, ...normalizeLeadMeta(statuses[lead.id]) }));
      return sendJson(response, 200, { leads });
    }

    const leadRoute = url.pathname.match(/^\/admin\/api\/leads\/([^/]+)$/u);
    if (request.method === "PATCH" && leadRoute) {
      if (!String(request.headers["content-type"] || "").startsWith("application/json")) return sendJson(response, 415, { error: "Ожидается JSON." });
      const leadId = decodeURIComponent(leadRoute[1]);
      const lead = (await readLeads()).find((item) => item.id === leadId);
      if (!lead) return sendJson(response, 404, { error: "Заявка не найдена." });
      const validation = validateLeadMeta(JSON.parse(await readBody(request)));
      if (validation.error) return sendJson(response, 422, { error: validation.error });
      await updateLeadMeta(leadId, validation.meta);
      return sendJson(response, 200, { ok: true, lead: { ...lead, ...validation.meta } });
    }

    const statusRoute = url.pathname.match(/^\/admin\/api\/leads\/([^/]+)\/status$/u);
    if (request.method === "PUT" && statusRoute) {
      if (!String(request.headers["content-type"] || "").startsWith("application/json")) return sendJson(response, 415, { error: "Ожидается JSON." });
      const status = clean(JSON.parse(await readBody(request)).status, 20);
      if (!["new", "telegram", "whatsapp", "deal"].includes(status)) return sendJson(response, 422, { error: "Неизвестный статус." });
      const leadId = decodeURIComponent(statusRoute[1]);
      if (!(await readLeads()).some((lead) => lead.id === leadId)) return sendJson(response, 404, { error: "Заявка не найдена." });
      const statuses = await readStatuses();
      await updateLeadMeta(leadId, { ...normalizeLeadMeta(statuses[leadId]), status, updatedAt: new Date().toISOString() });
      return sendJson(response, 200, { ok: true, status });
    }

    if (request.method === "GET" && url.pathname === "/admin/export.csv") {
      const statuses = await readStatuses();
      const leads = (await readLeads()).map((lead) => ({ ...lead, ...normalizeLeadMeta(statuses[lead.id]) }));
      const columns = ["createdAt", "name", "contactMethod", "contact", "email", "task", "caseId", "status", "followUpAt", "note", "updatedAt"];
      const csv = [`${columns.join(",")}`, ...leads.map((lead) => columns.map((column) => csvCell(lead[column])).join(","))].join("\n");
      response.writeHead(200, { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=ainativemaker-leads.csv", "Cache-Control": "no-store" });
      return response.end(`\ufeff${csv}`);
    }

    sendJson(response, 404, { error: "Не найдено." });
  } catch (error) {
    if (error instanceof SyntaxError) return sendJson(response, 400, { error: "Некорректный JSON." });
    sendJson(response, error.status || 500, { error: "Не удалось обработать запрос." });
  }
});

server.listen(port, host, () => {
  const address = server.address();
  console.log(`ainativemaker-leads listening on ${address.address}:${address.port}`);
});
