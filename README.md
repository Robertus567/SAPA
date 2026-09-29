# SAPA - MBTI Friend Finder

SAPA adalah platform pencarian teman platonic berbasis MBTI, minat, hobi, bahasa, dan tujuan pertemanan. Repository ini berisi:

- `apps/web`: Next.js 16 (web app + REST API) untuk Vercel.
- `apps/mobile`: Flutter Android yang memakai REST API yang sama.
- `apps/web/database`: skema dan seed PostgreSQL untuk Neon.

Fitur MVP: autentikasi + reset password, profil, discovery + filter, compatibility score, mutual match, chat persisten, read receipt, kirim gambar kecil, blokir/lapor/unmatch, AI bio, icebreaker, dan suggested reply.

APK yang langsung bisa dipasang tersedia di [`release/SAPA-android-preview.apk`](./release/SAPA-android-preview.apk). Paket ini ditandatangani untuk instalasi langsung dan memakai mode preview jika backend lokal belum tersedia. Setelah web dideploy, build ulang dengan URL Vercel agar register, match, serta chat terhubung ke Neon (lihat panduan).

SHA-256 APK: `C8729D3F9A28E5A6FCB71B3772BB7A4261A67D20725464C0B43D2D7B72667A39`

Mulai dari [SETUP.md](./SETUP.md) untuk Neon, Gemini API, Vercel, web lokal, dan build APK.
