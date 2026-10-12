// ============================================================
// تب «پروفایل» — کاربر جاری، وضعیت سرور و خروج
// ============================================================

import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { ROLE_LABELS, formatDateTimeJalali } from "@my-store/shared-utils";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  Note,
  Screen,
  ScreenHeader,
  colors,
} from "../../components/ui";
import { describeApiBase, describeApiError, fetchHealth, type HealthStatus } from "../../lib/api";
import { useAuth } from "../../lib/auth";

export default function ProfileScreen() {
  const { user, token, signOut } = useAuth();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    setChecking(true);
    setError(null);
    try {
      setHealth(await fetchHealth());
    } catch (err) {
      setHealth(null);
      setError(describeApiError(err));
    } finally {
      setChecking(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void check();
    }, [check]),
  );

  const dbReachable = health?.database?.reachable ?? health?.ok ?? false;

  return (
    <Screen>
      <ScreenHeader title="پروفایل" subtitle="کاربر جاری و وضعیت اتصال" />

      <Card>
        <View style={styles.headerRow}>
          <Text style={styles.name}>{user?.name ?? "کاربر"}</Text>
          <Badge
            label={ROLE_LABELS[user?.role ?? "CASHIER"] ?? user?.role ?? "—"}
            tone={user?.role === "OWNER" ? "success" : "info"}
          />
        </View>
        <View style={styles.line}>
          <Text style={styles.label}>ایمیل</Text>
          <Text style={[styles.value, styles.ltr]}>{user?.email ?? "—"}</Text>
        </View>
        <View style={styles.line}>
          <Text style={styles.label}>شناسه‌ی کاربر</Text>
          <Text style={[styles.value, styles.ltr]}>{user?.id.slice(-8) ?? "—"}</Text>
        </View>
        <View style={styles.line}>
          <Text style={styles.label}>فروشگاه</Text>
          <Text style={[styles.value, styles.ltr]}>{user?.storeId.slice(-8) ?? "—"}</Text>
        </View>
        <View style={styles.line}>
          <Text style={styles.label}>توکن ورود</Text>
          <Text style={[styles.value, styles.ltr]}>
            {token ? `…${token.slice(-8)}` : "—"}
          </Text>
        </View>
      </Card>

      <Card>
        <CardTitle>سرور و دیتابیس</CardTitle>
        <View style={styles.line}>
          <Text style={styles.label}>آدرس API</Text>
          <Text style={[styles.value, styles.ltr]}>{describeApiBase()}</Text>
        </View>
        <View style={styles.line}>
          <Text style={styles.label}>وب‌اپ</Text>
          <Text style={[styles.value, health ? (health.ok ? styles.ok : styles.danger) : null]}>
            {health ? (health.ok ? "در دسترس" : "مشکل دارد") : checking ? "در حال بررسی…" : "—"}
          </Text>
        </View>
        <View style={styles.line}>
          <Text style={styles.label}>دیتابیس</Text>
          <Text style={[styles.value, health ? (dbReachable ? styles.ok : styles.danger) : null]}>
            {health
              ? dbReachable
                ? `${health.db ?? "mongodb"} — وصل`
                : "قطع"
              : checking
                ? "در حال بررسی…"
                : "—"}
          </Text>
        </View>
        {health?.latencyMs !== undefined ? (
          <View style={styles.line}>
            <Text style={styles.label}>زمان پاسخ</Text>
            <Text style={styles.value}>{health.latencyMs} ms</Text>
          </View>
        ) : null}
        {health?.time ? (
          <View style={styles.line}>
            <Text style={styles.label}>زمان بررسی</Text>
            <Text style={styles.value}>{formatDateTimeJalali(health.time)}</Text>
          </View>
        ) : null}

        {error ? <Note tone="danger">{error}</Note> : null}
        {health && !dbReachable ? (
          <Note tone="warning">
            {health.database?.hint ??
              "دیتابیس در دسترس نیست. وب‌اپ را با «pnpm dev» اجرا کنید تا دیتابیس توسعه هم بالا بیاید."}
          </Note>
        ) : null}

        <Button label="بررسی دوباره" variant="outline" onPress={check} loading={checking} />
      </Card>

      <Card>
        <CardTitle>خروج</CardTitle>
        <Text style={styles.hint}>
          توکن ورود از این دستگاه پاک می‌شود و برای ورود دوباره به ایمیل و رمز عبور نیاز دارید.
        </Text>
        <Button label="خروج از حساب" variant="danger" onPress={() => void signOut()} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: { fontSize: 18, fontWeight: "800", color: colors.text, textAlign: "right" },
  line: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, gap: 8 },
  label: { fontSize: 13, color: colors.muted, textAlign: "right" },
  value: { fontSize: 13, fontWeight: "600", color: colors.text, textAlign: "left", flexShrink: 1 },
  ltr: { textAlign: "left" },
  ok: { color: colors.success },
  danger: { color: colors.danger },
  hint: { fontSize: 12, color: colors.muted, textAlign: "right", lineHeight: 19 },
});
