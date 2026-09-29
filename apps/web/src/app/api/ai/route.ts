import { NextRequest } from "next/server";
import { z } from "zod";
import { userFromRequest } from "@/lib/auth";
import { generateAiText } from "@/lib/ai";
import { isDatabaseConfigured } from "@/lib/db";

const schema = z.object({ mode: z.enum(["bio", "icebreaker", "replies"]), context: z.string().min(1).max(4000) });

export async function POST(request: NextRequest) {
  try {
    if (isDatabaseConfigured() && !(await userFromRequest(request))) return Response.json({ error: "Silakan masuk untuk memakai asisten AI." }, { status: 401 });
    const input = schema.parse(await request.json());
    return Response.json(await generateAiText(input.mode, input.context));
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Permintaan AI belum valid." }, { status: 400 });
    console.error(error);
    return Response.json({ error: "Asisten sedang istirahat. Coba lagi sebentar." }, { status: 502 });
  }
}

