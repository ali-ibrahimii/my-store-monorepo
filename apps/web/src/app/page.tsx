import Link from "next/link";
import {
  BarChart3,
  LayoutDashboard,
  Package,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Badge } from "@my-store/ui-kit/components/badge";
import { Button } from "@my-store/ui-kit/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@my-store/ui-kit/components/card";
import { Separator } from "@my-store/ui-kit/components/separator";

import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  {
    href: "/dashboard",
    title: "داشبورد",
    desc: "نمای کلی فروش، سود، موجودی انبار و فید زنده اسکن‌ها",
    icon: LayoutDashboard,
  },
  {
    href: "/products",
    title: "محصولات و انبار",
    desc: "ثبت کالا با بارکد، دسته‌بندی و هشدار کم‌موجودی",
    icon: Package,
  },
  {
    href: "/accounting",
    title: "حساب‌داری",
    desc: "فاکتور فروش، هزینه‌ها، دفتر کل و گزارش سود و زیان",
    icon: BarChart3,
  },
  {
    href: "/scan",
    title: "اسکنر موبایل",
    desc: "اسکن بارکد با دوربین گوشی و ثبت لحظه‌ای روی همه دستگاه‌ها",
    icon: ScanLine,
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-1 flex-col gap-12 px-6 py-12">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg">
            <ScanLine className="size-5" />
          </div>
          <span className="font-bold">فروشگاه من</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">ورود</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/register">ثبت‌نام</Link>
          </Button>
        </div>
      </header>

      <section className="space-y-6 text-center">
        <Badge variant="secondary" className="mx-auto flex w-fit gap-1">
          <Sparkles className="size-3" />
          ساخته‌شده با Next.js و shadcn/ui
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          فروشگاهت را ساده‌تر اداره کن
        </h1>
        <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
          انبار، فاکتور، هزینه و اسکن بارکد با موبایل — همه در یک پنل فارسی و
          راست‌به‌چپ، با گزارش‌های لحظه‌ای.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/dashboard">
              <LayoutDashboard className="size-4" />
              ورود به داشبورد
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/scan">
              <ScanLine className="size-4" />
              شروع اسکن
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.href} className="transition-colors hover:border-primary/50">
              <Link href={feature.href} className="block h-full">
                <CardHeader>
                  <div className="bg-muted text-foreground flex size-9 items-center justify-center rounded-lg">
                    <Icon className="size-4" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-primary text-sm font-medium">
                    مشاهده →
                  </span>
                </CardContent>
              </Link>
            </Card>
          );
        })}
      </section>

      <Separator />

      <footer className="text-muted-foreground flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-4" />
          نسخه اولیه — برای ورود به پنل از صفحه ورود استفاده کنید.
        </span>
        <Link href="/login" className="text-primary underline-offset-4 hover:underline">
          ورود به پنل مدیریت
        </Link>
      </footer>
    </main>
  );
}
