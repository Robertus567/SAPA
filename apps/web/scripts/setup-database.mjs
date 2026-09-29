import dotenv from "dotenv";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";

dotenv.config({ path: ".env.local" });
dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL tidak ditemukan. Salin .env.example ke .env.local lalu isi Neon connection string.");
  process.exit(1);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const schema = await readFile(path.join(here, "..", "database", "schema.sql"), "utf8");
const sql = neon(process.env.DATABASE_URL);

for (const statement of schema.split(";").map((item) => item.trim()).filter(Boolean)) {
  await sql.query(statement, []);
}

const passwordHash = await bcrypt.hash("SapaDemo123!", 12);
const people = [
  ["nara@sapa.app", "nara", "Nara Putri", "INFP", "Bandung", "/people/nara.svg", ["Indie music", "Film", "Psikologi", "Kucing"], ["Journaling", "Cafe hopping", "Fotografi"], "Anak visual yang suka percakapan panjang, toko buku kecil, dan playlist yang dibuat terlalu serius."],
  ["bima@sapa.app", "bimaworks", "Bima Ardhana", "ENFJ", "Jakarta", "/people/bima.svg", ["Film", "Psikologi", "Indie music", "Travel"], ["Basket", "Ngopi", "Volunteer"], "People person yang selalu punya rekomendasi tempat makan. Lagi cari teman buat proyek kecil dan eksplor kota."],
  ["keisha@sapa.app", "keishacodes", "Keisha Aulia", "INTP", "Yogyakarta", "/people/keisha.svg", ["Tech", "Game", "Film", "Japanese"], ["Coding", "Anime", "Board game"], "Bisa membahas bug tiga jam, lalu kalah telak di board game."],
  ["raka@sapa.app", "rakawanders", "Raka Pradipta", "ENTP", "Surabaya", "/people/raka.svg", ["Fotografi", "Startup", "Jazz", "Travel"], ["Lari", "Street photo", "Podcast"], "Suka ide random, jalan kaki tanpa tujuan, dan memotret kota sebelum matahari bangun."],
  ["salva@sapa.app", "salvareads", "Salva Nirmala", "INFJ", "Malang", "/people/salva.svg", ["Buku", "Film", "K-pop", "Psikologi"], ["Membaca", "Baking", "Pilates"], "Pembaca sunyi yang ternyata cerewet kalau sudah membahas buku dan film coming-of-age."],
];

const ids = new Map();
for (const person of people) {
  const [email, username, fullName, mbti, city, photoUrl, interests, hobbies, bio] = person;
  const users = await sql`
    INSERT INTO users (email, password_hash, email_verified_at)
    VALUES (${email}, ${passwordHash}, NOW())
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
    RETURNING id
  `;
  const id = users[0].id;
  ids.set(username, id);
  await sql`
    INSERT INTO profiles (user_id, username, full_name, birth_date, city, mbti, languages, hobbies, interests, looking_for, bio, photo_url, onboarding_completed)
    VALUES (${id}, ${username}, ${fullName}, '2002-05-14', ${city}, ${mbti}, ARRAY['Indonesia','English'], ${hobbies}, ${interests}, ARRAY['Teman baru','Study buddy'], ${bio}, ${photoUrl}, TRUE)
    ON CONFLICT (user_id) DO UPDATE SET full_name=EXCLUDED.full_name, city=EXCLUDED.city, mbti=EXCLUDED.mbti,
      hobbies=EXCLUDED.hobbies, interests=EXCLUDED.interests, bio=EXCLUDED.bio, photo_url=EXCLUDED.photo_url, onboarding_completed=TRUE
  `;
}

const nara = ids.get("nara");
const bima = ids.get("bimaworks");
await sql`INSERT INTO likes (from_user, to_user) VALUES (${nara}, ${bima}) ON CONFLICT DO NOTHING`;
await sql`INSERT INTO likes (from_user, to_user) VALUES (${bima}, ${nara}) ON CONFLICT DO NOTHING`;
await sql`INSERT INTO matches (user_a, user_b) VALUES (${nara}, ${bima}) ON CONFLICT DO NOTHING`;
const matches = await sql`
  SELECT id FROM matches
  WHERE (user_a=${nara} AND user_b=${bima}) OR (user_a=${bima} AND user_b=${nara})
  LIMIT 1
`;
const conversations = await sql`
  INSERT INTO conversations (match_id) VALUES (${matches[0].id})
  ON CONFLICT (match_id) DO UPDATE SET match_id=EXCLUDED.match_id
  RETURNING id
`;
const existing = await sql`SELECT COUNT(*)::int AS count FROM messages WHERE conversation_id=${conversations[0].id}`;
if (existing[0].count === 0) {
  await sql`INSERT INTO messages (conversation_id, sender_id, body) VALUES (${conversations[0].id}, ${bima}, 'Hai Nara! Aku lihat kita sama-sama suka film dan musik indie. Film terakhir yang bikin kamu kepikiran apa?')`;
}

console.log("Database SAPA siap. Akun demo: nara@sapa.app / SapaDemo123!");
