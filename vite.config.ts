// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// Never set ssr.external or resolve.external: the Worker has no runtime module resolution, so
// the build fails. Never add compression (compressPublicAssets, vite-plugin-compression):
// hosting already compresses at the edge.
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv, type Plugin } from "vite";

/**
 * Vite plugin: populate process.env with non-VITE_ server-only vars from .env
 * so that server functions (createServerFn) can read them via process.env.
 *
 * Background: Vite's loadEnv only injects VITE_* vars into import.meta.env.
 * Non-prefixed vars (WATSONX_*, OPENAI_API_KEY, LOVABLE_API_KEY, etc.) are
 * never automatically placed in process.env by Vite — they must be set here.
 * Nitro does the same via setupDotenv at build time; this covers the dev server.
 *
 * apply: "serve" — only runs during `npm run dev`, never during build.
 */
function serverEnvPlugin(): Plugin {
  return {
    name: "popup-detroit:server-env",
    apply: "serve",
    config(_, { mode }) {
      const all = loadEnv(mode, process.cwd(), "");
      for (const [key, value] of Object.entries(all)) {
        // Skip VITE_* (already handled by the framework) and vars already set
        // (e.g. from the shell environment, which should take precedence).
        if (key.startsWith("VITE_")) continue;
        if (process.env[key] !== undefined) continue;
        process.env[key] = value;
      }
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [serverEnvPlugin()],
  },
});
