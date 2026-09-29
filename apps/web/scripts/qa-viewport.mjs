// Quick Chromium viewport audit for public pages. Requires a local Next server.
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";

const edge = process.env.EDGE_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const profile = await mkdtemp(join(tmpdir(), "sapa-viewport-"));
const output = await mkdtemp(join(tmpdir(), "sapa-screens-"));
const port = 9333 + Math.floor(Math.random() * 1000);
const browser = spawn(edge, ["--headless=new", "--disable-gpu", "--no-first-run", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
const testUsers = [];
dotenv.config({ path: join(fileURLToPath(new URL("..", import.meta.url)), ".env.local"), quiet: true });
const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

async function api(path, body, token) {
  const response = await fetch(`http://localhost:3000${path}`, {
    method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
  return response.json();
}

async function waitForTab() {
  for (let attempt = 0; attempt < 200; attempt++) {
    if (browser.exitCode !== null) throw new Error(`Edge exited early with code ${browser.exitCode}.`);
    try {
      const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const tab = tabs.find((item) => item.type === "page");
      if (tab) return tab.webSocketDebuggerUrl;
    } catch { /* Edge is starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("Edge DevTools did not start.");
}

try {
  const url = await waitForTab();
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    if (message.error) entry.reject(new Error(message.error.message));
    else entry.resolve(message.result);
  });
  function command(method, params = {}) {
    const id = ++nextId;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  await command("Page.enable");
  await command("Network.enable");
  async function capture(page, width) {
    await command("Emulation.setDeviceMetricsOverride", { width, height: 800, deviceScaleFactor: 1, mobile: width < 768 });
    await command("Page.navigate", { url: `http://localhost:3000/${page}` });
    await new Promise((resolve) => setTimeout(resolve, 1200));
    if (process.argv.includes("--auth")) {
      const ready = page === "app" ? "document.body.innerText.includes('HALO, ALYA') && !document.body.innerText.includes('Mencari teman baru')" : page.startsWith("messages") ? "document.body.innerText.includes('Bima QA') && !document.body.innerText.includes('Memuat percakapan')" : "true";
      for (let attempt = 0; attempt < 24; attempt++) {
        const state = await command("Runtime.evaluate", { expression: ready, returnByValue: true });
        if (state.result.value === true) break;
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
    const result = await command("Runtime.evaluate", { expression: `({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,title:document.title,overflow:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>0&&r.right>innerWidth+2&&s.position!=='absolute'&&s.position!=='fixed'}).slice(0,5).map(e=>e.tagName.toLowerCase()+'.'+e.className)})`, returnByValue: true });
    const image = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    const path = join(output, `${page.replaceAll("/", "-") || "home"}-${width}.png`);
    await writeFile(path, Buffer.from(image.data, "base64"));
    process.stdout.write(`${page || "home"} ${width}: ${JSON.stringify(result.result.value)} ${path}\n`);
    if (result.result.value.viewport !== width || result.result.value.scrollWidth > width) {
      throw new Error(`Horizontal overflow at ${page || "home"} ${width}px.`);
    }
  }
  if (!process.argv.includes("--auth")) {
    for (const width of [320, 390, 768, 1280]) {
      for (const page of ["", "login"]) await capture(page, width);
    }
  }
  if (process.argv.includes("--auth")) {
    if (!sql) throw new Error("DATABASE_URL diperlukan untuk QA halaman yang memerlukan login.");
    const suffix = randomUUID().slice(0, 8);
    const password = `QA-${randomUUID()}`;
    const create = async (name) => {
      const account = await api("/api/auth/register", { email: `sapa-qa-${name}-${suffix}@example.invalid`, password, fullName: `${name} QA`, username: `qa${name.toLowerCase()}${suffix}` });
      testUsers.push(account.user.id);
      const response = await fetch("http://localhost:3000/api/profile", { method: "PUT", headers: { Authorization: `Bearer ${account.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ fullName: `${name} QA`, birthDate: "2002-03-14", city: "Bandung", country: "Indonesia", mbti: name === "Alya" ? "INFP" : "ENFJ", languages: ["Indonesia"], hobbies: ["Film"], interests: ["Film", "Buku", "Game"], lookingFor: ["Teman baru"], bio: `Aku ${name}, suka cerita film dan ingin berteman serta berbagi pengalaman baru.` }) });
      if (!response.ok) throw new Error(`Profil QA: ${response.status} ${await response.text()}`);
      return account;
    };
    const viewer = await create("Alya");
    const peer = await create("Bima");
    await create("Citra");
    await api("/api/likes", { targetUserId: peer.user.id }, viewer.token);
    const match = await api("/api/likes", { targetUserId: viewer.user.id }, peer.token);
    await api(`/api/conversations/${match.conversationId}/messages`, { body: "Halo, apa film favoritmu?" }, peer.token);
    const login = await fetch("http://localhost:3000/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: `sapa-qa-Alya-${suffix}@example.invalid`, password }) });
    const cookie = login.headers.get("set-cookie")?.split(";")[0]?.split("=")[1];
    if (!cookie) throw new Error("Cookie login QA tidak diterima.");
    await command("Network.setCookie", { name: "sapa_session", value: cookie, url: "http://localhost:3000/", httpOnly: true });
    for (const width of [320, 390, 1280]) {
      for (const page of ["app", "messages", `messages/${match.conversationId}`, "profile"]) await capture(page, width);
    }
  }
  socket.close();
} finally {
  browser.kill();
  if (sql) for (const id of testUsers) await sql`DELETE FROM users WHERE id=${id}`;
}
