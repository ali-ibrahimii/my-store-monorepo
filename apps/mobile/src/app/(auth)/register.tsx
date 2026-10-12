// ============================================================
// ثبت فروشگاه جدید (multi-tenant) و ورود خودکار
// ============================================================

import { Link } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, Card, Field, Note, Screen, colors } from "../../components/ui";
import { describeApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";

export default function RegisterScreen() {
  const { signUp } = useAuth();

  const [storeName, setStoreName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    setBusy(true);
    try {
      await signUp({ storeName, name, email, password });
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.title}>فروشگاه جدید</Text>
        <Text style={styles.subtitle}>یک فروشگاه و یک حساب مالک می‌سازیم و مستقیم وارد می‌شوید.</Text>
      </View>

      <Card>
        <Field
          label="نام فروشگاه"
          value={storeName}
          onChangeText={setStoreName}
          placeholder="فروشگاه من"
          autoCapitalize="words"
        />
        <Field
          label="نام شما"
          value={name}
          onChangeText={setName}
          placeholder="نام و نام خانوادگی"
          autoCapitalize="words"
          autoComplete="name"
        />
        <Field
          label="ایمیل"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoComplete="email"
          ltr
        />
        <Field
          label="رمز عبور"
          value={password}
          onChangeText={setPassword}
          placeholder="حداقل ۶ کاراکتر"
          secureTextEntry
          autoComplete="password"
          ltr
          onSubmitEditing={onSubmit}
        />

        {error ? <Note tone="danger">{error}</Note> : null}

        <Button label={busy ? "در حال ثبت‌نام…" : "ثبت‌نام و ورود"} onPress={onSubmit} loading={busy} />

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>قبلاً ثبت‌نام کرده‌اید؟</Text>
          <Link href="/login" asChild>
            <Text style={styles.link}> ورود</Text>
          </Link>
        </View>
      </Card>
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
});
