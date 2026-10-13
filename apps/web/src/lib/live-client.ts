"use client";

// ============================================================
// همگام‌سازی لحظه‌ای وب‌پنل با اسکنر گوشی
//
// دو لایه دارد:
//   ۱) سوپابیس Realtime (WebSocket روی جدول invoices و scan_events):
//      فاکتورِ ثبت‌شده روی گوشی را در چند میلی‌ثانیه به همه‌ی تب‌ها و
//      دستگاه‌های باز می‌رساند — حتی روی ورسل با چند نمونه‌ی سرورلس.
//   ۲) پولینگ سبک `/api/live`: پشتیبانِ مطمئن. اگر Realtime در دسترس
//      نباشد (یا publication سوپابیس اجرا نشده باشد) هر ۳ ثانیه
//      فقط «چیزهای تازه» را می‌گیرد.
//
// حالت چشمی: هر تغییر اسکن روی گوشی، بلافاصله در فیدِ سبد و در
// فهرست فاکتورها دیده می‌شود؛ فاکتور تازه هم با اعلان (toast) می‌آید.
// ============================================================

import * as React from "react";
import { createBrowserClient } from "@supabase/ssr";

import { ApiError, apiGet, getInvoice } from "@my-store/api-client";
import { API_ROUTES } from "@my-store/shared-utils";
import type {
  Invoice,
  LiveCartLine,
  LiveInvoiceHead,
  LiveSnapshot,
  ScanEvent,
} from "@my-store/shared-types";

export type LiveStatus = "connecting" | "realtime" | "polling" | "offline";

const MAX_INVOICES = 60;
const MAX_SCANS = 40;
/** پولینگ سریع (وقتی Realtime نداریم) و پولینگ آرام (پشتیبان) */
const FAST_POLL_MS = 3000;
const SLOW_POLL_MS = 12_000;
const HIDDEN_POLL_MS = 25_000;

export function mergeInvoiceHeads(
  prev: LiveInvoiceHead[],
  fresh: LiveInvoiceHead[],
): LiveInvoiceHead[] {
  if (fresh.length === 0) return prev;
  const map = new Map(prev.map((invoice) => [invoice.id, invoice]));
  for (const invoice of fresh) map.set(invoice.id, invoice);
  return [...map.values()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, MAX_INVOICES);
}

export function mergeScanEvents(prev: ScanEvent[], fresh: ScanEvent[]): ScanEvent[] {
  if (fresh.length === 0) return prev;
  const map = new Map(prev.map((event) => [event.id, event]));
  for (const event of fresh) map.set(event.id, event);
  return [...map.values()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, MAX_SCANS);
}

/** یک قلم اسکن تازه را روی سبد فعلی اعمال می‌کند (بدون رفت‌وبرگشت). */
export function applyScanToCart(cart: LiveCartLine[], event: ScanEvent): LiveCartLine[] {
  if (event.type !== "CART") return cart;
  const index = cart.findIndex((line) => line.barcode === event.barcode);
  if (index === -1) {
    return [
      {
        barcode: event.barcode,
        productId: event.productId,
        name: event.product?.name ?? null,
        qty: event.qty,
        salePrice: event.product?.salePrice ?? 0,
        lastAt: event.createdAt,
        device: event.device,
      },
      ...cart,
    ];
  }
  const next = [...cart];
  const line = next[index];
  next[index] = { ...line, qty: line.qty + event.qty, lastAt: event.createdAt };
  return next;
}

export interface UseLiveStoreOptions {
  storeId: string;
  initialInvoices?: LiveInvoiceHead[];
  initialCart?: LiveCartLine[];
  /** فید اسکن‌ها را هم بگیر (داشبورد/صفحه اسکن) */
  withScans?: boolean;
  /** وقتی فاکتور تازه‌ای از گوشی می‌رسد */
  onNewInvoice?: (invoice: Pick<LiveInvoiceHead, "id" | "number" | "total">) => void;
}

export interface LiveStore {
  invoices: LiveInvoiceHead[];
  cart: LiveCartLine[];
  scans: ScanEvent[];
  status: LiveStatus;
  /** فاکتورهایی که همین چند ثانیه پیش رسیده‌اند (برای برجسته‌کردن) */
  freshInvoiceIds: Set<string>;
  refresh: () => Promise<void>;
}

interface PostgresChangePayload {
  eventType?: string;
  new?: Record<string, unknown>;
}

function readBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  try {
    return createBrowserClient(url, key);
  } catch {
    return null;
  }
}

/**
 * اشتراک زنده‌ی وضعیت فروشگاه.
 * @param options.storeId شناسه فروشگاه برای فیلتر کانال
 */
