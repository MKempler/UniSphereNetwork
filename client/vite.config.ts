import { defineConfig, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
// Import types if needed, actual import will be dynamic
// import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal"; 

export default defineConfig(async (): Promise<UserConfig> => {
  const pluginsToPush: UserConfig['plugins'] = [];

  if (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined) {
    const cartographerPlugin = await import("@replit/vite-plugin-cartographer").then((m) => m.cartographer());
    pluginsToPush.push(cartographerPlugin);
  }
  
  // Dynamically import ESM package
  const { default: runtimeErrorOverlay } = await import("@replit/vite-plugin-runtime-error-modal");

  return {
    plugins: [
      react(),
      runtimeErrorOverlay(), 
      ...pluginsToPush,
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@shared": path.resolve(import.meta.dirname, "..", "shared"),
        "@assets": path.resolve(import.meta.dirname, "..", "attached_assets"),
      },
    },
    // root: ".", // Optional: Defaults to config file location, which is now client/
    build: {
      // Adjusted: outDir relative to client/, so up one to project root, then dist/public
      outDir: path.resolve(import.meta.dirname, "..", "dist/public"), 
      emptyOutDir: true,
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false, // Assuming backend is http
        },
      },
    },
  };
}); 