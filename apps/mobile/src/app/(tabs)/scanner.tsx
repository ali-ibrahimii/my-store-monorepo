// ============================================================
// تب «اسکن» — ثبت رویداد بارکد و دیدن آخرین اسکن‌ها
//
// روی گوشی می‌توانید بارکد را با قلم/کیبورد یا اسکنر سخت‌افزاری
// (که مثل کیبورد تایپ می‌کند) وارد کنید. دوربین در این نسخه وصل
// نیست؛ برای اسکن دوربینی از صفحه‌ی /scan وب‌اپ استفاده کنید.
//
// API: GET /api/products/lookup · POST /api/scan · GET /api/scan
// ============================================================

import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Product, ScanEvent, ScanType } from "@my-store/shared-types";
import {
  SCAN_TYPE_LABELS,
  formatCurrency,
  formatDateTimeJalali,
  formatNumber,
  normalizeBarcode,
} from "@my-store/shared-utils";
import { listScanEvents, lookupByBarcode, recordScan } from "@my-store/api-client";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  EmptyState,
  Field,
  Note,
  Screen,
  ScreenHeader,
  colors,
  type Tone,
} from "../../components/ui";
import { describeApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";

const SCAN_FILTERS: ScanType[] = ["SALE", "COUNT", "CHECK_IN", "CHECK_OUT", "ADJUSTMENT"];

const SCAN_TONE: Record<ScanType, Tone> = {
  SALE: "success",
  COUNT: "info",
  CHECK_IN: "info",
  CHECK_OUT: "warning",
  ADJUSTMENT: "neutral",
};

export default function ScannerScreen() {
  const { user, handleAuthError } = useAuth();

  const [barcode, setBarcode] = useState("");
  const [type, setType] = useState<ScanType>("SALE");
  const [qty, setQty] = useState("1");
  const [product, setProduct] = useState<Product | null>(null);
  const [lookedUp, setLookedUp] = useState(false);
  const [events, setEvents] = useState<ScanEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const loadEvents = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true);
      try {
        const page = await listScanEvents({ page: 1, pageSize: 15 });
        setEvents(page.items);
        setError(null);
      } catch (err) {
        if (handleAuthError(err)) return;
        if (!silent) setError(describeApiError(err));
      } finally {
        setRefreshing(false);
      }
    },
    [handleAuthError],
  );

  useFocusEffect(
    useCallback(() => {
      void loadEvents();
      const timer = setInterval(() => void loadEvents(true), 8000);
      return () => clearInterval(timer);
    }, [loadEvents]),
  );

  async function onLookup() {
    const code = normalizeBarcode(barcode);
    if (!code) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    setProduct(null);
    try {
      const result = await lookupByBarcode(code);
      setLookedUp(true);
      if (result.found && result.product) setProduct(result.product as Product);
    } catch (err) {
      if (!handleAuthError(err)) setError(describeApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onRecord() {
    const code = normalizeBarcode(barcode);
    if (!code) {
      setError("بارکد را وارد کنید");
      return;
    }
    const quantity = Number(qty) || 1;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const event = await recordScan({
        barcode: code,
        type,
        qty: quantity,
        device: "mobile",
      });
      setInfo(
        `${SCAN_TYPE_LABELS[event.type] ?? event.type} ثبت شد — ` +
          `${event.product ? event.product.name : `بارکد ${event.barcode}`}`,
      );
      setEvents((current) => [event, ...current].slice(0, 15));
    } catch (err) {
      if (!handleAuthError(err)) setError(describeApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen onRefresh={() => void loadEvents()} refreshing={refreshing}>
      <ScreenHeader
        title="اسکن بارکد"
        subtitle={user?.name ? `اپراتور: ${user.name}` : "ورود و خروج کالا با بارکد"}
      />

      <Card>
        <Field
          label="بارکد"
          value={barcode}
          onChangeText={(value) => {
            setBarcode(value);
            setLookedUp(false);
            setProduct(null);
          }}
          placeholder="6281111000019"
          keyboardType="number-pad"
          ltr
          onSubmitEditing={onLookup}
          hint="بارکدهای نمونه: 6281111000019 (شیر) · 6281111000026 (آب معدنی)"
        />

        <Text style={styles.typeLabel}>نوع اسکن</Text>
        <View style={styles.chips}>
          {SCAN_FILTERS.map((option) => {
            const active = option === type;
            return (
              <Pressable
                key={option}
                onPress={() => setType(option)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                  {SCAN_TYPE_LABELS[option]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Field
          label="تعداد"
          value={qty}
          onChangeText={setQty}
          keyboardType="number-pad"
          ltr
        />

        {error ? <Note tone="danger">{error}</Note> : null}
        {info ? <Note tone="success">{info}</Note> : null}

        <View style={styles.actions}>
          <Button label="جست‌وجوی کالا" variant="outline" onPress={onLookup} disabled={busy} />
          <Button label="ثبت اسکن" variant="accent" onPress={onRecord} loading={busy} />
        </View>
      </Card>

      {lookedUp ? (
        <Card>
          <CardTitle>نتیجه‌ی جست‌وجو</CardTitle>
          {product ? (
            <>
              <View style={styles.line}>
                <Text style={styles.lineLabel}>نام</Text>
                <Text style={styles.lineValue}>{product.name}</Text>
              </View>
              <View style={styles.line}>
                <Text style={styles.lineLabel}>بارکد</Text>
                <Text style={[styles.lineValue, styles.ltr]}>{product.barcode}</Text>
              </View>
              <View style={styles.line}>
                <Text style={styles.lineLabel}>قیمت فروش</Text>
                <Text style={styles.lineValue}>{formatCurrency(product.salePrice)}</Text>
              </View>
              <View style={styles.line}>
                <Text style={styles.lineLabel}>موجودی</Text>
                <Text
                  style={[
                    styles.lineValue,
                    product.stock <= product.lowStockThreshold && styles.danger,
                  ]}
                >
                  {formatNumber(product.stock)}
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.notFound}>
              کالایی با این بارکد پیدا نشد. اگر «ثبت اسکن» را بزنید، رویداد با بارکد ناشناخته
              ذخیره می‌شود و بعداً می‌توانید به یک کالا وصلش کنید.
            </Text>
          )}
        </Card>
      ) : null}

      <Card>
        <CardTitle>آخرین اسکن‌ها</CardTitle>
        {events.length === 0 ? (
          <EmptyState title="هنوز اسکنی ثبت نشده" hint="اولین بارکد را بالا ثبت کنید." />
        ) : (
          events.map((event) => (
            <View key={event.id} style={styles.eventRow}>
              <Badge label={SCAN_TYPE_LABELS[event.type] ?? event.type} tone={SCAN_TONE[event.type]} />
              <View style={styles.eventBody}>
                <Text style={styles.eventTitle} numberOfLines={1}>
                  {event.product ? event.product.name : `بارکد ${event.barcode}`}
                </Text>
                <Text style={styles.eventMeta}>
                  {formatDateTimeJalali(event.createdAt)} · تعداد {formatNumber(event.qty)}
                </Text>
              </View>
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  typeLabel: { fontSize: 13, fontWeight: "600", color: colors.text, textAlign: "right" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipLabel: { fontSize: 12, color: colors.muted, fontWeight: "600" },
  chipLabelActive: { color: "#fff" },
  actions: { gap: 10 },
  line: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, gap: 8 },
  lineLabel: { fontSize: 13, color: colors.muted, textAlign: "right" },
  lineValue: { fontSize: 13, fontWeight: "600", color: colors.text, textAlign: "left" },
  ltr: { textAlign: "left" },
  danger: { color: colors.danger },
  notFound: { fontSize: 13, color: colors.muted, textAlign: "right", lineHeight: 20 },
  eventRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  eventBody: { flex: 1, gap: 2 },
  eventTitle: { fontSize: 13, fontWeight: "600", color: colors.text, textAlign: "right" },
  eventMeta: { fontSize: 12, color: colors.muted, textAlign: "right" },
});
