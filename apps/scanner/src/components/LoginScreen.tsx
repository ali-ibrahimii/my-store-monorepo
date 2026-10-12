import { useState, type FormEvent } from "react";
import { AlertCircle, ScanLine } from "lucide-react";

import { Alert, AlertDescription } from "@my-store/ui-kit/components/alert";
import { Button } from "@my-store/ui-kit/components/button";
import { Card, CardContent, CardHeader } from "@my-store/ui-kit/components/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@my-store/ui-kit/components/field";
import { Input } from "@my-store/ui-kit/components/input";
import { Separator } from "@my-store/ui-kit/components/separator";
import { Spinner } from "@my-store/ui-kit/components/spinner";
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
        <CardHeader className="items-center gap-2 text-center">
          <div className="bg-primary text-primary-foreground mb-2 flex size-14 items-center justify-center rounded-2xl">
            <ScanLine className="size-7" />
          </div>
          <h1 className="text-lg font-semibold">اسکنر فروشگاه من</h1>
          <p className="text-muted-foreground text-sm">
            برای اسکن بارکد وارد حساب فروشگاه شوید
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">ایمیل</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  dir="ltr"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">رمز عبور</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  dir="ltr"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </Field>
            </FieldGroup>

            {error ? (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <Button type="submit" disabled={busy} size="lg" className="w-full">
              {busy ? <Spinner /> : null}
              {busy ? "در حال ورود…" : "ورود"}
            </Button>

            <Separator />

            <p className="text-muted-foreground text-center text-xs">
              سرور: {apiBaseUrlLabel()}
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
