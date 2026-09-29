# SAPA - MBTI Friend Finder

SAPA adalah platform pencarian teman platonic berbasis MBTI, minat, hobi, bahasa, dan tujuan pertemanan. Repository ini berisi:

- `apps/web`: Next.js 16 (web app + REST API) untuk Vercel.
- `apps/mobile`: Flutter Android yang memakai REST API yang sama.
- `apps/web/database`: skema dan seed PostgreSQL untuk Neon.

Fitur MVP: autentikasi, onboarding/edit profil, discovery + filter, compatibility score, like/spark, mutual match, chat persisten, read receipt, kirim gambar kecil, inbox notifikasi, blokir/lapor/unmatch, serta AI bio, icebreaker, dan suggested reply.

Skor kecocokan adalah heuristik untuk memulai obrolan: preferensi MBTI, minat, hobi, bahasa, dan tujuan pertemanan. Skor ini bukan prediksi ilmiah keberhasilan hubungan atau klaim bahwa ada pasangan tipe MBTI yang pasti terbaik. Saran Gemini untuk match dan chat mempertimbangkan MBTI kedua orang tanpa mengunci mereka pada stereotip.

APK yang bisa dipasang tersedia di [`release/SAPA-android-preview.apk`](./release/SAPA-android-preview.apk). APK memakai backend `https://sapa-rpl-mbti.vercel.app`, bukan data preview. Lihat [SETUP.md](./SETUP.md) untuk batasan notifikasi saat aplikasi ditutup.

SHA-256 APK: `203571463FF36C49DF49484EB5ADE400DA8B123FCF580B37A9BCB1567B0A6BC2`

Mulai dari [SETUP.md](./SETUP.md) untuk Neon, Gemini API, Vercel, web lokal, dan build APK.
