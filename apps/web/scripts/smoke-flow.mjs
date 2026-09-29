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

async function request(url, { token, method = "GET", body } = {}) {
  const response = await fetch(`${base}${url}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${method} ${url}: ${response.status} ${data.error || "unknown error"}`);
  return data;
}

async function createUser(label) {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 10);
  const data = await request("/api/auth/register", { method: "POST", body: {
    email: `sapa-smoke-${suffix}@example.invalid`, password: `Smoke-${randomUUID()}`,
    fullName: `${label} SAPA`, username: `smk${suffix}`,
  } });
  users.push(data.user.id);
  return data;
}

try {
  const a = await createUser("Alya");
  const b = await createUser("Bima");
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

  const firstLike = await request("/api/likes", { token: a.token, method: "POST", body: { targetUserId: b.user.id } });
  assert.equal(firstLike.matched, false);
  const bNotifications = await request("/api/notifications", { token: b.token });
  assert.ok(bNotifications.notifications.some((item) => item.type === "like" && item.payload.userId === a.user.id));
  const secondLike = await request("/api/likes", { token: b.token, method: "POST", body: { targetUserId: a.user.id } });
  assert.equal(secondLike.matched, true);
  assert.ok(secondLike.conversationId);
  const aNotifications = await request("/api/notifications", { token: a.token });
  assert.ok(aNotifications.notifications.some((item) => item.type === "match" && item.payload.conversationId === secondLike.conversationId));
  const matches = await request("/api/matches", { token: a.token });
  assert.ok(matches.matches.some((item) => item.conversationId === secondLike.conversationId));

  const sent = await request(`/api/conversations/${secondLike.conversationId}/messages`, { token: a.token, method: "POST", body: { body: "Halo Bima, suka film apa?" } });
  assert.equal(sent.message.body, "Halo Bima, suka film apa?");
  const inbox = await request("/api/notifications", { token: b.token });
  assert.ok(inbox.notifications.some((item) => item.type === "message" && item.payload.conversationId === secondLike.conversationId));
  const chat = await request(`/api/conversations/${secondLike.conversationId}/messages`, { token: b.token });
  assert.ok(chat.messages.some((item) => item.id === sent.message.id));
  assert.equal(chat.peer.fullName, "Alya SAPA");
  const afterRead = await request("/api/notifications", { token: b.token });
  assert.ok(afterRead.notifications.some((item) => item.type === "message" && item.readAt));

  await request("/api/safety", { token: a.token, method: "POST", body: { action: "unmatch", targetUserId: b.user.id, matchId: secondLike.matchId } });
  const afterUnmatch = await request("/api/matches", { token: a.token });
  assert.ok(!afterUnmatch.matches.some((item) => item.id === secondLike.matchId));
  const noChat = await fetch(`${base}/api/conversations/${secondLike.conversationId}/messages`, { headers: { Authorization: `Bearer ${a.token}` } });
  assert.equal(noChat.status, 404);
  console.log("PASS: daftar → profil → discover → like → match → chat → notifikasi → baca → unmatch");
  console.log(`Gemini: ${ai.fallback ? "fallback lokal (API tidak aktif)" : "respons API aktif"}`);
} finally {
  for (const id of users) await sql`DELETE FROM users WHERE id=${id}`;
  console.log(`Akun uji dibersihkan: ${users.length}`);
}
