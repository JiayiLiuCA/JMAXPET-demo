import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

/**
 * dev 与 build 使用不同的输出目录，避免 `next build` 覆盖正在运行的 `next dev` 产物
 * （否则 dev server 会报 ENOENT _buildManifest.js.tmp / Internal Server Error，必须重启）。
 *   next dev   → .next
 *   next build / next start → .next-build
 */
const nextConfig = (phase: string): NextConfig => ({
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next" : ".next-build",
});

export default nextConfig;
