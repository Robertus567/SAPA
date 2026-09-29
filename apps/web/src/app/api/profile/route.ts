import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { apiError, db } from "@/lib/db";
import { rowToProfile } from "@/lib/profiles";

const profileSchema = z.object({
  fullName: z.string().min(2).max(80),
  birthDate: z.string().optional(),
  city: z.string().max(80),
  country: z.string().max(80).default("Indonesia"),
  mbti: z.string().regex(/^[EI][NS][TF][JP]$/),
  languages: z.array(z.string()).max(8),
  hobbies: z.array(z.string()).max(12),
  interests: z.array(z.string()).max(12),
  lookingFor: z.array(z.string()).max(8),
  bio: z.string().max(600),
  photoUrl: z.string().max(1_300_000).optional(),
  isVisible: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const sql = db();
    const rows = await sql`SELECT * FROM profiles WHERE user_id=${user.id}`;
    return Response.json({ profile: rows[0] ? rowToProfile(rows[0]) : null });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return Response.json({ error: "Silakan masuk." }, { status: 401 });
    return apiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const input = profileSchema.parse(await request.json());
    const sql = db();
    const rows = await sql`
      UPDATE profiles SET
        full_name=${input.fullName}, birth_date=${input.birthDate || null}, city=${input.city}, country=${input.country},
        mbti=${input.mbti}, languages=${input.languages}, hobbies=${input.hobbies}, interests=${input.interests},
        looking_for=${input.lookingFor}, bio=${input.bio}, photo_url=COALESCE(${input.photoUrl || null}, photo_url),
        is_visible=COALESCE(${input.isVisible ?? null}, is_visible), onboarding_completed=TRUE, last_seen=NOW()
      WHERE user_id=${user.id} RETURNING *
    `;
    return Response.json({ profile: rowToProfile(rows[0]) });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Profil belum valid.", issues: error.issues }, { status: 400 });
    if ((error as Error).message === "UNAUTHORIZED") return Response.json({ error: "Silakan masuk." }, { status: 401 });
    return apiError(error);
  }
}
