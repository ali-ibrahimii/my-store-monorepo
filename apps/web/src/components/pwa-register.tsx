"use client";

import { useEffect } from "react";

/** Registers the service worker so the app is installable as a PWA. */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // registration failed — app still works without offline support
      });
    }
  }, []);

  return null;
}
