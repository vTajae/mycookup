import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    preact({
      // Enable React compatibility mode
      devtoolsInProd: false,
    }),
    tailwindcss(),
    tsconfigPaths(),
  ],
  resolve: {
    alias: {
      // Alias React to Preact/compat for React Router compatibility
      "react": "@preact/compat",
      "react-dom": "@preact/compat",
    },
  },
  build: {
    outDir: "build",
  },
});
