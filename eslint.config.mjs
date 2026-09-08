import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

/**
 * ESLint 9 usa flat config; eslint-config-next 15 todavia se publica en el
 * formato viejo, asi que FlatCompat lo traduce.
 */
const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // El brief lo pide explicito: sin `any`.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  { ignores: ["drizzle/**", ".next/**", "node_modules/**", "next-env.d.ts"] },
];

export default config;
