import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { apiError, db, isDatabaseConfigured } from "@/lib/db";

const schema = z.object({ targetUserId: z.string().uuid(), superLike: z.boolean().optional() });

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const sql = db();
    const rows = await sql`
      SELECT l.id, l.created_at, p.user_id, p.full_name, p.username, p.photo_url, p.mbti, p.city,
        EXISTS (SELECT 1 FROM likes mine WHERE mine.from_user=${user.id} AND mine.to_user=l.from_user) AS liked_back
      FROM likes l JOIN profiles p ON p.user_id=l.from_user
      WHERE l.to_user=${user.id}
        AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id=${user.id} AND b.blocked_id=l.from_user) OR (b.blocker_id=l.from_user AND b.blocked_id=${user.id}))
      ORDER BY l.created_at DESC LIMIT 80
    `;
    return Response.json({ likes: rows.map((row) => ({ id: String(row.id), userId: String(row.user_id), fullName: String(row.full_name), username: String(row.username), photoUrl: String(row.photo_url), mbti: String(row.mbti), city: String(row.city), likedBack: row.liked_back === true, createdAt: row.created_at })) });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return Response.json({ error: "Silakan masuk." }, { status: 401 });
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = schema.parse(await request.json());
    if (!isDatabaseConfigured()) return Response.json({ error: "Mode preview tidak dapat mengirim like." }, { status: 503 });
    const user = await requireUser(request);
    if (user.id === input.targetUserId) return Response.json({ error: "Tidak dapat menyukai profil sendiri." }, { status: 400 });
    const sql = db();
    const target = await sql`SELECT 1 FROM profiles p WHERE p.user_id=${input.targetUserId} AND p.is_visible=TRUE AND p.onboarding_completed=TRUE AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id=${user.id} AND b.blocked_id=p.user_id) OR (b.blocker_id=p.user_id AND b.blocked_id=${user.id})) LIMIT 1`;
    if (!target[0]) return Response.json({ error: "Profil ini tidak tersedia." }, { status: 404 });
    const inserted = await sql`INSERT INTO likes (from_user, to_user) VALUES (${user.id}, ${input.targetUserId}) ON CONFLICT DO NOTHING RETURNING id`;
    if (!inserted[0]) {
      const existing = await sql`SELECT m.id, c.id AS conversation_id FROM matches m JOIN conversations c ON c.match_id=m.id WHERE m.is_active=TRUE AND ((m.user_a=${user.id} AND m.user_b=${input.targetUserId}) OR (m.user_a=${input.targetUserId} AND m.user_b=${user.id})) LIMIT 1`;
      return Response.json({ liked: true, alreadyLiked: true, matched: Boolean(existing[0]), matchId: existing[0]?.id, conversationId: existing[0]?.conversation_id });
    }
    const reciprocal = await sql`SELECT 1 FROM likes WHERE from_user=${input.targetUserId} AND to_user=${user.id} LIMIT 1`;
    if (!reciprocal[0]) {
      await sql`INSERT INTO notifications (user_id, type, payload) VALUES (${input.targetUserId}, ${input.superLike ? "spark" : "like"}, jsonb_build_object('userId', ${user.id}::text))`;
      return Response.json({ liked: true, matched: false });
    }

    const created = await sql`INSERT INTO matches (user_a, user_b) VALUES (${user.id}, ${input.targetUserId}) ON CONFLICT DO NOTHING RETURNING id`;
    const matches = await sql`
      SELECT id FROM matches
      WHERE (user_a=${user.id} AND user_b=${input.targetUserId}) OR (user_a=${input.targetUserId} AND user_b=${user.id})
      LIMIT 1
    `;
    const matchId = matches[0].id;
    const reactivated = !created[0] ? await sql`UPDATE matches SET is_active=TRUE, matched_at=NOW() WHERE id=${matchId} AND is_active=FALSE RETURNING id` : [];
    const conversations = await sql`
      INSERT INTO conversations (match_id) VALUES (${matchId})
      ON CONFLICT (match_id) DO UPDATE SET match_id=EXCLUDED.match_id
      RETURNING id
    `;
    if (created[0] || reactivated[0]) await sql`
      INSERT INTO notifications (user_id, type, payload) VALUES
      (${user.id}, 'match', jsonb_build_object('matchId', ${matchId}::text, 'conversationId', ${conversations[0].id}::text, 'userId', ${input.targetUserId}::text)),
      (${input.targetUserId}, 'match', jsonb_build_object('matchId', ${matchId}::text, 'conversationId', ${conversations[0].id}::text, 'userId', ${user.id}::text))
    `;
    return Response.json({ liked: true, matched: true, matchId, conversationId: conversations[0].id });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Target profil tidak valid." }, { status: 400 });
    if ((error as Error).message === "UNAUTHORIZED") return Response.json({ error: "Silakan masuk." }, { status: 401 });
    return apiError(error);
  }
}
