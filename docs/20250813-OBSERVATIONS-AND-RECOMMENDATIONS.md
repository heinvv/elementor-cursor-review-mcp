## Observations

- **Architecture (Atomic Widgets V4)**
  - Feature-gated via experiments in `modules/atomic-widgets/module.php` (e.g., `EXPERIMENT_NAME`, capability and transition toggles). Hooks register packages, styles schema, supported units, widgets/elements, and transformers. Clear separation of editor vs frontend asset registration and opt-in rollout.
  - Schema-driven styling and props with transformer registries (`PropsResolver\Transformers_Registry`) and prop types (`PropTypes/*`). Promotes pure, composable transforms and consistent outputs.
  - Uses WordPress i18n and escaping APIs (`esc_html__`), ABSPATH guard, and explicit handles for scripts/styles.

- **Monorepo `packages/`**
  - Strong lint boundaries: disallow package path imports, enforce import cycles checks, enforce `react-hooks/exhaustive-deps`, consistent type imports, filename casing, and zone-based import restrictions (core/libs/tools).
  - TypeScript strict configs and Jest setup exist; import resolver configured for TS and Node.

- **Linting and style**
  - Root `.eslintrc.js` extends WordPress + React; local rules, tabs indentation, JSDoc constraints for i18n; TypeScript overrides add strict rules and project references to `tsconfig.json`.
  - PHP CodeSniffer `ruleset.xml` includes `WordPress` and `WordPress.Security` with pragmatic exclusions for documentation comments and some formatting.

- **Security (WordPress context)**
  - Widespread use of sanitization/escaping and permission-aware patterns in PHP code; security standard enabled via PHPCS ruleset. DB queries use `$wpdb->prepare` where present.

- **Testing**
  - PHPUnit in PHP projects, Jest in JS/TS packages, Playwright E2E in related repos with CI workflows and conventions; internal best-practices docs captured as rules.

- **CSS**
  - Adoption of CSS logical properties with explicit guidance and browser support constraints; intent to remove `*-rtl.css`, reduce build/mixins, and align with modern standards.

- **Internationalization**
  - Enforced text domains, `elementor` inside the Elementor core plugin, and restrictions on translation function argument types via ESLint.

### Supporting references

- Git commits and PR guidelines (structure and hygiene): [Confluence](https://elementor.atlassian.net/wiki/spaces/RDDEP/pages/410719307/Git+Commits+PR+Guidelines)
- CSS logical properties direction and constraints: [Confluence](https://elementor.atlassian.net/wiki/spaces/RDDEP/pages/682262596/Logical+Properties)
- Editor Playwright best practices (testing discipline): [Confluence](https://elementor.atlassian.net/wiki/spaces/RDDEP/pages/835617108/Editor+Playwright+Best+Practices)

## Recommendations

- **Clean code and readability**
  - Keep files focused and under ~300 lines when practical. Extract logic into named functions and pure transformers, especially in `PropsResolver` and style schema code.
  - Standardize simple-import-sort and naming conventions across all TS/JS (not only under `packages/`). Align import groupings with `packages/.eslintrc.js`.

- **Security (WP)**
  - For any admin ajax/REST routes, enforce a checklist: ABSPATH guard, nonce verification first (`wp_verify_nonce`/`check_ajax_referer`), capability checks (`current_user_can`), sanitize on input (`sanitize_text_field`, `absint`, etc.), escape on output (`esc_*`), use `$wpdb->prepare` for SQL, and use `wp_kses` for controlled HTML. Provide a central helper to make this frictionless.

- **Maintainability**
  - Document each experiment’s purpose, KPIs, and sunset plan. Track migration from experiment to default, and proactively remove feature flags once GA.
  - Port import-boundary rules to the main plugin code to prevent deep imports and accidental coupling beyond `packages/`.
  - Type the style and props schema with shared TS types (even if authored in PHP, publish a TS schema contract for editor consumers).

- **Testability**
  - Provide unit tests (and snapshots) for transformers and parsers. Use data attributes or role-based selectors in Playwright to reduce fragility. Offer a shared test-data helper (via REST) to seed pages/users consistently.

- **Performance**
  - Set asset budgets for editor and frontend bundles; prefer code-splitting for editor-only features. Guard against unnecessary renders with memoization and hook dependency discipline (already enforced via ESLint).

- **Accessibility**
  - Establish an a11y checklist for UI changes: semantics, labels, focus traps, keyboard flows, and color contrast. Add rule hooks for CI-linting where possible.

- **Innovation (V4)**
  - Continue schema-first approach; maintain a coverage matrix of physical→logical CSS mappings and known exceptions (e.g., Safari 14 versus 14.1).
  - Provide a migration guide for legacy widgets to atomic components, including codemods where feasible.

## What is missing in `rules/`

- **WordPress Security Checklist (PHP)**
  - A rule codifying nonce/capability/sanitization/escaping/prepare/kses patterns, with examples.

- **REST API Best Practices (WP)**
  - Route naming, schema validation, permission callbacks, error shape, caching headers, and rate-limiting considerations.

- **Accessibility (a11y)**
  - Practical checklist for components (roles, landmarks, focus, labels, keyboard, contrast) and React patterns for a11y.

- **Performance**
  - Guidelines for code splitting, lazy loading, memoization, import boundaries, and asset budgets (editor/frontend).

- **State and Data**
  - Guidance for React Query (since eslint plugin exists): cache keys, invalidation, suspense, and error boundaries.

- **Experiment Governance**
  - A rule clarifying experiment lifecycle, approval, telemetry, and deprecation/removal workflow.

- **Migration/Refactor Guides**
  - Atomic V4 migration playbook and codemod pointers for common widget patterns.


