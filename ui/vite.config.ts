import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// In production Frank serves this build at / and the console calls /mcp on its
// own origin (ADR-006), so there is no Frank URL to configure. In dev, the
// proxy gives `npm run dev` the same shape against a local Frank on :3000.
export default defineConfig({
  plugins: [react()],
  build: {
    // Cloudscape alone is ~1 MB minified; the default 500 kB warning is noise here.
    chunkSizeWarningLimit: 1500,
  },
  server: {
    proxy: {
      "/mcp": "http://localhost:3000",
      "/healthz": "http://localhost:3000",
    },
  },
  test: {
    environment: "jsdom",
  },
});
