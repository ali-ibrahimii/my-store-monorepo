// ============================================================
// پیکربندی Metro برای مونورپو
//
// این اپ (`apps/mobile/src`) بسته‌های `packages/*` را به‌صورت
// «سورس TypeScript» مصرف می‌کند (مثل وب‌اپ)، یعنی Metro باید
// بیرون از ریشه‌ی خودش را هم ببیند و node_modules را هم در ریشه‌ی
// مونورپو جست‌وجو کند.
// ============================================================

const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname; // apps/mobile/src
const workspaceRoot = path.resolve(projectRoot, "../../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
