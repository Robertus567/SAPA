"use client";
/* eslint-disable @next/next/no-img-element -- profile pictures include uploaded data URLs. */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check, Compass, Heart, LogOut, MessageCircle, Search, Settings, Sparkles, UserRound, X, Zap } from "lucide-react";
import { Brand } from "./brand";
import type { Profile } from "@/lib/types";

type Match = { id: string; conversationId: string; userId: string; fullName: string; mbti: string; photoUrl: string; lastMessage: string; unread: number };
type IncomingLike = { id: string; userId: string; fullName: string; username: string; photoUrl: string; mbti: string; city: string; likedBack: boolean };
type Notification = { id: string; type: string; payload: { userId?: string; conversationId?: string }; actorName: string; actorPhoto: string; readAt: string | null; createdAt: string };
type Tab = "discover" | "likes" | "notifications" | "settings";
const types = ["", "INFP", "ENFP", "INFJ", "ENFJ", "INTJ", "ENTJ", "INTP", "ENTP", "ISFP", "ESFP", "ISFJ", "ESFJ", "ISTP", "ESTP", "ISTJ", "ESTJ"];

async function jsonRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Permintaan belum berhasil.");
  return data as T;
}

export function CommunityApp() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("discover");
  const [viewer, setViewer] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [index, setIndex] = useState(0);
  const [matches, setMatches] = useState<Match[]>([]);
  const [likes, setLikes] = useState<IncomingLike[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [toast, setToast] = useState("");
  const [match, setMatch] = useState<{ profile: Profile | IncomingLike; conversationId: string } | null>(null);
  const [detail, setDetail] = useState<Profile | null>(null);
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const [aiBusy, setAiBusy] = useState(false);

  const refreshActivity = useCallback(async () => {
    try {
      const [m, l, n] = await Promise.all([
        jsonRequest<{ matches: Match[] }>("/api/matches"),
        jsonRequest<{ likes: IncomingLike[] }>("/api/likes"),
        jsonRequest<{ notifications: Notification[] }>("/api/notifications"),
      ]);
      setMatches(m.matches); setLikes(l.likes); setNotifications(n.notifications);
    } catch { /* an error is shown by the primary load path */ }
  }, []);

  const loadProfiles = useCallback(async (mbti = "") => {
    setLoading(true);
    try {
      const data = await jsonRequest<{ profiles: Profile[] }>(`/api/discover${mbti ? `?mbti=${encodeURIComponent(mbti)}` : ""}`);
      setProfiles(data.profiles); setIndex(0);
    } catch (error) { setToast((error as Error).message); setProfiles([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    async function start() {
      try {
        const data = await jsonRequest<{ profile: Profile | null }>("/api/auth/me");
        if (!active) return;
        if (!data.profile?.onboardingCompleted) { router.replace("/onboarding"); return; }
        setViewer(data.profile);
        await Promise.all([loadProfiles(), refreshActivity()]);
        if (window.location.search.includes("tab=likes")) setTab("likes");
        if (window.location.search.includes("tab=notifications")) setTab("notifications");
      } catch { if (active) router.replace("/login"); }
    }
    void start();
    return () => { active = false; };
  }, [loadProfiles, refreshActivity, router]);

  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refreshActivity(); }, 8000);
    return () => window.clearInterval(timer);
  }, [refreshActivity]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const visible = profiles.filter((profile) => !search || `${profile.fullName} ${profile.city} ${profile.interests.join(" ")}`.toLowerCase().includes(search.toLowerCase()));
  const current = visible[index];
  const unreadMessages = matches.reduce((sum, item) => sum + item.unread, 0);
  const unreadNotifications = notifications.filter((item) => !item.readAt).length;

  async function like(target: Profile | IncomingLike, superLike = false) {
    if (acting) return;
    setActing(true);
    try {
      const result = await jsonRequest<{ matched: boolean; conversationId?: string; alreadyLiked?: boolean }>("/api/likes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId: "userId" in target ? target.userId : target.id, superLike }) });
      if (result.matched && result.conversationId) { setMatch({ profile: target, conversationId: result.conversationId }); setIcebreakers([]); }
      else setToast(result.alreadyLiked ? "Kamu sudah menyukai profil ini." : superLike ? "Spark terkirim ✦" : "Like terkirim ♡");
      if (tab === "discover") setIndex((value) => value + 1);
      await refreshActivity();
    } catch (error) { setToast((error as Error).message); }
    finally { setActing(false); }
  }

  async function markRead(item?: Notification) {
    try {
      await jsonRequest("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item ? { id: item.id } : { all: true }) });
      setNotifications((current) => current.map((entry) => (!item || entry.id === item.id) ? { ...entry, readAt: new Date().toISOString() } : entry));
      if (item?.payload.conversationId) router.push(`/messages/${item.payload.conversationId}`);
      else if (item?.type === "like" || item?.type === "spark") setTab("likes");
    } catch (error) { setToast((error as Error).message); }
  }

  async function createIcebreakers() {
    if (!match) return;
    setAiBusy(true);
    try {
      const data = await jsonRequest<{ suggestions: string[] }>("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "icebreaker", context: `${viewer?.fullName} (${viewer?.mbti}) baru match dengan ${match.profile.fullName} (${match.profile.mbti}). Buat tiga pertanyaan ramah untuk membuka percakapan.` }) });
      setIcebreakers(data.suggestions);
    } catch (error) { setToast((error as Error).message); }
    finally { setAiBusy(false); }
  }

  async function setVisibility() {
    if (!viewer?.birthDate) return;
    setActing(true);
    try {
      const data = await jsonRequest<{ profile: Profile }>("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: viewer.fullName, birthDate: viewer.birthDate, city: viewer.city, country: viewer.country, mbti: viewer.mbti, languages: viewer.languages, hobbies: viewer.hobbies, interests: viewer.interests, lookingFor: viewer.lookingFor, bio: viewer.bio, photoUrl: viewer.photoUrl, isVisible: !viewer.isVisible }) });
      setViewer(data.profile); setToast(data.profile.isVisible ? "Profilmu terlihat di Discover." : "Profilmu disembunyikan dari Discover.");
    } catch (error) { setToast((error as Error).message); }
    finally { setActing(false); }
  }

  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); router.replace("/login"); }

  const navigation = <><button className={tab === "discover" ? "active" : ""} onClick={() => setTab("discover")}><Compass /><span>Discover</span></button><Link href="/messages"><MessageCircle /><span>Pesan</span>{unreadMessages > 0 && <b>{unreadMessages}</b>}</Link><button className={tab === "likes" ? "active" : ""} onClick={() => setTab("likes")}><Heart /><span>Likes</span></button><button className={tab === "notifications" ? "active" : ""} onClick={() => setTab("notifications")}><Bell /><span>Notifikasi</span>{unreadNotifications > 0 && <b>{unreadNotifications}</b>}</button><button className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}><Settings /><span>Pengaturan</span></button></>;

  return <main className="app-canvas community-canvas"><aside className="side-nav"><Brand compact /><nav>{navigation}</nav><div className="side-bottom"><Link href="/profile"><UserRound /><span>Edit profil</span></Link><button onClick={logout}><LogOut /><span>Keluar</span></button></div></aside>
    <section className="discovery-main community-main"><header className="app-header"><div><p>HALO, {viewer?.fullName?.split(" ")[0]?.toUpperCase() || "TEMAN"}</p><h1>{tab === "discover" ? <>Siapa yang satu <em>frekuensi</em> hari ini?</> : tab === "likes" ? "Ada yang ingin menyapamu." : tab === "notifications" ? "Kabar terbaru untukmu." : "Ruangmu, pilihanmu."}</h1></div><div className="header-tools"><button aria-label="Notifikasi" onClick={() => setTab("notifications")}><Bell />{unreadNotifications > 0 && <i />}</button><Link href="/profile"><img src={viewer?.photoUrl || "/people/default.svg"} alt="Edit profil" /></Link></div></header>
      {tab === "discover" && <><div className="filter-row"><label className="community-search"><Search size={17} /><input value={search} onChange={(event) => { setSearch(event.target.value); setIndex(0); }} placeholder="Cari nama, kota, minat" aria-label="Cari profil" /></label><select value={filter} onChange={(event) => { setFilter(event.target.value); void loadProfiles(event.target.value); }} aria-label="Filter MBTI">{types.map((type) => <option key={type} value={type}>{type || "Semua MBTI"}</option>)}</select><span className="fresh-pill"><i /> {visible.length} profil</span></div>
        <div className={`card-stage ${loading ? "loading" : ""}`}>{current ? <article className="discovery-card"><img src={current.photoUrl || "/people/default.svg"} alt={current.fullName} /><div className="image-shade" /><div className="compat-badge"><Sparkles size={14} /><strong>{current.compatibility ?? 0}%</strong><span>cocok</span></div>{current.isOnline && <span className="online-badge"><i /> online</span>}<div className="card-info"><div className="profile-line"><div><h2>{current.fullName}, {current.age}</h2><p>{current.mbti} · {current.city}</p></div><button onClick={() => setDetail(current)} aria-label={`Lihat detail ${current.fullName}`}>↗</button></div><p className="profile-bio">“{current.bio}”</p><div className="interest-tags">{current.interests.slice(0, 4).map((item) => <span key={item} className={current.sharedInterests?.includes(item) ? "shared" : ""}>{item}</span>)}</div><p className="shared-copy"><Heart size={14} fill="currentColor" /> {current.sharedInterests?.length ? `${current.sharedInterests.length} minat yang sama` : "Kenalan baru menunggumu"}</p></div></article> : <div className="empty-state"><Sparkles /><h2>{loading ? "Mencari teman baru…" : "Belum ada profil lagi"}</h2><p>{search || filter ? "Coba ubah pencarian atau filter." : "Kamu sudah melihat semua profil yang tersedia."}</p><button onClick={() => { setSearch(""); setFilter(""); void loadProfiles(); }}>Muat ulang</button></div>}
          <div className="swipe-actions"><button className="pass" disabled={!current || acting} onClick={() => setIndex((value) => value + 1)} aria-label="Lewati"><X /></button><button className="like" disabled={!current || acting} onClick={() => current && void like(current)} aria-label="Suka"><Heart fill="currentColor" /></button><button className="spark" disabled={!current || acting} onClick={() => current && void like(current, true)} aria-label="Kirim spark"><Zap fill="currentColor" /></button></div></div></>}
      {tab === "likes" && <div className="community-panel"><div className="panel-title"><Heart /><div><h2>Yang menyukaimu</h2><p>Balas like untuk membuka percakapan.</p></div></div>{likes.length ? <div className="people-grid">{likes.map((person) => <article className="person-tile" key={person.id}><img src={person.photoUrl} alt={person.fullName} /><div><strong>{person.fullName}</strong><span>{person.mbti} · {person.city}</span></div>{person.likedBack ? <span className="matched-label"><Check size={15} /> Sudah match</span> : <button className="button button-primary button-small" disabled={acting} onClick={() => void like(person)}>Suka balik <Heart size={15} /></button>}</article>)}</div> : <div className="panel-empty"><Heart /><h3>Belum ada like masuk.</h3><p>Lengkapi profil dan tampilkan dirimu agar orang lain bisa menemukanmu.</p><Link href="/profile" className="button button-dark button-small">Edit profil</Link></div>}</div>}
      {tab === "notifications" && <div className="community-panel"><div className="panel-title"><Bell /><div><h2>Notifikasi</h2><p>Like, match, dan pesan terbaru tersimpan di sini.</p></div>{unreadNotifications > 0 && <button className="text-action" onClick={() => void markRead()}>Tandai semua dibaca</button>}</div>{notifications.length ? <div className="notification-list">{notifications.map((item) => <button className={`notification-item ${!item.readAt ? "unread" : ""}`} key={item.id} onClick={() => void markRead(item)}><img src={item.actorPhoto} alt="" /><span><strong>{item.actorName}</strong> {item.type === "like" ? "menyukai profilmu" : item.type === "spark" ? "mengirim spark" : item.type === "match" ? "match denganmu—mulai sapa!" : "mengirim pesan baru"}<small>{new Date(item.createdAt).toLocaleString("id-ID")}</small></span>{!item.readAt && <i />}</button>)}</div> : <div className="panel-empty"><Bell /><h3>Belum ada kabar baru.</h3><p>Saat ada yang like, match, atau mengirim pesan, kamu akan melihatnya di sini.</p></div>}</div>}
      {tab === "settings" && <div className="community-panel settings-panel"><div className="panel-title"><Settings /><div><h2>Pengaturan akun</h2><p>Atur bagaimana orang lain menemukanmu.</p></div></div><div className="setting-row"><div><strong>Profil tampil di Discover</strong><p>Matikan sementara jika ingin rehat dari pertemanan baru.</p></div><button className={`setting-toggle ${viewer?.isVisible ? "on" : ""}`} aria-label="Ubah visibilitas profil" aria-pressed={viewer?.isVisible} onClick={setVisibility} disabled={acting}><i /></button></div><div className="setting-row"><div><strong>Informasi profil</strong><p>Nama, foto, minat, dan bio yang dilihat teman baru.</p></div><Link href="/profile" className="button button-ghost button-small">Edit profil</Link></div><div className="setting-row"><div><strong>Keluar dari SAPA</strong><p>Kamu bisa masuk lagi kapan saja.</p></div><button className="button button-ghost button-small" onClick={logout}>Keluar</button></div></div>}
    </section>
    <aside className="match-panel"><div className="panel-heading"><div><p>KONEKSI TERBARU</p><h2>Matches <span>{matches.length}</span></h2></div><Link href="/messages">Lihat semua</Link></div><div className="match-list">{matches.length ? matches.slice(0, 5).map((item) => <Link href={`/messages/${item.conversationId}`} className="match-item" key={item.id}><div className="match-avatar"><img src={item.photoUrl} alt={item.fullName} /></div><div><strong>{item.fullName}</strong><span>{item.mbti}</span><p>{item.lastMessage}</p></div>{item.unread > 0 && <b>{item.unread}</b>}</Link>) : <p className="match-empty">Belum ada match. Mulai dari satu like yang tulus ♡</p>}</div><div className="daily-prompt"><span>IDE UNTUK MENYAPA</span><Sparkles /><h3>Kalau hidupmu jadi film, genre apa yang paling pas?</h3><button onClick={() => { void navigator.clipboard?.writeText("Kalau hidupmu jadi film, genre apa yang paling pas?"); setToast("Pertanyaan disalin."); }}>Salin pertanyaan</button></div></aside>
    <nav className="mobile-tabbar">{navigation}</nav>
    {toast && <div className="toast" role="status"><Sparkles size={16} /> {toast}</div>}
    {detail && <div className="modal-backdrop" onClick={() => setDetail(null)}><div className="profile-detail-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setDetail(null)} aria-label="Tutup"><X /></button><img src={detail.photoUrl} alt={detail.fullName} /><div><span className="overline">{detail.mbti} · {detail.city}</span><h2>{detail.fullName}, {detail.age}</h2><p>{detail.bio}</p><div className="interest-tags">{detail.interests.map((interest) => <span key={interest}>{interest}</span>)}</div><button className="button button-primary" disabled={acting} onClick={() => { void like(detail); setDetail(null); }}>Kirim like <Heart size={17} /></button></div></div></div>}
    {match && <div className="modal-backdrop"><div className="match-modal"><button className="modal-close" onClick={() => setMatch(null)} aria-label="Tutup"><X /></button><span className="match-kicker">IT&apos;S A MATCH!</span><div className="matched-faces"><img src={viewer?.photoUrl || "/people/default.svg"} alt={viewer?.fullName || "Kamu"} /><Heart fill="currentColor" /><img src={match.profile.photoUrl} alt={match.profile.fullName} /></div><h2>Kalian sama-sama ingin ngobrol.</h2><p>Sapa {match.profile.fullName} dengan pertanyaan yang terasa seperti kamu.</p>{icebreakers.length ? <div className="modal-icebreakers">{icebreakers.map((item) => <Link key={item} href={`/messages/${match.conversationId}?draft=${encodeURIComponent(item)}`}>{item}</Link>)}</div> : <button className="gemini-icebreaker" onClick={createIcebreakers} disabled={aiBusy}><Sparkles size={15} /> {aiBusy ? "Sedang merangkai…" : "Buat icebreaker dengan Gemini"}</button>}<Link className="button button-primary" href={`/messages/${match.conversationId}`}>Kirim sapa pertama</Link><button className="later" onClick={() => setMatch(null)}>Nanti saja</button></div></div>}
  </main>;
}
