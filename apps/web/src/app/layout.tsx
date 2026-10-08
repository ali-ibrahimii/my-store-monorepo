import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "فروشگاه من | my-store",
    template: "%s | my-store",
  },
  description: "سیستم مدیریت فروشگاه، انبارداری، حساب‌داری و اسکن لحظه‌ای محصولات با موبایل",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
