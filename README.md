# SAPA - MBTI Friend Finder

SAPA adalah platform pencarian teman platonic berbasis MBTI, minat, hobi, bahasa, dan tujuan pertemanan. Repository ini berisi:

- `apps/web`: Next.js 16 (web app + REST API) untuk Vercel.
- `apps/mobile`: Flutter Android yang memakai REST API yang sama.
- `apps/web/database`: skema dan seed PostgreSQL untuk Neon.

Fitur MVP: autentikasi, onboarding/edit profil, discovery + filter, compatibility score, like/spark, mutual match, chat persisten, read receipt, kirim gambar kecil, inbox notifikasi, blokir/lapor/unmatch, serta AI bio, icebreaker, dan suggested reply.

APK yang bisa dipasang tersedia di [`release/SAPA-android-preview.apk`](./release/SAPA-android-preview.apk). APK memakai backend `https://sapa-rpl-mbti.vercel.app`, bukan data preview. Lihat [SETUP.md](./SETUP.md) untuk batasan notifikasi saat aplikasi ditutup.

SHA-256 APK: `D62F3E9D90E07E8FCA78DFB3573914BF0DB2FDCC86EE38057592564FEF78EA5B`

Mulai dari [SETUP.md](./SETUP.md) untuk Neon, Gemini API, Vercel, web lokal, dan build APK.
