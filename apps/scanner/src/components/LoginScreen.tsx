import { useState, type FormEvent } from "react";
import { ScanLine } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@my-store/ui-kit";
import { apiPost } from "@my-store/api-client";
import { API_ROUTES } from "@my-store/shared-utils";
import type { MobileSession } from "@my-store/shared-types";
import { apiBaseUrlLabel, saveSession } from "../lib/api";

interface LoginScreenProps {
  onLoggedIn: (session: MobileSession) => void;
}

export function LoginScreen({ onLoggedIn }: LoginScreenProps) {
  const [email, setEmail] = useState("owner@mystore.ir");
  const [password, setPassword] = useState("123456");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const session = await apiPost<MobileSession>(API_ROUTES.mobileLogin, {
        email: email.trim(),
        password,
      });
      saveSession(session);
      onLoggedIn(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ورود ناموفق بود");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="bg-primary text-primary-foreground mb-2 flex h-14 w-14 items-center justify-center rounded-2xl">
            <ScanLine className="h-7 w-7" />
          </div>
          <CardTitle>اسکنر فروشگاه من</CardTitle>
          <p className="text-muted-foreground text-sm">
            برای اسکن بارکد وارد حساب فروشگاه شوید
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                ایمیل
              </label>
              <Input
                id="email"
                type="email"
                dir="ltr"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                رمز عبور
              </label>
              <Input
                id="password"
                type="password"
                dir="ltr"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error ? (
              <p className="text-destructive text-sm">{error}</p>
            ) : null}
            <Button type="submit" disabled={busy} className="w-full" size="lg">
              {busy ? "در حال ورود…" : "ورود"}
            </Button>
            <p className="text-muted-foreground text-center text-xs">
              سرور: {apiBaseUrlLabel()}
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
