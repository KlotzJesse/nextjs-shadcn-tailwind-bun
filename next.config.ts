import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,


  typedRoutes: true,

  experimental: {

    useCache: true,

    // Forward browser logs to the terminal for easier debugging

    browserDebugInfoInTerminal: true,

    inlineCss: true,

    typedEnv: true,

    // Advanced optimizations

    optimizePackageImports: [
      "@radix-ui",

      "radix-ui",

      "@radix-ui/react-accordion",

      "@radix-ui/react-alert-dialog",

      "@radix-ui/react-avatar",

      "@radix-ui/react-checkbox",

      "@radix-ui/react-collapsible",

      "@radix-ui/react-context-menu",

      "@radix-ui/react-dialog",

      "@radix-ui/react-dropdown-menu",

      "@radix-ui/react-hover-card",

      "@radix-ui/react-label",

      "@radix-ui/react-menubar",

      "@radix-ui/react-navigation-menu",

      "@radix-ui/react-popover",

      "@radix-ui/react-progress",

      "@radix-ui/react-radio-group",

      "@radix-ui/react-scroll-area",

      "@radix-ui/react-select",

      "@radix-ui/react-separator",

      "@radix-ui/react-slider",

      "@radix-ui/react-switch",

      "@radix-ui/react-tabs",

      "@radix-ui/react-toggle",

      "@radix-ui/react-toggle-group",

      "@radix-ui/react-tooltip",

      "lucide-react",

      "recharts",

      "@tabler/icons-react",
    ],

    optimizeCss: true,

    authInterrupts: true,

    cacheComponents: true,

    clientSegmentCache: true,

    turbopackFileSystemCacheForDev: true,

    turbopackFileSystemCacheForBuild: true,
  },
};

export default nextConfig;
