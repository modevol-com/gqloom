// @ts-check

const js = require("@eslint/js")
const ts = require("typescript-eslint")
const prettier = require("eslint-config-prettier")

module.exports = ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  { ignores: ["**/*.js", "**/dist/"] },
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
    },
    rules: {
      "no-unused-vars": "off",
      "no-console": ["warn"],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/consistent-type-definitions": "error", // Enforce declaring types using `interface` keyword for better TS performance.
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        {
          disallowTypeAnnotations: false,
          fixStyle: "inline-type-imports",
          prefer: "type-imports",
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn", // or "error"
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  prettier
)
