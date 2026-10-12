"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@my-store/ui-kit/components/breadcrumb";
import { Separator } from "@my-store/ui-kit/components/separator";
import { SidebarTrigger } from "@my-store/ui-kit/components/sidebar";

import { ThemeToggle } from "./theme-toggle";

/** برچسب فارسی هر بخش از مسیر */
const SECTION_LABELS: Record<string, string> = {
  dashboard: "داشبورد",
  products: "محصولات",
  barcodes: "بارکدها",
  customers: "مشتریان",
  scan: "اسکنر",
  accounting: "فاکتورها",
  expenses: "هزینه‌ها",
  reports: "گزارش‌ها",
  invoices: "جزئیات فاکتور",
};

const SEGMENT_HREF: Record<string, string> = {
  dashboard: "/dashboard",
  products: "/products",
  barcodes: "/barcodes",
  customers: "/customers",
  scan: "/scan",
  accounting: "/accounting",
  expenses: "/accounting/expenses",
  reports: "/accounting/reports",
};

export function SiteHeader() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const crumbs = segments.map((segment, index) => ({
    label: SECTION_LABELS[segment] ?? segment,
    href: SEGMENT_HREF[segment] ?? `/${segments.slice(0, index + 1).join("/")}`,
  }));

  return (
    <header className="bg-background/80 sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b backdrop-blur">
      <div className="flex w-full items-center gap-2 px-4">
        <SidebarTrigger className="-ms-1" />
        <Separator orientation="vertical" className="me-1 data-[orientation=vertical]:h-4" />

        <Breadcrumb className="hidden sm:block">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboard">فروشگاه</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {crumbs.map((crumb, index) => {
              const isLast = index === crumbs.length - 1;
              return (
                <BreadcrumbItem key={crumb.href}>
                  <BreadcrumbSeparator />
                  {isLast ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={crumb.href}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>

        <div className="ms-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