export function useLiveStore({
  storeId,
  initialInvoices = [],
  initialCart = [],
  withScans = false,
  onNewInvoice,
}: UseLiveStoreOptions): LiveStore {
  const [invoices, setInvoices] = React.useState<LiveInvoiceHead[]>(initialInvoices);
  const [cart, setCart] = React.useState<LiveCartLine[]>(initialCart);
  const [scans, setScans] = React.useState<ScanEvent[]>([]);
  const [status, setStatus] = React.useState<LiveStatus>("connecting");
  const [freshInvoiceIds, setFreshInvoiceIds] = React.useState<Set<string>>(new Set());

  // `since` فقط بعد از اولین پاسخ سرور مقدار می‌گیرد (اختلاف ساعت گوشی/لپ‌تاپ
  // باعث نمی‌شود فاکتوری از قلم بیفتد).
  const sinceRef = React.useRef<string | null>(null);
  const firstLoadRef = React.useRef(true);
  const knownIdsRef = React.useRef<Set<string>>(new Set(initialInvoices.map((i) => i.id)));
  const newInvoiceRef = React.useRef(onNewInvoice);
  const withScansRef = React.useRef(withScans);
  const statusRef = React.useRef<LiveStatus>("connecting");

  React.useEffect(() => {
    newInvoiceRef.current = onNewInvoice;
  }, [onNewInvoice]);
  React.useEffect(() => {
    withScansRef.current = withScans;
  }, [withScans]);

  const markFresh = React.useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setFreshInvoiceIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
    for (const id of ids) {
      setTimeout(() => {
        setFreshInvoiceIds((prev) => {
          if (!prev.has(id)) return prev;
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 20_000);
    }
  }, []);

  /** خواندن «چیزهای تازه» از سرور (سبک و افزایشی) */
  const refresh = React.useCallback(async () => {
    try {
      const query = new URLSearchParams();
      if (sinceRef.current) query.set("since", sinceRef.current);
      if (withScansRef.current) query.set("scans", "1");
      const snapshot = await apiGet<LiveSnapshot>(`${API_ROUTES.live}?${query.toString()}`);
      sinceRef.current = snapshot.serverTime;

      if (snapshot.invoices.length > 0) {
        const brandNew = snapshot.invoices.filter((invoice) => !knownIdsRef.current.has(invoice.id));
        for (const invoice of snapshot.invoices) knownIdsRef.current.add(invoice.id);
        setInvoices((prev) => mergeInvoiceHeads(prev, snapshot.invoices));
        if (brandNew.length > 0 && !firstLoadRef.current) {
          markFresh(brandNew.map((invoice) => invoice.id));
          for (const invoice of brandNew) {
            newInvoiceRef.current?.({
              id: invoice.id,
              number: invoice.number,
              total: invoice.total,
            });
          }
        }
      }

      firstLoadRef.current = false;
      setCart(snapshot.cart);
      if (snapshot.scans.length > 0) {
        setScans((prev) => mergeScanEvents(prev, snapshot.scans));
      }
      setStatus((current) => (current === "realtime" ? current : "polling"));
      statusRef.current = statusRef.current === "realtime" ? "realtime" : "polling";
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setStatus("offline");
        return;
      }
      setStatus((current) => (current === "offline" ? current : "polling"));
    }
  }, [markFresh]);

  /** بارگذاری اولیه + پولینگ تطبیقی */
  React.useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const loop = () => {
      if (cancelled) return;
      const delay = document.hidden
        ? HIDDEN_POLL_MS
        : statusRef.current === "realtime"
          ? SLOW_POLL_MS
          : FAST_POLL_MS;
      timer = setTimeout(() => {
        void refresh().finally(loop);
      }, delay);
    };

    // تأخیر صفر: اولین بارگذاری بیرون از بدنه‌ی effect شروع می‌شود
    const startTimer = setTimeout(() => {
      if (!cancelled) void refresh().finally(loop);
    }, 0);

    const onVisible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  /** لایه‌ی Realtime سوپابیس */
  React.useEffect(() => {
    if (!storeId) return;
    const supabase = readBrowserSupabase();
    if (!supabase) {
      statusRef.current = "polling";
      const timer = setTimeout(() => setStatus("polling"), 0);
      return () => clearTimeout(timer);
    }

    let disposed = false;

    // توکن نشست را صریحاً به کانال ریل‌تایم بده؛ بدون آن، RLS اجازه‌ی
    // خواندن ردیف‌های فروشگاه را نمی‌دهد و کانال خطا می‌دهد.
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        const token = data.session?.access_token;
        if (token) supabase.realtime.setAuth(token);
      })
      .catch(() => undefined);

    const channel = supabase.channel(`store:${storeId}`);

    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "invoices", filter: `store_id=eq.${storeId}` },
        (payload: PostgresChangePayload) => {
          const row = payload.new ?? {};
          const id = typeof row.id === "string" ? row.id : null;
          if (id && !knownIdsRef.current.has(id)) {
            knownIdsRef.current.add(id);
            markFresh([id]);
            newInvoiceRef.current?.({
              id,
              number: String(row.number ?? ""),
              total: Number(row.total ?? 0),
            });
          }
          // جزئیات (تعداد قلم، نام مشتری) را سرور می‌دهد
          void refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "scan_events", filter: `store_id=eq.${storeId}` },
        (payload: PostgresChangePayload) => {
          const row = payload.new ?? {};
          if (typeof row.id !== "string") return;
          const event: ScanEvent = {
            id: row.id,
            productId: (row.product_id as string | null) ?? null,
            barcode: String(row.barcode ?? ""),
            type: (row.type as ScanEvent["type"]) ?? "CART",
            qty: Number(row.qty ?? 1),
            device: (row.device as string | null) ?? null,
            note: (row.note as string | null) ?? null,
            userId: (row.user_id as string | null) ?? null,
            storeId,
            createdAt: String(row.created_at ?? new Date().toISOString()),
            product: null,
          };
          setScans((prev) => mergeScanEvents(prev, [event]));
          setCart((prev) => applyScanToCart(prev, event));
        },
      )
      .subscribe((state) => {
        if (disposed) return;
        if (state === "SUBSCRIBED") {
          statusRef.current = "realtime";
          setStatus("realtime");
        } else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT" || state === "CLOSED") {
          statusRef.current = "polling";
          setStatus("polling");
        }
      });

    return () => {
      disposed = true;
      void supabase.removeChannel(channel);
    };
  }, [markFresh, refresh, storeId]);

  return { invoices, cart, scans, status, freshInvoiceIds, refresh };
}

/** فاکتور کامل (برای نمایش سریع جزئیات پس از اعلان) */
export async function fetchInvoice(id: string): Promise<Invoice> {
  return getInvoice(id);
}
