import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: [".expo/**", "dist/**", "node_modules/**"],
  },
]);