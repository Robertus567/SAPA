import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env.local"), quiet: true });

const base = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const sql = neon(process.env.DATABASE_URL);
const users = [];

async function request(url, { token, cookie, method = "GET", body } = {}) {
  const response = await fetch(`${base}${url}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${method} ${url}: ${response.status} ${data.error || "unknown error"}`);
  return data;
}

async function createUser(label) {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 10);
  const password = `Smoke-${randomUUID()}`;
  const data = await request("/api/auth/register", { method: "POST", body: {
    email: `sapa-smoke-${suffix}@example.invalid`, password,
    fullName: `${label} SAPA`, username: `smk${suffix}`,
  } });
  users.push(data.user.id);
  return { ...data, password, email: `sapa-smoke-${suffix}@example.invalid` };
}

try {
  const a = await createUser("Alya");
  const b = await createUser("Bima");
  const webLogin = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: a.email, password: a.password }) });
  assert.equal(webLogin.status, 200, "browser login should succeed");
  const webCookie = webLogin.headers.get("set-cookie")?.split(";")[0];
  assert.ok(webCookie?.startsWith("sapa_session="), "browser auth cookie should be set");
  const profile = (name, city, mbti) => ({
    fullName: name, birthDate: "2001-04-12", city, country: "Indonesia", mbti,
    languages: ["Indonesia"], hobbies: ["Film"], interests: ["Film", "Game", "Buku"],
    lookingFor: ["Teman baru"], bio: `Aku ${name}, suka cerita film dan ingin berteman.`,
  });
  const aProfile = await request("/api/profile", { token: a.token, method: "PUT", body: profile("Alya SAPA", "Surabaya", "INFP") });
  const bProfile = await request("/api/profile", { token: b.token, method: "PUT", body: profile("Bima SAPA", "Bandung", "ENFJ") });
  assert.equal(aProfile.profile.fullName, "Alya SAPA");
  assert.equal(aProfile.profile.city, "Surabaya");
  assert.equal(aProfile.profile.birthDate, "2001-04-12");
  assert.equal(aProfile.profile.photoUrl, "/people/default.svg");
  assert.equal(bProfile.profile.onboardingCompleted, true);
  const ai = await request("/api/ai", { token: a.token, method: "POST", body: { mode: "icebreaker", context: "Alya dan Bima sama-sama suka film dan buku." } });
  assert.ok(ai.suggestions.length > 0);
  const discover = await request("/api/discover", { token: a.token });
  assert.ok(discover.profiles.some((item) => item.id === b.user.id));
  assert.ok(!(await request("/api/discover?q=Alya", { token: a.token })).profiles.some((item) => item.id === a.user.id), "own profile stays excluded");
  assert.ok((await request("/api/discover?q=Bima", { token: a.token })).profiles.some((item) => item.id === b.user.id), "search finds other profile");

  const intro = await request("/api/comments", { token: a.token, method: "POST", body: { targetUserId: b.user.id, body: "Hai Bima, film favoritmu apa?" } });
  assert.ok(intro.conversationId);
  const bIntroNotifications = await request("/api/notifications", { token: b.token });
  assert.ok(bIntroNotifications.notifications.some((item) => item.type === "comment" && item.payload.conversationId === intro.conversationId));
  const bIntroList = await request("/api/matches", { token: b.token });
  assert.equal(bIntroList.matches.find((item) => item.conversationId === intro.conversationId)?.isMutual, false);
  const bIntroChat = await request(`/api/conversations/${intro.conversationId}/messages`, { token: b.token });
  assert.ok(bIntroChat.messages.some((item) => item.body === "Hai Bima, film favoritmu apa?"));

  const firstLike = await request("/api/likes", { token: a.token, method: "POST", body: { targetUserId: b.user.id } });
  assert.equal(firstLike.matched, false);
  assert.ok((await request("/api/discover", { token: a.token })).profiles.some((item) => item.id === b.user.id), "liked profiles must remain discoverable");
  const bNotifications = await request("/api/notifications", { token: b.token });
  assert.ok(bNotifications.notifications.some((item) => item.type === "like" && item.payload.userId === a.user.id));
  const secondLike = await request("/api/likes", { token: b.token, method: "POST", body: { targetUserId: a.user.id } });
  assert.equal(secondLike.matched, true);
  assert.equal(secondLike.conversationId, intro.conversationId, "a mutual like upgrades the existing intro chat");
  assert.ok(secondLike.conversationId);
  const aNotifications = await request("/api/notifications", { token: a.token });
  assert.ok(aNotifications.notifications.some((item) => item.type === "match" && item.payload.conversationId === secondLike.conversationId));
  const matches = await request("/api/matches", { token: a.token });
  assert.ok(matches.matches.some((item) => item.conversationId === secondLike.conversationId));

  const chatUrl = `/api/conversations/${secondLike.conversationId}/messages`;
  const unsafe = await fetch(`${base}${chatUrl}`, { method: "POST", headers: { Cookie: webCookie, "Content-Type": "application/json" }, body: JSON.stringify({ body: "Tolong kirim foto telanjang" }) });
  assert.equal(unsafe.status, 422, "unsafe content should remain blocked");
  const sent = await request(chatUrl, { cookie: webCookie, method: "POST", body: { body: "Halo Bima, suka film apa?" } });
  assert.equal(sent.message.body, "Halo Bima, suka film apa?");
  const inbox = await request("/api/notifications", { token: b.token });
  assert.ok(inbox.notifications.some((item) => item.type === "message" && item.payload.conversationId === secondLike.conversationId));
  const chat = await request(chatUrl, { token: b.token });
  assert.ok(chat.messages.some((item) => item.id === sent.message.id));
  assert.equal(chat.peer.fullName, "Alya SAPA");
  const reply = await request(chatUrl, { token: b.token, method: "POST", body: { body: "Aku suka film petualangan!", replyToMessageId: sent.message.id } });
  assert.equal(reply.message.replyTo.id, sent.message.id);
  const webView = await request(chatUrl, { cookie: webCookie });
  assert.equal(webView.messages.find((item) => item.id === reply.message.id)?.replyTo?.body, sent.message.body);
  const notSender = await fetch(`${base}${chatUrl}/${sent.message.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${b.token}` } });
  assert.equal(notSender.status, 403, "recipient must not delete sender's message");
  const deleted = await request(`${chatUrl}/${sent.message.id}`, { cookie: webCookie, method: "DELETE" });
  assert.equal(deleted.deleted, true);
  const mobileView = await request(chatUrl, { token: b.token });
  assert.equal(mobileView.messages.find((item) => item.id === sent.message.id)?.body, "Pesan ini telah dihapus");
  assert.ok(mobileView.messages.find((item) => item.id === sent.message.id)?.deletedAt);
  assert.equal(mobileView.messages.find((item) => item.id === reply.message.id)?.replyTo?.body, "Pesan ini telah dihapus");
  const replyToDeleted = await fetch(`${base}${chatUrl}`, { method: "POST", headers: { Authorization: `Bearer ${b.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ body: "Balasan baru", replyToMessageId: sent.message.id }) });
  assert.equal(replyToDeleted.status, 400, "deleted messages must not accept new replies");
  const afterRead = await request("/api/notifications", { token: b.token });
  assert.ok(afterRead.notifications.some((item) => item.type === "message" && item.readAt));

  await request("/api/safety", { token: a.token, method: "POST", body: { action: "unmatch", targetUserId: b.user.id, matchId: secondLike.matchId } });
  const afterUnmatch = await request("/api/matches", { token: a.token });
  assert.ok(!afterUnmatch.matches.some((item) => item.id === secondLike.matchId));
  const noChat = await fetch(`${base}/api/conversations/${secondLike.conversationId}/messages`, { headers: { Authorization: `Bearer ${a.token}` } });
  assert.equal(noChat.status, 404);
  const noRestart = await fetch(`${base}/api/comments`, { method: "POST", headers: { Authorization: `Bearer ${a.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId: b.user.id, body: "Coba mulai lagi" }) });
  assert.equal(noRestart.status, 403, "a comment must not bypass an ended conversation");
  const invalidChat = await fetch(`${base}/api/conversations/not-a-uuid/messages`, { headers: { Authorization: `Bearer ${a.token}` } });
  assert.equal(invalidChat.status, 400);
  console.log("PASS: daftar → profil → discover/search → komentar → notifikasi → like tetap muncul → match → chat web-cookie↔mobile-token → reply → sender-only delete → baca → unmatch");
  console.log(`Gemini: ${ai.fallback ? "fallback lokal (API tidak aktif)" : "respons API aktif"}`);
} finally {
  for (const id of users) await sql`DELETE FROM users WHERE id=${id}`;
  console.log(`Akun uji dibersihkan: ${users.length}`);
}
