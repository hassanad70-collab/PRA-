import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      // Generated Playwright output (gitignored, but not previously
      // eslint-ignored) -- surfaced once a local test run left a report
      // bundle on disk, since eslint has its own ignore list separate from
      // git's.
      "playwright-report/**",
      "test-results/**",
      "playwright/.cache/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
];

export default eslintConfig;
