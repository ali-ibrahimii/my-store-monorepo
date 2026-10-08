"use client";

import dynamic from "next/dynamic";

// html5-qrcode needs the browser camera — never render it on the server.
// next/dynamic with ssr:false is only allowed inside Client Components.
const Scanner = dynamic(
  () => import("@/components/scanner").then((m) => ({ default: m.Scanner })),
  { ssr: false },
);

export function ScannerDynamic() {
  return <Scanner />;
}
