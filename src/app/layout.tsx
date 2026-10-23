import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Harita ve Kadastro Sayısallaştırma Sistemi | CBS & Pafta Takip Portalı",
  description:
    "Kadastro sayısallaştırma, iyileştirme dönüşüm, pafta ve parsel haritalama veri yönetim sistemi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-blue-900 selection:text-white">
        {children}
      </body>
    </html>
  );
}
