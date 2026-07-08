import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaiwanHolic 翻譯小秘書",
  description:
    "將台灣旅遊文章翻成自然日文，同時保留原作者原意。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
