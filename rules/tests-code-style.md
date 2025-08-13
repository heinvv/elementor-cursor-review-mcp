---
title: "Testing Best Practices"
severity: "warning"
category: "tests"
filePatterns: ["**/*.test.*", "**/__tests__/**/*"]
---
# Testing Best Practices

## Reduce Code Duplication
- For repeated code such as test setup, mocks or assertions, extract them into helper methods or setup functions.
- Example: If multiple tests initialize the same mocks or objects, move this logic to a shared setup function rather than duplicating code in each test.
