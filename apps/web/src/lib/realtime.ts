import { EventEmitter } from "node:events";
import type { ScanEvent } from "@my-store/shared-types";

/**
 * Real-time scan event bus.
 *
 * - Always works in-memory (single process — covers dev & the sandbox preview).
 * - When REDIS_URL points to a shared Redis, events are also published on a
 *   pub/sub channel so multiple server instances stay in sync.
 */

const CHANNEL = "my-store:scan-events";

type ScanListener = (event: ScanEvent) => void;

class ScanBus {
  private emitter = new EventEmitter();
  private redisPub: { publish: (channel: string, message: string) => Promise<unknown> } | null = null;
  private redisSub: { quit: () => Promise<unknown> } | null = null;
  private initPromise: Promise<void> | null = null;

  constructor() {
    // SSE can have many listeners
    this.emitter.setMaxListeners(0);
  }

  /** Lazily connect to Redis (optional). Safe to call multiple times. */
  init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.connectRedis().catch(() => {
        // Redis unavailable — in-memory bus keeps working.
      });
    }
    return this.initPromise;
  }

  private async connectRedis(): Promise<void> {
    const url = process.env.REDIS_URL;
    if (!url) return;

    const { default: Redis } = await import("ioredis");

    const options = {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: (times: number) => (times > 3 ? null : 1000),
    };

    const pub = new Redis(url, options);
    const sub = new Redis(url, options);

    pub.on("error", () => {});
    sub.on("error", () => {});

    await pub.connect().catch(() => {});
    await sub.connect().catch(() => {});

    await sub.subscribe(CHANNEL).catch(() => {});
    sub.on("message", (_channel: string, message: string) => {
      try {
        const event = JSON.parse(message) as ScanEvent;
        this.emitter.emit("scan", event);
      } catch {
        // ignore malformed frames
      }
    });

    this.redisPub = pub;
    this.redisSub = sub;
  }

  /** Broadcast a scan event to local listeners + Redis (if connected). */
  publish(event: ScanEvent): void {
    this.emitter.emit("scan", event);
    if (this.redisPub) {
      this.redisPub.publish(CHANNEL, JSON.stringify(event)).catch(() => {});
    }
  }

  /** Subscribe to scan events. Returns an unsubscribe function. */
  onScan(listener: ScanListener): () => void {
    this.emitter.on("scan", listener);
    return () => {
      this.emitter.off("scan", listener);
    };
  }

  async dispose(): Promise<void> {
    await this.redisSub?.quit().catch(() => {});
  }
}

export const scanBus = new ScanBus();
