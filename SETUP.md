# Panduan setup SAPA

## 1. Menjalankan web secara lokal

Persyaratan: Node.js 20+ dan akun Neon. Dari folder `apps/web`:

```powershell
Copy-Item .env.example .env.local
npm install
npm run db:setup
npm run dev
```

Buka `http://localhost:3000`. Akun, Discover, match, chat, dan notifikasi memakai database Neon yang sama dengan APK.

## 2. Membuat database Neon

1. Buat project baru di [Neon](https://console.neon.tech/).
2. Pada dashboard project, salin **pooled connection string**. Pastikan string mengandung `sslmode=require`.
3. Isi `DATABASE_URL` di `apps/web/.env.local`.
4. Buat `JWT_SECRET` minimal 32 karakter. Contoh PowerShell:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

5. Jalankan `npm run db:setup` **sekali** untuk memasang skema dan lima profil contoh. Jangan jalankan ulang untuk migrasi database yang sudah dipakai karena script seed dapat memperbarui akun contoh.

Untuk **database Neon yang sudah berisi akun/chat**, jalankan migrasi aditif berikut dari `apps/web` sebelum memakai versi reply/hapus pesan. Perintah ini aman dijalankan ulang dan tidak mereset data:

```powershell
npm run db:migrate
```

Migrasi menambah kolom referensi balasan dan penanda pesan dihapus. Pada Neon project SAPA yang dipakai pengembangan, migrasi ini sudah dijalankan; jalankan lagi hanya bila menggunakan database lain. Jangan jalankan `db:setup` lagi untuk upgrade.

Akun seed untuk menguji mutual match/chat:

- `nara@sapa.app` / `SapaDemo123!`
- `bima@sapa.app` / `SapaDemo123!`

Akun contoh membantu mengisi Discover untuk tugas. Jangan gunakan kata sandinya untuk akun pribadi. Email pengiriman/reset password tidak diperlukan untuk alur utama dan tidak ditampilkan pada UI.

## 3. Mengaktifkan Gemini AI

1. Buat API key di [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Simpan key hanya sebagai `GEMINI_API_KEY` di server (`.env.local` atau Vercel Environment Variables). Jangan pernah menaruh key di Flutter atau variabel `NEXT_PUBLIC_*`.
3. Isi `GEMINI_MODEL=gemini-3.8-flash`. Jika model itu sementara penuh (`503`/`429`), server mencoba `gemini-3.5-flash-lite` sebelum fallback lokal. Ketersediaan dan kuota tergantung project Google Anda.

Tanpa API key atau saat layanan sibuk, bio/icebreaker/balasan tetap punya fallback lokal agar UI tidak rusak. Dengan key aktif, endpoint server memakai Gemini untuk ketiganya dan untuk klasifikasi pesan. Fallback lokal **bukan** moderasi AI setara; gunakan pengawasan manusia jika aplikasi dibuka untuk publik.

## 4. Deploy web/backend ke Vercel

1. Hubungkan repo `Robertus567/SAPA` ke project Vercel `sapa-rpl-mbti`.
2. Di **Settings → Build and Deployment**, set **Root Directory** ke `apps/web`, **Framework Preset** ke `Next.js`, dan biarkan Build Command default (`next build`). Simpan perubahan lalu buat deployment baru dari commit terbaru; pengaturan root tidak mengubah deployment lama.
3. Di **Settings → Environment Variables**, tambahkan untuk Production (dan Preview bila diperlukan):
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `GEMINI_API_KEY` (key Google AI Studio, server-only)
   - `GEMINI_MODEL=gemini-3.8-flash`
   - `APP_URL=https://sapa-rpl-mbti.vercel.app`
   Jangan menambahkan prefix `NEXT_PUBLIC_` pada rahasia apa pun. `DATABASE_URL` adalah pooled connection string yang sama dari Neon; tempel **nilainya**, bukan nama variabelnya.
4. Jika database masih kosong, jalankan `npm run db:setup` **sekali** dari `apps/web` setelah `.env.local` terisi. Jika sudah berisi data, jalankan `npm run db:migrate` untuk skema chat baru.
5. Push ke branch `main` atau klik Deploy pada commit terbaru. Periksa deployment baru, bukan URL deployment lama yang berstatus *Stale*.

Chat, balasan berkutip, penghapusan pesan, dan notifikasi disimpan di Neon yang sama untuk web dan APK, lalu disegarkan berkala (polling). Saat layar aktif, chat diperiksa sekitar tiap 2 detik dan aktivitas lain sekitar tiap 5 detik; ini mendekati waktu nyata, bukan WebSocket/push instan. Penghapusan untuk semua orang hanya boleh oleh pengirim; kutipan pesan yang dihapus berubah menjadi penanda penghapusan. Tidak perlu server WebSocket persisten.

## 5. Menjalankan Flutter

Dari `apps/mobile`:

```powershell
flutter pub get
flutter run --dart-define=API_BASE_URL=https://sapa-rpl-mbti.vercel.app
```

Jika `API_BASE_URL` tidak diisi, APK memakai `https://sapa-rpl-mbti.vercel.app`. Untuk Android emulator dengan backend lokal gunakan `http://10.0.2.2:3000`; untuk HP fisik di Wi-Fi yang sama gunakan IP LAN komputer.

## 6. Membuat APK installable

```powershell
flutter build apk --release --dart-define=API_BASE_URL=https://sapa-rpl-mbti.vercel.app
```

Hasilnya berada di `apps/mobile/build/app/outputs/flutter-apk/app-release.apk`. Aktifkan izin install dari sumber tidak dikenal di Android bila diperlukan. Untuk distribusi Play Store, buat signing key sendiri dan jangan memakai debug key.

Repository menyertakan `release/SAPA-android-preview.apk`, yaitu build yang diarahkan ke deployment Vercel SAPA. APK bertanda tangan debug untuk instalasi tugas/uji pribadi, **bukan** distribusi Play Store. Web harus sudah menjalankan backend terbaru sebelum aplikasi mobile dapat memakai endpoint notifikasi.

Notifikasi like/match/pesan tersimpan di inbox web dan APK. Android juga menampilkan notifikasi sistem untuk aktivitas baru selama proses aplikasi masih berjalan dan izin notifikasi diberikan. Push saat aplikasi **tertutup total** memerlukan integrasi FCM/Firebase dan konfigurasi project Android tambahan; fitur itu belum disiapkan.

Uji alur backend dua akun tanpa menyisakan akun uji: jalankan `npm run build`, `npm run start`, lalu `node scripts/smoke-flow.mjs` dari `apps/web`. Script otomatis menghapus dua akun yang dibuatnya.

## Checklist production

- Gunakan connection string pooled Neon dan aktifkan backup/retention sesuai kebutuhan.
- Rotasi `JWT_SECRET` dan API key jika pernah terekspos.
- Sebelum membuka aplikasi untuk publik, tambahkan verifikasi akun, pemulihan sandi, dan kebijakan privasi yang sesuai.
- Pasang rate limiting eksternal (misalnya Vercel Firewall/Upstash) pada auth, chat, dan AI.
- Gunakan object storage untuk foto besar; MVP membatasi gambar chat menjadi data URL <= 900 KB.
- Uji kebijakan privasi, pelaporan, penghapusan akun, dan moderasi dengan data nyata.
