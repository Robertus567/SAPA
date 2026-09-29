"use client";
/* eslint-disable @next/next/no-img-element -- preview supports a freshly selected data URL. */

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Camera, Sparkles } from "lucide-react";
import { Brand } from "./brand";

const mbtiTypes = ["INFP","ENFP","INFJ","ENFJ","INTJ","ENTJ","INTP","ENTP","ISFP","ESFP","ISFJ","ESFJ","ISTP","ESTP","ISTJ","ESTJ"];
const choices = ["Film", "Indie music", "Game", "Buku", "Fotografi", "Tech", "Psikologi", "K-pop", "Travel", "Olahraga", "Anime", "Kuliner"];

export function ProfileSetup() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [mbti, setMbti] = useState("INFP");
  const [selected, setSelected] = useState<string[]>(["Film", "Indie music", "Psikologi"]);
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("/people/nara.svg");
  const [aiBusy, setAiBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function toggle(item: string) { setSelected((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item]); }
  function choosePhoto(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file || file.size > 900_000) { if (file) setError("Foto maksimal 900 KB."); return; } const reader = new FileReader(); reader.onload = () => setPhotoUrl(String(reader.result)); reader.readAsDataURL(file); }

  async function generateBio() {
    setAiBusy(true); setError("");
    try {
      const response = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "bio", context: `MBTI ${mbti}. Minat: ${selected.join(", ")}. Saya mencari teman baru dan study buddy. Buat terdengar santai dan personal.` }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error); setBio(data.suggestions?.[0] || "");
    } catch (caught) { setError((caught as Error).message || "Gemini belum tersedia."); } finally { setAiBusy(false); }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: form.get("fullName"), birthDate: form.get("birthDate"), city: form.get("city"), country: "Indonesia", mbti, languages: ["Indonesia", "English"], hobbies: selected.slice(0, 5), interests: selected, lookingFor: ["Teman baru", "Study buddy"], bio, photoUrl }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error); router.push("/app");
    } catch (caught) { setError((caught as Error).message); } finally { setBusy(false); }
  }

  return <main className="onboarding-page"><header><Brand /><button onClick={() => step > 1 ? setStep(step - 1) : router.back()}><ArrowLeft /> Kembali</button><span>LANGKAH {step} DARI 3</span></header><div className="progress"><i style={{ width: `${step * 33.333}%` }} /></div>
    <form onSubmit={save} className="onboarding-card">
      {step === 1 && <section><span className="overline">WAJAH DI BALIK PROFIL</span><h1>Biar mereka tahu siapa kamu.</h1><p>Profil yang terasa personal mendapat percakapan yang lebih bermakna.</p><label className="photo-picker"><img src={photoUrl} alt="Foto profil" /><i><Camera /></i><input type="file" accept="image/png,image/jpeg,image/webp" onChange={choosePhoto} /></label><div className="form-split"><label>Nama lengkap<input name="fullName" defaultValue="Nara Putri" required /></label><label>Tanggal lahir<input name="birthDate" type="date" defaultValue="2003-04-12" required /></label></div><label>Kota<input name="city" defaultValue="Bandung" required /></label></section>}
      {step === 2 && <section><span className="overline">PERSONALITY & INTERESTS</span><h1>Apa yang membuatmu, kamu?</h1><p>Pilih satu tipe dan minimal tiga hal yang benar-benar kamu nikmati.</p><label>Tipe MBTI<div className="mbti-grid">{mbtiTypes.map((type) => <button type="button" key={type} className={mbti === type ? "active" : ""} onClick={() => setMbti(type)}>{type}</button>)}</div></label><label>Minatmu<div className="choice-cloud">{choices.map((item) => <button type="button" key={item} className={selected.includes(item) ? "active" : ""} onClick={() => toggle(item)}>{selected.includes(item) ? "✓ " : "+ "}{item}</button>)}</div></label></section>}
      {step === 3 && <section><span className="overline">SUARA PROFILMU</span><h1>Tulis seperti sedang menyapa.</h1><p>Ceritakan sedikit tentang dirimu. Gemini bisa membantu merapikan, bukan menggantikan suaramu.</p><div className="bio-field"><textarea value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Aku suka... dan sedang mencari teman untuk..." maxLength={600} rows={7} required /><span>{bio.length}/600</span></div><button type="button" className="gemini-compose" onClick={generateBio} disabled={aiBusy}><Sparkles /> {aiBusy ? "Gemini sedang merangkai..." : "Bantu tulis dengan Gemini"}</button><div className="profile-preview"><img src={photoUrl} alt="Preview" /><div><span>{mbti}</span><strong>Nara · Bandung</strong><p>{bio || "Bio-mu akan tampil di sini."}</p></div></div></section>}
      {error && <p className="form-error">{error}</p>}<div className="onboarding-actions">{step < 3 ? <button type="button" className="button button-primary" onClick={() => { if (step === 2 && selected.length < 3) { setError("Pilih minimal tiga minat."); return; } setError(""); setStep(step + 1); }}>Lanjutkan <ArrowRight /></button> : <button className="button button-primary" disabled={busy}>{busy ? "Menyimpan..." : "Mulai menemukan teman"}<ArrowRight /></button>}<button type="button" onClick={() => router.push("/app")}>Lewati untuk preview</button></div>
    </form>
    <aside className="onboarding-quote"><Sparkles /><p>“Kepribadian bukan kotak. Ini hanya cara seru untuk memulai percakapan.”</p><span>— Prinsip desain SAPA</span></aside>
  </main>;
}
