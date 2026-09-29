import bcrypt from "bcryptjs";
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
    const rows = await sql`
      INSERT INTO users (email, password_hash)
      VALUES (${input.email.toLowerCase()}, ${passwordHash})
      RETURNING id, email
    `;
    const user = rows[0];
    await sql`
      INSERT INTO profiles (user_id, username, full_name)
      VALUES (${user.id}, ${input.username.toLowerCase()}, ${input.fullName})
    `;
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

