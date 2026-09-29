import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { apiError, db } from "@/lib/db";

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string; messageId: string }> }) {
  try {
    const user = await requireUser(request);
    const { id, messageId } = await context.params;
    if (!z.string().uuid().safeParse(id).success || !z.string().uuid().safeParse(messageId).success) {
      return Response.json({ error: "ID percakapan atau pesan tidak valid." }, { status: 400 });
    }
    const sql = db();
    const rows = await sql`
      SELECT msg.sender_id, msg.deleted_at FROM messages msg
      JOIN conversations c ON c.id=msg.conversation_id
      JOIN matches m ON m.id=c.match_id
      WHERE msg.id=${messageId} AND c.id=${id} AND m.is_active=TRUE
        AND (m.user_a=${user.id} OR m.user_b=${user.id}) LIMIT 1
    `;
    if (!rows[0]) return Response.json({ error: "Pesan tidak ditemukan." }, { status: 404 });
    if (String(rows[0].sender_id) !== user.id) return Response.json({ error: "Hanya pengirim yang dapat menghapus pesan untuk semua orang." }, { status: 403 });
    if (rows[0].deleted_at) return Response.json({ deleted: true, alreadyDeleted: true });
    await sql`
      UPDATE messages SET body='Pesan ini telah dihapus', image_url=NULL, deleted_at=NOW()
      WHERE id=${messageId} AND conversation_id=${id} AND sender_id=${user.id} AND deleted_at IS NULL
    `;
    return Response.json({ deleted: true });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return Response.json({ error: "Silakan masuk." }, { status: 401 });
    return apiError(error);
  }
}
