import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/db/**/*.test.ts"],
    environment: "node",
    // PGlite démarre une instance Postgres WASM par fichier de test : on laisse du temps.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
