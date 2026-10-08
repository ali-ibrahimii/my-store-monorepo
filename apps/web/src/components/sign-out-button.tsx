"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@my-store/ui-kit";

export function SignOutButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full"
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      <LogOut className="h-4 w-4" />
      خروج
    </Button>
  );
}
