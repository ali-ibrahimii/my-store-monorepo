import { ScannerDynamic } from "@/components/scanner-dynamic";
import { ScanFeed } from "@/components/scan-feed";

export const metadata = { title: "اسکنر" };

export default function ScanPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">اسکنر بارکد</h1>
        <p className="text-muted-foreground text-sm">
          با دوربین گوشی محصول را اسکن کنید — ثبت فوری انجام می‌شود و روی همه دستگاه‌ها
          به‌صورت لحظه‌ای نمایش داده می‌شود.
        </p>
      </div>

      <ScannerDynamic />

      <ScanFeed />
    </div>
  );
}
