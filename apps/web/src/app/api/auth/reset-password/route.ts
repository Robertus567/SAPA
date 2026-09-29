import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, db } from "@/lib/db";

const schema = z.object({ token: z.string().length(64), password: z.string().min(8).max(72) });

export async function POST(request: NextRequest) {
  try {
    const input = schema.parse(await request.json());
    const tokenHash = createHash("sha256").update(input.token).digest("hex");
    const passwordHash = await bcrypt.hash(input.password, 12);
    const sql = db();
    const rows = await sql`
      WITH consumed AS (
        UPDATE password_reset_tokens SET used_at=NOW()
        WHERE token_hash=${tokenHash} AND used_at IS NULL AND expires_at>NOW()
        RETURNING user_id
      )
      UPDATE users SET password_hash=${passwordHash}, updated_at=NOW()
      WHERE id=(SELECT user_id FROM consumed)
      RETURNING id
    `;
    if (!rows[0]) return Response.json({ error: "Tautan reset tidak valid atau sudah kedaluwarsa." }, { status: 400 });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Token atau kata sandi baru tidak valid." }, { status: 400 });
    return apiError(error);
  }
}
