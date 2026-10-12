"use client";

// ============================================================
// <BarcodeStudio /> — «تب بارکدها»: تولید، اتصال و چاپ بارکد محصولات
//
// سه حالت کاری (تب):
//   ۱) خودکار     → هر محصولی که بارکد ندارد، یک EAN-13 معتبر می‌گیرد
//   ۲) دلخواه     → به هر تعدادی که بخواهی بارکد بساز و روی محصول بگذار
//   ۳) چاپ برچسب  → برچسب‌های آماده (نام + بارکد + قیمت) را چاپ کن
//
// همه‌ی عملیات نوشتن از `@my-store/api-client` و روی همان API خود وب‌اپ
// انجام می‌شود، پس اسکنر/موبایل هم بلافاصله همان بارکدها را می‌بیند.
// ============================================================

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Barcode as BarcodeIcon,
  CheckCircle2,
  Info,
  Layers,
  Printer,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
} from "lucide-react";
import { toast } from "sonner";

import { assignBarcodes, fillMissingBarcodes, generateBarcodes } from "@my-store/api-client";
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
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@my-store/ui-kit/components/field";
import { Input } from "@my-store/ui-kit/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@my-store/ui-kit/components/select";
import { Separator } from "@my-store/ui-kit/components/separator";
import { Spinner } from "@my-store/ui-kit/components/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@my-store/ui-kit/components/tabs";
import { formatCurrency, toPersianDigits } from "@my-store/shared-utils";

import { BarcodeImage } from "./barcode-image";
import { LABEL_SIZES, LabelSheet, type BarcodeLabelData, type LabelSize } from "./barcode-label";
import { cn } from "@/lib/utils";

export interface BarcodeStudioProduct {
  id: string;
  name: string;
  barcode: string;
  sku: string | null;
  categoryName: string | null;
  salePrice: number;
  hasBarcode: boolean;
}

interface BarcodeStudioProps {
  products: BarcodeStudioProduct[];
  /** کد سه‌رقمی فروشگاه که داخل بارکدهای ساخته‌شده می‌آید */
  storeCode: string;
  /** نقش کاربر اجازه‌ی ثبت بارکد روی محصول را دارد؟ */
  canEdit: boolean;
  /**
   * وقتی از دکمه‌ی «برچسب» یک محصول در جدول محصولات می‌آییم:
   * محصولِ دارای بارکد → تب چاپ (همان کالا انتخاب‌شده)،
   * محصولِ بدون بارکد → تب تولید خودکار.
   */
  focusProductId?: string;
}

type TabValue = "auto" | "bulk" | "print";

