import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import pkg from "./package.json" with { type: "json" };

// Version: package.json "major.minor" + git commit count => 0.1.<count> (every commit bumps it).
// Order: APP_VERSION env override -> git -> package.json version (git yoq bolsa, mes. deploy).
function git(cmd: string): string | undefined {
  try {
    return execSync(`git ${cmd}`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim() || undefined;
  } catch {
    return undefined;
  }
}
function resolveVersion(): string {
  if (process.env.APP_VERSION) return process.env.APP_VERSION;
  const count = git("rev-list --count HEAD");
  if (!count) return pkg.version;
  const [major, minor] = pkg.version.split(".");
  return `${major}.${minor}.${count}`;
}
const sha = process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? git("rev-parse --short HEAD") ?? "";

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_APP_VERSION: resolveVersion(), NEXT_PUBLIC_APP_COMMIT: sha },
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
