---
title: "General PR Suggestions"
severity: "info"
category: "process"
filePatterns: ["**/*"]
---

# General PR Suggestions

These items are suggestions to guide reviews; do not enforce as hard requirements unless explicitly stated in a specific rule.

## CSS Logical Properties baseline
- Baseline Safari: use project browsers list. Current minimum: Safari >= 15.5.
- Prefer logical properties over physical. Avoid exceptions; if a gap exists, discuss explicitly.
- See: `css-logical-properties.md` for details.

## REST tests (recommended)
- For new/changed routes: add route schema tests and permission callback tests when feasible.
- Treat as recommended, not mandatory, unless critical path or security-sensitive.

## Security checklist
- Follow the WordPress security checklist for routes, Ajax, and output.
- See: `wordpress-security-checklist.md`.

## Atomic Widgets (V4)
- Status: Alpha. No migration guidance needed now; treat as net-new widgets.


