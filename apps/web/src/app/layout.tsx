import type { Metadata } from "next";
import "./globals.css";

import { Toaster } from "@my-store/ui-kit/components/sonner";

import { ThemeProvider } from "@/components/theme-provider";

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
    <html lang="fa" dir="rtl" className="h-full" suppressHydrationWarning>
      <body className="bg-background text-foreground flex min-h-full flex-col font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster dir="rtl" position="bottom-left" closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