export function BarcodeStudio({
  products,
  storeCode,
  canEdit,
  focusProductId,
}: BarcodeStudioProps) {
  const router = useRouter();

  const focusProduct = focusProductId
    ? products.find((product) => product.id === focusProductId)
    : undefined;

  // بارکدهایی که همین حالا در این صفحه ثبت شده‌اند — برای اینکه UI بدون
  // انتظار برای refresh سرور هم فوراً درست نشان دهد.
  const [overrides, setOverrides] = React.useState<Record<string, string>>({});
  const [tab, setTab] = React.useState<TabValue>(() =>
    focusProduct && focusProduct.hasBarcode ? "print" : "auto",
  );

  const list = React.useMemo<BarcodeStudioProduct[]>(
    () =>
      products.map((product) =>
        overrides[product.id]
          ? { ...product, barcode: overrides[product.id], hasBarcode: true }
          : product,
      ),
    [products, overrides],
  );

  const missing = React.useMemo(() => list.filter((product) => !product.hasBarcode), [list]);
  const withBarcode = React.useMemo(() => list.filter((product) => product.hasBarcode), [list]);

  // به‌طور پیش‌فرض همه‌ی محصولات بدون بارکد تیک‌خورده‌اند؛ اگر از جدول
  // محصولات روی یک کالای مشخص «برچسب» بزنیم، فقط همان انتخاب می‌شود.
  const [selectedMissing, setSelectedMissing] = React.useState<Set<string>>(() => {
    const missingIds = products
      .filter((product) => !product.hasBarcode)
      .map((product) => product.id);
    if (focusProductId && missingIds.includes(focusProductId)) return new Set([focusProductId]);
    return new Set(missingIds);
  });
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // ---- تب «تولید دلخواه» ----
  const [count, setCount] = React.useState<string>(String(products.length || 1));
  const [codes, setCodes] = React.useState<string[]>([]);
  const [targets, setTargets] = React.useState<Record<string, string>>({});

  // ---- تب «چاپ برچسب» ----
  const [printIds, setPrintIds] = React.useState<Set<string>>(() =>
    focusProduct && focusProduct.hasBarcode ? new Set([focusProduct.id]) : new Set(),
  );
  const [copies, setCopies] = React.useState<string>("1");
  const [labelSize, setLabelSize] = React.useState<LabelSize>("md");
  const [showName, setShowName] = React.useState(true);
  const [showPrice, setShowPrice] = React.useState(true);
  const [query, setQuery] = React.useState("");

  /** رفتن به تب «چاپ برچسب» با انتخاب آماده */
  const openPrintTab = (ids: string[]) => {
    setPrintIds(new Set(ids));
    setTab("print");
  };

  const rememberAssigned = (assigned: { productId: string; barcode: string }[]) => {
    setOverrides((current) => {
      const next = { ...current };
      for (const item of assigned) next[item.productId] = item.barcode;
      return next;
    });
  };

  // ----------------------------------------------------------
  // ۱) تولید خودکار برای محصولات بدون بارکد
  // ----------------------------------------------------------
  async function runFillMissing(ids?: string[]) {
    if (!canEdit) return;
    setError(null);
    setBusy("auto");
    try {
      const result = await fillMissingBarcodes(ids);
      rememberAssigned(result.assigned);
      if (result.assigned.length === 0) {
        toast.message("محصولی بدون بارکد نمانده بود");
      } else {
        toast.success(`${toPersianDigits(result.assigned.length)} بارکد ساخته و ثبت شد`);
      }
      if (result.failed.length > 0) {
        setError(`برای ${toPersianDigits(result.failed.length)} محصول ثبت نشد`);
      }
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ساخت بارکد ناموفق بود");
    } finally {
      setBusy(null);
    }
  }

  // ----------------------------------------------------------
  // ۲) تولید دلخواه (به اندازه‌ی دلخواه) و اتصال به محصولات
  // ----------------------------------------------------------
  async function runGenerate() {
    setError(null);
    setBusy("generate");
    try {
      const value = Math.max(1, Math.min(500, Number(count) || 1));
      const result = await generateBarcodes({ count: value });
      setCodes((current) => [...new Set([...current, ...result.codes])]);
      toast.success(`${toPersianDigits(result.codes.length)} بارکد ساخته شد`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تولید بارکد ناموفق بود");
    } finally {
      setBusy(null);
    }
  }

  async function assignOne(code: string, productId: string) {
    if (!productId) return;
    setError(null);
    setBusy(`assign-${code}`);
    try {
      const result = await assignBarcodes([{ productId, barcode: code }]);
      if (result.failed.length > 0) {
        setError(result.failed[0]?.error ?? "ثبت بارکد روی محصول ناموفق بود");
      } else {
        rememberAssigned(result.assigned);
        setCodes((current) => current.filter((item) => item !== code));
        setTargets((current) => {
          const next = { ...current };
          delete next[code];
          return next;
        });
        toast.success("بارکد روی محصول ثبت شد");
        router.refresh();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ثبت بارکد ناموفق بود");
    } finally {
      setBusy(null);
    }
  }

  async function assignRemaining() {
    if (!canEdit || codes.length === 0) return;

    const pairs: { productId: string; barcode: string }[] = [];
    const usedProducts = new Set<string>();
    const freeProducts = list.filter((product) => !product.hasBarcode);

    for (const code of codes) {
      const explicit = targets[code];
      if (explicit && !usedProducts.has(explicit)) {
        pairs.push({ productId: explicit, barcode: code });
        usedProducts.add(explicit);
        continue;
      }
      const nextFree = freeProducts.find((product) => !usedProducts.has(product.id));
      if (nextFree) {
        pairs.push({ productId: nextFree.id, barcode: code });
        usedProducts.add(nextFree.id);
      }
    }

    if (pairs.length === 0) {
      setError("محصولی بدون بارکد نمانده — اول یک محصول را از فهرست انتخاب کن");
      return;
    }

    setError(null);
    setBusy("assign-all");
    try {
      const result = await assignBarcodes(pairs);
      rememberAssigned(result.assigned);
      const doneCodes = new Set(result.assigned.map((item) => item.barcode));
      setCodes((current) => current.filter((code) => !doneCodes.has(code)));
      if (result.assigned.length > 0) {
        toast.success(`${toPersianDigits(result.assigned.length)} بارکد روی محصولات ثبت شد`, {
          action: {
            label: "چاپ برچسب",
            onClick: () => openPrintTab(result.assigned.map((item) => item.productId)),
          },
        });
      }
      if (result.failed.length > 0) {
        setError(`${toPersianDigits(result.failed.length)} مورد ثبت نشد`);
      }
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ثبت بارکدها ناموفق بود");
    } finally {
      setBusy(null);
    }
  }

  // ----------------------------------------------------------
  // ۳) برچسب‌ها
  // ----------------------------------------------------------
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (product) =>
        product.name.toLowerCase().includes(q) ||
        product.barcode.toLowerCase().includes(q) ||
        (product.sku ?? "").toLowerCase().includes(q),
    );
  }, [list, query]);

  const copiesNumber = Math.max(1, Math.min(50, Number(copies) || 1));

  const printLabels = React.useMemo(() => {
    const chosen = list.filter((product) => printIds.has(product.id) && product.hasBarcode);
    const labels: { key: string; data: BarcodeLabelData }[] = [];
    for (const product of chosen) {
      const data: BarcodeLabelData = {
        name: product.name,
        barcode: product.barcode,
        salePrice: product.salePrice,
        sku: product.sku,
        categoryName: product.categoryName,
      };
      for (let copy = 0; copy < copiesNumber; copy++) {
        labels.push({ key: `${product.id}-${copy}`, data });
      }
    }
    return labels;
  }, [list, printIds, copiesNumber]);

  // کدهای تازه‌ساخته‌شده‌ای که هنوز روی محصولی نرفته‌اند هم قابل چاپ‌اند
  const looseLabels = React.useMemo(
    () => codes.map((code) => ({ key: `loose-${code}`, data: { name: "", barcode: code } as BarcodeLabelData })),
    [codes],
  );

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as TabValue)} className="space-y-6">
      <TabsList>
        <TabsTrigger value="auto">
          <Sparkles className="size-4" />
          تولید خودکار
        </TabsTrigger>
        <TabsTrigger value="bulk">
          <Layers className="size-4" />
          تولید دلخواه
        </TabsTrigger>
        <TabsTrigger value="print">
          <Printer className="size-4" />
          چاپ برچسب
        </TabsTrigger>
      </TabsList>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!canEdit ? (
        <Alert>
          <Info className="size-4" />
          <AlertDescription>
            نقش شما فقط اجازه‌ی دیدن این صفحه را دارد؛ برای ثبت بارکد روی محصولات باید
            حسابدار یا مالک فروشگاه باشید.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* =============== ۱) تولید خودکار =============== */}
      <TabsContent value="auto" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4" />
              بارکد خودکار برای محصولات بدون بارکد
            </CardTitle>
            <CardDescription>
              برای هر کالایی که بارکد ندارد یک <strong>EAN-13 استاندارد</strong> با پیشوند ایران
              (۶۲۸) و کد فروشگاه شما ({toPersianDigits(storeCode)}) ساخته و ثبت می‌شود؛ همان کدی
              که اسکنر موبایل و بارکدخوان دستگاهی می‌خواند.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={missing.length > 0 ? "warning" : "success"}>
                {missing.length > 0
                  ? `${toPersianDigits(missing.length)} محصول بدون بارکد`
                  : "همه‌ی محصولات بارکد دارند"}
              </Badge>
              <Badge variant="secondary">
                {toPersianDigits(withBarcode.length)} محصول دارای بارکد
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={!canEdit || busy !== null || missing.length === 0}
                onClick={() => runFillMissing(undefined)}
              >
                {busy === "auto" ? <Spinner /> : <Sparkles className="size-4" />}
                ساخت بارکد برای هر {toPersianDigits(missing.length)} محصول
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!canEdit || busy !== null || selectedMissing.size === 0}
                onClick={() => runFillMissing([...selectedMissing])}
              >
                {busy === "auto" ? <Spinner /> : <CheckCircle2 className="size-4" />}
                فقط انتخاب‌شده‌ها ({toPersianDigits(selectedMissing.size)})
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={Object.keys(overrides).length === 0}
                onClick={() => openPrintTab(Object.keys(overrides))}
              >
                <Printer className="size-4" />
                چاپ برچسب‌های ساخته‌شده ({toPersianDigits(Object.keys(overrides).length)})
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.refresh()}
                title="به‌روزرسانی فهرست"
              >
                <RefreshCw className="size-4" />
                به‌روزرسانی
              </Button>
            </div>

            {missing.length === 0 ? (
              <Empty className="border border-dashed">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CheckCircle2 />
                  </EmptyMedia>
                  <EmptyTitle>همه‌ی محصولات بارکد دارند</EmptyTitle>
                  <EmptyDescription>
                    اگر کالای تازه‌ای اضافه کردی، بارکدش خودکار ساخته می‌شود؛ برای چاپ برچسب به تب
                    «چاپ برچسب» برو.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="max-h-80 space-y-1 overflow-y-auto rounded-lg border p-2">
                <div className="flex items-center justify-between px-1 pb-2 text-xs">
                  <button
                    type="button"
                    className="text-primary font-medium"
                    onClick={() => setSelectedMissing(new Set(missing.map((p) => p.id)))}
                  >
                    انتخاب همه
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground font-medium"
                    onClick={() => setSelectedMissing(new Set())}
                  >
                    پاک‌کردن
                  </button>
                </div>
                {missing.map((product) => (
                  <label
                    key={product.id}
                    className="hover:bg-muted/60 flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="accent-primary size-4"
                      checked={selectedMissing.has(product.id)}
                      onChange={(event) => {
                        setSelectedMissing((current) => {
                          const next = new Set(current);
                          if (event.target.checked) next.add(product.id);
                          else next.delete(product.id);
                          return next;
                        });
                      }}
                    />
                    <span className="flex-1 truncate">{product.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {product.categoryName ?? "—"}
                    </span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {formatCurrency(product.salePrice)}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="size-4" />
              چطور کار می‌کند؟
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-2 text-sm">
            <p>
              ساختار هر بارکد: <span dir="ltr" className="font-mono">۶۲۸</span> (ایران) + کد
              فروشگاه (۳ رقم) + شماره‌ی کالا (۶ رقم) + رقم کنترلی. رقم کنترلی محاسبه می‌شود تا
              بارکدخوان واقعی هم آن را درست بخواند.
            </p>
            <p>
              محصول جدید؟ لازم نیست کاری کنی — هنگام ثبت محصول، اگر کادر بارکد را خالی بگذاری
              خودِ سیستم برایش بارکد می‌سازد.
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      {/* =============== ۲) تولید دلخواه =============== */}
      <TabsContent value="bulk" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="size-4" />
              تولید به تعداد دلخواه
            </CardTitle>
            <CardDescription>
              هر چند بارکد که لازم داری بساز (مثلاً به اندازه‌ی تعداد محصولات) و همان‌جا روی
              محصولاتت بگذار.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="barcode-count">تعداد بارکد</FieldLabel>
                <Input
                  id="barcode-count"
                  type="number"
                  min={1}
                  max={500}
                  dir="ltr"
                  value={count}
                  onChange={(event) => setCount(event.target.value)}
                />
                <FieldDescription>
                  حداکثر {toPersianDigits(500)} بارکد در هر بار — کدها هیچ‌وقت با بارکدهای موجود
                  فروشگاه تکراری نمی‌شوند.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="barcode-prefix">پیشوند GS1</FieldLabel>
                <Input id="barcode-prefix" dir="ltr" value="628" readOnly />
                <FieldDescription>
                  ۶۲۸ کد کشور ایران است؛ کد فروشگاه شما {toPersianDigits(storeCode)} درج می‌شود.
                </FieldDescription>
              </Field>
            </FieldGroup>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={busy !== null}
                onClick={() => setCount(String(Math.max(1, list.length)))}
                variant="outline"
              >
                به اندازه‌ی محصولات ({toPersianDigits(list.length)})
              </Button>
              <Button
                type="button"
                disabled={busy !== null}
                onClick={() => setCount(String(Math.max(1, missing.length || 1)))}
                variant="outline"
              >
                به اندازه‌ی بدون بارکدها ({toPersianDigits(missing.length)})
              </Button>
              <Button type="button" disabled={busy !== null} onClick={runGenerate}>
                {busy === "generate" ? <Spinner /> : <BarcodeIcon className="size-4" />}
                تولید بارکد
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>بارکدهای تولیدشده</CardTitle>
            <CardDescription>
              هر کد را روی یکی از محصولات بگذار. کدها تا وقتی «ثبت» نشوند در دیتابیس ذخیره
              نمی‌شوند.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {codes.length === 0 ? (
              <Empty className="border border-dashed">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <BarcodeIcon />
                  </EmptyMedia>
                  <EmptyTitle>هنوز بارکدی تولید نشده</EmptyTitle>
                  <EmptyDescription>
                    تعداد را بگذار و «تولید بارکد» را بزن — همه‌ی کدها همین‌جا آماده می‌شوند.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    {toPersianDigits(codes.length)} کد آماده‌ی ثبت
                  </Badge>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!canEdit || busy !== null || missing.length === 0}
                    onClick={assignRemaining}
                  >
                    {busy === "assign-all" ? <Spinner /> : <CheckCircle2 className="size-4" />}
                    ثبت روی محصولات بدون بارکد ({toPersianDigits(missing.length)})
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const assignedIds = Object.keys(overrides);
                      openPrintTab(assignedIds);
                      toast.message(
                        assignedIds.length > 0
                          ? "برچسب محصولاتی که بارکد گرفتند آماده است"
                          : "کدهای ثبت‌نشده هم در همین برگه چاپ می‌شوند",
                      );
                    }}
                  >
                    <Printer className="size-4" />
                    چاپ این برچسب‌ها
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setCodes([]);
                      setTargets({});
                    }}
                  >
                    پاک‌کردن فهرست
                  </Button>
                </div>

                <div className="space-y-2">
                  {codes.map((code) => (
                    <div
                      key={code}
                      className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center"
                    >
                      <BarcodeImage value={code} height={44} fontSize={12} className="sm:w-[46mm]" />
                      <div className="flex flex-1 flex-wrap items-center gap-2">
                        <span dir="ltr" className="font-mono text-xs">
                          {code}
                        </span>
                        <Select
                          value={targets[code] ?? ""}
                          onValueChange={(value) =>
                            setTargets((current) => ({ ...current, [code]: value }))
                          }
                        >
                          <SelectTrigger className="w-full sm:w-64">
                            <SelectValue placeholder="انتخاب محصول…" />
                          </SelectTrigger>
                          <SelectContent>
                            {list.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name}
                                {product.hasBarcode ? " (بارکد دارد)" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          size="sm"
                          disabled={!canEdit || !targets[code] || busy !== null}
                          onClick={() => assignOne(code, targets[code] ?? "")}
                        >
                          {busy === `assign-${code}` ? <Spinner /> : <CheckCircle2 className="size-4" />}
                          ثبت روی محصول
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* =============== ۳) چاپ برچسب =============== */}
      <TabsContent value="print" className="space-y-6">
        <div className="no-print space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="size-4" />
                انتخاب برچسب‌ها
              </CardTitle>
              <CardDescription>
                محصولاتی را که می‌خواهی برچسبشان را بچسبانی انتخاب کن، اندازه و تعداد را بگذار و
                چاپ بگیر.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FieldGroup className="grid gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="label-size">اندازه‌ی برچسب</FieldLabel>
                  <Select
                    value={labelSize}
                    onValueChange={(value) => setLabelSize(value as LabelSize)}
                  >
                    <SelectTrigger id="label-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(LABEL_SIZES) as LabelSize[]).map((size) => (
                        <SelectItem key={size} value={size}>
                          {LABEL_SIZES[size].title} — {LABEL_SIZES[size].hint}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="label-copies">تعداد نسخه از هر کالا</FieldLabel>
                  <Input
                    id="label-copies"
                    type="number"
                    min={1}
                    max={50}
                    dir="ltr"
                    value={copies}
                    onChange={(event) => setCopies(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>محتوا</FieldLabel>
                  <div className="flex items-center gap-4 pt-2 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="accent-primary size-4"
                        checked={showName}
                        onChange={(event) => setShowName(event.target.checked)}
                      />
                      نام کالا
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="accent-primary size-4"
                        checked={showPrice}
                        onChange={(event) => setShowPrice(event.target.checked)}
                      />
                      قیمت
                    </label>
                  </div>
                </Field>
              </FieldGroup>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="جست‌وجوی نام یا بارکد…"
                    className="ps-9"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPrintIds(new Set(withBarcode.map((product) => product.id)))
                  }
                >
                  انتخاب همه‌ی محصولات ({toPersianDigits(withBarcode.length)})
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPrintIds(new Set())}
                >
                  پاک‌کردن انتخاب
                </Button>
                <Button
                  type="button"
                  disabled={printLabels.length === 0 && looseLabels.length === 0}
                  onClick={() => window.print()}
                >
                  <Printer className="size-4" />
                  چاپ {toPersianDigits(printLabels.length + looseLabels.length)} برچسب
                </Button>
              </div>

              <Separator />

              <div className="max-h-96 space-y-1 overflow-y-auto rounded-lg border p-2">
                {filtered.map((product) => (
                  <label
                    key={product.id}
                    className={cn(
                      "hover:bg-muted/60 flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm",
                      !product.hasBarcode && "opacity-60",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="accent-primary size-4"
                      disabled={!product.hasBarcode}
                      checked={printIds.has(product.id)}
                      onChange={(event) => {
                        setPrintIds((current) => {
                          const next = new Set(current);
                          if (event.target.checked) next.add(product.id);
                          else next.delete(product.id);
                          return next;
                        });
                      }}
                    />
                    <span className="flex-1 truncate">{product.name}</span>
                    {product.hasBarcode ? (
                      <span dir="ltr" className="text-muted-foreground font-mono text-xs">
                        {product.barcode}
                      </span>
                    ) : (
                      <Badge variant="warning">بدون بارکد</Badge>
                    )}
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {looseLabels.length > 0 ? (
            <Alert>
              <BarcodeIcon className="size-4" />
              <AlertDescription>
                {toPersianDigits(looseLabels.length)} بارکد تازه از تب «تولید دلخواه» هم در همین
                برگه چاپ می‌شود.
              </AlertDescription>
            </Alert>
          ) : null}
        </div>

        <Card>
          <CardHeader className="no-print">
            <CardTitle>پیش‌نمایش برگه‌ی چاپ</CardTitle>
            <CardDescription>
              اندازه‌ها واقعی (میلی‌متری) هستند — با کاغذ برچسب A4 یا کاغذ ساده چاپ بگیر.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LabelSheet
              labels={printLabels.length > 0 ? printLabels : looseLabels}
              size={labelSize}
              showName={showName}
              showPrice={showPrice}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
