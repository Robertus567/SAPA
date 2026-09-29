import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { isMessageAllowed } from "@/lib/ai";
import { apiError, db, isDatabaseConfigured } from "@/lib/db";

const messageSchema = z.object({
  body: z.string().max(2000).default(""),
  imageUrl: z.string().max(1_300_000).nullable().optional(),
}).refine((value) => value.body.trim() || value.imageUrl, "Pesan tidak boleh kosong.");

const demoMessages = [
  { id: "m1", senderId: "demo-bima", body: "Hai Nara! Aku lihat kita sama-sama suka film dan musik indie 👋", createdAt: new Date(Date.now() - 420000).toISOString(), readAt: new Date().toISOString() },
  { id: "m2", senderId: "demo-viewer", body: "Hai Bima! Iya, kombinasi yang susah ditolak 😄", createdAt: new Date(Date.now() - 300000).toISOString(), readAt: new Date().toISOString() },
  { id: "m3", senderId: "demo-bima", body: "Film terakhir yang bikin kamu kepikiran apa?", createdAt: new Date(Date.now() - 120000).toISOString(), readAt: null },
];

async function assertMember(sql: ReturnType<typeof db>, conversationId: string, userId: string) {
  const rows = await sql`
    SELECT c.id FROM conversations c JOIN matches m ON m.id=c.match_id
    WHERE c.id=${conversationId} AND m.is_active=TRUE AND (m.user_a=${userId} OR m.user_b=${userId}) LIMIT 1
  `;
  return Boolean(rows[0]);
}

async function conversationDetails(sql: ReturnType<typeof db>, conversationId: string, userId: string) {
  const rows = await sql`
    SELECT m.id AS match_id, p.user_id, p.full_name, p.mbti, p.photo_url
    FROM conversations c
    JOIN matches m ON m.id=c.match_id
    JOIN profiles p ON p.user_id=CASE WHEN m.user_a=${userId} THEN m.user_b ELSE m.user_a END
    WHERE c.id=${conversationId} AND m.is_active=TRUE
      AND (m.user_a=${userId} OR m.user_b=${userId})
    LIMIT 1
  `;
  return rows[0];
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!isDatabaseConfigured()) return Response.json({ messages: demoMessages, currentUserId: "demo-viewer", peer: { userId: "demo-bima", matchId: "demo-match", fullName: "Bima Ardhana", mbti: "ENFJ", photoUrl: "/people/bima.svg" }, demo: true });
    const user = await requireUser(request);
    const sql = db();
    const details = await conversationDetails(sql, id, user.id);
    if (!details) return Response.json({ error: "Percakapan tidak ditemukan." }, { status: 404 });
    await sql`UPDATE messages SET read_at=NOW() WHERE conversation_id=${id} AND sender_id<>${user.id} AND read_at IS NULL`;
    const rows = await sql`
      SELECT id, sender_id, body, image_url, read_at, created_at FROM messages
      WHERE conversation_id=${id} ORDER BY created_at ASC LIMIT 200
    `;
    return Response.json({ messages: rows.map((row) => ({
      id: String(row.id), senderId: String(row.sender_id), body: String(row.body), imageUrl: row.image_url,
      createdAt: row.created_at, readAt: row.read_at,
    })), currentUserId: user.id, peer: { userId: String(details.user_id), matchId: String(details.match_id), fullName: String(details.full_name), mbti: String(details.mbti), photoUrl: String(details.photo_url) } });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return Response.json({ error: "Silakan masuk." }, { status: 401 });
    return apiError(error);
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const input = messageSchema.parse(await request.json());
    if (input.imageUrl && !/^(data:image\/(png|jpe?g|webp);base64,|https:\/\/)/i.test(input.imageUrl)) {
      return Response.json({ error: "Format gambar tidak didukung." }, { status: 400 });
    }
    if (!(await isMessageAllowed(input.body))) return Response.json({ error: "Pesan ditahan oleh sistem keamanan." }, { status: 422 });
    if (!isDatabaseConfigured()) {
      return Response.json({ message: { id: crypto.randomUUID(), senderId: "demo-viewer", body: input.body, imageUrl: input.imageUrl, createdAt: new Date().toISOString() }, demo: true }, { status: 201 });
    }
    const user = await requireUser(request);
    const sql = db();
    if (!(await assertMember(sql, id, user.id))) return Response.json({ error: "Percakapan tidak ditemukan." }, { status: 404 });
    const rows = await sql`
      INSERT INTO messages (conversation_id, sender_id, body, image_url)
      VALUES (${id}, ${user.id}, ${input.body.trim()}, ${input.imageUrl || null})
      RETURNING id, sender_id, body, image_url, read_at, created_at
    `;
    const row = rows[0];
    return Response.json({ message: { id: row.id, senderId: row.sender_id, body: row.body, imageUrl: row.image_url, readAt: row.read_at, createdAt: row.created_at } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Pesan tidak valid." }, { status: 400 });
    if ((error as Error).message === "UNAUTHORIZED") return Response.json({ error: "Silakan masuk." }, { status: 401 });
    return apiError(error);
  }
}
