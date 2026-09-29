"use client";
/* eslint-disable @next/next/no-img-element -- chat accepts runtime data URLs and user-provided images. */

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, MoreHorizontal, Phone, Send, ShieldAlert, Sparkles, Video } from "lucide-react";
import { Brand } from "./brand";
import type { ChatMessage } from "@/lib/types";

type ChatPeer = { userId: string; matchId: string; fullName: string; mbti: string; photoUrl: string };

const fallbackPeer: ChatPeer = { userId: "demo-bima", matchId: "demo-match", fullName: "Bima Ardhana", mbti: "ENFJ", photoUrl: "/people/bima.svg" };

const fallbackMessages: ChatMessage[] = [
  { id: "m1", senderId: "demo-bima", body: "Hai Nara! Aku lihat kita sama-sama suka film dan musik indie 👋", createdAt: new Date(Date.now() - 420000).toISOString(), readAt: new Date().toISOString() },
  { id: "m2", senderId: "demo-viewer", body: "Hai Bima! Iya, kombinasi yang susah ditolak 😄", createdAt: new Date(Date.now() - 300000).toISOString(), readAt: new Date().toISOString() },
  { id: "m3", senderId: "demo-bima", body: "Film terakhir yang bikin kamu kepikiran apa?", createdAt: new Date(Date.now() - 120000).toISOString(), readAt: null },
];

