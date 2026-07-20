import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import boundaries from "eslint-plugin-boundaries";

export default [
  {
    ignores: ["dist/", "node_modules/", ".git/", "coverage/"],
  },
  {
    files: ["src/**/*.ts", "tests/**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      boundaries,
    },
    rules: {
      "@typescript-eslint/member-ordering": ["error", {
        default: {
          memberTypes: [
            "public-static-field",
            "protected-static-field",
            "private-static-field",
            "public-instance-field",
            "protected-instance-field",
            "private-instance-field",
            "public-constructor",
            "protected-constructor",
            "private-constructor",
            "public-static-method",
            "protected-static-method",
            "private-static-method",
            "public-instance-method",
            "protected-instance-method",
            "private-instance-method",
          ],
        },
      }],
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
      "@typescript-eslint/consistent-type-imports": ["error", {
        prefer: "type-imports",
        fixStyle: "separate-type-imports",
      }],
      "@typescript-eslint/consistent-type-exports": "error",

      "no-console": "warn",
      "no-debugger": "error",
      "no-duplicate-imports": "error",
      "no-unused-expressions": "error",
      "prefer-const": "error",
      "no-var": "error",

      "boundaries/dependencies": ["error", {
        default: "disallow",
        policies: [
          {
            from: { element: { types: "domain" } },
            allow: { to: { element: { types: { anyOf: ["domain", "shared", "errors"] } } } },
          },
          {
            from: { element: { types: "application" } },
            allow: { to: { element: { types: { anyOf: ["application", "domain", "shared", "errors"] } } } },
          },
          {
            from: { element: { types: "infrastructure" } },
            allow: { to: { element: { types: { anyOf: ["infrastructure", "application", "domain", "shared", "errors"] } } } },
          },
          {
            from: { element: { types: "public-api" } },
            allow: { to: { element: { types: { anyOf: ["public-api", "application", "domain", "shared", "errors", "infrastructure"] } } } },
          },
          {
            from: { element: { types: "adapters" } },
            allow: { to: { element: { types: { anyOf: ["adapters", "public-api", "shared", "errors"] } } } },
          },
          {
            from: { element: { types: "tests" } },
            allow: { to: { element: { types: { anyOf: ["tests", "public-api", "application", "domain", "shared", "errors", "infrastructure", "adapters"] } } } },
          },
        ],
      }],
    },
    settings: {
      "boundaries/elements": [
        { type: "domain", pattern: "src/domain/**" },
        { type: "application", pattern: "src/application/**" },
        { type: "infrastructure", pattern: "src/infrastructure/**" },
        { type: "public-api", pattern: "src/public-api/**" },
        { type: "adapters", pattern: "src/adapters/**" },
        { type: "shared", pattern: "src/shared/**" },
        { type: "errors", pattern: "src/errors/**" },
        { type: "tests", pattern: "tests/**" },
      ],
    },
  },
  {
    files: ["src/infrastructure/logging/console-logger.ts"],
    rules: {
      "no-console": "off",
    },
  },
  {
    files: ["tests/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },
];
