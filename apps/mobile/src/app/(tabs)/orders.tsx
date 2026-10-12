// ============================================================
// تب «فاکتورها» — لیست فاکتورهای فروش با فیلتر وضعیت
// (GET /api/invoices)
// ============================================================

import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Invoice, InvoiceStatus } from "@my-store/shared-types";
import {
  INVOICE_STATUS_LABELS,
  formatCurrency,
  formatDateTimeJalali,
  formatNumber,
} from "@my-store/shared-utils";
import { listInvoices } from "@my-store/api-client";
import {
  Badge,
  Card,
  EmptyState,
  Note,
  Screen,
  ScreenHeader,
  colors,
  type Tone,
} from "../../components/ui";
import { describeApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";

const FILTERS: { label: string; status?: InvoiceStatus }[] = [
  { label: "همه" },
  { label: "صادر شده", status: "ISSUED" },
  { label: "پرداخت ناقص", status: "PARTIAL" },
  { label: "پرداخت شده", status: "PAID" },
  { label: "لغو شده", status: "CANCELLED" },
];

const STATUS_TONE: Record<InvoiceStatus, Tone> = {
  DRAFT: "neutral",
  ISSUED: "info",
  PAID: "success",
  PARTIAL: "warning",
  CANCELLED: "danger",
};

export default function OrdersScreen() {
  const { handleAuthError } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<InvoiceStatus | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (filter: InvoiceStatus | undefined, mode: "initial" | "refresh") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      try {
        setError(null);
        const page = await listInvoices({ status: filter, page: 1, pageSize: 25 });
        setInvoices(page.items);
        setTotal(page.total);
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
      void load(status, "initial");
      // عمداً فقط وقتی تب باز می‌شود؛ فیلتر خودش دوباره load می‌کند
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  function applyFilter(next: InvoiceStatus | undefined) {
    setStatus(next);
    void load(next, "initial");
  }

  return (
    <Screen onRefresh={() => void load(status, "refresh")} refreshing={refreshing}>
      <ScreenHeader title="فاکتورها" subtitle={`${formatNumber(total)} فاکتور ثبت شده`} />

      <View style={styles.chips}>
        {FILTERS.map((filter) => {
          const active = filter.status === status;
          return (
            <Pressable
              key={filter.label}
              onPress={() => applyFilter(filter.status)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{filter.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <Note tone="danger">{error}</Note> : null}

      {loading && invoices.length === 0 ? (
        <EmptyState title="در حال گرفتن فاکتورها…" />
      ) : invoices.length === 0 ? (
        <EmptyState title="فاکتوری نیست" hint="با «اسکن» یک فروش ثبت کنید یا از وب‌اپ فاکتور بسازید." />
      ) : (
        invoices.map((invoice) => {
          const remaining = Math.max(0, invoice.total - invoice.paidAmount);
          return (
            <Card key={invoice.id}>
              <View style={styles.cardHeader}>
                <Text style={styles.invoiceNumber}>#{invoice.number}</Text>
                <Badge
                  label={INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status}
                  tone={STATUS_TONE[invoice.status] ?? "neutral"}
                />
              </View>

              <View style={styles.line}>
                <Text style={styles.lineLabel}>مشتری</Text>
                <Text style={styles.lineValue}>{invoice.customer?.name ?? "مشتری گذرا"}</Text>
              </View>
              <View style={styles.line}>
                <Text style={styles.lineLabel}>تاریخ</Text>
                <Text style={styles.lineValue}>{formatDateTimeJalali(invoice.createdAt)}</Text>
              </View>
              <View style={styles.line}>
                <Text style={styles.lineLabel}>تعداد اقلام</Text>
                <Text style={styles.lineValue}>{formatNumber(invoice.items.length)}</Text>
              </View>
              <View style={styles.line}>
                <Text style={styles.lineLabel}>مبلغ کل</Text>
                <Text style={styles.lineStrong}>{formatCurrency(invoice.total)}</Text>
              </View>
              {invoice.status === "PARTIAL" || remaining > 0 ? (
                <View style={styles.line}>
                  <Text style={styles.lineLabel}>مانده</Text>
                  <Text style={[styles.lineValue, remaining > 0 && styles.danger]}>
                    {formatCurrency(remaining)}
                  </Text>
                </View>
              ) : null}
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipLabel: { fontSize: 12, color: colors.muted, fontWeight: "600" },
  chipLabelActive: { color: "#fff" },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  invoiceNumber: { fontSize: 15, fontWeight: "800", color: colors.text },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    gap: 8,
  },
  lineLabel: { fontSize: 13, color: colors.muted, textAlign: "right" },
  lineValue: { fontSize: 13, color: colors.text, textAlign: "left", flexShrink: 1 },
  lineStrong: { fontSize: 14, fontWeight: "800", color: colors.text, textAlign: "left" },
  danger: { color: colors.danger, fontWeight: "700" },
});
