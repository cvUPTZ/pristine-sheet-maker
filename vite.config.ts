import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path"; // Still need this for path.resolve and path.dirname
import { fileURLToPath } from "url"; // To get __dirname in ESM
import { componentTagger } from "lovable-tagger"; // Assuming this is a valid package

// ESM way to get __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::", // Listen on all IPv6 and IPv4 addresses. '0.0.0.0' is also common for IPv4.
    port: 8080,
    // allowedHosts should be an array of hostnames or the string 'all'.
    // It should not include the protocol (https://).
    allowedHosts: ["xpxkzc-8080.csb.app"],
    // If you want to allow any host (e.g., for CodeSandbox previews or similar environments
    // where the preview URL might change or be proxied), you might use:
    // allowedHosts: 'all',
    // However, be mindful of security implications if not in a controlled environment.
  },
  plugins: [
    react(),
    // This conditional logic is fine
    mode === "development" && componentTagger(),
  ].filter(Boolean), // .filter(Boolean) correctly removes falsy values (like false if mode !== "development")
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
