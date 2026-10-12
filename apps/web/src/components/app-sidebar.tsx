"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  LayoutDashboard,
  Package,
  Receipt,
  ScanLine,
  Users,
  Wallet,
} from "lucide-react";
import { APP_NAME_FA } from "@my-store/shared-utils";

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
};

const mainNav: NavItem[] = [
  { href: "/dashboard", label: "داشبورد", icon: LayoutDashboard },
  { href: "/products", label: "محصولات", icon: Package },
  { href: "/scan", label: "اسکنر", icon: ScanLine },
  { href: "/customers", label: "مشتریان", icon: Users },
];

const accountingNav: NavItem[] = [
  { href: "/accounting", label: "فاکتورها", icon: Receipt },
  { href: "/accounting/expenses", label: "هزینه‌ها", icon: Wallet },
  { href: "/accounting/reports", label: "گزارش‌ها", icon: BarChart3 },
];

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  userName: string | null;
  userEmail: string;
  role: string;
}

export function AppSidebar({ userName, userEmail, role, ...props }: AppSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href ||
    (href !== "/accounting" && pathname.startsWith(`${href}/`));

  const renderItems = (items: NavItem[]) => (
    <SidebarMenu>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              tooltip={item.label}
              isActive={isActive(item.href)}
            >
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
                  <span className="truncate font-semibold">{APP_NAME_FA}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    my-store
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
          <SidebarGroupLabel>حساب‌داری</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(accountingNav)}</SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser name={userName} email={userEmail} role={role} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
