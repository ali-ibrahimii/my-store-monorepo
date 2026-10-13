import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, Eye, EyeOff, LogIn, ScanLine, ServerCrash } from "lucide-react";

import { Alert, AlertDescription } from "@my-store/ui-kit/components/alert";
import { Button } from "@my-store/ui-kit/components/button";
import { Input } from "@my-store/ui-kit/components/input";
import { Spinner } from "@my-store/ui-kit/components/spinner";
import { ApiError, apiGet, apiPost } from "@my-store/api-client";
import { API_ROUTES, toPersianDigits } from "@my-store/shared-utils";
import type { MobileSession } from "@my-store/shared-types";
import { apiBaseUrlLabel, saveSession } from "../lib/api";

interface HealthResponse {
  ok?: boolean;
  error?: string;
  configured?: boolean;
  project?: string | null;
  latencyMs?: number;
  database?: { hint?: string; error?: string };
}

function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const body = error.data as HealthResponse | null;
    if (error.status === 503 && body?.database?.hint) return body.database.hint;
    if (error.status >= 500) {
      const detail = body?.error || error.message;
      return `${detail} (HTTP ${error.status}) — آدرس API فعلی: ${apiBaseUrlLabel()}`;
    }
    return error.message || `خطای سرور (${error.status})`;
  }
  if (error instanceof SyntaxError) {
    return `پاسخ سرور معتبر نیست. آدرس API فعلی: ${apiBaseUrlLabel()}`;
  }
  if (error instanceof Error) {
    if (/failed to fetch|network|load failed/i.test(error.message)) {
      return `ارتباط با وب‌اپ برقرار نشد. آدرس API فعلی: ${apiBaseUrlLabel()} — مقدار VITE_API_URL را بررسی کنید و CORS_ORIGINS را در وب‌اپ روی دامنه‌ی همین اسکنر بگذارید.`;
    }
    return error.message || "خطای ناشناخته";
  }
  return "ارتباط با وب‌اپ برقرار نشد.";
}

interface LoginScreenProps {
  onLoggedIn: (session: MobileSession) => void;
}

export function LoginScreen({ onLoggedIn }: LoginScreenProps) {
  const [email, setEmail] = useState("cashier@mystore.ir");
  const [password, setPassword] = useState("123456");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<{ ok: boolean; detail?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGet<HealthResponse>(API_ROUTES.health)
      .then((result) => {
        if (cancelled) return;
        setHealth({
          ok: result.ok !== false,
          detail:
            result.ok === false
              ? (result.database?.hint ?? result.database?.error ?? "دیتابیس در دسترس نیست")
              : undefined,
        });
      })
      .catch((cause: unknown) => {
        if (!cancelled) setHealth({ ok: false, detail: apiErrorMessage(cause) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const session = await apiPost<MobileSession>(API_ROUTES.scannerLogin, {
        email: email.trim(),
        password,
      });
      saveSession(session);
      onLoggedIn(session);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="from-primary/10 via-background to-background flex min-h-full flex-col justify-center bg-gradient-to-b p-5 pt-safe pb-safe">
      <div className="mx-auto w-full max-w-sm space-y-6">
        <div className="space-y-3 text-center">
          <div className="bg-primary text-primary-foreground mx-auto flex size-16 items-center justify-center rounded-3xl shadow-lg">
            <ScanLine className="size-8" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold">اسکنر فروشگاه من</h1>
            <p className="text-muted-foreground text-sm">
              اقلام را اسکن کنید و در پایان با یک کلید، فاکتور را ثبت کنید.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                ایمیل
              </label>
              <Input
                id="email"
                type="email"
                dir="ltr"
                inputMode="email"
                autoComplete="username"
                className="h-12 text-base"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                رمز عبور
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  dir="ltr"
                  autoComplete="current-password"
                  className="h-12 pe-12 text-base"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="text-muted-foreground absolute end-3 top-1/2 -translate-y-1/2 p-1"
                  aria-label={showPassword ? "پنهان کردن رمز" : "نمایش رمز"}
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </div>
          </div>

          {health && !health.ok ? (
            <Alert variant="destructive">
              <ServerCrash className="size-4" />
              <AlertDescription className="text-xs">
                سرور/دیتابیس آماده نیست: {health.detail}
              </AlertDescription>
            </Alert>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          ) : null}

          <Button type="submit" disabled={busy} className="h-14 w-full text-base font-semibold">
            {busy ? <Spinner /> : <LogIn className="size-5" />}
            {busy ? "در حال ورود…" : "ورود و شروع اسکن"}
          </Button>

          <p className="text-muted-foreground text-center text-[11px] leading-5">
            سرور: <span dir="ltr">{apiBaseUrlLabel()}</span>
            {health?.ok ? " · دیتابیس آماده" : null}
          </p>
        </form>

        <p className="text-muted-foreground text-center text-[11px]">
          {toPersianDigits(new Date().getFullYear())} © فروشگاه من
        </p>
      </div>
    </div>
  );
}
