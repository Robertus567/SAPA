# Panduan setup SAPA

## 1. Menjalankan web secara lokal

Persyaratan: Node.js 20+ dan akun Neon. Dari folder `apps/web`:

```powershell
Copy-Item .env.example .env.local
npm install
npm run db:setup
npm run dev
```

Buka `http://localhost:3000`. Tanpa database, landing page dan preview discovery tetap bisa dilihat. Register, match, dan chat persisten memerlukan Neon.

## 2. Membuat database Neon

1. Buat project baru di [Neon](https://console.neon.tech/).
2. Pada dashboard project, salin **pooled connection string**. Pastikan string mengandung `sslmode=require`.
3. Isi `DATABASE_URL` di `apps/web/.env.local`.
4. Buat `JWT_SECRET` minimal 32 karakter. Contoh PowerShell:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

5. Jalankan `npm run db:setup`. Script ini memasang skema dan akun demo.

Akun seed untuk menguji mutual match/chat:

- `nara@sapa.app` / `SapaDemo123!`
- `bima@sapa.app` / `SapaDemo123!`

Ganti atau hapus akun seed sebelum production publik.

Fitur lupa kata sandi sudah aktif. Saat development, API mengembalikan tautan reset langsung. Untuk production, buat API key di [Resend](https://resend.com/), verifikasi domain pengirim, lalu isi `RESEND_API_KEY`, `EMAIL_FROM`, dan `APP_URL`. Tanpa provider email, production sengaja tidak mengekspos token reset.

## 3. Mengaktifkan Gemini AI

1. Buat API key di [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Simpan key hanya sebagai `GEMINI_API_KEY` di server (`.env.local` atau Vercel Environment Variables). Jangan pernah menaruh key di Flutter atau variabel `NEXT_PUBLIC_*`.
3. Isi `GEMINI_MODEL`; default proyek adalah `gemini-3.8-flash`, dan dapat diganti dengan model Gemini yang tersedia di project Google Anda.

Tanpa API key, tiga fitur AI tetap memberi fallback lokal yang aman sehingga UI tidak rusak. Dengan key, endpoint server memakai Gemini Generate Content API untuk bio, icebreaker, dan suggested reply. Pesan juga melewati klasifikasi Gemini dengan safety settings sebelum disimpan.

## 4. Deploy web/backend ke Vercel

1. Folder `apps/web` dibuat sebagai repository Git mandiri oleh scaffold Next.js. Push folder itu ke GitHub, lalu pilih **Add New Project** di Vercel. Jika nanti kamu memilih menjadikan folder induk sebagai satu monorepo, hapus metadata `apps/web/.git` secara manual terlebih dahulu, lalu set **Root Directory** Vercel ke `apps/web`.
2. Untuk repository web mandiri, framework akan terdeteksi sebagai Next.js dan Root Directory dibiarkan default.
3. Tambahkan environment variables untuk Production, Preview, dan Development:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `GEMINI_API_KEY` (opsional)
   - `GEMINI_MODEL` (opsional)
   - `APP_URL` (contoh: `https://sapa-anda.vercel.app`)
   - `RESEND_API_KEY` dan `EMAIL_FROM` (untuk reset password via email)
4. Jalankan skema satu kali dari lokal menggunakan connection string production: `npm run db:setup`.
5. Deploy. Vercel menjalankan `npm run build` otomatis.

Chat menggunakan HTTP polling 3 detik dan penyimpanan Neon. Pendekatan ini tidak memerlukan server WebSocket persisten dan aman untuk runtime serverless Vercel.

## 5. Menjalankan Flutter

Dari `apps/mobile`:

```powershell
flutter pub get
flutter run --dart-define=API_BASE_URL=https://domain-vercel-anda.vercel.app
```

Untuk Android emulator dan web lokal gunakan `http://10.0.2.2:3000`. Untuk HP fisik di Wi-Fi yang sama, gunakan IP LAN komputer, misalnya `http://192.168.1.10:3000`.

## 6. Membuat APK installable

```powershell
flutter build apk --release --dart-define=API_BASE_URL=https://domain-vercel-anda.vercel.app
```

Hasilnya berada di `apps/mobile/build/app/outputs/flutter-apk/app-release.apk`. Aktifkan izin install dari sumber tidak dikenal di Android bila diperlukan. Untuk distribusi Play Store, buat signing key sendiri dan jangan memakai debug key.

Repository ini juga menyertakan `release/SAPA-android-preview.apk` yang dapat langsung dipasang untuk melihat seluruh UI/demo. Karena URL Vercel milikmu belum ada saat paket itu dibuat, login/chat online memerlukan build ulang satu kali menggunakan perintah di atas setelah deploy.

## Checklist production

- Gunakan connection string pooled Neon dan aktifkan backup/retention sesuai kebutuhan.
- Rotasi `JWT_SECRET` dan API key jika pernah terekspos.
- Aktifkan verifikasi email sebelum onboarding publik jika aplikasi dibuka untuk komunitas umum; reset password via email sudah tersedia melalui Resend.
- Pasang rate limiting eksternal (misalnya Vercel Firewall/Upstash) pada auth, chat, dan AI.
- Gunakan object storage untuk foto besar; MVP membatasi gambar chat menjadi data URL <= 900 KB.
- Uji kebijakan privasi, pelaporan, penghapusan akun, dan moderasi dengan data nyata.
