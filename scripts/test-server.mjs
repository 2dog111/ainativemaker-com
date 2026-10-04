import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { adminCss, adminHtml, adminJs } from "../server/admin-ui.mjs";

assert.match(adminHtml, /data-count-attention/u);
assert.match(adminHtml, /data-filter="attention"/u);
assert.match(adminHtml, /data-follow-up/u);
assert.match(adminHtml, /data-note/u);
assert.match(adminJs, /tg:\/\/resolve/u);
assert.match(adminJs, /whatsapp:\/\/send/u);
assert.match(adminJs, /visibilitychange/u);
assert.match(adminCss, /horizontalOverflow|overflow-wrap|@media\(max-width:900px\)/u);

const directory = await mkdtemp(join(tmpdir(), "ainativemaker-server-"));
const dataFile = join(directory, "leads.jsonl");
const statusFile = join(directory, "lead-statuses.json");
const child = spawn(process.execPath, ["server/index.mjs"], {
  env: {
    ...process.env,
    HOST: "127.0.0.1",
    PORT: "0",
    DATA_FILE: dataFile,
    STATUS_FILE: statusFile,
    ADMIN_USER: "test-admin",
    ADMIN_PASSWORD_SHA256: createHash("sha256").update("test-password").digest("hex"),
    COOKIE_SECURE: "false",
    ALLOWED_ORIGINS: "http://localhost"
  },
  stdio: ["ignore", "pipe", "inherit"]
});

const port = await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error("Server startup timed out")), 5000);
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    const match = chunk.match(/:(\d+)/u);
    if (!match) return;
    clearTimeout(timeout);
    resolve(Number(match[1]));
  });
  child.once("exit", (code) => reject(new Error(`Server exited with ${code}`)));
});

const request = (path, options = {}) => fetch(`http://127.0.0.1:${port}${path}`, options);

try {
  const health = await request("/health");
  assert.equal(health.status, 200);

  const invalid = await request("/api/leads", { method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost" }, body: "{}" });
  assert.equal(invalid.status, 422);

  const created = await request("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost" },
    body: JSON.stringify({ name: "Тест", email: "test@example.com", contactMethod: "SMS", contact: "+79990000000", task: "Проверка", caseId: "excel-google-sheets" })
  });
  assert.equal(created.status, 201);
  const createdBody = await created.json();
  assert.equal(createdBody.ok, true);

  const stored = JSON.parse((await readFile(dataFile, "utf8")).trim());
  assert.equal(stored.name, "Тест");
  assert.equal(stored.contactMethod, "SMS");

  const unauthorized = await request("/admin/api/leads");
  assert.equal(unauthorized.status, 401);
  assert.equal(unauthorized.headers.get("www-authenticate"), null);

  const loginPage = await request("/admin/");
  assert.equal(loginPage.status, 200);
  assert.match(await loginPage.text(), /Вход в админку/u);

  const invalidLogin = await request("/admin/login", {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: "test-admin", password: "wrong" })
  });
  assert.equal(invalidLogin.status, 303);
  assert.equal(invalidLogin.headers.get("location"), "/admin/?error=1");

  const login = await request("/admin/login", {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: "test-admin", password: "test-password" })
  });
  assert.equal(login.status, 303);
  assert.equal(login.headers.get("location"), "/admin/");
  const adminCookie = login.headers.get("set-cookie").split(";", 1)[0];
  assert.match(adminCookie, /^ainm_admin=/u);

  const admin = await request("/admin/api/leads", { headers: { Cookie: adminCookie } });
  const adminBody = await admin.json();
  assert.equal(adminBody.leads.length, 1);
  assert.equal(adminBody.leads[0].status, "new");
  assert.equal(adminBody.leads[0].note, "");

  const metadata = await request(`/admin/api/leads/${createdBody.id}`, {
    method: "PATCH",
    headers: { Cookie: adminCookie, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "telegram", note: "Ответить после обеда", followUpAt: "2026-08-28T08:00:00.000Z" })
  });
  assert.equal(metadata.status, 200);
  const metadataBody = await metadata.json();
  assert.equal(metadataBody.lead.status, "telegram");
  assert.equal(metadataBody.lead.note, "Ответить после обеда");
  assert.equal(metadataBody.lead.followUpAt, "2026-08-28T08:00:00.000Z");

  const persistedMetadata = JSON.parse(await readFile(statusFile, "utf8"));
  assert.equal(persistedMetadata[createdBody.id].status, "telegram");
  assert.equal(persistedMetadata[createdBody.id].note, "Ответить после обеда");

  const updated = await request(`/admin/api/leads/${createdBody.id}/status`, {
    method: "PUT",
    headers: { Cookie: adminCookie, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "whatsapp" })
  });
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).status, "whatsapp");

  const refreshed = await request("/admin/api/leads", { headers: { Cookie: adminCookie } });
  const refreshedLead = (await refreshed.json()).leads[0];
  assert.equal(refreshedLead.status, "whatsapp");
  assert.equal(refreshedLead.note, "Ответить после обеда");

  const csv = await request("/admin/export.csv", { headers: { Cookie: adminCookie } });
  assert.match(await csv.text(), /test@example\.com.*whatsapp.*2026-08-28.*Ответить после обеда/su);
  const logout = await request("/admin/logout", { method: "POST", redirect: "manual", headers: { Cookie: adminCookie } });
  assert.equal(logout.status, 303);
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/u);
  console.log("Server tests passed: validation, storage, admin sessions, metadata, follow-up, notes and CSV");
} finally {
  child.kill("SIGTERM");
  await rm(directory, { recursive: true, force: true });
}
