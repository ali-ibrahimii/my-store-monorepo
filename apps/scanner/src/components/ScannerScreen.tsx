import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  Flashlight,
  FlashlightOff,
  Keyboard,
  LogOut,
  Package,
  PackageSearch,
  ScanLine,
} from "lucide-react";

import { Alert, AlertDescription } from "@my-store/ui-kit/components/alert";
import { Badge } from "@my-store/ui-kit/components/badge";
import { Button } from "@my-store/ui-kit/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@my-store/ui-kit/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@my-store/ui-kit/components/empty";
import { Input } from "@my-store/ui-kit/components/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@my-store/ui-kit/components/item";
import { Separator } from "@my-store/ui-kit/components/separator";
import { Spinner } from "@my-store/ui-kit/components/spinner";
import { Tabs, TabsList, TabsTrigger } from "@my-store/ui-kit/components/tabs";
import { lookupByBarcode, listScanEvents, recordScan } from "@my-store/api-client";
import {
  SCAN_TYPE_LABELS,
  formatCurrency,
  formatDateTimeJalali,
  formatNumber,
  normalizeBarcode,
} from "@my-store/shared-utils";
import type { MobileSession, ScanEvent, ScanType } from "@my-store/shared-types";
import { clearSession } from "../lib/api";

const SCAN_TYPES: ScanType[] = ["SALE", "CHECK_IN", "CHECK_OUT", "COUNT", "ADJUSTMENT"];

interface ScannerScreenProps {
  session: MobileSession;
  onLoggedOut: () => void;
}