export function ChatRoom({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(fallbackMessages);
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [viewerId, setViewerId] = useState("demo-viewer");
  const [peer, setPeer] = useState<ChatPeer>(fallbackPeer);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, { credentials: "include" });
      const data = await response.json();
      if (response.ok && data.messages) {
        setMessages(data.messages);
        if (data.currentUserId) setViewerId(data.currentUserId);
        if (data.peer) setPeer(data.peer);
      }
    } catch { /* keep the current optimistic state */ }
  }, [conversationId]);

  useEffect(() => {
    const kickoff = window.setTimeout(() => {
      void loadMessages();
      const draft = new URLSearchParams(window.location.search).get("draft");
      if (draft) setText(draft);
    }, 0);
    if (conversationId === "demo") return () => window.clearTimeout(kickoff);
    const timer = window.setInterval(loadMessages, 3000);
    return () => { window.clearTimeout(kickoff); window.clearInterval(timer); };
  }, [conversationId, loadMessages]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, suggestions]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() && !imageUrl) return;
    setSending(true); setNotice("");
    const optimistic: ChatMessage = { id: crypto.randomUUID(), senderId: viewerId, body: text.trim(), imageUrl, createdAt: new Date().toISOString() };
    setMessages((current) => [...current, optimistic]); setText(""); setImageUrl(null); setSuggestions([]);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ body: optimistic.body, imageUrl: optimistic.imageUrl }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Pesan belum terkirim.");
      if (conversationId !== "demo") await loadMessages();
    } catch (error) { setNotice((error as Error).message); } finally { setSending(false); }
  }

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 900_000) { setNotice("Ukuran gambar maksimal 900 KB untuk versi MVP."); return; }
    const reader = new FileReader();
    reader.onload = () => setImageUrl(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function askGemini() {
    setAiBusy(true); setNotice("");
    const context = messages.slice(-6).map((message) => `${message.senderId === peer.userId ? peer.fullName : "Aku"}: ${message.body}`).join("\n");
    try {
      const response = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "replies", context }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSuggestions(data.suggestions || []);
    } catch (error) { setNotice((error as Error).message || "Gemini belum tersedia."); } finally { setAiBusy(false); }
  }

  async function safetyAction(action: "block" | "report" | "unmatch") {
    const label = action === "block" ? "memblokir" : action === "report" ? "melaporkan" : "mengakhiri match dengan";
    if (!window.confirm(`Yakin ingin ${label} ${peer.fullName}?`)) return;
    setSafetyOpen(false); setNotice("");
    try {
      const response = await fetch("/api/safety", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ action, targetUserId: peer.userId, matchId: peer.matchId, reason: action === "report" ? "Perilaku tidak nyaman" : undefined }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Aksi belum berhasil.");
      if (action === "report") setNotice("Laporan diterima. Terima kasih sudah menjaga komunitas SAPA.");
      else router.push("/app");
    } catch (error) { setNotice((error as Error).message); }
  }

  return <main className="chat-page">
    <aside className="chat-list-panel"><Brand /><div className="chat-list-head"><h1>Pesan</h1><button>＋</button></div><label className="chat-search">⌕ <input placeholder="Cari percakapan" /></label><div className="chat-list-tabs"><button className="active">Semua</button><button>Belum dibaca <b>1</b></button></div><div className="conversation active"><img src="/people/bima.svg" alt="Bima" /><div><strong>Bima Ardhana</strong><p>Film terakhir yang bikin...</p></div><span>2m</span><b>1</b></div><div className="conversation"><img src="/people/salva.svg" alt="Salva" /><div><strong>Salva Nirmala</strong><p>Thank you rekomendasinya!</p></div><span>1h</span></div><div className="conversation"><img src="/people/keisha.svg" alt="Keisha" /><div><strong>Keisha Aulia</strong><p>Board game weekend?</p></div><span>2h</span></div></aside>

    <section className="chat-main"><header className="chat-header"><Link href="/app" className="chat-back"><ArrowLeft /></Link><img src={peer.photoUrl} alt={peer.fullName} /><div><h2>{peer.fullName} <span>✓</span></h2><p><i /> online · {peer.mbti}</p></div><div className="chat-tools"><button title="Panggilan suara segera hadir" onClick={() => setNotice("Panggilan suara sedang kami siapkan.")}><Phone /></button><button title="Panggilan video segera hadir" onClick={() => setNotice("Panggilan video sedang kami siapkan.")}><Video /></button><div className="safety-menu-wrap"><button aria-label="Menu keamanan" aria-expanded={safetyOpen} onClick={() => setSafetyOpen(!safetyOpen)}><MoreHorizontal /></button>{safetyOpen && <div className="safety-menu"><button onClick={() => safetyAction("report")}>Laporkan akun</button><button onClick={() => safetyAction("unmatch")}>Batalkan match</button><button className="danger" onClick={() => safetyAction("block")}>Blokir akun</button></div>}</div></div></header>
      <div className="chat-body"><div className="match-announcement"><div><img src="/people/nara.svg" alt="Nara" /><img src="/people/bima.svg" alt="Bima" /></div><Sparkles /><h3>Kalian match!</h3><p>Senin, 28 September · 94% cocok</p></div><div className="date-divider"><span>HARI INI</span></div>
        {messages.map((message, index) => { const mine = message.senderId === viewerId; return <div className={`message-row ${mine ? "mine" : "theirs"}`} key={message.id}>{!mine && (index === 0 || messages[index - 1]?.senderId !== message.senderId) && <img src={peer.photoUrl} alt="" />}<div className="message-wrap">{message.imageUrl && <img className="message-image" src={message.imageUrl} alt="Gambar percakapan" />}{message.body && <div className="message-bubble">{message.body}</div>}<span>{new Date(message.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}{mine && ` · ${message.readAt ? "dibaca" : "terkirim"}`}</span></div></div>; })}
        {suggestions.length > 0 && <div className="suggestion-box"><span><Sparkles size={15} /> Saran Gemini</span>{suggestions.map((suggestion) => <button key={suggestion} onClick={() => { setText(suggestion); setSuggestions([]); }}>{suggestion}</button>)}</div>}
        <div ref={endRef} />
      </div>
      <div className="composer-wrap">{notice && <div className="chat-notice"><ShieldAlert size={15} /> {notice}</div>}{imageUrl && <div className="image-preview"><img src={imageUrl} alt="Preview" /><button onClick={() => setImageUrl(null)}>×</button></div>}<form className="composer" onSubmit={send}><label className="attach-button"><ImagePlus /><input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseImage} /></label><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Tulis pesan yang tulus..." rows={1} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} /><button type="button" className="ai-button" onClick={askGemini} disabled={aiBusy}><Sparkles /> {aiBusy ? "berpikir" : "Bantu balas"}</button><button className="send-button" disabled={sending}><Send /></button></form><p>Tekan Enter untuk kirim · Shift + Enter untuk baris baru</p></div>
    </section>
  </main>;
}
