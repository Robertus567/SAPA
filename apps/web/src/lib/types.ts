export type Profile = {
  id: string;
  username: string;
  fullName: string;
  age: number;
  city: string;
  country: string;
  mbti: string;
  languages: string[];
  hobbies: string[];
  interests: string[];
  lookingFor: string[];
  bio: string;
  photoUrl: string;
  compatibility?: number;
  sharedInterests?: string[];
  isOnline?: boolean;
  birthDate?: string | null;
  isVisible?: boolean;
  onboardingCompleted?: boolean;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  body: string;
  imageUrl?: string | null;
  createdAt: string;
  readAt?: string | null;
};

export type SessionUser = {
  id: string;
  email: string;
  username?: string;
  fullName?: string;
};
