"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ScanLine,
  Receipt,
  Wallet,
  Users,
  BarChart3,
} from "lucide-react";
import { cn } from "@my-store/ui-kit";
import { APP_NAME_FA, ROLE_LABELS } from "@my-store/shared-utils";
import { SignOutButton } from "./sign-out-button";

const items = [
  { href: "/dashboard", label: "داشبورد", icon: LayoutDashboard },
  { href: "/products", label: "محصولات", icon: Package },
  { href: "/scan", label: "اسکنر", icon: ScanLine },
  { href: "/accounting", label: "فاکتورها", icon: Receipt },
  { href: "/accounting/expenses", label: "هزینه‌ها", icon: Wallet },
  { href: "/accounting/reports", label: "گزارش‌ها", icon: BarChart3 },
  { href: "/customers", label: "مشتریان", icon: Users },
];

interface DashboardNavProps {
  userName: string | null;
  userEmail: string;
  role: string;
}

export function DashboardNav({ userName, userEmail, role }: DashboardNavProps) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-l bg-sidebar text-sidebar-foreground">
      <div className="border-b p-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ScanLine className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold leading-tight">{APP_NAME_FA}</div>
            <div className="text-muted-foreground text-xs">my-store</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <div className="mb-3">
          <div className="truncate text-sm font-medium">
            {userName || userEmail}
          </div>
          <div className="text-muted-foreground text-xs">
            {ROLE_LABELS[role] ?? role}
          </div>
        </div>
        <SignOutButton />
      </div>
    </aside>
  );
}
