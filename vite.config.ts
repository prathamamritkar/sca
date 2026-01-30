import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            // Specific large libraries first to avoid getting caught by generic checks
            if (id.includes("recharts")) {
              return "charts";
            }
            if (id.includes("lucide-react")) {
              return "icons";
            }
            if (id.includes("@radix-ui")) {
              return "radix-ui";
            }

            // Core React last to ensure specific libs above aren't captured here
            if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/react-router-dom/")) {
              return "react-vendor";
            }

            // Allow other dependencies to fall into default chunking
            // avoiding the "catch-all" vendor chunk that causes circular dependencies
          }
        },
      },
    },
  },
}));
