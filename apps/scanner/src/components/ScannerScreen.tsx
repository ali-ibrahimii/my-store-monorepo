import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  Flashlight,
  FlashlightOff,
  LogOut,
  PackagePlus,
  RotateCcw,
  ScanLine,
  ShoppingCart,
  Store,
  Wifi,
  WifiOff,
} from "lucide-react";

import { Alert, AlertDescription } from "@my-store/ui-kit/components/alert";
import { Badge } from "@my-store/ui-kit/components/badge";
import { Button } from "@my-store/ui-kit/components/button";
import { Spinner } from "@my-store/ui-kit/components/spinner";
import { recordScan } from "@my-store/api-client";
import { formatCurrency, normalizeBarcode, toPersianDigits } from "@my-store/shared-utils";
import type { Invoice, MobileSession, Product } from "@my-store/shared-types";

import { clearSession } from "../lib/api";
import { useCart } from "../lib/cart";
import { useCatalog } from "../lib/catalog";
import { beepError, beepSuccess, vibrate } from "../lib/feedback";
import { CartPanel } from "./CartPanel";
import { CheckoutSheet } from "./CheckoutSheet";
import { ProductPicker } from "./ProductPicker";
import { SuccessView } from "./SuccessView";

interface ScannerScreenProps {
  session: MobileSession;
  onLoggedOut: () => void;
}

type CameraState = "idle" | "starting" | "running" | "error";

const DUPLICATE_WINDOW_MS = 1200;
const LAST_SCAN_TIMEOUT_MS = 4000;

/**
 * صفحه‌ی اصلی اسکنر.
 *
 * جریان کار: بارکد ← افزودن به سبد ← (تکرار) ← «ثبت فاکتور» روی نوار پایین
 * ← انتخاب روش پرداخت ← ثبت در سرور ← فاکتور در پنل وب (آماده‌ی چاپ).
 */
