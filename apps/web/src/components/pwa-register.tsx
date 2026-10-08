"use client";

import { useEffect } from "react";

/** Registers the service worker so the app is installable as a PWA. */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // A service worker is only useful in production. In dev it can serve stale
    // Next.js assets and interfere with hot reloading, so remove an old local
    // registration instead of installing one.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistration().then((registration) => {
        registration?.unregister();
      });
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // registration failed — app still works without offline support
    });
  }, []);

  return null;
}
