// ============================================================
// راست‌به‌چپ (فارسی) — یک‌بار موقع بالا آمدن اپ اجرا می‌شود
//
// نکته: در React Native تغییر RTL بعد از اجرای بعدی اپ اعمال می‌شود،
// برای همین استایل‌ها را هم «راست‌چین» نوشته‌ایم تا در هر دو حالت
// درست به نظر برسد.
// ============================================================

import { I18nManager, Platform } from "react-native";

let applied = false;

export function enableRTL(): void {
  if (applied) return;
  applied = true;

  try {
    I18nManager.allowRTL(true);
    I18nManager.swapLeftAndRightInRTL(true);

    if (Platform.OS === "web") {
      if (typeof document !== "undefined") {
        document.documentElement.dir = "rtl";
        document.documentElement.lang = "fa";
      }
    } else if (!I18nManager.isRTL) {
      I18nManager.forceRTL(true);
    }
  } catch {
    // RTL اجباری نیست؛ اگر پلتفرم پشتیبانی نکرد بی‌سروصدا رد می‌شویم
  }
}

enableRTL();
