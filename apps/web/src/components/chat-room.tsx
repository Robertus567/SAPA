"use client";
/* eslint-disable @next/next/no-img-element -- chat accepts runtime data URLs and user-provided images. */

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, MoreHorizontal, Reply, Send, ShieldAlert, Sparkles, Trash2, X } from "lucide-react";
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
  const [replying, setReplying] = useState<ChatMessage | null>(null);
  const [activeMessage, setActiveMessage] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const lastTailId = useRef("");

  function clearLongPress() { if (longPressTimer.current) clearTimeout(longPressTimer.current); longPressTimer.current = null; pointerStart.current = null; }

  function startLongPress(event: React.PointerEvent, message: ChatMessage) {
    clearLongPress();
    pointerStart.current = { x: event.clientX, y: event.clientY };
    longPressTimer.current = setTimeout(() => { if (!message.deletedAt) setActiveMessage(message.id); }, 520);
  }

  function moveLongPress(event: React.PointerEvent) {
    if (pointerStart.current && Math.hypot(event.clientX - pointerStart.current.x, event.clientY - pointerStart.current.y) > 12) clearLongPress();
  }

  const loadMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, { credentials: "include" });
      const data = await response.json();
      if (response.ok && data.messages) {
        setMessages((current) => current.length === data.messages.length && current.every((item, index) => {
          const next = data.messages[index];
          return item.id === next.id && item.readAt === next.readAt && item.deletedAt === next.deletedAt && item.body === next.body && item.replyTo?.deletedAt === next.replyTo?.deletedAt;
        }) ? current : data.messages);
        if (data.currentUserId) setViewerId(data.currentUserId);
        if (data.peer) setPeer((current) => current.userId === data.peer.userId && current.fullName === data.peer.fullName && current.photoUrl === data.peer.photoUrl && current.mbti === data.peer.mbti ? current : data.peer);
      } else if (!response.ok) setNotice(data.error || "Percakapan gagal dimuat.");
    } catch { setNotice("Koneksi terputus. Mencoba lagi…"); }
  }, [conversationId]);

  const loadMatches = useCallback(async () => {
    try {
      const response = await fetch("/api/matches", { cache: "no-store" });
      const data = await response.json();
      if (response.ok) setMatches((current) => {
        const next: MatchItem[] = data.matches || [];
        return current.length === next.length && current.every((item, index) => item.id === next[index].id && item.unread === next[index].unread && item.lastMessage === next[index].lastMessage) ? current : next;
      });
    } catch { /* chat remains usable */ }
  }, []);

  useEffect(() => {
    const kickoff = window.setTimeout(() => {
      void loadMessages();
      void loadMatches();
      const draft = new URLSearchParams(window.location.search).get("draft");
      if (draft) setText(draft);
    }, 0);
    const timer = window.setInterval(() => { void loadMessages(); void loadMatches(); }, 5000);
    return () => { window.clearTimeout(kickoff); window.clearInterval(timer); clearLongPress(); };
  }, [conversationId, loadMessages, loadMatches]);
  useEffect(() => {
    const tail = messages.at(-1)?.id || "";
    if (tail && tail !== lastTailId.current) endRef.current?.scrollIntoView({ behavior: "smooth" });
    lastTailId.current = tail;
  }, [messages, suggestions]);
  useEffect(() => {
    const dismissOutside = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest(".message-wrap")) setActiveMessage(null);
    };
    const dismissEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setActiveMessage(null); };
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissEscape);
    return () => { document.removeEventListener("pointerdown", dismissOutside); document.removeEventListener("keydown", dismissEscape); };
  }, []);

  function chooseReply(message: ChatMessage) {
    setReplying(message); setActiveMessage(null); composerRef.current?.focus();
  }

  async function deleteForEveryone(message: ChatMessage) {
    setActiveMessage(null);
    if (message.senderId !== viewerId || !window.confirm("Hapus pesan ini untuk semua orang?")) return;
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages/${message.id}`, { method: "DELETE", credentials: "include" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Pesan belum dapat dihapus.");
      if (replying?.id === message.id) setReplying(null);
      await loadMessages(); await loadMatches();
    } catch (error) { setNotice((error as Error).message); }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() && !imageUrl) return;
    setSending(true); setNotice("");
    const selectedReply = replying;
    const optimistic: ChatMessage = { id: crypto.randomUUID(), senderId: viewerId, body: text.trim(), imageUrl, replyTo: selectedReply ? { id: selectedReply.id, senderId: selectedReply.senderId, body: selectedReply.body || (selectedReply.imageUrl ? "Foto" : ""), hasImage: Boolean(selectedReply.imageUrl), deletedAt: selectedReply.deletedAt } : null, createdAt: new Date().toISOString() };
    setMessages((current) => [...current, optimistic]); setText(""); setImageUrl(null); setReplying(null); setSuggestions([]);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ body: optimistic.body, imageUrl: optimistic.imageUrl, replyToMessageId: selectedReply?.id || null }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Pesan belum terkirim.");
      await loadMessages(); await loadMatches();
    } catch (error) { setMessages((current) => current.filter((item) => item.id !== optimistic.id)); setText(optimistic.body); setImageUrl(optimistic.imageUrl || null); setReplying(selectedReply); setNotice((error as Error).message); } finally { setSending(false); }
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

    <section className="chat-main"><header className="chat-header"><Link href="/messages" className="chat-back" aria-label="Kembali ke daftar pesan" title="Kembali ke daftar pesan"><ArrowLeft /></Link><img src={peer.photoUrl} alt={peer.fullName} /><div><h2>{peer.fullName}</h2><p>{peer.mbti} · percakapan pribadi</p></div><div className="chat-tools"><div className="safety-menu-wrap"><button aria-label="Menu keamanan" aria-expanded={safetyOpen} onClick={() => setSafetyOpen(!safetyOpen)}><MoreHorizontal /></button>{safetyOpen && <div className="safety-menu"><button onClick={() => safetyAction("report")}>Laporkan akun</button><button onClick={() => safetyAction("unmatch")}>Batalkan match</button><button className="danger" onClick={() => safetyAction("block")}>Blokir akun</button></div>}</div></div></header>
      <div className="chat-body"><div className="match-announcement"><div><img src={peer.photoUrl} alt={peer.fullName} /></div><Sparkles /><h3>Kalian match!</h3><p>Mulai percakapan dengan {peer.fullName}.</p></div><div className="date-divider"><span>PESAN</span></div>
        {messages.map((message, index) => { const mine = message.senderId === viewerId; return <div className={`message-row ${mine ? "mine" : "theirs"}`} key={message.id}>{!mine && (index === 0 || messages[index - 1]?.senderId !== message.senderId) && <img src={peer.photoUrl} alt="" />}<div className="message-wrap" onPointerDown={(event) => startLongPress(event, message)} onPointerMove={moveLongPress} onPointerUp={clearLongPress} onPointerLeave={clearLongPress} onPointerCancel={clearLongPress} onContextMenu={(event) => { event.preventDefault(); if (!message.deletedAt) setActiveMessage(message.id); }}>
          {!message.deletedAt && <button type="button" className="message-more" aria-label="Opsi pesan" onClick={() => setActiveMessage(activeMessage === message.id ? null : message.id)}><MoreHorizontal size={15} /></button>}
          {message.replyTo && <div className="message-quote"><strong>{message.replyTo.senderId === viewerId ? "Kamu" : peer.fullName}</strong><span>{message.replyTo.deletedAt ? "Pesan ini telah dihapus" : message.replyTo.hasImage ? `Foto${message.replyTo.body && message.replyTo.body !== "Foto" ? ` · ${message.replyTo.body}` : ""}` : message.replyTo.body}</span></div>}
          {message.imageUrl && <img className="message-image" src={message.imageUrl} alt="Gambar percakapan" />}{message.body && <div className={`message-bubble ${message.deletedAt ? "deleted" : ""}`}>{message.body}</div>}
          <span>{new Date(message.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}{mine && !message.deletedAt && ` · ${message.readAt ? "dibaca" : "terkirim"}`}</span>
          {activeMessage === message.id && !message.deletedAt && <div className="message-actions" role="menu"><button type="button" role="menuitem" onClick={() => chooseReply(message)}><Reply size={15} /> Balas</button>{mine && <button type="button" role="menuitem" className="danger" onClick={() => void deleteForEveryone(message)}><Trash2 size={15} /> Hapus untuk semua</button>}</div>}
        </div></div>; })}
        {suggestions.length > 0 && <div className="suggestion-box"><span><Sparkles size={15} /> Saran Gemini</span>{suggestions.map((suggestion) => <button key={suggestion} onClick={() => { setText(suggestion); setSuggestions([]); }}>{suggestion}</button>)}</div>}
        <div ref={endRef} />
      </div>
      <div className="composer-wrap">{notice && <div className="chat-notice"><ShieldAlert size={15} /> {notice}</div>}{replying && <div className="reply-preview"><Reply size={16} /><div><strong>Balas {replying.senderId === viewerId ? "pesanmu" : peer.fullName}</strong><span>{replying.deletedAt ? "Pesan ini telah dihapus" : replying.body || (replying.imageUrl ? "Foto" : "")}</span></div><button type="button" onClick={() => setReplying(null)} aria-label="Batal membalas"><X size={17} /></button></div>}{imageUrl && <div className="image-preview"><img src={imageUrl} alt="Preview" /><button onClick={() => setImageUrl(null)}>×</button></div>}<form className="composer" onSubmit={send}><label className="attach-button"><ImagePlus /><input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseImage} /></label><textarea ref={composerRef} value={text} onChange={(event) => setText(event.target.value)} placeholder={replying ? "Tulis balasanmu..." : "Tulis pesan yang tulus..."} rows={1} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} /><button type="button" className="ai-button" onClick={askGemini} disabled={aiBusy}><Sparkles /> {aiBusy ? "berpikir" : "Bantu balas"}</button><button className="send-button" disabled={sending}><Send /></button></form><p>Tahan atau klik kanan pesan untuk balas/hapus · Enter untuk kirim</p></div>
    </section>
  </main>;
}
