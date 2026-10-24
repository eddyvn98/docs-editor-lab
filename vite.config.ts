import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: [
      "prosemirror-model",
      "prosemirror-state",
      "prosemirror-view",
      "prosemirror-transform",
      "prosemirror-tables",
      "prosemirror-history",
      "prosemirror-keymap",
      "prosemirror-commands",
      "prosemirror-schema-list",
      "prosemirror-dropcursor",
      "prosemirror-gapcursor",
      "@tiptap/pm",
      "@tiptap/core",
      "react",
      "react-dom",
    ],
  },
  optimizeDeps: {
    include: [
      "prosemirror-view",
      "prosemirror-state",
      "prosemirror-model",
      "prosemirror-transform",
    ],
  },
});
