import type { Profile } from "./types";

type ProfileRow = Record<string, unknown>;

export function rowToProfile(row: ProfileRow): Profile {
  const birth = row.birth_date ? new Date(String(row.birth_date)) : null;
  const age = birth ? Math.max(18, new Date().getFullYear() - birth.getFullYear()) : 21;
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
    photoUrl: String(row.photo_url ?? "/people/nara.svg"),
    isOnline: row.is_online === true,
  };
}

