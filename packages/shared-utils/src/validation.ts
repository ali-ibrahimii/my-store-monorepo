// ============================================================
// Zod validation schemas (shared between client and server)
// ============================================================

import { z } from "zod";

export const barcodeSchema = z
  .string()
  .min(4, "بارکد خیلی کوتاه است")
  .max(48, "بارکد خیلی بلند است")
  .transform((v) => v.trim().replace(/[\s-]/g, "").toUpperCase());

export const productSchema = z.object({
  name: z.string().min(2, "نام محصول را وارد کنید"),
  /**
   * بارکد اختیاری است: اگر خالی بماند، سرور خودش یک EAN-13 معتبر و یکتا
   * می‌سازد (تب «بارکدها» هم همان کار را برای محصولات قدیمی می‌کند).
   */
  barcode: z.union([barcodeSchema, z.literal("")]).optional(),
  sku: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().optional().or(z.literal("")),
  costPrice: z.coerce.number().min(0, "قیمت خرید نمی‌تواند منفی باشد"),
  salePrice: z.coerce.number().min(0, "قیمت فروش نمی‌تواند منفی باشد"),
  stock: z.coerce.number().int().min(0).optional(),
  lowStockThreshold: z.coerce.number().int().min(0).optional(),
  categoryId: z.string().optional().or(z.literal("")),
});

export const categorySchema = z.object({
  name: z.string().min(2, "نام دسته را وارد کنید"),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]*$/, "اسلاگ فقط حروف کوچک انگلیسی، عدد و خط تیره")
    .optional()
    .or(z.literal("")),
});

export const customerSchema = z.object({
  name: z.string().min(2, "نام مشتری را وارد کنید"),
  phone: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  note: z.string().trim().optional().or(z.literal("")),
});

export const storeSettingsSchema = z.object({
  name: z.string().min(2, "نام فروشگاه را وارد کنید"),
  phone: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().optional().or(z.literal("")),
  currency: z.string().trim().min(2).max(8).optional(),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  invoicePrefix: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{1,8}$/, "پیشوند فاکتور فقط حروف و عدد")
    .optional(),
  receiptFooter: z.string().trim().max(240).optional().or(z.literal("")),
  lowStockDefault: z.coerce.number().int().min(0).max(10000).optional(),
});

export const staffSchema = z.object({
  name: z.string().min(2, "نام را وارد کنید"),
  email: z.string().email("ایمیل معتبر نیست"),
  password: z.string().min(6, "رمز عبور حداقل ۶ کاراکتر"),
});

export const purchaseSchema = z.object({
  supplier: z.string().trim().optional().or(z.literal("")),
  note: z.string().trim().optional().or(z.literal("")),
  paidAmount: z.coerce.number().min(0).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        qty: z.coerce.number().int().positive(),
        unitCost: z.coerce.number().min(0),
      }),
    )
    .min(1, "حداقل یک قلم خرید لازم است"),
});

export const invoiceItemSchema = z.object({
  productId: z.string().min(1),
  qty: z.coerce.number().int().positive("تعداد باید بیشتر از صفر باشد"),
  unitPrice: z.coerce.number().min(0),
});

export const invoiceSchema = z.object({
  customerId: z.string().optional().or(z.literal("")),
  items: z.array(invoiceItemSchema).min(1, "حداقل یک آیتم لازم است"),
  discount: z.coerce.number().min(0).optional(),
  tax: z.coerce.number().min(0).optional(),
  note: z.string().trim().optional().or(z.literal("")),
  issueNow: z.boolean().optional(),
  payment: z
    .object({
      method: z.enum(["CASH", "CARD", "TRANSFER", "CREDIT"]),
      amount: z.coerce.number().positive(),
      note: z.string().trim().optional().or(z.literal("")),
    })
    .optional(),
});

export const expenseSchema = z.object({
  title: z.string().min(2, "عنوان هزینه را وارد کنید"),
  amount: z.coerce.number().positive("مبلغ باید بیشتر از صفر باشد"),
  date: z.string().optional(),
  note: z.string().trim().optional().or(z.literal("")),
  categoryId: z.string().optional().or(z.literal("")),
});

export const scanInputSchema = z.object({
  barcode: barcodeSchema,
  type: z.enum(["SALE", "COUNT", "CHECK_IN", "CHECK_OUT", "ADJUSTMENT"]).optional(),
  qty: z.coerce.number().int().positive().optional(),
  device: z.string().trim().optional().or(z.literal("")),
  note: z.string().trim().optional().or(z.literal("")),
});

export const registerSchema = z.object({
  storeName: z.string().min(2, "نام فروشگاه را وارد کنید"),
  name: z.string().min(2, "نام خود را وارد کنید"),
  email: z.string().email("ایمیل معتبر نیست"),
  password: z.string().min(6, "رمز عبور حداقل ۶ کاراکتر"),
});

export type ProductInput = z.infer<typeof productSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type ScanInput = z.infer<typeof scanInputSchema>;
