import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { isMessageAllowed } from "@/lib/ai";
import { apiError, db } from "@/lib/db";

const messageSchema = z.object({
  body: z.string().max(2000).default(""),
  imageUrl: z.string().max(1_300_000).nullable().optional(),
  replyToMessageId: z.string().uuid().nullable().optional(),
}).refine((value) => value.body.trim() || value.imageUrl, "Pesan tidak boleh kosong.");

function rowToMessage(row: Record<string, unknown>) {
  const deletedAt = row.deleted_at ?? null;
  return {
    id: String(row.id), senderId: String(row.sender_id),
    body: deletedAt ? "Pesan ini telah dihapus" : String(row.body ?? ""),
    imageUrl: deletedAt ? null : row.image_url ?? null,
    deletedAt, readAt: row.read_at ?? null, createdAt: row.created_at,
    replyTo: row.reply_to_message_id && row.reply_sender_id ? {
      id: String(row.reply_to_message_id), senderId: String(row.reply_sender_id),
      body: row.reply_deleted_at ? "Pesan ini telah dihapus" : String(row.reply_body || (row.reply_image_url ? "Foto" : "")),
      hasImage: !row.reply_deleted_at && Boolean(row.reply_image_url), deletedAt: row.reply_deleted_at ?? null,
    } : null,
  };
}

async function assertMember(sql: ReturnType<typeof db>, conversationId: string, userId: string) {
  const rows = await sql`
    SELECT c.id FROM conversations c JOIN matches m ON m.id=c.match_id
    WHERE c.id=${conversationId} AND m.is_active=TRUE AND (m.user_a=${userId} OR m.user_b=${userId}) LIMIT 1
  `;
  return Boolean(rows[0]);
}

async function conversationDetails(sql: ReturnType<typeof db>, conversationId: string, userId: string) {
  const rows = await sql`
    SELECT m.id AS match_id, p.user_id, p.full_name, p.mbti, p.photo_url, viewer.mbti AS viewer_mbti
    FROM conversations c
    JOIN matches m ON m.id=c.match_id
    JOIN profiles p ON p.user_id=CASE WHEN m.user_a=${userId} THEN m.user_b ELSE m.user_a END
    JOIN profiles viewer ON viewer.user_id=${userId}
    WHERE c.id=${conversationId} AND m.is_active=TRUE
      AND (m.user_a=${userId} OR m.user_b=${userId})
    LIMIT 1
  `;
  return rows[0];
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!z.string().uuid().safeParse(id).success) return Response.json({ error: "ID percakapan tidak valid." }, { status: 400 });
    const user = await requireUser(request);
    const sql = db();
    const details = await conversationDetails(sql, id, user.id);
    if (!details) return Response.json({ error: "Percakapan tidak ditemukan." }, { status: 404 });
    await sql`UPDATE messages SET read_at=NOW() WHERE conversation_id=${id} AND sender_id<>${user.id} AND read_at IS NULL`;
    await sql`UPDATE notifications SET read_at=NOW() WHERE user_id=${user.id} AND type='message' AND payload->>'conversationId'=${id} AND read_at IS NULL`;
    const rows = await sql`
      SELECT m.id, m.sender_id, m.body, m.image_url, m.reply_to_message_id, m.deleted_at, m.read_at, m.created_at,
        r.sender_id AS reply_sender_id, r.body AS reply_body, r.image_url AS reply_image_url, r.deleted_at AS reply_deleted_at
      FROM (
        SELECT * FROM messages WHERE conversation_id=${id}
        ORDER BY created_at DESC, id DESC LIMIT 200
      ) m LEFT JOIN messages r ON r.id=m.reply_to_message_id
      ORDER BY m.created_at ASC, m.id ASC
    `;
    return Response.json({ messages: rows.map(rowToMessage), currentUserId: user.id, currentUserMbti: String(details.viewer_mbti), peer: { userId: String(details.user_id), matchId: String(details.match_id), fullName: String(details.full_name), mbti: String(details.mbti), photoUrl: String(details.photo_url) } });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return Response.json({ error: "Silakan masuk." }, { status: 401 });
    return apiError(error);
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!z.string().uuid().safeParse(id).success) return Response.json({ error: "ID percakapan tidak valid." }, { status: 400 });
    const input = messageSchema.parse(await request.json());
    const user = await requireUser(request);
    if (input.imageUrl && !/^(data:image\/(png|jpe?g|webp);base64,|https:\/\/)/i.test(input.imageUrl)) {
      return Response.json({ error: "Format gambar tidak didukung." }, { status: 400 });
    }
    const sql = db();
    if (!(await assertMember(sql, id, user.id))) return Response.json({ error: "Percakapan tidak ditemukan." }, { status: 404 });
    let reply = null;
    if (input.replyToMessageId) {
      const rows = await sql`SELECT id, sender_id, body, image_url, deleted_at FROM messages WHERE id=${input.replyToMessageId} AND conversation_id=${id} LIMIT 1`;
      reply = rows[0] ?? null;
      if (!reply || reply.deleted_at) return Response.json({ error: "Pesan yang dibalas tidak tersedia." }, { status: 400 });
    }
    if (!(await isMessageAllowed(input.body))) return Response.json({ error: "Pesan ditahan oleh sistem keamanan." }, { status: 422 });
    const rows = await sql`
      INSERT INTO messages (conversation_id, sender_id, body, image_url, reply_to_message_id)
      VALUES (${id}, ${user.id}, ${input.body.trim()}, ${input.imageUrl || null}, ${input.replyToMessageId || null})
      RETURNING id, sender_id, body, image_url, reply_to_message_id, deleted_at, read_at, created_at
    `;
    const row = rows[0];
    const details = await conversationDetails(sql, id, user.id);
    if (details) await sql`INSERT INTO notifications (user_id, type, payload) VALUES (${details.user_id}, 'message', jsonb_build_object('userId', ${user.id}::text, 'conversationId', ${id}::text, 'messageId', ${row.id}::text))`;
    return Response.json({ message: { ...rowToMessage(row), replyTo: reply ? { id: String(reply.id), senderId: String(reply.sender_id), body: String(reply.body || (reply.image_url ? "Foto" : "")), hasImage: Boolean(reply.image_url), deletedAt: null } : null } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Pesan tidak valid." }, { status: 400 });
    if ((error as Error).message === "UNAUTHORIZED") return Response.json({ error: "Silakan masuk." }, { status: 401 });
    return apiError(error);
  }
}
