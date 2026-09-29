import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { apiError, db } from "@/lib/db";

const schema = z.object({
  action: z.enum(["block", "report", "unmatch"]),
  targetUserId: z.string().min(1),
  matchId: z.string().min(1).optional(),
  reason: z.string().max(100).optional(),
  details: z.string().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const raw = await request.json();
    const input = schema.parse(raw);
    if (!z.string().uuid().safeParse(input.targetUserId).success || (input.matchId && !z.string().uuid().safeParse(input.matchId).success)) {
      return Response.json({ error: "Identitas akun tidak valid." }, { status: 400 });
    }
    const sql = db();
    if (input.action === "block") {
      await sql`INSERT INTO blocks (blocker_id, blocked_id) VALUES (${user.id}, ${input.targetUserId}) ON CONFLICT DO NOTHING`;
      await sql`UPDATE matches SET is_active=FALSE WHERE (user_a=${user.id} AND user_b=${input.targetUserId}) OR (user_a=${input.targetUserId} AND user_b=${user.id})`;
      await sql`DELETE FROM likes WHERE (from_user=${user.id} AND to_user=${input.targetUserId}) OR (from_user=${input.targetUserId} AND to_user=${user.id})`;
    } else if (input.action === "report") {
      await sql`INSERT INTO reports (reporter_id, reported_id, reason, details) VALUES (${user.id}, ${input.targetUserId}, ${input.reason || "Lainnya"}, ${input.details || ""})`;
    } else if (input.matchId) {
      const ended = await sql`UPDATE matches SET is_active=FALSE WHERE id=${input.matchId} AND ((user_a=${user.id} AND user_b=${input.targetUserId}) OR (user_b=${user.id} AND user_a=${input.targetUserId})) RETURNING id`;
      if (!ended[0]) return Response.json({ error: "Match tidak ditemukan." }, { status: 404 });
      await sql`DELETE FROM likes WHERE (from_user=${user.id} AND to_user=${input.targetUserId}) OR (from_user=${input.targetUserId} AND to_user=${user.id})`;
    } else {
      return Response.json({ error: "Pilih match yang ingin diakhiri." }, { status: 400 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Permintaan keamanan tidak valid." }, { status: 400 });
    if ((error as Error).message === "UNAUTHORIZED") return Response.json({ error: "Silakan masuk." }, { status: 401 });
    return apiError(error);
  }
}
