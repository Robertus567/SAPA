"use client";
/* eslint-disable @next/next/no-img-element -- preview supports a freshly selected data URL. */

import { ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Camera, Check, Sparkles } from "lucide-react";
import { Brand } from "./brand";
import type { Profile } from "@/lib/types";

const mbtiTypes = ["INFP","ENFP","INFJ","ENFJ","INTJ","ENTJ","INTP","ENTP","ISFP","ESFP","ISFJ","ESFJ","ISTP","ESTP","ISTJ","ESTJ"];
const choices = ["Film", "Indie music", "Game", "Buku", "Fotografi", "Tech", "Psikologi", "K-pop", "Travel", "Olahraga", "Anime", "Kuliner"];

export function ProfileSetup({ editing = false }: { editing?: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [city, setCity] = useState("");
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mbti, setMbti] = useState("INFP");
  const [selected, setSelected] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("/people/default.svg");
  const [existingProfile, setExistingProfile] = useState<Profile | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" }).then(async (response) => {
      if (response.status === 401) { router.replace("/login"); return; }
      if (!response.ok) throw new Error("Profil gagal dimuat.");
      const data = await response.json();
      if (!active) return;
      const profile = data.profile as Profile | null;
      setExistingProfile(profile);
      setFullName(profile?.fullName === "SAPA Member" ? "" : profile?.fullName || data.user?.fullName || "");
      setBirthDate(profile?.birthDate || "");
      setCity(profile?.city || "");
      setMbti(profile?.mbti || "INFP");
      setSelected(profile?.interests || []);
      setBio(profile?.bio || "");
      setPhotoUrl(profile?.photoUrl || "/people/default.svg");
      setReady(true);
    }).catch(() => { if (active) setError("Profil gagal dimuat. Coba segarkan halaman."); });
    return () => { active = false; };
  }, [router]);

  function toggle(item: string) { setSelected((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item]); }
  function choosePhoto(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 800_000) { setError("Pilih JPG, PNG, atau WebP maksimal 800 KB."); return; } const reader = new FileReader(); reader.onload = () => setPhotoUrl(String(reader.result)); reader.readAsDataURL(file); }

  async function generateBio() {
    setAiBusy(true); setError("");
    try {
      const response = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "bio", context: `Nama ${fullName}. MBTI ${mbti}. Minat: ${selected.join(", ")}. Kota ${city}. Buat bio pertemanan yang singkat dan personal.` }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error); setBio(data.suggestions?.[0] || "");
    } catch (caught) { setError((caught as Error).message || "Gemini belum tersedia."); } finally { setAiBusy(false); }
  }

  function next() {
    if (step === 1) {
      if (fullName.trim().length < 2) { setError("Nama lengkap minimal dua karakter."); return; }
      if (!birthDate) { setError("Masukkan tanggal lahirmu."); return; }
      const birth = new Date(`${birthDate}T00:00:00Z`); const today = new Date();
      const age = today.getUTCFullYear() - birth.getUTCFullYear() - (today.getUTCMonth() < birth.getUTCMonth() || (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate()) ? 1 : 0);
      if (!Number.isFinite(age) || age < 18 || age > 100) { setError("Usia harus antara 18–100 tahun."); return; }
      if (city.trim().length < 2) { setError("Masukkan nama kota minimal dua karakter."); return; }
    }
    if (step === 2 && selected.length < 3) { setError("Pilih minimal tiga minat."); return; }
    setError(""); setStep(step + 1); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    if (bio.trim().length < 10) { setError("Bio minimal 10 karakter agar teman baru bisa mengenalmu."); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: fullName.trim(), birthDate, city: city.trim(), country: existingProfile?.country || "Indonesia", mbti, languages: existingProfile?.languages?.length ? existingProfile.languages : ["Indonesia"], hobbies: existingProfile?.hobbies?.length ? existingProfile.hobbies : selected.slice(0, 5), interests: selected, lookingFor: existingProfile?.lookingFor?.length ? existingProfile.lookingFor : ["Teman baru", "Study buddy"], bio: bio.trim(), photoUrl, isVisible: existingProfile?.isVisible ?? true }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Profil belum tersimpan."); setSaved(true); window.setTimeout(() => router.replace("/app"), 1200);
    } catch (caught) { setError((caught as Error).message); } finally { setBusy(false); }
  }

  return <main className="onboarding-page"><header><Brand /><button aria-label="Kembali" onClick={() => step > 1 ? setStep(step - 1) : router.back()}><ArrowLeft /> Kembali</button><span>LANGKAH {step} DARI 3</span></header><div className="progress"><i style={{ width: `${step * 33.333}%` }} /></div>
    <div className="onboarding-card" aria-busy={!ready || busy}>
      {!ready ? <div className="setup-loading">{error ? <><p role="alert">{error}</p><button type="button" className="button button-primary" onClick={() => window.location.reload()}>Coba lagi</button></> : "Menyiapkan profilmu…"}</div> : saved ? <div className="setup-success"><div><Check size={34} /></div><span className="overline">PROFILMU SIAP</span><h1>Selamat datang di SAPA.</h1><p>Sekarang waktunya menemukan orang yang satu frekuensi.</p></div> : <>
      {step === 1 && <section><span className="overline">WAJAH DI BALIK PROFIL</span><h1>Biar mereka tahu siapa kamu.</h1><p>Foto opsional. Kamu bisa mulai dengan avatar bawaan.</p><label className="photo-picker"><img src={photoUrl} alt="Foto profil" /><i><Camera /></i><input type="file" accept="image/png,image/jpeg,image/webp" onChange={choosePhoto} /></label><div className="form-split"><label>Nama lengkap<input value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" maxLength={80} required /></label><label>Tanggal lahir<input value={birthDate} onChange={(event) => setBirthDate(event.target.value)} type="date" required /></label></div><label>Kota<input value={city} onChange={(event) => setCity(event.target.value)} autoComplete="address-level2" placeholder="Contoh: Surabaya" maxLength={80} required /></label></section>}
      {step === 2 && <section><span className="overline">PERSONALITY & INTERESTS</span><h1>Apa yang membuatmu, kamu?</h1><p>Pilih satu tipe dan minimal tiga hal yang benar-benar kamu nikmati.</p><label>Tipe MBTI<div className="mbti-grid">{mbtiTypes.map((type) => <button type="button" key={type} className={mbti === type ? "active" : ""} onClick={() => setMbti(type)}>{type}</button>)}</div></label><label>Minatmu<div className="choice-cloud">{choices.map((item) => <button type="button" key={item} className={selected.includes(item) ? "active" : ""} onClick={() => toggle(item)}>{selected.includes(item) ? "✓ " : "+ "}{item}</button>)}</div></label></section>}
      {step === 3 && <section><span className="overline">SUARA PROFILMU</span><h1>Tulis seperti sedang menyapa.</h1><p>Ceritakan sedikit tentang dirimu. Gemini bisa membantu merapikan, bukan menggantikan suaramu.</p><div className="bio-field"><textarea value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Aku suka... dan sedang mencari teman untuk..." maxLength={600} rows={7} required /><span>{bio.length}/600</span></div><button type="button" className="gemini-compose" onClick={generateBio} disabled={aiBusy}><Sparkles /> {aiBusy ? "Gemini sedang merangkai..." : "Bantu tulis dengan Gemini"}</button><div className="profile-preview"><img src={photoUrl} alt="Preview" /><div><span>{mbti}</span><strong>{fullName || "Namamu"} · {city || "Kotamu"}</strong><p>{bio || "Bio-mu akan tampil di sini."}</p></div></div></section>}
      {error && <p className="form-error" role="alert">{error}</p>}<div className="onboarding-actions"><button type="button" className="button button-primary" disabled={busy} onClick={step < 3 ? next : save}>{busy ? "Menyimpan…" : step < 3 ? "Lanjutkan" : editing ? "Simpan perubahan" : "Mulai menemukan teman"}<ArrowRight /></button></div></>}
    </div>
    <aside className="onboarding-quote"><Sparkles /><p>“Kepribadian bukan kotak. Ini hanya cara seru untuk memulai percakapan.”</p><span>— Prinsip desain SAPA</span></aside>
  </main>;
}
