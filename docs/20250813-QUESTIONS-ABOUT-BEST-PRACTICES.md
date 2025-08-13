## Questions for alignment on best practices

Most questions are too technical as a general PR guideline. Don't enforce these items, but you can add them a suggestions or questions in the PR review.


- Architecture and experiments
  - What are the criteria and timeline to remove experiments (e.g., V4 flags) once adopted? Is there an ADR template to capture the decision to flip defaults?

This is handled from a Product perspective. Not inside a code review.


  - Should capabilities/permissions be enforced uniformly via a central helper? Any exceptions?

Please elaborate. 
Maybe we can add it as a general guideline.
Where did you find this information?



- Packages and import boundaries
  - Do we want to extend `packages/.eslintrc.js` boundary rules to the main plugin code to prevent deep imports? Any known legitimate exceptions?

`packages` is still in process. It was a standalone repo, that has been integrated with the Elementor plugin.



  - Should we standardize simple-import-sort groups for all TS/JS projects (including non-packages)?
  No sure. 

- Security (WordPress)
  - Which nonce names and capabilities are standard per route type (editor REST/admin AJAX/public)? Central naming convention?

Not sure. Use best practices.


  - Is there a shared sanitizer/validator library we should import instead of re-implementing per route?

  Not sure. 


- REST API conventions
  - Preferred route namespace/versioning, schema validation approach, and error payload shape? Should we enforce via unit tests/contract tests?

Preferably enforce through unit tests.


  - Any caching headers or ETags we want by default for read-heavy endpoints?

Not sure.


- Testing strategy
  - What are the target levels for unit/integration/E2E coverage? Are we measuring flakiness in CI?

Not sure. Generally speaking at least one automated test per task/PR.

  - Should we enforce data-testid or prefer role-based selectors for Playwright by default? Any guidance for snapshot usage limits?
Role-based preferably, but allow for data-testid if necessary.



- Performance and asset budgets
  - Target bundle sizes for editor and frontend? How are we tracking/regressing budgets in CI?

Not a PR review question.


  - Are there preferred lazy-loading boundaries for editor features? Any critical-path constraints?

  Not sure.

- Accessibility
  - Do we maintain a required a11y checklist per feature? Who signs off on a11y in PRs? Any automated checks we can add?

A11y is work in progress. Do a general check.
In some cases, we add axe-core test to playwright.


- CSS Logical Properties
  - Are exceptions permitted due to Safari 14 vs 14.1 gaps (e.g., inset)? What’s the approval path for temporary physical properties?

No. Safari 15.1 is the minimum version (but please check in our documentation, what is minimum supported version)

  - Do we want an automated lint to guard against new physical properties where logical ones exist?

No.


- Documentation
  - Where should the Atomic Widgets architecture documentation live? Do we adopt ADRs for major decisions? Who maintains migration guides?

Atomic Widgets are in alpha version. There is no migration. These are new widgets.


- State/Data
  - With React Query enabled in lint rules, do we have standard cache key naming, invalidation patterns, and suspense boundary conventions?

  No sure.


