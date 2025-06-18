import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
// import basicSsl from '@vitejs/plugin-basic-ssl';
import mkcert from 'vite-plugin-mkcert'

export default defineConfig({
  plugins: [
    mkcert() ,
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
    https: {
    key: './localhost+2-key.pem',
    cert: './localhost+2.pem'
  },
    host: true, // Allow external connections
    // Ensure service workers are served with correct MIME type
    headers: {
      'Service-Worker-Allowed': '/',
    },
    // Configure MIME types for service worker files
    middlewareMode: false,
  },
  
  // Ensure service worker files are copied to build
  publicDir: 'public',
});