export function ScannerScreen({ session, onLoggedOut }: ScannerScreenProps) {
  const catalog = useCatalog();
  const cart = useCart(session.user.id, catalog.taxRate);

  const regionRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const lastCodeRef = useRef<{ code: string; at: number } | null>(null);
  const decodedHandlerRef = useRef<(text: string) => void>(() => {});
  const lastScanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [flash, setFlash] = useState(false);
  const [lastScan, setLastScan] = useState<
    { name: string; qty: number; price: number; productId: string } | null
  >(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const logout = useCallback(async () => {
    clearSession();
    onLoggedOut();
  }, [onLoggedOut]);

  /** ثبت رویداد اسکن در سرور تا وب‌پنل سبدِ در حال تکمیل را زنده ببیند */
  const publishCartScan = useCallback(
    (barcode: string, qty: number) => {
      recordScan({ barcode, type: "CART", qty, device: "scanner-pwa" }).catch((error: unknown) => {
        if (error instanceof Error && "status" in error && (error as { status?: number }).status === 401) {
          void logout();
        }
      });
    },
    [logout],
  );

  const showLastScan = useCallback((product: Product, qty: number) => {
    setLastScan({ name: product.name, qty, price: Number(product.salePrice), productId: product.id });
    setFlash(true);
    setTimeout(() => setFlash(false), 500);
    if (lastScanTimerRef.current) clearTimeout(lastScanTimerRef.current);
    lastScanTimerRef.current = setTimeout(() => setLastScan(null), LAST_SCAN_TIMEOUT_MS);
  }, []);

  const handleDecoded = useCallback(
    async (rawCode: string) => {
      const code = normalizeBarcode(rawCode);
      if (!code) return;

      const now = Date.now();
      if (
        lastCodeRef.current &&
        lastCodeRef.current.code === code &&
        now - lastCodeRef.current.at < DUPLICATE_WINDOW_MS
      ) {
        return; // همان بارکد پشت‌سرهم خوانده شده — نادیده بگیر
      }
      lastCodeRef.current = { code, at: now };

      const product = await catalog.findByBarcode(code);
      if (!product) {
        beepError();
        vibrate([70, 50, 70]);
        setUnknownBarcode(code);
        setPickerOpen(true);
        return;
      }

      beepSuccess();
      vibrate(35);
      cart.addProduct(product, 1);
      showLastScan(product, 1);
      publishCartScan(code, 1);
    },
    [cart, catalog, publishCartScan, showLastScan],
  );

  useEffect(() => {
    decodedHandlerRef.current = (text: string) => {
      void handleDecoded(text);
    };
  }, [handleDecoded]);

  const stopCamera = useCallback(async () => {
    const qr = qrRef.current;
    qrRef.current = null;
    if (qr) {
      try {
        await qr.stop();
        qr.clear();
      } catch {
        // قبلاً متوقف شده
      }
    }
    setCameraState("idle");
    setTorchOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (cameraState === "starting" || cameraState === "running") return;
    if (!regionRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("دوربین فقط روی HTTPS کار می‌کند. آدرس سایت را با https باز کنید.");
      setCameraState("error");
      return;
    }

    setCameraState("starting");
    setCameraError(null);
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      const qr = new Html5Qrcode(regionRef.current.id, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      });
      qrRef.current = qr;

      const width = regionRef.current.clientWidth || 320;
      const box = Math.round(Math.min(width * 0.78, 300));

      await qr.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: { width: box, height: Math.round(box * 0.62) },
          aspectRatio: 1.1,
          disableFlip: true,
        },
        (decodedText) => decodedHandlerRef.current(decodedText),
        () => {},
      );

      setCameraState("running");
      try {
        const capabilities = qr.getRunningTrackCapabilities?.() as Record<string, unknown> | undefined;
        setTorchAvailable(Boolean(capabilities && "torch" in capabilities));
      } catch {
        setTorchAvailable(false);
      }
      try {
        await qr.applyVideoConstraints({ advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet] });
      } catch {
        // فوکوس پیوسته پشتیبانی نمی‌شود
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setCameraError(
        /permission|notallowed/i.test(message)
          ? "اجازه‌ی دوربین داده نشد. در تنظیمات مرورگر، دسترسی دوربین این سایت را روشن کنید."
          : "دوربین باز نشد. با «افزودن کالا» یا بارکدخوان دستی ادامه دهید.",
      );
      setCameraState("error");
      await stopCamera();
    }
  }, [cameraState, stopCamera]);

  const toggleTorch = useCallback(async () => {
    const qr = qrRef.current as unknown as {
      applyVideoConstraints?: (c: MediaTrackConstraints) => Promise<void>;
    } | null;
    if (!qr?.applyVideoConstraints) return;
    const next = !torchOn;
    try {
      await qr.applyVideoConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchOn(next);
    } catch {
      setTorchAvailable(false);
    }
  }, [torchOn]);

  // دوربین به‌صورت خودکار روشن می‌شود تا کار صندوق سریع باشد
  useEffect(() => {
    const timer = setTimeout(() => {
      void startCamera();
    }, 200);
    return () => {
      clearTimeout(timer);
      void stopCamera();
      if (lastScanTimerRef.current) clearTimeout(lastScanTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePick(product: Product) {
    cart.addProduct(product, 1);
    showLastScan(product, 1);
    setPickerOpen(false);
    setUnknownBarcode(null);
    beepSuccess();
    vibrate(35);
  }

  function handlePaid(created: Invoice) {
    void stopCamera();
    cart.clear();
    setCheckoutOpen(false);
    setSubmitError(null);
    setLastScan(null);
    setInvoice(created);
    beepSuccess();
    vibrate([40, 30, 40]);
  }

  function startNewSale() {
    setInvoice(null);
    // صبر کوتاه تا کادر دوربین دوباره در DOM سوار شود
    setTimeout(() => void startCamera(), 260);
  }

  if (invoice) {
    return <SuccessView invoice={invoice} onNewSale={startNewSale} />;
  }

  const running = cameraState === "running";

  return (
    <div className="flex h-full flex-col">
      {/* سربرگ */}
      <header className="bg-background/95 sticky top-0 z-20 flex items-center justify-between gap-2 border-b px-3 py-2 pt-safe backdrop-blur">
        <div className="flex min-w-0 items-center gap-2">
          <div className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-xl">
            <ScanLine className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1 truncate text-sm font-semibold">
              <Store className="size-3.5 shrink-0 opacity-70" />
              {catalog.store?.name ?? "فروشگاه من"}
            </p>
            <p className="text-muted-foreground truncate text-[11px]">
              {session.user.name ?? session.user.email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant={online ? "secondary" : "warning"} className="gap-1 text-[10px]">
            {online ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
            {online ? "آنلاین" : "آفلاین"}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            aria-label="خروج"
            onClick={() => void logout()}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>

      {/* دوربین */}
      <section className="relative flex-none px-3 pt-3">
        <div className="scan-frame relative aspect-[4/3] w-full">
          <div id="scan-region" ref={regionRef} className="absolute inset-0" />

          {running ? (
            <>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-[62%] w-[78%]">
                  <span className="absolute -top-px -start-px size-6 rounded-ss-lg border-t-4 border-s-4 border-sky-400" />
                  <span className="absolute -top-px -end-px size-6 rounded-se-lg border-t-4 border-e-4 border-sky-400" />
                  <span className="absolute -bottom-px -start-px size-6 rounded-es-lg border-b-4 border-s-4 border-sky-400" />
                  <span className="absolute -bottom-px -end-px size-6 rounded-ee-lg border-b-4 border-e-4 border-sky-400" />
                  <span className="scan-line" />
                </div>
              </div>
              {flash ? <div className="scan-flash pointer-events-none absolute inset-0" /> : null}
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
              {cameraState === "starting" ? (
                <>
                  <Spinner />
                  <p className="text-sm">در حال روشن‌کردن دوربین…</p>
                </>
              ) : (
                <>
                  <CameraOff className="size-9 opacity-70" />
                  <p className="max-w-[16rem] text-center text-xs opacity-80">
                    {cameraError ?? "دوربین خاموش است"}
                  </p>
                  <Button onClick={() => void startCamera()} className="rounded-full px-5">
                    <Camera className="size-4" />
                    روشن‌کردن دوربین
                  </Button>
                </>
              )}
            </div>
          )}

          {/* کنترل‌های روی دوربین */}
          <div className="absolute bottom-2 end-2 flex items-center gap-1.5">
            {running && torchAvailable ? (
              <Button
                variant="secondary"
                size="icon"
                className="size-10 rounded-full shadow-lg"
                onClick={() => void toggleTorch()}
                aria-label="چراغ"
              >
                {torchOn ? <FlashlightOff className="size-5" /> : <Flashlight className="size-5" />}
              </Button>
            ) : null}
            {running ? (
              <Button
                variant="secondary"
                size="icon"
                className="size-10 rounded-full shadow-lg"
                onClick={() => void stopCamera()}
                aria-label="خاموش کردن دوربین"
              >
                <CameraOff className="size-5" />
              </Button>
            ) : null}
          </div>

          {/* آخرین اسکن */}
          {lastScan ? (
            <div className="pop-in absolute inset-x-2 bottom-2 flex items-center gap-2 rounded-2xl bg-black/70 px-3 py-2 text-white backdrop-blur">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{lastScan.name}</p>
                <p className="tnum text-[11px] opacity-80">{formatCurrency(lastScan.price)}</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 rounded-full px-3 text-xs"
                onClick={() => cart.decrease(lastScan.productId)}
              >
                <RotateCcw className="size-3.5" />
                برگشت
              </Button>
            </div>
          ) : null}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              setUnknownBarcode(null);
              setPickerOpen(true);
            }}
          >
            <PackagePlus className="size-4" />
            افزودن کالا / بارکد دستی
          </Button>
          {catalog.error ? (
            <Button variant="ghost" size="sm" onClick={() => void catalog.refresh()}>
              تلاش دوباره
            </Button>
          ) : (
            <Badge variant="secondary" className="text-[10px]">
              {toPersianDigits(catalog.products.length)} کالا در حافظه
            </Badge>
          )}
        </div>
      </section>

      {catalog.error ? (
        <div className="px-3 pt-3">
          <Alert variant="destructive">
            <AlertDescription className="text-xs">
              فهرست کالاها بارگذاری نشد: {catalog.error}
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      {/* سبد */}
      <section className="flex-1 overflow-y-auto px-3 py-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <ShoppingCart className="size-4" />
            سبد فاکتور
          </h2>
          {cart.lines.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-7 px-2 text-xs"
              onClick={() => cart.clear()}
            >
              خالی‌کردن سبد
            </Button>
          ) : null}
        </div>
        <CartPanel
          lines={cart.lines}
          onIncrease={cart.increase}
          onDecrease={cart.decrease}
          onRemove={cart.remove}
          onAddManually={() => {
            setUnknownBarcode(null);
            setPickerOpen(true);
          }}
        />
      </section>

      {/* نوار پایین: جمع‌ها + ثبت فاکتور */}
      <footer className="bg-background/95 sticky bottom-0 z-20 border-t px-3 pt-3 pb-safe backdrop-blur">
        <div className="mb-2 flex items-end justify-between gap-3">
          <div className="text-xs">
            <p className="text-muted-foreground">
              {toPersianDigits(cart.totals.count)} قلم
              {catalog.taxRate > 0 ? ` · مالیات ${toPersianDigits(catalog.taxRate)}٪` : ""}
            </p>
            <p className="text-muted-foreground tnum">
              جمع کالاها: {formatCurrency(cart.totals.subtotal)}
            </p>
          </div>
          <div className="text-end">
            <p className="text-muted-foreground text-[11px]">مبلغ قابل پرداخت</p>
            <p className="tnum text-xl font-bold">{formatCurrency(cart.totals.total)}</p>
          </div>
        </div>
        <Button
          className="h-14 w-full text-base font-semibold"
          disabled={cart.lines.length === 0}
          onClick={() => {
            setSubmitError(null);
            setCheckoutOpen(true);
          }}
        >
          ثبت فاکتور
          {cart.totals.count > 0 ? ` (${toPersianDigits(cart.lines.length)} ردیف)` : ""}
        </Button>
      </footer>

      {pickerOpen ? (
        <ProductPicker
          unknownBarcode={unknownBarcode}
          search={catalog.searchLocal}
          onPick={handlePick}
          onClose={() => {
            setPickerOpen(false);
            setUnknownBarcode(null);
          }}
        />
      ) : null}

      {checkoutOpen ? (
        <CheckoutSheet
          lines={cart.lines}
          subtotal={cart.totals.subtotal}
          tax={cart.totals.tax}
          total={cart.totals.total}
          taxRate={catalog.taxRate}
          busy={submitting}
          error={submitError}
          onClose={() => setCheckoutOpen(false)}
          onPaid={handlePaid}
          onError={setSubmitError}
          onBusyChange={setSubmitting}
        />
      ) : null}
    </div>
  );
}
