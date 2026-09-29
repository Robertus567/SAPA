import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAPA - Temukan yang Satu Frekuensi",
  description: "Platform pertemanan platonic berdasarkan MBTI, minat, hobi, dan bahasa.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
