import js from "@eslint/js";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.ts"],
    ignores: ["node_modules/**", "dist/**"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: {
      // General rules
      "prefer-const": "error",
      "no-var": "error",

      // TypeScript rules
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],

      // Disable rules
      "preserve-caught-error": "off",
    },
  },
]);
