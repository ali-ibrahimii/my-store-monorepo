"use client";

import { useRouter } from "next/navigation";
import { ChevronsUpDown, LogOut } from "lucide-react";
import { ROLE_LABELS } from "@my-store/shared-utils";

import { Avatar, AvatarFallback } from "@my-store/ui-kit/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@my-store/ui-kit/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@my-store/ui-kit/components/sidebar";

interface NavUserProps {
  name: string | null;
  email: string;
  role: string;
}

/** کاربر جاری در پایین سایدبار — منوی shadcn با خروج از حساب. */
export function NavUser({ name, email, role }: NavUserProps) {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const label = name?.trim() || email;
  const initials = label.slice(0, 2).toUpperCase();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-start text-sm leading-tight">
                <span className="truncate font-medium">{label}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {ROLE_LABELS[role] ?? role}
                </span>
              </div>
              <ChevronsUpDown className="ms-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "left"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-start text-sm leading-tight">
                  <span className="truncate font-medium">{label}</span>
                  <span className="text-muted-foreground truncate text-xs" dir="ltr">
                    {email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                router.push("/login");
                router.refresh();
              }}
            >
              <LogOut className="size-4" />
              خروج از حساب
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
