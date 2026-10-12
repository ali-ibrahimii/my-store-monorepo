import { EventEmitter } from "node:events";
import type { ScanEvent } from "@my-store/shared-types";

/**
 * باس درون‌حافظه‌ای اسکن‌ها.
 * برای چند سرور، سوپابیس Realtime روی جدول scan_events را فعال کنید؛
 * فید وب علاوه بر SSE هر چند ثانیه هم از API پول می‌کند.
 */

type ScanListener = (event: ScanEvent) => void;

class ScanBus {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(0);
  }

  init(): Promise<void> {
    return Promise.resolve();
  }

  publish(event: ScanEvent): void {
    this.emitter.emit("scan", event);
  }

  onScan(listener: ScanListener): () => void {
    this.emitter.on("scan", listener);
    return () => this.emitter.off("scan", listener);
  }
}

export const scanBus = new ScanBus();
