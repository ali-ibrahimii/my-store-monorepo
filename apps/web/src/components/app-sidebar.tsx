"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Barcode,
  BookOpen,
  LayoutDashboard,
  Package,
  Receipt,
  ScanLine,
  Settings,
  ShoppingCart,
  Users,
  UserCog,
  Warehouse,
  Wallet,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@my-store/ui-kit/components/sidebar";

import { NavUser } from "./nav-user";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

const mainNav: NavItem[] = [
  { href: "/dashboard", label: "داشبورد", icon: LayoutDashboard },
  { href: "/products", label: "محصولات", icon: Package },
  { href: "/barcodes", label: "بارکدها", icon: Barcode, adminOnly: true },
  { href: "/scan", label: "اسکنر", icon: ScanLine },
  { href: "/customers", label: "مشتریان", icon: Users },
  { href: "/inventory", label: "حرکت انبار", icon: Warehouse, adminOnly: true },
];

const accountingNav: NavItem[] = [
  { href: "/accounting", label: "فاکتورها", icon: Receipt },
  { href: "/purchases", label: "خرید کالا", icon: ShoppingCart, adminOnly: true },
  { href: "/accounting/expenses", label: "هزینه‌ها", icon: Wallet, adminOnly: true },
  { href: "/accounting/ledger", label: "دفتر کل", icon: BookOpen, adminOnly: true },
  { href: "/accounting/reports", label: "گزارش‌ها", icon: BarChart3, adminOnly: true },
];

const adminNav: NavItem[] = [
  { href: "/settings", label: "تنظیمات فروشگاه", icon: Settings, adminOnly: true },
  { href: "/staff", label: "کاربران", icon: UserCog, adminOnly: true },
];

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  userName: string | null;
  userEmail: string;
  role: string;
  storeName: string;
}

export function AppSidebar({
  userName,
  userEmail,
  role,
  storeName,
  ...props
}: AppSidebarProps) {
  const pathname = usePathname();
  const isAdmin = role === "ADMIN";

  const isActive = (href: string) =>
    pathname === href || (href !== "/accounting" && pathname.startsWith(`${href}/`));

  const renderItems = (items: NavItem[]) => (
    <SidebarMenu>
      {items
        .filter((item) => isAdmin || !item.adminOnly)
        .map((item) => {
          const Icon = item.icon;
          return (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild tooltip={item.label} isActive={isActive(item.href)}>
                <Link href={item.href}>
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon" side="right" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <ScanLine className="size-4" />
                </div>
                <div className="grid flex-1 text-start text-sm leading-tight">
                  <span className="truncate font-semibold">{storeName}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {isAdmin ? "مدیر" : "صندوق‌دار"}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>فروشگاه</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(mainNav)}</SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>حسابداری</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(accountingNav)}</SidebarGroupContent>
        </SidebarGroup>
        {isAdmin ? (
          <SidebarGroup>
            <SidebarGroupLabel>مدیریت</SidebarGroupLabel>
            <SidebarGroupContent>{renderItems(adminNav)}</SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>

      <SidebarFooter>
        <NavUser name={userName} email={userEmail} role={role} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
