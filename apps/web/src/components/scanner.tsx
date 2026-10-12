"use client";

import * as React from "react";
import {
  Camera,
  CameraOff,
  Flashlight,
  FlashlightOff,
  Keyboard,
  Package,
  PackageSearch,
  ScanLine,
  Volume2,
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
import { Label } from "@my-store/ui-kit/components/label";
import { Separator } from "@my-store/ui-kit/components/separator";
import { Spinner } from "@my-store/ui-kit/components/spinner";
import { Tabs, TabsList, TabsTrigger } from "@my-store/ui-kit/components/tabs";
import { cn } from "@my-store/ui-kit/lib/utils";
import { lookupByBarcode, recordScan } from "@my-store/api-client";
import {
  formatCurrency,
  normalizeBarcode,
  SCAN_TYPE_LABELS,
  toPersianDigits,
} from "@my-store/shared-utils";
import type { Product, ScanEvent, ScanType } from "@my-store/shared-types";

const SCAN_TYPES: ScanType[] = ["SALE", "CHECK_IN", "CHECK_OUT", "COUNT", "ADJUSTMENT"];

interface ScannerProps {
  /** Called after every successful scan record (for haptics/sounds in parent). */
  onScanned?: (event: ScanEvent) => void;
}

export function Scanner({ onScanned }: ScannerProps) {
  const readerRef = React.useRef<HTMLDivElement>(null);
  const qrRef = React.useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const lastCodeRef = React.useRef<{ code: string; at: number } | null>(null);

  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [torch, setTorch] = React.useState(false);
  const [torchSupported, setTorchSupported] = React.useState(false);
  const [manualCode, setManualCode] = React.useState("");
  const [type, setType] = React.useState<ScanType>("SALE");
  const [qty, setQty] = React.useState(1);
  const [busy, setBusy] = React.useState(false);

  const [lastEvent, setLastEvent] = React.useState<ScanEvent | null>(null);
  const [lastProduct, setLastProduct] = React.useState<Product | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);

  // Keep latest type/qty in refs so the decode callback always uses fresh values
  const typeRef = React.useRef(type);
  const qtyRef = React.useRef(qty);

  React.useEffect(() => {
    typeRef.current = type;
  }, [type]);

  React.useEffect(() => {
    qtyRef.current = qty;
  }, [qty]);

  const beep = React.useCallback(() => {
    try {
      const ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1200;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // audio not available
    }
  }, []);

  const handleDecoded = React.useCallback(
    async (decodedText: string) => {
      const code = normalizeBarcode(decodedText);
      if (!code) return;

      // Debounce: ignore the same code within 1.5s (scanner fires continuously)
      const now = Date.now();
      if (lastCodeRef.current && lastCodeRef.current.code === code && now - lastCodeRef.current.at < 1500) {
        return;
      }
      lastCodeRef.current = { code, at: now };

      beep();
      if (navigator.vibrate) navigator.vibrate(60);

      setBusy(true);
      setStatus(null);
      try {
        const lookup = await lookupByBarcode(code);
        setLastProduct(lookup.found ? (lookup.product ?? null) : null);

        const event = await recordScan({
          barcode: code,
          type: typeRef.current,
          qty: qtyRef.current,
          device: "web-pwa",
        });
        setLastEvent(event);
        setStatus(lookup.found ? "محصول پیدا شد و ثبت شد" : "بارکد ثبت شد (محصول تعریف نشده)");
        onScanned?.(event);
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "خطا در ثبت اسکن");
      } finally {
        setBusy(false);
      }
    },
    [beep, onScanned],
  );

  const start = React.useCallback(async () => {
    setError(null);
    if (!readerRef.current) return;
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      const qr = new Html5Qrcode(readerRef.current.id, {
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
          Html5QrcodeSupportedFormats.DATA_MATRIX,
        ],
        verbose: false,
      });
      qrRef.current = qr;

      await qr.start(
        { facingMode: "environment" },
        { fps: 12, qrbox: { width: 260, height: 260 }, aspectRatio: 1 },
        (decodedText) => {
          void handleDecoded(decodedText);
        },
        () => {
          // per-frame decode failure — ignore
        },
      );

      // Torch support check
      try {
        const track = qr.getRunningTrackSettings?.();
        setTorchSupported(!!track);
      } catch {
        setTorchSupported(false);
      }

      setRunning(true);
    } catch (e) {
      setError(
        e instanceof Error && e.message.includes("Permission")
          ? "دسترسی به دوربین داده نشد. لطفاً اجازه دسترسی به دوربین را بدهید."
          : "دوربین در دسترس نیست. از HTTPS (یا localhost) استفاده کنید و دوباره امتحان کنید.",
      );
      setRunning(false);
    }
  }, [handleDecoded]);

  const stop = React.useCallback(async () => {
    const qr = qrRef.current;
    if (qr) {
      try {
        await qr.stop();
        qr.clear();
      } catch {
        // already stopped
      }
      qrRef.current = null;
    }
    setRunning(false);
    setTorch(false);
  }, []);

  const toggleTorch = React.useCallback(async () => {
    const qr = qrRef.current as unknown as {
      applyVideoConstraints?: (c: MediaTrackConstraints) => Promise<void>;
    } | null;
    if (!qr?.applyVideoConstraints) return;
    const next = !torch;
    try {
      await qr.applyVideoConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet],
      });
      setTorch(next);
    } catch {
      // torch not supported
    }
  }, [torch]);

  React.useEffect(() => {
    return () => {
      // cleanup on unmount
      const qr = qrRef.current;
      if (qr) {
        qr.stop().catch(() => {});
        qr.clear();
      }
    };
  }, []);

  const submitManual = async () => {
    if (!manualCode.trim()) return;
    await handleDecoded(manualCode);
    setManualCode("");
  };

  const stockAfterScan = lastEvent && lastProduct
    ? lastProduct.stock +
      (lastEvent.type === "CHECK_IN"
        ? lastEvent.qty
        : lastEvent.type === "CHECK_OUT" || lastEvent.type === "SALE"
          ? -lastEvent.qty
          : 0)
    : null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Camera panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="size-4" />
            دوربین اسکنر
          </CardTitle>
          <CardDescription>
            بارکد را داخل کادر نگه دارید؛ پس از تشخیص، خودکار ثبت می‌شود.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative overflow-hidden rounded-xl border bg-black">
            <div
              id="qr-reader"
              ref={readerRef}
              className="w-full"
              style={{ minHeight: 280 }}
            />
            {!running ? (
              <div className="bg-muted/80 absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
                <Camera className="text-muted-foreground size-8" />
                <p className="text-muted-foreground text-sm">
                  دوربین خاموش است — برای شروع اسکن دکمه زیر را بزنید
                </p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!running ? (
              <Button onClick={start}>
                <Camera className="size-4" />
                شروع اسکن
              </Button>
            ) : (
              <Button variant="destructive" onClick={stop}>
                <CameraOff className="size-4" />
                توقف
              </Button>
            )}
            {running && torchSupported ? (
              <Button variant="outline" size="icon" onClick={toggleTorch} title="فلاش">
                {torch ? (
                  <FlashlightOff className="size-4" />
                ) : (
                  <Flashlight className="size-4" />
                )}
              </Button>
            ) : null}
            {busy ? (
              <Badge variant="secondary" className="gap-1">
                <Spinner className="size-3" />
                در حال ثبت…
              </Badge>
            ) : status ? (
              <Badge variant={lastProduct ? "success" : "warning"}>{status}</Badge>
            ) : null}
          </div>

          {error ? (
            <Alert variant="destructive">
              <CameraOff className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Separator />

          {/* Manual entry */}
          <div className="space-y-2 rounded-lg border border-dashed p-3">
            <Label
              htmlFor="manual-code"
              className="text-muted-foreground flex items-center gap-2"
            >
              <Keyboard className="size-4" />
              ورود دستی بارکد (اگر دوربین کار نکرد)
            </Label>
            <div className="flex gap-2">
              <Input
                id="manual-code"
                dir="ltr"
                value={manualCode}
                onChange={(event) => setManualCode(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && submitManual()}
                placeholder="بارکد را تایپ کنید"
              />
              <Button
                variant="secondary"
                onClick={submitManual}
                disabled={!manualCode.trim() || busy}
              >
                ثبت
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls + last result */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>تنظیمات اسکن</CardTitle>
            <CardDescription>
              نوع تراکنش و تعداد را قبل از اسکن انتخاب کنید.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>نوع اسکن</Label>
              <Tabs
                value={type}
                onValueChange={(value) => setType(value as ScanType)}
              >
                <TabsList className="h-auto flex-wrap">
                  {SCAN_TYPES.map((scanType) => (
                    <TabsTrigger key={scanType} value={scanType}>
                      {SCAN_TYPE_LABELS[scanType]}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>تعداد</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQty((current) => Math.max(1, current - 1))}
                >
                  −
                </Button>
                <span className="w-12 text-center text-xl font-bold tabular-nums">
                  {toPersianDigits(qty)}
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {lastProduct ? (
                <Package className="size-4" />
              ) : (
                <PackageSearch className="size-4" />
              )}
              آخرین اسکن
            </CardTitle>
            <CardDescription>نتیجه‌ی آخرین بارکد خوانده‌شده</CardDescription>
          </CardHeader>
          <CardContent>
            {lastEvent ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {lastProduct ? lastProduct.name : "محصول تعریف نشده"}
                  </span>
                  <Badge variant={lastProduct ? "default" : "warning"}>
                    {SCAN_TYPE_LABELS[lastEvent.type]}
                  </Badge>
                </div>

                <div className="text-muted-foreground space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Volume2 className="size-3" />
                    بارکد: <span dir="ltr">{lastEvent.barcode}</span>
                  </div>
                  {lastProduct ? (
                    <>
                      <div>
                        قیمت فروش: {formatCurrency(lastProduct.salePrice)}
                      </div>
                      <div className="flex items-center gap-1">
                        موجودی پس از اسکن:
                        <Badge
                          variant={
                            (stockAfterScan ?? 0) <= lastProduct.lowStockThreshold
                              ? "warning"
                              : "secondary"
                          }
                        >
                          {toPersianDigits(stockAfterScan ?? 0)}
                        </Badge>
                      </div>
                    </>
                  ) : (
                    <p className={cn("text-warning")}>
                      این بارکد در انبار ثبت نشده — می‌توانید در صفحه محصولات اضافه
                      کنید.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <Empty className="border border-dashed p-4 md:p-6">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <PackageSearch />
                  </EmptyMedia>
                  <EmptyTitle>هنوز اسکنی انجام نشده</EmptyTitle>
                  <EmptyDescription>
                    دوربین را روشن کنید و بارکد محصول را جلوی آن بگیرید.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
