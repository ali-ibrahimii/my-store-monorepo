// ============================================================
// slugify — ساخت اسلاگ انگلیسی از نام (برای دسته‌بندی و فروشگاه)
//
// نام‌های فارسی هیچ کاراکتر a-z ندارند، برای همین اگر نتیجه خالی یا
// فقط خط تیره شد، یک اسلاگ یکتا با پیشوند و timestamp می‌سازیم.
// ============================================================

export function slugify(value: string, fallbackPrefix = "item"): string {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  if (base) return base;
  return `${fallbackPrefix}-${Date.now().toString(36)}`;
}
