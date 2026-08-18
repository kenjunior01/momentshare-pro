import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import path from "node:path";
import type { PluginOption, UserConfig } from "vite";

export default ({ mode }: { mode: string }): UserConfig => {
  const plugins: PluginOption[] = [
    // Tailwind CSS
    tailwindcss(),
    // Path aliases from tsconfig
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    // TanStack Start with import protection
    tanstackStart({
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
    }),
    // Nitro (build only)
    nitro({
      defaultPreset: "cloudflare-module",
    }),
    // React
    viteReact(),
  ];

  return {
    plugins,
    css: {
      transformer: "lightningcss",
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
      ignoreOutdatedRequests: true,
    },
    server: {
      host: "::",
      port: 8080,
      watch: {
        awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 100 },
      },
    },
  };
};
