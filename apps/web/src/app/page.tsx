import Link from "next/link";

const links = [
  { href: "/dashboard", title: "داشبورد", desc: "نمای کلی فروشگاه و فروش" },
  { href: "/accounting", title: "حساب‌داری", desc: "فاکتور، هزینه و گزارش مالی" },
  { href: "/products", title: "محصولات", desc: "مدیریت katalog و موجودی انبار" },
  { href: "/scan", title: "اسکنر", desc: "اسکن بارکد محصول با دوربین گوشی" },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-3 text-center">
        <h1 className="text-4xl font-bold tracking-tight">فروشگاه من</h1>
        <p className="text-muted-foreground text-lg">
          مدیریت فروشگاه، انبار، حساب‌داری و اسکن لحظه‌ای محصولات
        </p>
      </header>

      <nav className="grid gap-4 sm:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group rounded-lg border bg-card p-5 shadow-sm transition-colors hover:border-primary"
          >
            <h2 className="text-xl font-semibold group-hover:text-primary">
              {link.title}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">{link.desc}</p>
          </Link>
        ))}
      </nav>

      <footer className="text-muted-foreground mt-auto text-center text-sm">
        نسخه اولیه — برای ورود به پنل مدیریت از{" "}
        <Link href="/login" className="text-primary underline">
          صفحه ورود
        </Link>{" "}
        استفاده کنید.
      </footer>
    </main>
  );
}
