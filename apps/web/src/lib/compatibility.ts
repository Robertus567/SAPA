import type { Profile } from "./types";

const mbtiPairs: Record<string, string[]> = {
  INFP: ["ENFJ", "ENTJ", "INFJ"], ENFP: ["INFJ", "INTJ", "ENFJ"],
  INFJ: ["ENFP", "ENTP", "INFP"], ENFJ: ["INFP", "ISFP", "ENFP"],
  INTJ: ["ENFP", "ENTP", "INFJ"], ENTJ: ["INFP", "INTP", "ENTP"],
  INTP: ["ENTJ", "ESTJ", "ENTP"], ENTP: ["INFJ", "INTJ", "ENFP"],
  ISFP: ["ENFJ", "ESFJ", "INFP"], ESFP: ["ISFJ", "ISTJ", "ESFJ"],
  ISFJ: ["ESFP", "ESTP", "ISFP"], ESFJ: ["ISFP", "ISTP", "ESFP"],
  ISTP: ["ESFJ", "ESTJ", "ISFP"], ESTP: ["ISFJ", "ISTJ", "ESFP"],
  ISTJ: ["ESFP", "ESTP", "ISFJ"], ESTJ: ["INTP", "ISTP", "ISFJ"],
};

const overlap = (a: string[] = [], b: string[] = []) => {
  if (!a.length || !b.length) return 0;
  const left = new Set(a.map((item) => item.toLowerCase()));
  const right = new Set(b.map((item) => item.toLowerCase()));
  const shared = [...left].filter((item) => right.has(item)).length;
  return shared / new Set([...left, ...right]).size;
};

export function mbtiAffinity(a: string, b: string) {
  if (a === b) return 0.82;
  if (mbtiPairs[a]?.includes(b)) return 1;
  const sameLetters = [...a].filter((letter, index) => letter === b[index]).length;
  return 0.45 + sameLetters * 0.1;
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

