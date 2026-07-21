import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  plugins: [react()],
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.integration.test.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
