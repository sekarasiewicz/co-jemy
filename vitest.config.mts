import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    // Day keys are local dates; pin a zone so results don't depend on the machine.
    env: { TZ: "Europe/Warsaw" },
  },
});
