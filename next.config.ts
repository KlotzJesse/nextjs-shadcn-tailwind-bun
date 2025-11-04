import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,

  typedRoutes: true,

  experimental: {

    useCache: true,

    // Forward browser logs to the terminal for easier debugging

    browserDebugInfoInTerminal: true,

    inlineCss: true,

    typedEnv: true,

    optimizeCss: true,

    authInterrupts: true,

    clientSegmentCache: true,

    turbopackFileSystemCacheForDev: true,
  },
};

export default nextConfig;
