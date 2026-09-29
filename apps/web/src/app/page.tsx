/* eslint-disable @next/next/no-img-element -- profile art and dynamic user uploads intentionally use native img. */
import Link from "next/link";
import { ArrowRight, BadgeCheck, HeartHandshake, MessageCircleHeart, ShieldCheck, Sparkles } from "lucide-react";
import { Brand } from "@/components/brand";

const people = [
  { name: "Nara", type: "INFP", image: "/people/nara.svg", rotate: "-8deg", color: "coral" },
  { name: "Bima", type: "ENFJ", image: "/people/bima.svg", rotate: "6deg", color: "lime" },
  { name: "Keisha", type: "INTP", image: "/people/keisha.svg", rotate: "-3deg", color: "violet" },
];

export default function Home() {
  return (
    <main className="landing">
      <nav className="landing-nav shell">
        <Brand />
        <div className="nav-links"><a href="#cara-kerja">Cara kerja</a><a href="#fitur">Fitur</a><a href="#safety">Safety</a></div>
        <div className="nav-actions"><Link className="text-link" href="/login">Masuk</Link><Link className="button button-dark button-small" href="/login?mode=register">Mulai sekarang <ArrowRight size={16} /></Link></div>
      </nav>

      <section className="hero shell">
        <div className="hero-copy">
          <div className="eyebrow"><span className="pulse-dot" /> Untuk koneksi platonic yang nyata</div>
          <h1>Temukan teman yang <em>satu frekuensi.</em></h1>
          <p>Bukan dating app. SAPA mempertemukanmu dengan orang yang nyambung lewat kepribadian, minat, bahasa, dan hal-hal kecil yang kamu sukai.</p>
          <div className="hero-actions"><Link className="button button-primary" href="/login?mode=register">Temukan orangmu <ArrowRight size={18} /></Link><Link className="button button-ghost" href="/app"><span className="play-icon">▶</span> Lihat preview</Link></div>
          <div className="trust-row"><div className="avatar-stack">{people.map((person) => <img key={person.name} src={person.image} alt={person.name} />)}</div><div><strong>2.4k+</strong><span>koneksi bermakna dimulai minggu ini</span></div></div>
        </div>

        <div className="hero-visual" aria-label="Preview profil SAPA">
          <div className="orb orb-one" /><div className="orb orb-two" />
          {people.map((person, index) => <article key={person.name} className={`portrait-card card-${index + 1}`} style={{ "--rotate": person.rotate } as React.CSSProperties}><div className={`portrait-frame ${person.color}`}><img src={person.image} alt={`${person.name}, ${person.type}`} /></div><div className="portrait-meta"><strong>{person.name}</strong><span>{person.type}</span></div></article>)}
          <div className="compatibility-chip"><span>✦</span><strong>94%</strong><small>Match energy</small></div>
          <div className="floating-note">“Akhirnya ketemu teman ngobrol film sampai pagi.” <span>— Nara</span></div>
        </div>
      </section>

      <section className="marquee" aria-label="Minat komunitas"><div>GAMING BUDDY <span>✦</span> STUDY PARTNER <span>✦</span> LANGUAGE EXCHANGE <span>✦</span> CREATIVE CIRCLE <span>✦</span> COFFEE & CONVERSATION <span>✦</span></div></section>

      <section className="steps-section shell" id="cara-kerja">
        <div className="section-heading"><span>01 — CARA KERJA</span><h2>Sedikit data.<br />Banyak kemungkinan.</h2><p>Kami melihat lebih dari empat huruf. Setiap rekomendasi punya alasan yang bisa kamu pahami.</p></div>
        <div className="steps-grid">
          <article><span className="step-no">01</span><div className="icon-tile coral"><BadgeCheck /></div><h3>Ceritakan tentangmu</h3><p>Isi MBTI, hobi, bahasa, dan jenis teman yang sedang kamu cari.</p></article>
          <article><span className="step-no">02</span><div className="icon-tile violet"><Sparkles /></div><h3>Temukan frekuensimu</h3><p>Jelajahi profil yang diperingkat dengan compatibility score transparan.</p></article>
          <article><span className="step-no">03</span><div className="icon-tile lime"><MessageCircleHeart /></div><h3>Mulai tanpa canggung</h3><p>Setelah match, gunakan icebreaker kontekstual atau mulai dengan caramu sendiri.</p></article>
        </div>
      </section>

      <section className="feature-band" id="fitur"><div className="shell feature-layout">
        <div className="feature-phone"><div className="phone-status"><span>9:41</span><span>●●●</span></div><div className="phone-head"><Brand compact /><span>⌁</span></div><img src="/people/bima.svg" alt="Contoh profil Bima" /><div className="phone-gradient" /><div className="phone-profile"><span className="score">94% cocok</span><h3>Bima, 23 <i>✓</i></h3><p>ENFJ · Jakarta</p><div><span>#film</span><span>#indie music</span><span>#psikologi</span></div></div><div className="phone-actions"><button>×</button><button>♡</button><button>⚡</button></div></div>
        <div className="feature-copy"><span className="overline">BUKAN SEKADAR SWIPE</span><h2>Ada cerita di balik setiap profil.</h2><p className="feature-lead">Compatibility score kami menggabungkan lima sinyal, tetap sebagai panduan—bukan vonis.</p><div className="meter-list">{[["MBTI chemistry","40%","94%"],["Minat bersama","25%","78%"],["Hobi & aktivitas","15%","66%"],["Bahasa","10%","88%"],["Tujuan berteman","10%","100%"]].map(([label,weight,width]) => <div key={label}><span>{label}<small>{weight}</small></span><i><b style={{ width }} /></i></div>)}</div><p className="disclaimer">MBTI digunakan sebagai preferensi eksplorasi dan tidak diklaim sebagai prediktor ilmiah kecocokan.</p></div>
      </div></section>

      <section className="safety-section shell" id="safety"><div><span className="overline">RUANG YANG LEBIH AMAN</span><h2>Nyaman untuk jadi dirimu sendiri.</h2></div><div className="safety-cards"><article><ShieldCheck /><h3>Kontrol ada padamu</h3><p>Blokir, laporkan, unmatch, atau sembunyikan profil kapan saja.</p></article><article><HeartHandshake /><h3>Platonic by design</h3><p>Tujuan hubungan terlihat jelas, sehingga ekspektasi tidak abu-abu.</p></article><article><Sparkles /><h3>AI yang tahu batas</h3><p>Gemini hanya membantu saat diminta—tidak menggantikan suara dan kepribadianmu.</p></article></div></section>

      <section className="cta shell"><div><span>SIAP MENEMUKAN ORANGMU?</span><h2>Koneksi yang baik dimulai dari satu <em>sapa.</em></h2></div><Link className="button button-light" href="/login?mode=register">Buat profil gratis <ArrowRight /></Link></section>
      <footer className="shell"><Brand /><p>© 2026 SAPA. Dibuat untuk pertemanan yang lebih bermakna.</p><div><a href="#safety">Safety</a><a href="mailto:hello@sapa.app">Kontak</a></div></footer>
    </main>
  );
}
