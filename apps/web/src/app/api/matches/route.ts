import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { apiError, db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const sql = db();
    const rows = await sql`
      SELECT m.id, m.matched_at, c.id AS conversation_id,
        p.user_id, p.full_name, p.username, p.mbti, p.photo_url,
        (SELECT CASE WHEN lm.deleted_at IS NOT NULL THEN 'Pesan ini telah dihapus' WHEN lm.body <> '' THEN lm.body ELSE 'Foto' END FROM messages lm WHERE lm.conversation_id=c.id ORDER BY lm.created_at DESC LIMIT 1) AS last_message,
        (SELECT COUNT(*)::int FROM messages um WHERE um.conversation_id=c.id AND um.sender_id<>${user.id} AND um.read_at IS NULL) AS unread
      FROM matches m
      JOIN conversations c ON c.match_id=m.id
      JOIN profiles p ON p.user_id=CASE WHEN m.user_a=${user.id} THEN m.user_b ELSE m.user_a END
      WHERE (m.user_a=${user.id} OR m.user_b=${user.id}) AND m.is_active=TRUE
      ORDER BY COALESCE((SELECT MAX(created_at) FROM messages WHERE conversation_id=c.id), m.matched_at) DESC
    `;
    return Response.json({ matches: rows.map((row) => ({
      id: String(row.id), conversationId: String(row.conversation_id), userId: String(row.user_id),
      fullName: String(row.full_name), username: String(row.username), mbti: String(row.mbti), photoUrl: String(row.photo_url),
      lastMessage: String(row.last_message ?? "Kalian baru saja match. Mulai percakapan!"), unread: Number(row.unread ?? 0), matchedAt: row.matched_at,
    })) });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return Response.json({ error: "Silakan masuk." }, { status: 401 });
    return apiError(error);
  }
}
