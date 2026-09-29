import { NextRequest } from "next/server";
import { userFromRequest } from "@/lib/auth";
import { compatibilityScore, sharedInterests } from "@/lib/compatibility";
import { apiError, db, isDatabaseConfigured } from "@/lib/db";
import { rowToProfile } from "@/lib/profiles";
import { sampleProfiles } from "@/lib/sample-data";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const mbti = search.get("mbti")?.toUpperCase();
  const city = search.get("city")?.toLowerCase();
  const purpose = search.get("purpose")?.toLowerCase();

  try {
    if (!isDatabaseConfigured()) {
      const profiles = sampleProfiles.filter((profile) =>
        (!mbti || profile.mbti === mbti) &&
        (!city || profile.city.toLowerCase().includes(city)) &&
        (!purpose || profile.lookingFor.some((item) => item.toLowerCase().includes(purpose)))
      );
      return Response.json({ profiles, demo: true });
    }

    const user = await userFromRequest(request);
    if (!user) return Response.json({ error: "Silakan masuk untuk melihat rekomendasi." }, { status: 401 });
    const sql = db();
    const viewerRows = await sql`SELECT * FROM profiles WHERE user_id=${user.id} LIMIT 1`;
    if (!viewerRows[0]) return Response.json({ error: "Lengkapi profil terlebih dahulu." }, { status: 409 });
    const candidateRows = await sql`
      SELECT p.*, p.last_seen > NOW() - INTERVAL '5 minutes' AS is_online
      FROM profiles p
      WHERE p.user_id <> ${user.id}
        AND p.is_visible=TRUE
        AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id=${user.id} AND b.blocked_id=p.user_id) OR (b.blocker_id=p.user_id AND b.blocked_id=${user.id}))
        AND NOT EXISTS (SELECT 1 FROM likes l WHERE l.from_user=${user.id} AND l.to_user=p.user_id)
      ORDER BY p.last_seen DESC LIMIT 40
    `;
    const viewer = rowToProfile(viewerRows[0]);
    const profiles = candidateRows
      .map((row) => {
        const profile = rowToProfile(row);
        return { ...profile, compatibility: compatibilityScore(viewer, profile), sharedInterests: sharedInterests(viewer, profile) };
      })
      .filter((profile) =>
        (!mbti || profile.mbti === mbti) &&
        (!city || profile.city.toLowerCase().includes(city)) &&
        (!purpose || profile.lookingFor.some((item) => item.toLowerCase().includes(purpose)))
      )
      .sort((a, b) => (b.compatibility ?? 0) - (a.compatibility ?? 0));
    return Response.json({ profiles, demo: false });
  } catch (error) {
    return apiError(error);
  }
}
