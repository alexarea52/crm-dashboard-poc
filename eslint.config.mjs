import vitest from "@vitest/eslint-plugin";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsdoc from "eslint-plugin-jsdoc";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // ---- Hygiene rules (project-wide) ----------------------------------------
  {
    rules: {
      // Correctness
      eqeqeq: ["error", "always"],
      "no-console": ["error", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "object-shorthand": "error",

      // Unused code: error (not the preset's warn), with the conventional
      // underscore escape hatch for intentionally-unused args/vars.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // Type-only imports stay type-only (keeps server code out of client
      // bundles and makes intent explicit). Auto-fixable.
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "inline-type-imports" },
      ],

      // Deterministic import order (auto-fixable) + structural import health.
      "import/order": [
        "error",
        {
          groups: [
            ["builtin", "external"],
            "internal",
            ["parent", "sibling", "index"],
          ],
          alphabetize: { order: "asc", caseInsensitive: true },
          "newlines-between": "never",
        },
      ],
      "import/no-duplicates": "error",
      "import/no-cycle": "error",
    },
  },

  // ---- Type-aware rules (need the TS project) -------------------------------
  // Kept surgical rather than adopting all of strictTypeChecked: these are the
  // checks that protect real invariants here — un-awaited promises, and async
  // functions passed where a sync callback is required (withSessionViews).
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/prefer-nullish-coalescing": "error",
    },
  },

  // ---- JSDoc on the public surface ------------------------------------------
  // Exported functions/classes/interfaces/type aliases must carry a doc
  // comment (the codebase is at 100% today — this keeps it there).
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    plugins: { jsdoc },
    rules: {
      "jsdoc/require-jsdoc": [
        "error",
        {
          publicOnly: true,
          require: { FunctionDeclaration: true, ClassDeclaration: true },
          contexts: [
            "ExportNamedDeclaration > TSInterfaceDeclaration",
            "ExportNamedDeclaration > TSTypeAliasDeclaration",
          ],
        },
      ],
      "jsdoc/check-param-names": "error",
      "jsdoc/check-tag-names": "error",
      "jsdoc/no-multi-asterisks": "error",
    },
  },

  // ---- Accessibility beyond the Next preset ---------------------------------
  // The hand-rolled modal/tablist/segmented controls are exactly where a11y
  // bugs hide. (Preset already registers the jsx-a11y plugin.)
  {
    files: ["src/**/*.tsx"],
    rules: {
      "jsx-a11y/click-events-have-key-events": "error",
      "jsx-a11y/no-static-element-interactions": "error",
      "jsx-a11y/no-noninteractive-element-interactions": "error",
      "jsx-a11y/interactive-supports-focus": "error",
      "jsx-a11y/mouse-events-have-key-events": "error",
      "jsx-a11y/heading-has-content": "error",
      "jsx-a11y/label-has-associated-control": "error",
      "jsx-a11y/tabindex-no-positive": "error",
      // Deliberately NOT enabled: no-autofocus. Moving focus into a freshly
      // opened dialog (glossary filter) is desirable focus management.
    },
  },

  // ---- Test hygiene ----------------------------------------------------------
  {
    files: ["src/**/*.test.ts"],
    plugins: { vitest },
    rules: {
      "vitest/no-focused-tests": "error", // a stray .only silently skips CI
      "vitest/no-disabled-tests": "warn",
      "vitest/expect-expect": "error",
      "vitest/no-identical-title": "error",
      "vitest/valid-expect": "error",
    },
  },

  // ---- Architecture: lib/crm/sql is server-only ----------------------------
  // Client components must never import the SQL layer (it would drag
  // better-sqlite3 into the client bundle). sql/types is the one allowed,
  // type-only module. Mirrors the convention documented in src/README.md.
  {
    files: ["src/components/**", "src/app/**/page.tsx", "src/app/layout.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/crm/sql/*", "!@/lib/crm/sql/types"],
              message:
                "lib/crm/sql is server-only (route handlers). Import wire types from @/lib/crm/sql/types instead.",
            },
          ],
        },
      ],
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
