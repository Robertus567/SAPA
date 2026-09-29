import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { apiError, db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const sql = db();
    const rows = await sql`
      SELECT n.id, n.type, n.payload, n.read_at, n.created_at,
        p.full_name AS actor_name, p.photo_url AS actor_photo
      FROM notifications n
      LEFT JOIN profiles p ON p.user_id::text = n.payload->>'userId'
      WHERE n.user_id=${user.id}
      ORDER BY n.created_at DESC LIMIT 80
    `;
    return Response.json({ notifications: rows.map((row) => ({
      id: String(row.id), type: String(row.type), payload: row.payload,
      actorName: String(row.actor_name ?? "Seseorang"), actorPhoto: String(row.actor_photo ?? "/people/default.svg"),
      readAt: row.read_at, createdAt: row.created_at,
    })), unread: rows.filter((row) => !row.read_at).length });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return Response.json({ error: "Silakan masuk." }, { status: 401 });
    return apiError(error);
  }
}

const markSchema = z.object({ id: z.string().uuid().optional(), all: z.boolean().optional() }).refine((value) => value.id || value.all);

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const input = markSchema.parse(await request.json());
    const sql = db();
    if (input.all) await sql`UPDATE notifications SET read_at=NOW() WHERE user_id=${user.id} AND read_at IS NULL`;
    else await sql`UPDATE notifications SET read_at=NOW() WHERE id=${input.id} AND user_id=${user.id} AND read_at IS NULL`;
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Notifikasi tidak valid." }, { status: 400 });
    if ((error as Error).message === "UNAUTHORIZED") return Response.json({ error: "Silakan masuk." }, { status: 401 });
    return apiError(error);
  }
}
