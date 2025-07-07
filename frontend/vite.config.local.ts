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
  server: {
    port: 5173,
    host: true, // Allow external connections
    // Ensure service workers are served with correct MIME type
    headers: {
      'Service-Worker-Allowed': '/',
    },
    // Configure MIME types for service worker files
    middlewareMode: false,
    // Proxy debug requests to debug console
    proxy: {
      '/api/debug-logs': {
        target: 'http://localhost:3003',
        changeOrigin: true,
        secure: false
      },
      '/debug-logs': {
        target: 'http://localhost:3003',
        changeOrigin: true,
        secure: false
      },
      '/logs': {
        target: 'http://localhost:3003',
        changeOrigin: true,
        secure: false
      }
    }
  },
  
  // Ensure service worker files are copied to build
  publicDir: 'public',
});
