"use client";
/* eslint-disable @next/next/no-img-element -- profile sources can be runtime data URLs from Neon. */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Compass, Heart, LogOut, MessageCircle, Search, Settings, SlidersHorizontal, Sparkles, UserRound, X, Zap } from "lucide-react";
import { Brand } from "./brand";
import { sampleProfiles } from "@/lib/sample-data";
import type { Profile } from "@/lib/types";

type Match = { id: string; conversationId: string; fullName: string; mbti: string; photoUrl: string; lastMessage: string; unread: number };

export function DiscoveryApp() {
  const [profiles, setProfiles] = useState<Profile[]>(sampleProfiles);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchProfile, setMatchProfile] = useState<Profile | null>(null);
  const [matchConversationId, setMatchConversationId] = useState("demo");
  const [filterOpen, setFilterOpen] = useState(false);
  const [mbti, setMbti] = useState("");
  const [toast, setToast] = useState("");
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const [aiBusy, setAiBusy] = useState(false);

  async function loadProfiles(filter = "") {
    setLoading(true);
    try {
      const response = await fetch(`/api/discover${filter ? `?mbti=${filter}` : ""}`, { credentials: "include" });
      const data = await response.json();
      if (response.ok) setProfiles(data.profiles?.length ? data.profiles : sampleProfiles);
    } finally { setLoading(false); setIndex(0); }
  }

  useEffect(() => {
    const kickoff = window.setTimeout(() => void loadProfiles(), 0);
    fetch("/api/matches", { credentials: "include" }).then((r) => r.json()).then((data) => setMatches(data.matches || [])).catch(() => null);
    return () => window.clearTimeout(kickoff);
  }, []);

  const current = profiles[index % Math.max(profiles.length, 1)];
  const next = profiles[(index + 1) % Math.max(profiles.length, 1)];
  const visibleMatches = useMemo(() => matches.slice(0, 4), [matches]);
  const pass = () => setIndex((value) => value + 1);

  async function like(superLike = false) {
    if (!current) return;
    setToast(superLike ? "Super spark terkirim ✦" : "Like terkirim diam-diam");
    const response = await fetch("/api/likes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId: current.id }) });
    const data = await response.json();
    if (data.matched) { setMatchConversationId(String(data.conversationId || "demo")); setMatchProfile(current); } else window.setTimeout(pass, 500);
    window.setTimeout(() => setToast(""), 2200);
  }

  async function createIcebreakers() {
    if (!matchProfile) return;
    setAiBusy(true);
    try {
      const response = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "icebreaker", context: `Nara (${"INFP"}) baru match dengan ${matchProfile.fullName} (${matchProfile.mbti}). Minat bersama: ${matchProfile.sharedInterests?.join(", ") || matchProfile.interests.join(", ")}. Buat pertanyaan platonic.` }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setIcebreakers(data.suggestions || []);
    } catch { setToast("Gemini belum tersedia, coba lagi nanti."); } finally { setAiBusy(false); }
  }

  return (
    <main className="app-canvas">
      <aside className="side-nav">
        <Brand compact />
        <nav>
          <Link className="active" href="/app"><Compass /><span>Discover</span></Link>
          <Link href="/messages/demo"><MessageCircle /><span>Pesan</span><b>{matches.reduce((sum, item) => sum + item.unread, 0) || 1}</b></Link>
          <button onClick={() => setToast("Daftar orang yang menyukaimu terbuka setelah match.")}><Heart /><span>Likes</span></button>
          <button onClick={() => setToast("Profil dapat disunting setelah masuk ke akun.")}><UserRound /><span>Profil</span></button>
        </nav>
        <div className="side-bottom"><button><Settings /><span>Pengaturan</span></button><Link href="/"><LogOut /><span>Keluar preview</span></Link></div>
      </aside>

      <section className="discovery-main">
        <header className="app-header"><div><p>SELAMAT DATANG, NARA</p><h1>Siapa yang satu <em>frekuensi</em> hari ini?</h1></div><div className="header-tools"><button><Search /></button><button><Bell /><i /></button><img src="/people/nara.svg" alt="Nara" /></div></header>
        <div className="filter-row">
          <button className="filter-button" onClick={() => setFilterOpen(!filterOpen)}><SlidersHorizontal size={17} /> Filter {mbti && <b>1</b>}</button>
          <button className={!mbti ? "active" : ""} onClick={() => { setMbti(""); loadProfiles(); }}>Untukmu</button>
          {["INFJ", "ENFJ", "INTP", "ENTP"].map((type) => <button key={type} className={mbti === type ? "active" : ""} onClick={() => { setMbti(type); loadProfiles(type); }}>{type}</button>)}
          <span className="fresh-pill"><i /> {profiles.length} profil baru</span>
        </div>
        {filterOpen && <div className="filter-popover"><strong>Temukan tipe tertentu</strong><div>{["INFP","ENFP","INFJ","ENFJ","INTJ","ENTJ","INTP","ENTP","ISFP","ESFP","ISFJ","ESFJ","ISTP","ESTP","ISTJ","ESTJ"].map((type) => <button key={type} onClick={() => { setMbti(type); loadProfiles(type); setFilterOpen(false); }}>{type}</button>)}</div></div>}

        <div className={`card-stage ${loading ? "loading" : ""}`}>
          {next && <article className="discovery-card card-behind"><img src={next.photoUrl} alt="" /></article>}
          {current ? <article className="discovery-card">
            <img src={current.photoUrl} alt={current.fullName} /><div className="image-shade" />
            <div className="compat-badge"><Sparkles size={14} /><strong>{current.compatibility ?? 86}%</strong><span>cocok</span></div>
            {current.isOnline && <span className="online-badge"><i /> online</span>}
            <div className="card-info"><div className="profile-line"><div><h2>{current.fullName}, {current.age} <span>✓</span></h2><p>{current.mbti} · {current.city}</p></div><button aria-label="Lihat detail">↗</button></div><p className="profile-bio">“{current.bio}”</p><div className="interest-tags">{current.interests.slice(0, 4).map((item, itemIndex) => <span key={item} className={itemIndex < (current.sharedInterests?.length ?? 0) ? "shared" : ""}>{itemIndex === 0 ? "✦ " : ""}{item}</span>)}</div><p className="shared-copy"><Heart size={14} fill="currentColor" /> Kalian punya <strong>{current.sharedInterests?.length || 1} minat yang sama</strong></p></div>
          </article> : <div className="empty-state"><Sparkles /><h2>Semua profil sudah kamu lihat</h2><p>Ubah filter atau kembali lagi nanti.</p><button onClick={() => setIndex(0)}>Lihat ulang</button></div>}
          <div className="swipe-actions"><button className="pass" onClick={pass} aria-label="Lewati"><X /></button><button className="like" onClick={() => like()} aria-label="Suka"><Heart fill="currentColor" /></button><button className="spark" onClick={() => like(true)} aria-label="Super spark"><Zap fill="currentColor" /></button></div>
          <p className="keyboard-hint"><kbd>←</kbd> lewati <kbd>→</kbd> suka <kbd>↑</kbd> super spark</p>
        </div>
      </section>

      <aside className="match-panel">
        <div className="panel-heading"><div><p>KONEKSI TERBARU</p><h2>Matches <span>{visibleMatches.length || 1}</span></h2></div><Link href="/messages/demo">Lihat semua</Link></div>
        <div className="match-list">{(visibleMatches.length ? visibleMatches : [{ id: "demo", conversationId: "demo", fullName: "Bima Ardhana", mbti: "ENFJ", photoUrl: "/people/bima.svg", lastMessage: "Film terakhir yang bikin kamu kepikiran apa?", unread: 1 }]).map((match) => <Link href={`/messages/${match.conversationId}`} className="match-item" key={match.id}><div className="match-avatar"><img src={match.photoUrl} alt={match.fullName} /><i /></div><div><strong>{match.fullName}</strong><span>{match.mbti} · baru match</span><p>{match.lastMessage}</p></div>{match.unread > 0 && <b>{match.unread}</b>}</Link>)}</div>
        <div className="daily-prompt"><span>ICEBREAKER HARI INI</span><Sparkles /><h3>Kalau hidupmu jadi film, genre apa yang paling pas?</h3><button onClick={() => navigator.clipboard?.writeText("Kalau hidupmu jadi film, genre apa yang paling pas?")}>Salin pertanyaan</button></div>
        <div className="mini-safety"><span className="shield-mini">✓</span><div><strong>Jaga ruangmu tetap nyaman</strong><p>Kamu selalu bisa blokir atau melaporkan akun.</p></div></div>
      </aside>

      <nav className="mobile-tabbar"><Link className="active" href="/app"><Compass /><span>Discover</span></Link><Link href="/messages/demo"><MessageCircle /><span>Pesan</span></Link><button><Heart /><span>Likes</span></button><button><UserRound /><span>Profil</span></button></nav>
      {toast && <div className="toast"><Sparkles size={16} /> {toast}</div>}
      {matchProfile && <div className="modal-backdrop"><div className="match-modal"><button className="modal-close" onClick={() => { setMatchProfile(null); setIcebreakers([]); pass(); }}><X /></button><span className="match-kicker">IT&apos;S A MATCH!</span><div className="matched-faces"><img src="/people/nara.svg" alt="Nara" /><Heart fill="currentColor" /><img src={matchProfile.photoUrl} alt={matchProfile.fullName} /></div><h2>Kalian sama-sama ingin ngobrol.</h2><p>Mulai dari hal yang kalian sukai bersama: {matchProfile.sharedInterests?.join(", ") || "cerita dan pengalaman baru"}.</p>{icebreakers.length ? <div className="modal-icebreakers">{icebreakers.map((item) => <Link key={item} href={`/messages/${matchConversationId}?draft=${encodeURIComponent(item)}`}>{item}</Link>)}</div> : <button className="gemini-icebreaker" onClick={createIcebreakers} disabled={aiBusy}><Sparkles size={15} /> {aiBusy ? "Gemini sedang berpikir..." : "Buat icebreaker dengan Gemini"}</button>}<Link className="button button-primary" href={`/messages/${matchConversationId}`}>Kirim sapa pertama</Link><button className="later" onClick={() => { setMatchProfile(null); setIcebreakers([]); pass(); }}>Nanti saja</button></div></div>}
    </main>
  );
}
