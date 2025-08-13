---
title: "CSS Logical Properties"
severity: "warning"
category: "css"
filePatterns: ["**/*.css", "**/*.scss"]
---

# CSS Logical Properties

Reference: [Logical Properties (Confluence)](https://elementor.atlassian.net/wiki/spaces/RDDEP/pages/682262596/Logical+Properties)

## Introduction

Elementor uses CSS logical properties instead of physical properties. This enables automatic support for different writing modes and directions (LTR/RTL) without maintaining parallel styles.

## Meaning

Logical properties follow content flow (start/end, block/inline) rather than fixed edges (top/bottom/left/right).

- Learn more: [web.dev: Logical properties](https://web.dev/learn/css/logical-properties/)
- MDN: [CSS logical properties and values](https://developer.mozilla.org/docs/Web/CSS/CSS_logical_properties_and_values)

Example for `padding-inline-start` based on language and writing direction:

- English (LTR) → `padding-left`
- Hebrew (RTL) → `padding-right`
- Vertical writing mode (top-to-bottom) → maps to the block axis when applicable

## Motivation

- Remove `*-rtl.css` files
- Reduce build time
- Remove SASS mixins for LTR/RTL switching
- Serve a lighter plugin
- Adopt modern standards

## Things to watch

- Do not use `inset-*` for now due to BC; Elementor supports Safari 14, while many `inset` values require Safari 14.1
- Some properties lack logical equivalents (e.g., `background-position`, `object-position`, `transform-origin`, `translate-x`, `translate-y`)
- Some logical properties landed recently and may have poor BC in older browsers (e.g., `overflow-inline`, `overflow-block`)
- Some logical properties exist but have low overall support (e.g., `float`, `inline-size`/`block-size`)

Focus refactors on fully supported properties first: margin, padding, border, and text-align.

## Browser support

Always verify support before refactoring:

- Can I use: [CSS Logical Properties](https://caniuse.com/?search=logical%20properties)
- Elementor requirements: System Requirements (see project docs)
- Code references:
  - `.grunt-config/webpack.js` (browsers targets)
  - `.browserslistrc`

Safari >= 15.5 is the current minimum (see project `.browserslistrc`). Align logical properties usage with that baseline.

## Common mappings

| Physical (LTR)        | Logical                    |
|-----------------------|----------------------------|
| `padding-top`         | `padding-block-start`      |
| `padding-bottom`      | `padding-block-end`        |
| `padding-left`        | `padding-inline-start`     |
| `padding-right`       | `padding-inline-end`       |
| `margin-top`          | `margin-block-start`       |
| `margin-bottom`       | `margin-block-end`         |
| `margin-left`         | `margin-inline-start`      |
| `margin-right`        | `margin-inline-end`        |
| `border-top(-*)`      | `border-block-start(-*)`   |
| `border-bottom(-*)`   | `border-block-end(-*)`     |
| `border-left(-*)`     | `border-inline-start(-*)`  |
| `border-right(-*)`    | `border-inline-end(-*)`    |
| `text-align: left`    | `text-align: start`        |
| `text-align: right`   | `text-align: end`          |

Flex and Grid are logical by design; prefer content-aligned properties.

## Labels and UI copy (examples)

When referring to edges in UI labels/help texts, prefer logical terms:

- Above/Below/Before/After instead of Top/Bottom/Left/Right where appropriate
- Start/End instead of Left/Right where applicable
