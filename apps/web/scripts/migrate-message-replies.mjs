import dotenv from "dotenv";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.local"), quiet: true });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum diatur.");

const sql = neon(process.env.DATABASE_URL);
const source = await readFile(path.join(root, "database", "migrations", "001_message_replies.sql"), "utf8");
for (const statement of source.split(";").map((item) => item.trim()).filter(Boolean)) {
  await sql.query(statement, []);
}
console.log("Migrasi reply dan hapus pesan selesai. Tidak ada pesan lama yang diubah.");
