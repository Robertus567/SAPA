import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className={`brand ${compact ? "brand-compact" : ""}`} aria-label="SAPA home"><span className="brand-mark"><i /><b /></span><strong>SAPA</strong>{!compact && <small>friend finder</small>}</Link>;
}
