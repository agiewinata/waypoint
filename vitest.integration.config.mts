import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    pool: "vmForks",
    sequence: { concurrent: false },
    setupFiles: ["dotenv/config"],
  },
});
