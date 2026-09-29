import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from "@google/genai";

export type AiMode = "bio" | "icebreaker" | "replies";

const fallbacks: Record<AiMode, (context: string) => string[]> = {
  bio: (context) => [`Penasaran pada hal-hal kecil, suka berbagi cerita, dan selalu terbuka untuk koneksi baru. ${context.slice(0, 90)}`.trim()],
  icebreaker: () => [
    "Kalau kita bikin playlist bareng, lagu pertama yang kamu masukin apa?",
    "Ada hobi yang belakangan ini bikin kamu lupa waktu?",
    "Weekend ideal versimu: eksplor kota atau recharge di rumah?",
  ],
  replies: () => [
    "Wah, ceritain lebih banyak dong - bagian paling serunya yang mana?",
    "Aku relate! Kayaknya kita punya selera yang mirip.",
    "Menarik banget. Kapan pertama kali kamu suka hal itu?",
  ],
};

export async function generateAiText(mode: AiMode, context: string) {
  if (!process.env.GEMINI_API_KEY) return { suggestions: fallbacks[mode](context), fallback: true };

  try {
    const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const instructions: Record<AiMode, string> = {
      bio: "Tulis satu bio profil pertemanan berbahasa Indonesia, natural, hangat, spesifik, maksimal 55 kata. Jangan terdengar seperti iklan atau AI.",
      icebreaker: "Buat tepat 3 pembuka percakapan berbahasa Indonesia berdasarkan profil. Hangat, tidak genit, tidak klise. Satu baris per opsi tanpa nomor.",
      replies: "Buat tepat 3 opsi balasan chat platonic berbahasa Indonesia berdasarkan konteks. Natural dan ringkas. Satu baris per opsi tanpa nomor.",
    };
    const response = await client.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
      contents: context.slice(0, 4000),
      config: {
        systemInstruction: instructions[mode],
        maxOutputTokens: 260,
        temperature: mode === "bio" ? 0.85 : 0.72,
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ],
      },
    });
    const output = response.text?.trim();
    if (!output) return { suggestions: fallbacks[mode](context), fallback: true };
    const lines = output.split("\n").map((line) => line.replace(/^[-*\d.)\s]+/, "").trim()).filter(Boolean);
    return { suggestions: mode === "bio" ? [output] : lines.slice(0, 3), fallback: false };
  } catch (error) {
    console.warn("Gemini unavailable, using local fallback:", (error as Error).message);
    return { suggestions: fallbacks[mode](context), fallback: true };
  }
}

export async function isMessageAllowed(text: string) {
  const blocked = /(bunuh|telanjang|kontol|memek|perkosa|nudes?)/i.test(text);
  if (blocked) return false;
  if (!process.env.GEMINI_API_KEY || !text.trim()) return true;
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const result = await client.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
      contents: `Nilai pesan chat pertemanan berikut. Jawab hanya SAFE atau UNSAFE. UNSAFE bila berisi ancaman, pelecehan, kebencian, ajakan seksual eksplisit, meminta data pribadi sensitif, atau spam berbahaya.\n\nPesan: ${text.slice(0, 2000)}`,
      config: {
        maxOutputTokens: 8,
        temperature: 0,
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
        ],
      },
    });
    return result.text?.trim().toUpperCase() === "SAFE";
  } catch {
    return true;
  }
}
