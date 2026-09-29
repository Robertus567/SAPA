import { neon } from "@neondatabase/serverless";

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL belum dikonfigurasi.");
  }
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function db() {
  if (!process.env.DATABASE_URL) throw new DatabaseNotConfiguredError();
  return neon(process.env.DATABASE_URL);
}

export function apiError(error: unknown) {
  console.error(error);
  if (error instanceof DatabaseNotConfiguredError) {
    return Response.json({ error: error.message, code: "DATABASE_NOT_CONFIGURED" }, { status: 503 });
  }
  return Response.json({ error: "Terjadi kendala pada server. Coba lagi sebentar." }, { status: 500 });
}

