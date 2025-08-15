---
title: "Avoid TODO Comments"
severity: "warning"
category: "maintainability"
filePatterns: ["*.ts", "*.js", "*.php", "*.jsx", "*.tsx"]
rules:
  - id: "avoid-todo-comments"
    pattern: "\\bTODO\\b"
    message: "Avoid TODO comments. Create a ticket and reference it explicitly or remove the comment."
    severity: "warning"
examples:
  - bad: "// TODO: Fix this later"
  - good: "// FIXME: Handle edge case for null values (Ticket: ABC-123)"
---

# Avoid TODO Comments

Do not leave generic `TODO` comments in committed code. They create technical debt and are often forgotten.

## Why This Matters

- TODO comments accumulate over time and become noise
- They don't provide actionable information
- They indicate incomplete work that shouldn't be merged
- They make the codebase look unfinished

## What to Do Instead

1. **Complete the work** before committing
2. **Create a ticket** and reference it in the comment
3. **Use specific comments** like `FIXME` with context
4. **Remove** the comment if it's no longer relevant

## Acceptable Alternatives

- `// FIXME: Handle null case (Ticket: DEV-456)`
- `// NOTE: This is a temporary workaround for API limitation`
- `// HACK: Remove when upstream library fixes bug #123`
