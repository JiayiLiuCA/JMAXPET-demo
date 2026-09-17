import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

/**
 * 生产构建保持默认的 .next（Vercel 只认这个目录里的 routes-manifest），
 * 本地 `next dev` 改用 .next-dev，这样本地跑 `next build` 不会覆盖正在运行的 dev server 产物。
 *   next dev                → .next-dev
 *   next build / next start → .next
 * NEXT_DIST_DIR 仅用于本地验证构建时临时换目录，Vercel 不设置它。
 */
const nextConfig = (phase: string): NextConfig => ({
  distDir: process.env.NEXT_DIST_DIR || (phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next"),
});

export default nextConfig;
