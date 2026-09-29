import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { setSessionCookie, signSession } from "@/lib/auth";
import { apiError, db } from "@/lib/db";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  fullName: z.string().min(2).max(80),
  username: z.string().min(3).max(24).regex(/^[a-z0-9_]+$/i),
});

export async function POST(request: NextRequest) {
  try {
    const input = schema.parse(await request.json());
    const sql = db();
    const passwordHash = await bcrypt.hash(input.password, 12);
    const userId = randomUUID();
    const [rows] = await sql.transaction([
      sql`INSERT INTO users (id, email, password_hash) VALUES (${userId}, ${input.email.toLowerCase().trim()}, ${passwordHash}) RETURNING id, email`,
      sql`INSERT INTO profiles (user_id, username, full_name, photo_url) VALUES (${userId}, ${input.username.toLowerCase().trim()}, ${input.fullName.trim()}, '/people/default.svg')`,
    ]);
    const user = rows[0];
    const sessionUser = { id: String(user.id), email: String(user.email), username: input.username, fullName: input.fullName };
    const token = await signSession(sessionUser);
    const response = NextResponse.json({ user: sessionUser, token }, { status: 201 });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Data pendaftaran belum valid.", issues: error.issues }, { status: 400 });
    if ((error as { code?: string }).code === "23505") return NextResponse.json({ error: "Email atau username sudah digunakan." }, { status: 409 });
    return apiError(error);
  }
}
