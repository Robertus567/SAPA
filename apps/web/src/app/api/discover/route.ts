import { NextRequest } from "next/server";
import { userFromRequest } from "@/lib/auth";
import { compatibilityReasons, compatibilityScore, sharedInterests } from "@/lib/compatibility";
import { apiError, db } from "@/lib/db";
import { rowToProfile } from "@/lib/profiles";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const mbti = search.get("mbti")?.toUpperCase();
  const city = search.get("city")?.toLowerCase();
  const purpose = search.get("purpose")?.toLowerCase();
  const query = search.get("q")?.trim().toLowerCase();

  try {
    const user = await userFromRequest(request);
    if (!user) return Response.json({ error: "Silakan masuk untuk melihat rekomendasi." }, { status: 401 });
    const sql = db();
    const viewerRows = await sql`SELECT *, birth_date::text AS birth_date_text FROM profiles WHERE user_id=${user.id} LIMIT 1`;
    if (!viewerRows[0] || viewerRows[0].onboarding_completed !== true) return Response.json({ error: "Lengkapi profil terlebih dahulu.", code: "ONBOARDING_REQUIRED" }, { status: 409 });
    const candidateRows = await sql`
      SELECT p.*, p.birth_date::text AS birth_date_text, p.last_seen > NOW() - INTERVAL '5 minutes' AS is_online
      FROM profiles p
      WHERE p.user_id <> ${user.id}
        AND p.is_visible=TRUE
        AND p.onboarding_completed=TRUE
        AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id=${user.id} AND b.blocked_id=p.user_id) OR (b.blocker_id=p.user_id AND b.blocked_id=${user.id}))
      ORDER BY p.last_seen DESC
    `;
    const viewer = rowToProfile(viewerRows[0]);
    const profiles = candidateRows
      .map((row) => {
        const profile = rowToProfile(row);
        return { ...profile, compatibility: compatibilityScore(viewer, profile), compatibilityReasons: compatibilityReasons(viewer, profile), sharedInterests: sharedInterests(viewer, profile) };
      })
      .filter((profile) =>
        (!mbti || profile.mbti === mbti) &&
        (!city || profile.city.toLowerCase().includes(city)) &&
        (!purpose || profile.lookingFor.some((item) => item.toLowerCase().includes(purpose))) &&
        (!query || `${profile.fullName} ${profile.username} ${profile.mbti} ${profile.city} ${profile.bio} ${profile.interests.join(" ")}`.toLowerCase().includes(query))
      )
      .sort((a, b) => (b.compatibility ?? 0) - (a.compatibility ?? 0));
    return Response.json({ profiles });
  } catch (error) {
    return apiError(error);
  }
}
