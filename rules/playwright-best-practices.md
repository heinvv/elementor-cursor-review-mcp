---
title: "Editor Playwright Best Practices"
severity: "warning"
category: "tests"
filePatterns: ["**/*.test.ts", "**/*.spec.ts", "**/__tests__/**/*", "**/playwright/**/*"]
---

# Editor Playwright Best Practices

Reference: [Editor Playwright Best Practices](https://elementor.atlassian.net/wiki/spaces/RDDEP/pages/835617108/Editor+Playwright+Best+Practices)

## Experiments

- Do not globally modify experiments. Tests should run with the default experiment status per product version. When running Pro tests, Core controls the experiment state.
- Do not modify default experiment configuration globally in the test environment (avoid global setup overrides for all tests).
- Test experiments inside a specific test, not globally. If needed, enable/disable within that test using `setExperiments()`.
- Always reset experiments after testing an experimental feature to avoid leaking state to other tests.
- Reset experiments only if your test modifies them. Use `resetExperiments()` only when you changed states.

Example:

```ts
await resetExperiments();
await setExperiments({ e_font_icon_svg: 'active', container: 'active' });
```

## General

1) Create small, readable tests. Use test steps when needed.

```ts
test('Copy Paste widget test', async ({ page }, testInfo) => {
  const editorPage = new EditorPage(page, testInfo);
  const wpAdminPage = new WpAdminPage(page, testInfo);
  const contextMenu = new ContextMenu(page, testInfo);
  await wpAdminPage.openNewPage();
  await editorPage.addWidget('heading');
  await page.locator(EditorSelectors.widgetsPanelIcon).click();
  await contextMenu.selectWidgetContextMenuItem('heading', 'Copy');
  await contextMenu.selectWidgetContextMenuItem('heading', 'Paste');
  expect(await contextMenu.editorPage.getWidgetCount()).toBe(2);
});
```

2) Wrap Playwright commands in logical helper functions.

Bad:

```ts
await page.locator('.elementor-tab-control-style').click();
await page.locator('.elementor-control-icon_section_style').click();
await page.locator('.elementor-control-icon_size [data-setting="size"]').first().fill('50');
```

Good:

```ts
await contextMenu.selectWidgetContextMenuItem('heading', 'Copy');
```

3) Keep functions in helpers under `playwright/pages` instead of inline in tests.

4) When a locator/URL is used more than once, avoid duplication. Create variables for locators and place them in the appropriate files with meaningful names.

5) Keep test files small; split large tests into helpers.

6) More than one `describe` in a test file is a signal to split files.

7) Use a data-driven approach; avoid copy-paste.

Bad:

```ts
await test.step('Check title <h3> text and icon alignment', async () => {
  const tag = 'h3';
  await frame.waitForLoadState('load');
  await setTitleTextTag(tag, nestedAccordionWidgetId, editor, page);
  await expectScreenshotToMatchLocator(`nested-accordion-title-${tag}-alignment.png`, nestedAccordionTitle);
});
// repeated for h4, h5...
```

Good:

```ts
for (const tag of ['h3', 'h4', 'h5']) {
  await test.step(`Check title ${tag} text and icon alignment`, async () => {
    await frame.waitForLoadState('load');
    await setTitleTextTag(tag, nestedAccordionWidgetId, editor, page);
    await expectScreenshotToMatchLocator(`nested-accordion-title-${tag}-alignment.png`, nestedAccordionTitle);
  });
}
```

8) Prefer explicit waits to hardcoded timeouts.

Bad:

```ts
await page.waitForTimeout(1000);
```

Good:

```ts
await page.locator('.superButton').waitFor();
```

9) Create test data (users, entities, WordPress content) via REST API when possible.

Reference: [REST API Handbook](https://developer.wordpress.org/rest-api/)

10) Store large test data in separate files and import in tests or hooks.

11) Enable ESLint and auto-format on save. Ensure the IDE uses the repo’s `.eslintrc.js`.

12) Use Playwright’s auto-retrying assertions.

Reference: [Playwright Assertions](https://playwright.dev/docs/test-assertions)

13) Use TypeScript and add types.

Bad:

```ts
async function myFunction(page) {
  await page.thisMethodNeverExist();
}
```

Good:

```ts
async function myFunction(page: Page) {
  await page.thisMethodNeverExist();
}
```

14) Read official Playwright best practices.

Reference: [Playwright Best Practices](https://playwright.dev/docs/best-practices)

15) Do not test styles with Playwright. Use screenshot comparison and test what the user sees.

```ts
await expect.soft(page.locator('.superBtn')).toHaveScreenshot('superBtn.png');
```

16) Use CI screenshots instead of localhost for comparison.

How to upload a CI screenshot:

- Create a test requiring a screenshot and run locally with `toHaveScreenshot`.
- Note where the screenshot is saved (e.g., `your-test-name.test.ts-snapshots`).
- The test will fail on first comparison; download results from CI summary.
- Find the `*-actual.jpeg` image, ensure it’s expected, then rename to `*-linux.jpeg`.
- Commit the CI screenshot in your PR. Do not push local machine screenshots to CI.

## Timings

- A good test should run in < 25s. Tests > 90s will fail by timeout.
- The full test run should complete in < 10 minutes on CI.

## Additional

- VSCode extension: https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright