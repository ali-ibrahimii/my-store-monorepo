// ============================================================
// تب «امروز» — خلاصه‌ی مالی و دسترسی سریع
// همان اعدادی که داشبورد وب نشان می‌دهد (GET /api/reports/summary)
// ============================================================

import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { SummaryReport } from "@my-store/shared-types";
import { formatCurrency, formatNumber } from "@my-store/shared-utils";
import { getSummary } from "@my-store/api-client";
import {
  Button,
  Card,
  CardTitle,
  EmptyState,
  Note,
  Screen,
  ScreenHeader,
  Stat,
  colors,
} from "../../components/ui";
import { describeApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";

export default function TodayScreen() {
  const { user, handleAuthError } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<SummaryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: "initial" | "refresh") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      try {
        setError(null);
        setSummary(await getSummary());
      } catch (err) {
        if (handleAuthError(err)) return;
        setError(describeApiError(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [handleAuthError],
  );

  useFocusEffect(
    useCallback(() => {
      void load("initial");
    }, [load]),
  );

  return (
    <Screen onRefresh={() => void load("refresh")} refreshing={refreshing}>
      <ScreenHeader
        title="سلام 👋"
        subtitle={user?.name ? `${user.name} — وضعیت امروز فروشگاه` : "وضعیت امروز فروشگاه"}
      />

      {error ? <Note tone="danger">{error}</Note> : null}

      {loading && !summary ? (
        <EmptyState title="در حال گرفتن آمار…" hint="یک لحظه صبر کنید" />
      ) : summary ? (
        <>
          <View style={styles.grid}>
            <Stat label="فروش امروز" value={formatCurrency(summary.todayRevenue)} tone="success" />
            <Stat label="فروش این ماه" value={formatCurrency(summary.monthRevenue)} tone="info" />
            <Stat label="هزینه‌ی امروز" value={formatCurrency(summary.todayExpenses)} tone="warning" />
            <Stat label="سود خالص امروز" value={formatCurrency(summary.netProfitToday)} tone="success" />
            <Stat label="ارزش انبار" value={formatCurrency(summary.inventoryValue)} tone="neutral" />
            <Stat
              label="فاکتورهای پرداخت‌نشده"
              value={formatCurrency(summary.unpaidInvoicesAmount)}
              tone={summary.unpaidInvoicesAmount > 0 ? "danger" : "neutral"}
            />
          </View>

          <Card>
            <CardTitle>جزئیات</CardTitle>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>تعداد فاکتورها</Text>
              <Text style={styles.detailValue}>{formatNumber(summary.invoiceCount)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>کالاهای کم‌موجود</Text>
              <Text style={[styles.detailValue, summary.lowStockCount > 0 && styles.danger]}>
                {formatNumber(summary.lowStockCount)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>هزینه‌ی این ماه</Text>
              <Text style={styles.detailValue}>{formatCurrency(summary.monthExpenses)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>سود خالص این ماه</Text>
              <Text style={styles.detailValue}>{formatCurrency(summary.netProfitMonth)}</Text>
            </View>
          </Card>
        </>
      ) : null}

      <Card style={styles.quick}>
        <CardTitle>دسترسی سریع</CardTitle>
        <View style={styles.actions}>
          <Button
            label="📷 اسکن بارکد"
            variant="accent"
            onPress={() => router.push("/scanner")}
          />
          <Button label="🧾 فاکتورها" variant="outline" onPress={() => router.push("/orders")} />
        </View>
        <Text style={styles.hint}>
          برای مدیریت کامل کالاها و گزارش‌ها از وب‌اپ استفاده کنید؛ اپ موبایل روی صندوق و اسکنر
          تمرکز دارد.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  detailLabel: { fontSize: 13, color: colors.muted, textAlign: "right" },
  detailValue: { fontSize: 14, fontWeight: "700", color: colors.text, textAlign: "left" },
  danger: { color: colors.danger },
  quick: { gap: 12 },
  actions: { gap: 10 },
  actionSlot: { flexGrow: 1 },
  hint: { fontSize: 12, color: colors.muted, textAlign: "right", lineHeight: 19 },
});
