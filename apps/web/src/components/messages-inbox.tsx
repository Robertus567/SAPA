"use client";
/* eslint-disable @next/next/no-img-element -- profile images may be uploaded data URLs. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageCircle, Search } from "lucide-react";
import { Brand } from "./brand";

type Match = { id: string; conversationId: string; fullName: string; mbti: string; photoUrl: string; lastMessage: string; unread: number };

export function MessagesInbox() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    function refresh() {
      fetch("/api/matches", { cache: "no-store" }).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Percakapan gagal dimuat.");
        if (active) { setMatches(data.matches || []); setError(""); }
      }).catch((caught) => { if (active) setError((caught as Error).message); }).finally(() => { if (active) setLoading(false); });
    }
    refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 8000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  return <main className="inbox-page"><header><Link href="/app" aria-label="Kembali ke beranda"><ArrowLeft /></Link><Brand /></header><section className="inbox-wrap"><span className="overline">OBROLANMU</span><h1>Pesan yang menunggu balasan.</h1><p>Semua percakapan dari match yang aktif ada di sini.</p><label className="inbox-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari teman" /></label>{error && <p className="form-error" role="alert">{error}</p>}{loading ? <p>Memuat percakapan…</p> : matches.filter((item) => item.fullName.toLowerCase().includes(search.toLowerCase())).length ? <div className="inbox-list">{matches.filter((item) => item.fullName.toLowerCase().includes(search.toLowerCase())).map((item) => <Link href={`/messages/${item.conversationId}`} key={item.id}><img src={item.photoUrl} alt="" /><span><strong>{item.fullName}</strong><small>{item.mbti} · {item.lastMessage}</small></span>{item.unread > 0 && <b>{item.unread}</b>}</Link>)}</div> : <div className="panel-empty"><MessageCircle /><h3>{search ? "Teman tidak ditemukan." : "Belum ada percakapan."}</h3><p>Temukan teman di beranda. Saat kalian saling suka, obrolan akan muncul di sini.</p><Link className="button button-primary button-small" href="/app">Ke Discover</Link></div>}</section></main>;
}
