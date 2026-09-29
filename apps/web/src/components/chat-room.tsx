"use client";
/* eslint-disable @next/next/no-img-element -- chat accepts runtime data URLs and user-provided images. */

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, MoreHorizontal, Send, ShieldAlert, Sparkles } from "lucide-react";
import { Brand } from "./brand";
import type { ChatMessage } from "@/lib/types";

type ChatPeer = { userId: string; matchId: string; fullName: string; mbti: string; photoUrl: string };

type MatchItem = { id: string; conversationId: string; fullName: string; photoUrl: string; lastMessage: string; unread: number };

export function ChatRoom({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [chatSearch, setChatSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [viewerId, setViewerId] = useState("");
  const [peer, setPeer] = useState<ChatPeer>({ userId: "", matchId: "", fullName: "Memuat percakapan…", mbti: "", photoUrl: "/people/default.svg" });
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
      } else if (!response.ok) setNotice(data.error || "Percakapan gagal dimuat.");
    } catch { setNotice("Koneksi terputus. Mencoba lagi…"); }
  }, [conversationId]);

  const loadMatches = useCallback(async () => {
    try { const response = await fetch("/api/matches", { cache: "no-store" }); const data = await response.json(); if (response.ok) setMatches(data.matches || []); } catch { /* chat remains usable */ }
  }, []);

  useEffect(() => {
    const kickoff = window.setTimeout(() => {
      void loadMessages();
      void loadMatches();
      const draft = new URLSearchParams(window.location.search).get("draft");
      if (draft) setText(draft);
    }, 0);
    const timer = window.setInterval(() => { void loadMessages(); void loadMatches(); }, 5000);
    return () => { window.clearTimeout(kickoff); window.clearInterval(timer); };
  }, [conversationId, loadMessages, loadMatches]);
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
      await loadMessages(); await loadMatches();
    } catch (error) { setMessages((current) => current.filter((item) => item.id !== optimistic.id)); setText(optimistic.body); setImageUrl(optimistic.imageUrl || null); setNotice((error as Error).message); } finally { setSending(false); }
  }

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 800_000) { setNotice("Pilih JPG, PNG, atau WebP maksimal 800 KB."); return; }
    const reader = new FileReader();
    reader.onload = () => setImageUrl(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function askGemini() {
    setAiBusy(true); setNotice("");
    const context = messages.length ? messages.slice(-6).map((message) => `${message.senderId === peer.userId ? peer.fullName : "Aku"}: ${message.body}`).join("\n") : `Aku baru match dengan ${peer.fullName}. Bantu tulis sapaan pertama yang hangat.`;
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
    <aside className="chat-list-panel"><Brand /><div className="chat-list-head"><h1>Pesan</h1><Link href="/app" aria-label="Kembali ke Discover">＋</Link></div><label className="chat-search">⌕ <input value={chatSearch} onChange={(event) => setChatSearch(event.target.value)} placeholder="Cari percakapan" /></label><div className="chat-list-tabs"><button className={!unreadOnly ? "active" : ""} onClick={() => setUnreadOnly(false)}>Semua</button><button className={unreadOnly ? "active" : ""} onClick={() => setUnreadOnly(true)}>Belum dibaca <b>{matches.reduce((sum, item) => sum + item.unread, 0)}</b></button></div>{matches.filter((item) => (!unreadOnly || item.unread > 0) && item.fullName.toLowerCase().includes(chatSearch.toLowerCase())).map((item) => <Link href={`/messages/${item.conversationId}`} className={`conversation ${item.conversationId === conversationId ? "active" : ""}`} key={item.id}><img src={item.photoUrl} alt="" /><div><strong>{item.fullName}</strong><p>{item.lastMessage}</p></div>{item.unread > 0 && <b>{item.unread}</b>}</Link>)}{!matches.length && <p className="match-empty">Belum ada percakapan lain.</p>}</aside>

    <section className="chat-main"><header className="chat-header"><Link href="/messages" className="chat-back"><ArrowLeft /></Link><img src={peer.photoUrl} alt={peer.fullName} /><div><h2>{peer.fullName}</h2><p>{peer.mbti} · percakapan pribadi</p></div><div className="chat-tools"><div className="safety-menu-wrap"><button aria-label="Menu keamanan" aria-expanded={safetyOpen} onClick={() => setSafetyOpen(!safetyOpen)}><MoreHorizontal /></button>{safetyOpen && <div className="safety-menu"><button onClick={() => safetyAction("report")}>Laporkan akun</button><button onClick={() => safetyAction("unmatch")}>Batalkan match</button><button className="danger" onClick={() => safetyAction("block")}>Blokir akun</button></div>}</div></div></header>
      <div className="chat-body"><div className="match-announcement"><div><img src={peer.photoUrl} alt={peer.fullName} /></div><Sparkles /><h3>Kalian match!</h3><p>Mulai percakapan dengan {peer.fullName}.</p></div><div className="date-divider"><span>PESAN</span></div>
        {messages.map((message, index) => { const mine = message.senderId === viewerId; return <div className={`message-row ${mine ? "mine" : "theirs"}`} key={message.id}>{!mine && (index === 0 || messages[index - 1]?.senderId !== message.senderId) && <img src={peer.photoUrl} alt="" />}<div className="message-wrap">{message.imageUrl && <img className="message-image" src={message.imageUrl} alt="Gambar percakapan" />}{message.body && <div className="message-bubble">{message.body}</div>}<span>{new Date(message.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}{mine && ` · ${message.readAt ? "dibaca" : "terkirim"}`}</span></div></div>; })}
        {suggestions.length > 0 && <div className="suggestion-box"><span><Sparkles size={15} /> Saran Gemini</span>{suggestions.map((suggestion) => <button key={suggestion} onClick={() => { setText(suggestion); setSuggestions([]); }}>{suggestion}</button>)}</div>}
        <div ref={endRef} />
      </div>
      <div className="composer-wrap">{notice && <div className="chat-notice"><ShieldAlert size={15} /> {notice}</div>}{imageUrl && <div className="image-preview"><img src={imageUrl} alt="Preview" /><button onClick={() => setImageUrl(null)}>×</button></div>}<form className="composer" onSubmit={send}><label className="attach-button"><ImagePlus /><input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseImage} /></label><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Tulis pesan yang tulus..." rows={1} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} /><button type="button" className="ai-button" onClick={askGemini} disabled={aiBusy}><Sparkles /> {aiBusy ? "berpikir" : "Bantu balas"}</button><button className="send-button" disabled={sending}><Send /></button></form><p>Tekan Enter untuk kirim · Shift + Enter untuk baris baru</p></div>
    </section>
  </main>;
}
