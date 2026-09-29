import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { setSessionCookie, signSession } from "@/lib/auth";
import { apiError, db } from "@/lib/db";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(request: NextRequest) {
  try {
    const input = schema.parse(await request.json());
    const sql = db();
    const rows = await sql`
      SELECT u.id, u.email, u.password_hash, p.username, p.full_name
      FROM users u LEFT JOIN profiles p ON p.user_id=u.id
      WHERE u.email=${input.email.toLowerCase()} LIMIT 1
    `;
    const row = rows[0];
    if (!row || !(await bcrypt.compare(input.password, String(row.password_hash)))) {
      return NextResponse.json({ error: "Email atau kata sandi salah." }, { status: 401 });
    }
    const user = { id: String(row.id), email: String(row.email), username: String(row.username ?? ""), fullName: String(row.full_name ?? "") };
    const token = await signSession(user);
    const response = NextResponse.json({ user, token });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Masukkan email dan kata sandi yang valid." }, { status: 400 });
    return apiError(error);
  }
}

