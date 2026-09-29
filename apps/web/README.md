# SAPA Web + API

Next.js web app sekaligus REST backend untuk SAPA. Target deployment adalah Vercel, dengan PostgreSQL Neon, session JWT HTTP-only, dan Gemini API yang hanya dipanggil dari server.

Untuk repository monorepo ini, atur **Root Directory** project Vercel ke `apps/web`.

```powershell
Copy-Item .env.example .env.local
npm install
npm run db:setup
npm run dev
```

Lihat [`../../SETUP.md`](../../SETUP.md) untuk konfigurasi Neon, Gemini, email reset password, Vercel, dan Flutter.
