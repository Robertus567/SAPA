import type { Profile } from "./types";

type ProfileRow = Record<string, unknown>;

export function rowToProfile(row: ProfileRow): Profile {
  const birthDate = typeof row.birth_date_text === "string" ? row.birth_date_text : null;
  const birth = birthDate ? new Date(`${birthDate}T00:00:00.000Z`) : null;
  const today = new Date();
  const age = birth ? today.getUTCFullYear() - birth.getUTCFullYear() - (today.getUTCMonth() < birth.getUTCMonth() || (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate()) ? 1 : 0) : 0;
  return {
    id: String(row.user_id ?? row.id),
    username: String(row.username ?? "member"),
    fullName: String(row.full_name ?? "SAPA Member"),
    age,
    city: String(row.city ?? ""),
    country: String(row.country ?? "Indonesia"),
    mbti: String(row.mbti ?? "INFP"),
    languages: (row.languages as string[]) ?? [],
    hobbies: (row.hobbies as string[]) ?? [],
    interests: (row.interests as string[]) ?? [],
    lookingFor: (row.looking_for as string[]) ?? [],
    bio: String(row.bio ?? ""),
    photoUrl: String(row.photo_url ?? "/people/default.svg"),
    isOnline: row.is_online === true,
    birthDate,
    isVisible: row.is_visible !== false,
    onboardingCompleted: row.onboarding_completed === true,
  };
}
