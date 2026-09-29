import { NextRequest } from "next/server";
import { userFromRequest } from "@/lib/auth";
import { db, isDatabaseConfigured } from "@/lib/db";
import { rowToProfile } from "@/lib/profiles";

export async function GET(request: NextRequest) {
  const user = await userFromRequest(request);
  if (!user) return Response.json({ user: null }, { status: 401 });
  if (!isDatabaseConfigured()) return Response.json({ user });
  const sql = db();
  const rows = await sql`SELECT *, birth_date::text AS birth_date_text FROM profiles WHERE user_id=${user.id} LIMIT 1`;
  return Response.json({ user, profile: rows[0] ? rowToProfile(rows[0]) : null });
}
