import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: `/natural-voice-chat/`, // This is hard coded for the GitHub Pages deployment. See https://vitejs.dev/guide/static-deploy#github-pages
});