export function ScannerScreen({ session, onLoggedOut }: ScannerScreenProps) {
  const regionRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const lastCodeRef = useRef<{ code: string; at: number } | null>(null);
  const typeRef = useRef<ScanType>("SALE");
  const qtyRef = useRef(1);

  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [scanType, setScanType] = useState<ScanType>("SALE");
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<{ event: ScanEvent; product: ScanEvent["product"] } | null>(null);
  const [events, setEvents] = useState<ScanEvent[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    typeRef.current = scanType;
  }, [scanType]);
  useEffect(() => {
    qtyRef.current = qty;
  }, [qty]);

  // آخرین اسکن‌ها (اولیه)
  useEffect(() => {
    listScanEvents({ page: 1, pageSize: 10 })
      .then((page) => setEvents(page.items))
      .catch(() => {});
  }, []);

  const beep = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1200;
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // صدا در دسترس نیست
    }
  }, []);

  /** ثبت یک بارکد — دوربینی یا دستی. نتیجه فوراً ثبت و پخش می‌شود. */
  const submitBarcode = useCallback(
    async (rawCode: string) => {
      const code = normalizeBarcode(rawCode);
      if (!code) return;

      const now = Date.now();
      if (
        lastCodeRef.current &&
        lastCodeRef.current.code === code &&
        now - lastCodeRef.current.at < 1500
      ) {
        return; // debounce — اسکنر پیوسته همان کد را می‌فرستد
      }
      lastCodeRef.current = { code, at: now };

      beep();
      if (navigator.vibrate) navigator.vibrate(60);

      setBusy(true);
      setError(null);
      try {
        const lookup = await lookupByBarcode(code);
        const event = await recordScan({
          barcode: code,
          type: typeRef.current,
          qty: qtyRef.current,
          device: "scanner-pwa",
        });
        setLast({ event, product: lookup.found ? (lookup.product ?? null) : null });
        setEvents((prev) => [event, ...prev.filter((e) => e.id !== event.id)].slice(0, 10));
      } catch (err) {
        if (err instanceof Error && "status" in err && (err as { status?: number }).status === 401) {
          clearSession();
          onLoggedOut();
          return;
        }
        setError(err instanceof Error ? err.message : "خطا در ثبت اسکن");
      } finally {
        setBusy(false);
      }
    },
    [beep, onLoggedOut],
  );

  const start = useCallback(async () => {
    setError(null);
    if (!regionRef.current || starting) return;
    setStarting(true);
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

      await qr.start(
        { facingMode: "environment" },
        { fps: 12, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
        (decodedText) => {
          void submitBarcode(decodedText);
        },
        () => {},
      );

      try {
        const track = qr.getRunningTrackSettings?.();
        setTorchSupported(!!track);
      } catch {
        setTorchSupported(false);
      }
      setRunning(true);
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes("Permission")
          ? "دسترسی به دوربین داده نشد. اجازه‌ی دوربین را در تنظیمات مرورگر فعال کنید."
          : "دوربین در دسترس نیست — از ورود دستی استفاده کنید. (دوربین فقط روی HTTPS کار می‌کند)",
      );
      setRunning(false);
    } finally {
      setStarting(false);
    }
  }, [starting, submitBarcode]);

  const stop = useCallback(async () => {
    const qr = qrRef.current;
    if (qr) {
      try {
        await qr.stop();
        qr.clear();
      } catch {
        // قبلاً متوقف شده
      }
      qrRef.current = null;
    }
    setRunning(false);
    setTorch(false);
  }, []);

  const toggleTorch = useCallback(async () => {
    const qr = qrRef.current as unknown as {
      applyVideoConstraints?: (c: MediaTrackConstraints) => Promise<void>;
    } | null;
    if (!qr?.applyVideoConstraints) return;
    const next = !torch;
    try {
      await qr.applyVideoConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorch(next);
    } catch {
      // نور پشتیبانی نمی‌شود
    }
  }, [torch]);

  // بستن دوربین هنگام خروج از صفحه
  useEffect(() => () => void stop(), [stop]);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col gap-3 p-3 pb-8">
      {/* سربرگ */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-xl">
            <ScanLine className="size-5" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">اسکنر فروشگاه</div>
            <div className="text-muted-foreground text-xs">
              {session.user.name ?? session.user.email}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="خروج"
          onClick={() => {
            void stop();
            clearSession();
            onLoggedOut();
          }}
        >
          <LogOut className="size-5" />
        </Button>
      </header>

      {/* نوع اسکن + تعداد */}
      <Card>
        <CardContent className="space-y-3 p-3">
          <Tabs value={scanType} onValueChange={(value) => setScanType(value as ScanType)}>
            <TabsList className="h-auto w-full flex-wrap">
              {SCAN_TYPES.map((type) => (
                <TabsTrigger key={type} value={type}>
                  {SCAN_TYPE_LABELS[type]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">تعداد</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQty((current) => Math.max(1, current - 1))}
              >
                −
              </Button>
              <span className="w-10 text-center text-lg font-bold tabular-nums">
                {formatNumber(qty)}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQty((current) => current + 1)}
              >
                +
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* دوربین */}
      <Card className="gap-0 overflow-hidden py-0">
        <div className="bg-foreground/95 relative aspect-square w-full">
          <div id="scan-region" ref={regionRef} className="absolute inset-0" />
          {!running ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
              <Camera className="size-10 opacity-70" />
              <Button
                onClick={() => void start()}
                disabled={starting}
                className="rounded-full px-6"
              >
                {starting ? <Spinner /> : <Camera className="size-4" />}
                {starting ? "در حال آماده‌سازی…" : "شروع اسکن با دوربین"}
              </Button>
            </div>
          ) : null}
        </div>
        {running ? (
          <CardContent className="flex items-center justify-between gap-2 p-3">
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <span className="bg-success inline-block size-2 animate-pulse rounded-full" />
              دوربین فعال — بارکد را روبه‌رو بگیرید
            </span>
            <div className="flex gap-1.5">
              {torchSupported ? (
                <Button variant="outline" size="icon" onClick={() => void toggleTorch()}>
                  {torch ? (
                    <FlashlightOff className="size-4" />
                  ) : (
                    <Flashlight className="size-4" />
                  )}
                </Button>
              ) : null}
              <Button variant="outline" size="icon" onClick={() => void stop()}>
                <CameraOff className="size-4" />
              </Button>
            </div>
          </CardContent>
        ) : null}
      </Card>

      {error ? (
        <Alert variant="destructive">
          <CameraOff className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {/* ورود دستی */}
      <Card>
        <CardContent className="p-3">
          <Button
            variant="ghost"
            className="text-muted-foreground w-full"
            onClick={() => setManualOpen((value) => !value)}
          >
            <Keyboard className="size-4" />
            ورود دستی بارکد
          </Button>
          {manualOpen ? (
            <form
              className="mt-3 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void submitBarcode(manualCode);
                setManualCode("");
              }}
            >
              <Input
                dir="ltr"
                inputMode="numeric"
                placeholder="6281111000019"
                value={manualCode}
                onChange={(event) => setManualCode(event.target.value)}
              />
              <Button type="submit" disabled={busy || !manualCode.trim()}>
                {busy ? <Spinner /> : null}
                ثبت
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>

      {/* آخرین نتیجه */}
      {last ? (
        <Card className="border-success/40 bg-success/5">
          <CardContent className="flex items-start gap-3 p-3">
            <CheckCircle2 className="text-success mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">
                {last.product ? last.product.name : `بارکد ${last.event.barcode}`}
              </div>
              <div className="text-muted-foreground mt-0.5 text-xs">
                {SCAN_TYPE_LABELS[last.event.type]} · {formatNumber(last.event.qty)} عدد
                {last.product ? ` · ${formatCurrency(last.product.salePrice)}` : ""}
                {" · "}
                {formatDateTimeJalali(last.event.createdAt)}
              </div>
              {!last.product ? (
                <div className="text-muted-foreground mt-1 text-xs">
                  محصولی با این بارکد تعریف نشده — رویداد ثبت شد.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* آخرین اسکن‌ها */}
      <Card>
        <CardHeader className="p-3 pb-0">
          <CardTitle className="flex items-center justify-between gap-2 text-sm">
            آخرین اسکن‌ها
            <Badge variant="secondary">لحظه‌ای روی داشبورد</Badge>
          </CardTitle>
          <CardDescription className="text-xs">
            رویدادهای همین دستگاه و بقیه‌ی دستگاه‌ها
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3">
          {events.length === 0 ? (
            <Empty className="border border-dashed p-4">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <PackageSearch />
                </EmptyMedia>
                <EmptyTitle>هنوز اسکنی ثبت نشده</EmptyTitle>
                <EmptyDescription>
                  اولین بارکد را با دوربین یا ورود دستی ثبت کنید.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ItemGroup>
              {events.map((event) => (
                <Item key={event.id} size="sm" variant="outline">
                  <ItemMedia variant="icon">
                    <Package />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{event.product?.name ?? event.barcode}</ItemTitle>
                    <ItemDescription>
                      {formatDateTimeJalali(event.createdAt)}
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Badge variant="outline">
                      {SCAN_TYPE_LABELS[event.type]} · {formatNumber(event.qty)}
                    </Badge>
                  </ItemActions>
                </Item>
              ))}
            </ItemGroup>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
