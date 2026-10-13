"use client";

import * as React from "react";

import { DbOfflineNotice } from "@/components/db-offline-notice";

interface HealthResponse {
  ok?: boolean;
  configured?: boolean;
  database?: { hint?: string; error?: string };
}

/**
 * بررسی سلامت سوپابیس بعد از رندر صفحه.
 *
 * قبلاً خودِ layout قبل از نمایش هر صفحه منتظر پاسخ سوپابیس می‌ماند
 * (یک رفت‌وبرگشت اضافه روی هر ناوبری). حالا صفحه فوراً می‌آید و این
 * بررسی جداگانه انجام می‌شود.
 */
export function DbHealthBanner() {
  const [warning, setWarning] = React.useState<{ detail?: string } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    fetch("/api/health", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as HealthResponse | null;
        if (cancelled) return;
        if (!body || body.ok === false) {
          setWarning({ detail: body?.database?.hint ?? body?.database?.error });
        }
      })
      .catch(() => {
        // شبکه یا تایم‌اوت — مزاحم کار کاربر نمی‌شویم
      })
      .finally(() => clearTimeout(timer));

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  if (!warning) return null;
  return <DbOfflineNotice detail={warning.detail} />;
}
