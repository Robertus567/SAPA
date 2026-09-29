# SAPA Mobile

Flutter client untuk SAPA. Aplikasi memakai REST API nyata dari `apps/web`, dengan URL Vercel SAPA sebagai default.

```powershell
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

Untuk HP fisik, ganti URL dengan IP LAN komputer atau URL Vercel. Detail lengkap, build APK, dan catatan signing tersedia di [`../../SETUP.md`](../../SETUP.md).
