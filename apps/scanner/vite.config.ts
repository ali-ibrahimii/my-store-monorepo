import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// آدرس API در توسعه: پروکسی same-origin تا مشکل CORS پیش نیاید.
// در پروداکشن (Vercel) به‌جایش VITE_API_URL ست می‌شود.
const API_ORIGIN = process.env.API_ORIGIN ?? "http://127.0.0.1:3000";

/**
 * پروکسی بیرونی پیش‌نمایش (sandbox) هدر Authorization را حذف می‌کند،
 * اما query را عبور می‌دهد. api-client توکن را در `mstore_token` هم
 * می‌فرستد؛ اینجا (فقط در dev) آن را به هدر `x-mystore-token` تبدیل
 * می‌کنیم تا Next بتواند احراز هویت کند — دقیقاً مثل apps/mobile.
 */
function tokenQueryToHeader(): Plugin {
  return {
    name: "mstore-token-query-to-header",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url?.startsWith("/api")) {
          const url = new URL(req.url, "http://local");
          const token = url.searchParams.get("mstore_token");
          if (token) {
            url.searchParams.delete("mstore_token");
            req.url = url.pathname + url.search;
            req.headers["x-mystore-token"] = token;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [tokenQueryToHeader(), react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    // پیش‌نمایش sandbox پشت دامنه‌ی proxy‌شده است
    allowedHosts: true,
    proxy: {
      "/api": {
        target: API_ORIGIN,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
  },
});
