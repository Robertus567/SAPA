import { createHash, randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, db, isDatabaseConfigured } from "@/lib/db";

const schema = z.object({ email: z.string().email() });
const genericMessage = "Jika email terdaftar, tautan reset akan dikirim dan berlaku selama 30 menit.";

export async function POST(request: NextRequest) {
  try {
    const { email } = schema.parse(await request.json());
    if (!isDatabaseConfigured()) return Response.json({ message: genericMessage, demo: true });
    const sql = db();
    const users = await sql`SELECT id, email FROM users WHERE email=${email.toLowerCase()} LIMIT 1`;
    if (!users[0]) return Response.json({ message: genericMessage });

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await sql`DELETE FROM password_reset_tokens WHERE user_id=${users[0].id} OR expires_at<NOW()`;
    await sql`INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (${users[0].id}, ${tokenHash}, NOW() + INTERVAL '30 minutes')`;
    const appUrl = process.env.APP_URL || request.nextUrl.origin;
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
      const mail = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM,
          to: [String(users[0].email)],
          subject: "Reset kata sandi SAPA",
          html: `<div style="font-family:Arial,sans-serif;color:#17233d"><h1>Halo dari SAPA 👋</h1><p>Klik tombol berikut untuk membuat kata sandi baru. Tautan berlaku 30 menit.</p><p><a href="${resetUrl}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#ff6b4a;color:#fff;text-decoration:none;font-weight:700">Reset kata sandi</a></p><p>Jika kamu tidak meminta ini, abaikan email ini.</p></div>`,
        }),
      });
      if (!mail.ok) return Response.json({ error: "Email reset belum dapat dikirim. Periksa konfigurasi provider email." }, { status: 502 });
      return Response.json({ message: genericMessage });
    }

    if (process.env.NODE_ENV !== "production" || process.env.DEV_SHOW_RESET_LINK === "true") {
      return Response.json({ message: "Mode pengembangan: buka tautan reset berikut.", resetUrl });
    }
    return Response.json({ error: "Provider email belum dikonfigurasi." }, { status: 503 });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Masukkan alamat email yang valid." }, { status: 400 });
    return apiError(error);
  }
}
