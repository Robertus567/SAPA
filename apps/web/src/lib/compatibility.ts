import type { Profile } from "./types";

const validType = (type: string) => /^[EI][NS][FT][JP]$/.test(type);

const overlap = (a: string[] = [], b: string[] = []) => {
  if (!a.length || !b.length) return 0;
  const left = new Set(a.map((item) => item.toLowerCase()));
  const right = new Set(b.map((item) => item.toLowerCase()));
  const shared = [...left].filter((item) => right.has(item)).length;
  return shared / new Set([...left, ...right]).size;
};

export function mbtiAffinity(a: string, b: string) {
  const left = a.toUpperCase();
  const right = b.toUpperCase();
  if (!validType(left) || !validType(right)) return 0.65;
  // An exploratory conversation-fit heuristic, not a scientific relationship prediction.
  // Shared N/S and F/T preferences help conversation flow; differing E/I and J/P
  // preferences can add complementary perspectives without being ranked as "better".
  return 0.48
    + (left[0] === right[0] ? 0.05 : 0.07)
    + (left[1] === right[1] ? 0.17 : 0.03)
    + (left[2] === right[2] ? 0.14 : 0.05)
    + (left[3] === right[3] ? 0.06 : 0.08);
}

export function compatibilityReasons(viewer: Profile, candidate: Profile) {
  const a = viewer.mbti.toUpperCase();
  const b = candidate.mbti.toUpperCase();
  const reasons: string[] = [];
  if (validType(a) && validType(b)) {
    reasons.push(a[1] === b[1]
      ? a[1] === "N" ? "Sama-sama menikmati ide, kemungkinan, dan obrolan mendalam." : "Sama-sama nyaman membahas pengalaman yang konkret."
      : "Cara melihat dunia berbeda; contoh nyata bisa menjembatani obrolan.");
    reasons.push(a[2] === b[2]
      ? a[2] === "F" ? "Sama-sama peka pada sisi personal sebuah cerita." : "Sama-sama suka bertukar alasan dan sudut pandang."
      : "Satu cenderung memulai dari empati, satu dari analisis—keduanya bisa saling melengkapi.");
    if (a[0] !== b[0]) reasons.push("Ritme sosial berbeda; beri ruang untuk aktif dan rehat bergantian.");
    else if (a[3] !== b[3]) reasons.push("Satu lebih terencana, satu lebih spontan; sepakati ritme yang nyaman.");
  }
  const shared = sharedInterests(viewer, candidate);
  if (shared.length) reasons.push(`Kalian sama-sama suka ${shared.slice(0, 2).join(" dan ")}.`);
  return reasons.slice(0, 4);
}

export function compatibilityScore(viewer: Profile, candidate: Profile) {
  const mbti = mbtiAffinity(viewer.mbti, candidate.mbti) * 40;
  const interests = overlap(viewer.interests, candidate.interests) * 25;
  const hobbies = overlap(viewer.hobbies, candidate.hobbies) * 15;
  const languages = overlap(viewer.languages, candidate.languages) * 10;
  const preferences = overlap(viewer.lookingFor, candidate.lookingFor) * 10;
  return Math.max(0, Math.min(100, Math.round(mbti + interests + hobbies + languages + preferences)));
}

export function sharedInterests(viewer: Profile, candidate: Profile) {
  const candidateSet = new Set(candidate.interests.map((item) => item.toLowerCase()));
  return viewer.interests.filter((item) => candidateSet.has(item.toLowerCase()));
}
