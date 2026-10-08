"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@my-store/ui-kit";
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
  const readerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const lastCodeRef = useRef<{ code: string; at: number } | null>(null);

  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [type, setType] = useState<ScanType>("SALE");
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);

  const [lastEvent, setLastEvent] = useState<ScanEvent | null>(null);
  const [lastProduct, setLastProduct] = useState<Product | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  // Keep latest type/qty in refs so the decode callback always uses fresh values
  const typeRef = useRef(type);
  const qtyRef = useRef(qty);

  useEffect(() => {
    typeRef.current = type;
  }, [type]);

  useEffect(() => {
    qtyRef.current = qty;
  }, [qty]);

  const beep = useCallback(() => {
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

  const handleDecoded = useCallback(
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

  const start = useCallback(async () => {
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

  const stop = useCallback(async () => {
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

  const toggleTorch = useCallback(async () => {
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

  useEffect(() => {
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

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Camera panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            دوربین اسکنر
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative overflow-hidden rounded-lg border bg-black">
            <div
              id="qr-reader"
              ref={readerRef}
              className="w-full"
              style={{ minHeight: 280 }}
            />
            {!running ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/80 p-6 text-center">
                <Camera className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  دوربین خاموش است — برای شروع اسکن دکمه زیر را بزنید
                </p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!running ? (
              <Button onClick={start}>
                <Camera className="h-4 w-4" />
                شروع اسکن
              </Button>
            ) : (
              <Button variant="destructive" onClick={stop}>
                <CameraOff className="h-4 w-4" />
                توقف
              </Button>
            )}
            {running && torchSupported ? (
              <Button variant="outline" size="icon" onClick={toggleTorch} title="فلاش">
                {torch ? <FlashlightOff className="h-4 w-4" /> : <Flashlight className="h-4 w-4" />}
              </Button>
            ) : null}
            {busy ? (
              <Badge variant="secondary">در حال ثبت...</Badge>
            ) : status ? (
              <Badge variant="success">{status}</Badge>
            ) : null}
          </div>

          {error ? (
            <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>
          ) : null}

          {/* Manual entry */}
          <div className="space-y-2 rounded-md border border-dashed p-3">
            <Label htmlFor="manual-code" className="flex items-center gap-2 text-muted-foreground">
              <Keyboard className="h-4 w-4" />
              ورود دستی بارکد (اگر دوربین کار نکرد)
            </Label>
            <div className="flex gap-2">
              <Input
                id="manual-code"
                dir="ltr"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitManual()}
                placeholder="بارکد را تایپ کنید"
              />
              <Button variant="secondary" onClick={submitManual} disabled={!manualCode.trim()}>
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
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>نوع اسکن</Label>
              <div className="flex flex-wrap gap-2">
                {SCAN_TYPES.map((t) => (
                  <Button
                    key={t}
                    size="sm"
                    variant={type === t ? "default" : "outline"}
                    onClick={() => setType(t)}
                  >
                    {SCAN_TYPE_LABELS[t]}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>تعداد</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                >
                  −
                </Button>
                <span className="w-12 text-center text-xl font-bold">
                  {toPersianDigits(qty)}
                </span>
                <Button variant="outline" size="icon" onClick={() => setQty((q) => q + 1)}>
                  +
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {lastProduct ? <Package className="h-5 w-5" /> : <PackageSearch className="h-5 w-5" />}
              آخرین اسکن
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastEvent ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {lastProduct ? lastProduct.name : "محصول تعریف نشده"}
                  </span>
                  <Badge variant={lastProduct ? "default" : "warning"}>
                    {SCAN_TYPE_LABELS[lastEvent.type]}
                  </Badge>
                </div>
                <div className="text-muted-foreground space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-3 w-3" />
                    بارکد: <span dir="ltr">{lastEvent.barcode}</span>
                  </div>
                  {lastProduct ? (
                    <>
                      <div>قیمت فروش: {formatCurrency(lastProduct.salePrice)}</div>
                      <div>موجودی پس از اسکن: {toPersianDigits(lastProduct.stock + (lastEvent.type === "CHECK_IN" ? lastEvent.qty : lastEvent.type === "CHECK_OUT" || lastEvent.type === "SALE" ? -lastEvent.qty : 0))}</div>
                    </>
                  ) : (
                    <div className="text-amber-600">
                      این بارکد در انبار ثبت نشده — می‌توانید در صفحه محصولات اضافه کنید.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                هنوز اسکن انجام نشده. دوربین را روشن کنید و بارکد محصول را جلوی آن بگیرید.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
