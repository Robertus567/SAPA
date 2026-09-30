import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { isMessageAllowed } from "@/lib/ai";
import { apiError, db } from "@/lib/db";

const schema = z.object({ targetUserId: z.string().uuid(), body: z.string().trim().min(1).max(500) });

export async function POST(request: NextRequest) {
  try {
    const input = schema.parse(await request.json());
    const user = await requireUser(request);
    if (user.id === input.targetUserId) return Response.json({ error: "Tidak dapat mengomentari profil sendiri." }, { status: 400 });
    if (!(await isMessageAllowed(input.body))) return Response.json({ error: "Komentar ditahan oleh sistem keamanan." }, { status: 422 });

    const sql = db();
    const target = await sql`SELECT 1 FROM profiles p WHERE p.user_id=${input.targetUserId} AND p.is_visible=TRUE AND p.onboarding_completed=TRUE AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id=${user.id} AND b.blocked_id=p.user_id) OR (b.blocker_id=p.user_id AND b.blocked_id=${user.id})) LIMIT 1`;
    if (!target[0]) return Response.json({ error: "Profil ini tidak tersedia." }, { status: 404 });

    const existing = await sql`SELECT id, is_active FROM matches WHERE (user_a=${user.id} AND user_b=${input.targetUserId}) OR (user_a=${input.targetUserId} AND user_b=${user.id}) LIMIT 1`;
    if (existing[0] && !existing[0].is_active) return Response.json({ error: "Percakapan ini sudah diakhiri." }, { status: 403 });
    if (!existing[0]) await sql`INSERT INTO matches (user_a, user_b, is_mutual) VALUES (${user.id}, ${input.targetUserId}, FALSE) ON CONFLICT DO NOTHING`;
    const connection = await sql`SELECT id, is_active FROM matches WHERE (user_a=${user.id} AND user_b=${input.targetUserId}) OR (user_a=${input.targetUserId} AND user_b=${user.id}) LIMIT 1`;
    if (!connection[0]?.is_active) return Response.json({ error: "Percakapan ini tidak tersedia." }, { status: 403 });
    const matchId = connection[0].id;
    const conversations = await sql`INSERT INTO conversations (match_id) VALUES (${matchId}) ON CONFLICT (match_id) DO UPDATE SET match_id=EXCLUDED.match_id RETURNING id`;
    const conversationId = conversations[0].id;
    const messages = await sql`INSERT INTO messages (conversation_id, sender_id, body) VALUES (${conversationId}, ${user.id}, ${input.body}) RETURNING id`;
    await sql`INSERT INTO notifications (user_id, type, payload) VALUES (${input.targetUserId}, 'comment', jsonb_build_object('userId', ${user.id}::text, 'conversationId', ${conversationId}::text, 'messageId', ${messages[0].id}::text))`;
    return Response.json({ conversationId, matchId, messageId: messages[0].id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Komentar harus berisi 1–500 karakter." }, { status: 400 });
    if ((error as Error).message === "UNAUTHORIZED") return Response.json({ error: "Silakan masuk." }, { status: 401 });
    return apiError(error);
  }
}
