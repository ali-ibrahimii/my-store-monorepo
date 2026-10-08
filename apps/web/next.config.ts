import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

// The monorepo root (two levels up from apps/web).
const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    // Lets Turbopack resolve the workspace packages under /packages.
    // (The stray apps/web/pnpm-lock.yaml that used to confuse root inference
    // — and forced this pin — has been removed; the root lockfile is now the
    // only one, so inference and this pin agree.)
    root: workspaceRoot,
  },
  // Shared workspace packages are consumed as TypeScript source.
  transpilePackages: [
    "@my-store/shared-types",
    "@my-store/shared-utils",
    "@my-store/api-client",
    "@my-store/ui-kit",
  ],
  experimental: {
    // ------------------------------------------------------------------
    // Workarounds for the Next.js 16.2.x Turbopack dev-server rebuild loop
    // (vercel/next.js#94915, #77102, #81161): "[Fast Refresh] rebuilding"
    // + "[HMR] connected" spam and a stuck "Compiling…" indicator.
    //
    // 1) The persistent dev filesystem cache writes continuously into
    //    .next/dev/cache/turbopack; on 16.2.x those writes can feed back
    //    into the fs watcher and re-trigger invalidation forever.
    // 2) Server Fast Refresh can ping-pong: HMR update → browser RSC
    //    refetch → (no-op) compile → another HMR update → …
    //
    // Both features are nice-to-have; disabling them costs a slightly
    // slower cold start and a manual reload after editing *server*
    // components (client components still hot-reload). Re-enable once
    // upstream ships a fix.
    // ------------------------------------------------------------------
    turbopackFileSystemCacheForDev: false,
    turbopackServerFastRefresh: false,
  },
};

export default nextConfig;
