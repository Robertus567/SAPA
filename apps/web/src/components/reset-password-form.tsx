"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, KeyRound } from "lucide-react";
import { Brand } from "./brand";

export function ResetPasswordForm() {
  const token = useSearchParams().get("token") || "";
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (data.password !== data.confirmPassword) { setError("Konfirmasi kata sandi belum sama."); setBusy(false); return; }
    try {
      const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password: data.password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Reset belum berhasil.");
      setDone(true);
    } catch (caught) { setError((caught as Error).message); } finally { setBusy(false); }
  }

  return <main className="recovery-page"><Link href="/login" className="back-link"><ArrowLeft /> Kembali ke login</Link><section className="recovery-card"><Brand /><div className="recovery-icon"><KeyRound /></div>{done ? <><h1>Kata sandi diperbarui.</h1><p>Kamu sudah bisa masuk kembali dan melanjutkan percakapanmu.</p><Link className="button button-primary" href="/login">Masuk sekarang</Link></> : <form onSubmit={submit}><h1>Buat kata sandi baru.</h1><p>Gunakan minimal 8 karakter yang tidak kamu pakai di akun lain.</p>{!token && <p className="form-error">Token reset tidak ditemukan pada tautan ini.</p>}<label>Kata sandi baru<input name="password" type="password" minLength={8} maxLength={72} required /></label><label>Ulangi kata sandi<input name="confirmPassword" type="password" minLength={8} maxLength={72} required /></label>{error && <p className="form-error">{error}</p>}<button className="button button-primary" disabled={busy || !token}>{busy ? "Menyimpan..." : "Simpan kata sandi"}</button></form>}</section></main>;
}
