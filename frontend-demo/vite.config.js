import { defineConfig } from "vite";
import { nodePolyfills } from "@bangjelkoski/vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [nodePolyfills({ protocolImports: true })],
  resolve: {
    preserveSymlinks: true,
  },
});