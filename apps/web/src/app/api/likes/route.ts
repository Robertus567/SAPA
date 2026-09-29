import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { apiError, db, isDatabaseConfigured } from "@/lib/db";

const schema = z.object({ targetUserId: z.string().min(1) });

export async function POST(request: NextRequest) {
  try {
    const input = schema.parse(await request.json());
    if (!isDatabaseConfigured()) return Response.json({ liked: true, matched: input.targetUserId === "demo-bima", demo: true });
    const user = await requireUser(request);
    if (user.id === input.targetUserId) return Response.json({ error: "Tidak dapat menyukai profil sendiri." }, { status: 400 });
    const sql = db();
    await sql`INSERT INTO likes (from_user, to_user) VALUES (${user.id}, ${input.targetUserId}) ON CONFLICT DO NOTHING`;
    const reciprocal = await sql`SELECT 1 FROM likes WHERE from_user=${input.targetUserId} AND to_user=${user.id} LIMIT 1`;
    if (!reciprocal[0]) return Response.json({ liked: true, matched: false });

    await sql`INSERT INTO matches (user_a, user_b) VALUES (${user.id}, ${input.targetUserId}) ON CONFLICT DO NOTHING`;
    const matches = await sql`
      SELECT id FROM matches
      WHERE (user_a=${user.id} AND user_b=${input.targetUserId}) OR (user_a=${input.targetUserId} AND user_b=${user.id})
      LIMIT 1
    `;
    const matchId = matches[0].id;
    const conversations = await sql`
      INSERT INTO conversations (match_id) VALUES (${matchId})
      ON CONFLICT (match_id) DO UPDATE SET match_id=EXCLUDED.match_id
      RETURNING id
    `;
    await sql`
      INSERT INTO notifications (user_id, type, payload) VALUES
      (${user.id}, 'match', jsonb_build_object('matchId', ${matchId}, 'conversationId', ${conversations[0].id}, 'userId', ${input.targetUserId})),
      (${input.targetUserId}, 'match', jsonb_build_object('matchId', ${matchId}, 'conversationId', ${conversations[0].id}, 'userId', ${user.id}))
    `;
    return Response.json({ liked: true, matched: true, matchId, conversationId: conversations[0].id });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Target profil tidak valid." }, { status: 400 });
    if ((error as Error).message === "UNAUTHORIZED") return Response.json({ error: "Silakan masuk." }, { status: 401 });
    return apiError(error);
  }
}

