"use client";
/* eslint-disable @next/next/no-img-element -- local SVG profile art does not need image optimization. */

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Sparkles } from "lucide-react";
import { Brand } from "./brand";

export function AuthForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [register, setRegister] = useState(params.get("mode") === "register");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setSuccess("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const endpoint = `/api/auth/${register ? "register" : "login"}`;
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Belum berhasil masuk.");
      if (register) { setSuccess("Akun berhasil dibuat! Yuk lengkapi profilmu ✦"); window.setTimeout(() => router.push("/onboarding"), 850); }
      else router.push("/app");
    } catch (caught) { setError((caught as Error).message); } finally { setBusy(false); }
  }

  return <main className="auth-page"><section className="auth-art"><Link className="back-link" href="/"><ArrowLeft /> Kembali</Link><div className="auth-collage"><img className="auth-face face-a" src="/people/nara.svg" alt="" /><img className="auth-face face-b" src="/people/bima.svg" alt="" /><img className="auth-face face-c" src="/people/keisha.svg" alt="" /><div className="auth-quote"><Sparkles /><p>“Koneksi terbaik sering dimulai dari keberanian kecil untuk bilang halo.”</p></div></div><div className="auth-art-copy"><span>PLATONIC. PERSONAL. POSITIVE.</span><h2>Temukan ruang untuk menjadi dirimu sendiri.</h2></div></section>
    <section className="auth-form-wrap"><Brand /><form onSubmit={submit} className="auth-form"><div><span className="overline">{register ? "MULAI PERJALANANMU" : "SELAMAT DATANG KEMBALI"}</span><h1>{register ? "Buat profilmu." : "Mari lanjut ngobrol."}</h1><p>{register ? "Hanya butuh dua menit untuk memulai." : "Masuk ke ruang pertemananmu."}</p></div>{register && <div className="form-split"><label>Nama lengkap<input name="fullName" placeholder="Nama lengkapmu" required minLength={2} /></label><label>Username<input name="username" placeholder="username" required minLength={3} /></label></div>}<label>Email<input name="email" type="email" placeholder="kamu@email.com" required /></label><label>Kata sandi<div className="password-field"><input name="password" type={showPassword ? "text" : "password"} placeholder="Minimal 8 karakter" required minLength={8} /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label>{error && <p className="form-error" role="alert">{error}</p>}{success && <p className="form-success" role="status"><Sparkles size={16} /> {success}</p>}<button className="button button-primary auth-submit" disabled={busy || Boolean(success)}>{busy ? "Menyiapkan..." : register ? "Buat akun" : "Masuk ke SAPA"}<ArrowRight /></button><p className="auth-switch">{register ? "Sudah punya akun?" : "Belum punya akun?"} <button type="button" onClick={() => { setRegister(!register); setError(""); setSuccess(""); }}>{register ? "Masuk" : "Daftar gratis"}</button></p></form></section></main>;
}
