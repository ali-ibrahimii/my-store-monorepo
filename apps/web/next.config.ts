import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

// The monorepo root (two levels up from apps/web).
const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    // Silences the "multiple lockfiles" warning and lets Turbopack resolve
    // the workspace packages under /packages.
    root: workspaceRoot,
  },
  // Shared workspace packages are consumed as TypeScript source.
  transpilePackages: [
    "@my-store/shared-types",
    "@my-store/shared-utils",
    "@my-store/api-client",
    "@my-store/ui-kit",
  ],
};

export default nextConfig;
