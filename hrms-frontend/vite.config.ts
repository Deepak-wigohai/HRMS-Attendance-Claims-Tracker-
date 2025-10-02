import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcssVite from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcssVite(),   // add this
  ],
});
