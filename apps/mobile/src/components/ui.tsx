// ============================================================
// قطعه‌های پایه‌ی رابط کاربری موبایل (فقط با React Native)
//
// چرا از `@my-store/ui-kit` استفاده نکردیم؟ آن بسته برای وب است
// (div/input + کلاس‌های Tailwind) و در React Native معنی ندارد.
// ظاهر و رنگ‌ها را عمداً نزدیک به وب‌اپ نگه داشته‌ایم.
// ============================================================

import React from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

export const colors = {
  bg: "#f8fafc",
  surface: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  muted: "#64748b",
  primary: "#0f172a",
  accent: "#0d9488",
  danger: "#dc2626",
  warning: "#b45309",
  success: "#15803d",
  info: "#1d4ed8",
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

// ------------------------------------------------------------
// Screen
// ------------------------------------------------------------

export function Screen({
  children,
  onRefresh,
  refreshing = false,
  contentStyle,
  scroll = true,
}: {
  children: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  scroll?: boolean;
}) {
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.muted} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.scrollContent, contentStyle]}>{children}</View>
  );

  return <SafeAreaView style={styles.screen}>{content}</SafeAreaView>;
}

export function ScreenHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

// ------------------------------------------------------------
// Card
// ------------------------------------------------------------

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.cardTitle}>{children}</Text>;
}

export function Row({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: StyleProp<TextStyle>;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueStyle]}>{value}</Text>
    </View>
  );
}

// ------------------------------------------------------------
// Button
// ------------------------------------------------------------

type ButtonVariant = "primary" | "accent" | "outline" | "danger" | "ghost";

export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        variant === "outline" && styles.buttonOutline,
        variant === "danger" && { backgroundColor: colors.danger, borderColor: colors.danger },
        variant === "accent" && { backgroundColor: colors.accent, borderColor: colors.accent },
        variant === "ghost" && styles.buttonGhost,
        (isDisabled || pressed) && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === "outline" ? colors.primary : "#fff"} />
      ) : null}
      <Text
        style={[
          styles.buttonLabel,
          variant === "outline" && { color: colors.text },
          variant === "ghost" && { color: colors.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ------------------------------------------------------------
// Field
// ------------------------------------------------------------

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize = "none",
  autoComplete,
  multiline,
  hint,
  error,
  ltr = false,
  onSubmitEditing,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoComplete?: "email" | "password" | "name" | "off";
  multiline?: boolean;
  hint?: string;
  error?: string | null;
  ltr?: boolean;
  onSubmitEditing?: () => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        autoComplete={autoComplete}
        multiline={multiline}
        onSubmitEditing={onSubmitEditing}
        style={[styles.input, multiline && styles.inputMultiline, ltr && styles.ltr]}
      />
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

// ------------------------------------------------------------
// Badge / Note / Stat / Empty / Loading
// ------------------------------------------------------------

export type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const toneStyles: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: "#e2e8f0", fg: "#334155" },
  success: { bg: "#dcfce7", fg: colors.success },
  warning: { bg: "#fef3c7", fg: colors.warning },
  danger: { bg: "#fee2e2", fg: colors.danger },
  info: { bg: "#dbeafe", fg: colors.info },
};

export function Badge({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  const toneStyle = toneStyles[tone];
  return (
    <View style={[styles.badge, { backgroundColor: toneStyle.bg }]}>
      <Text style={[styles.badgeLabel, { color: toneStyle.fg }]}>{label}</Text>
    </View>
  );
}

export function Note({
  children,
  tone = "danger",
}: {
  children: React.ReactNode;
  tone?: "danger" | "warning" | "info" | "success";
}) {
  const toneStyle = toneStyles[tone];
  return (
    <View style={[styles.note, { backgroundColor: toneStyle.bg }]}>
      <Text style={[styles.noteText, { color: toneStyle.fg }]}>{children}</Text>
    </View>
  );
}

export function Stat({ label, value, tone = "neutral" }: { label: string; value: string; tone?: Tone }) {
  const toneStyle = toneStyles[tone];
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: toneStyle.fg }]}>{value}</Text>
    </View>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {hint ? <Text style={styles.emptyHint}>{hint}</Text> : null}
    </View>
  );
}

export function Loading({ label = "در حال بارگذاری…" }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.accent} />
      <Text style={styles.loadingLabel}>{label}</Text>
    </View>
  );
}

// ------------------------------------------------------------
// Styles
// ------------------------------------------------------------

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: spacing.lg, gap: spacing.lg, flexGrow: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  headerText: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: colors.text, textAlign: "right" },
  headerSubtitle: { fontSize: 13, color: colors.muted, textAlign: "right" },

  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.text, textAlign: "right" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    gap: spacing.md,
  },
  rowLabel: { fontSize: 13, color: colors.muted, flex: 1, textAlign: "right" },
  rowValue: { fontSize: 14, color: colors.text, fontWeight: "600", textAlign: "left" },

  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
  },
  buttonOutline: { backgroundColor: "transparent", borderColor: colors.border },
  buttonGhost: { backgroundColor: "transparent", borderColor: "transparent" },
  buttonDisabled: { opacity: 0.55 },
  buttonLabel: { color: "#fff", fontSize: 15, fontWeight: "700" },

  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.text, textAlign: "right" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    textAlign: "right",
  },
  inputMultiline: { minHeight: 80, textAlignVertical: "top" },
  ltr: { textAlign: "left" },
  fieldHint: { fontSize: 12, color: colors.muted, textAlign: "right" },
  fieldError: { fontSize: 12, color: colors.danger, textAlign: "right" },

  badge: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeLabel: { fontSize: 12, fontWeight: "700" },

  note: { borderRadius: 10, padding: spacing.md },
  noteText: { fontSize: 13, lineHeight: 20, textAlign: "right" },

  stat: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
    gap: 4,
    minWidth: 140,
  },
  statLabel: { fontSize: 12, color: colors.muted, textAlign: "right" },
  statValue: { fontSize: 17, fontWeight: "700", textAlign: "right" },

  empty: { gap: 6, paddingVertical: spacing.lg, alignItems: "center" },
  emptyTitle: { fontSize: 15, fontWeight: "600", color: colors.text, textAlign: "center" },
  emptyHint: { fontSize: 13, color: colors.muted, textAlign: "center" },

  loading: { gap: spacing.sm, alignItems: "center", paddingVertical: spacing.xl },
  loadingLabel: { fontSize: 13, color: colors.muted, textAlign: "center" },
});
