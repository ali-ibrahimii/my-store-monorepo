// ============================================================
// ورود اپ موبایل
//
// مثل صفحه‌ی ورود وب، اول سلامت سرور/دیتابیس را چک می‌کند تا
// «دیتابیس خاموش» با «رمز اشتباه» قاطی نشود.
// ============================================================

import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, Card, Field, Note, Screen, colors } from "../../components/ui";
import { describeApiBase, describeApiError, fetchHealth } from "../../lib/api";
import { useAuth } from "../../lib/auth";

export default function LoginScreen() {
  const { signIn } = useAuth();

  const [email, setEmail] = useState("owner@mystore.ir");
  const [password, setPassword] = useState("123456");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  // اگر سرور/دیتابیس پایین باشد، همان اول می‌گوییم (نه بعد از «رمز اشتباه»)
  useEffect(() => {
    let cancelled = false;
    fetchHealth()
      .then((health) => {
        if (cancelled || health?.ok) return;
        setWarning(health?.database?.hint ?? "دیتابیس در دسترس نیست.");
      })
      .catch((err: unknown) => {
        if (!cancelled) setWarning(describeApiError(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit() {
    setError(null);
    setBusy(true);
    try {
      await signIn({ email, password });
      // موفق → RouteGuard خودش به تب‌ها می‌برد
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setBusy(false);
    }
  }

  const debug = (
    globalThis as unknown as { __MYSTORE_DEBUG__?: { bundle: string; last: unknown } } | undefined
  )?.__MYSTORE_DEBUG__;

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.title}>فروشگاه من</Text>
        <Text style={styles.subtitle}>نقطه‌فروش، انبار و حسابداری — نسخه‌ی موبایل</Text>
      </View>

      <Card>
        <Field
          label="ایمیل"
          value={email}
          onChangeText={setEmail}
          placeholder="owner@mystore.ir"
          keyboardType="email-address"
          autoComplete="email"
          ltr
        />
        <Field
          label="رمز عبور"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••"
          secureTextEntry
          autoComplete="password"
          ltr
          onSubmitEditing={onSubmit}
        />

        {warning ? <Note tone="warning">{warning}</Note> : null}
        {error ? <Note tone="danger">{error}</Note> : null}

        <Button label={busy ? "در حال ورود…" : "ورود"} onPress={onSubmit} loading={busy} />

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>حساب ندارید؟</Text>
          <Link href="/register" asChild>
            <Text style={styles.link}> ثبت فروشگاه جدید</Text>
          </Link>
        </View>
      </Card>

      <Card>
        <Text style={styles.hintTitle}>حساب‌های نمونه</Text>
        <Text style={styles.hint}>owner@mystore.ir / 123456 — دسترسی کامل (مالک)</Text>
        <Text style={styles.hint}>cashier@mystore.ir / 123456 — فقط صندوق</Text>
        <Text style={styles.hintMuted}>سرور API: {describeApiBase()}</Text>
      </Card>

      {/* [debug موقت] نسخه‌ی باندل در حال اجرا و آخرین درخواست API */}
      <Text style={styles.debug} numberOfLines={3}>
        {debug
          ? JSON.stringify(debug)
          : "debug: هیچ درخواست API از این باندل ثبت نشده (bundle قدیمی؟ دکمه‌ی رفرش پیش‌نمایش را بزنید)"}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 4, paddingTop: 24, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: "800", color: colors.text, textAlign: "right" },
  subtitle: { fontSize: 14, color: colors.muted, textAlign: "right" },
  footerRow: { flexDirection: "row", justifyContent: "center", marginTop: 4 },
  footerText: { fontSize: 13, color: colors.muted },
  link: { fontSize: 13, color: colors.accent, fontWeight: "700" },
  hintTitle: { fontSize: 13, fontWeight: "700", color: colors.text, textAlign: "right" },
  hint: { fontSize: 13, color: colors.muted, textAlign: "right", lineHeight: 20 },
  hintMuted: { fontSize: 12, color: colors.muted, textAlign: "right", marginTop: 4, opacity: 0.8 },
  debug: {
    fontSize: 10,
    color: colors.muted,
    textAlign: "left",
    opacity: 0.7,
    fontFamily: "monospace",
  },
});
