---
title: "General Code Quality"
severity: "info"
category: "general"
filePatterns: ["**/*"]
examples:
  - bad: "hardcoded values without explanation"
  - good: "well-documented configuration with clear intent"
---

# General Code Quality Guidelines

Ensure code changes follow good practices regardless of file type.

## Guidelines

- Use clear, descriptive names for variables and functions
- Avoid hardcoded values without explanation
- Include comments for complex logic
- Maintain consistent formatting and style
- Follow established patterns in the codebase

## For Configuration Files

- Use descriptive keys and values
- Group related settings together
- Include comments explaining purpose
- Validate configuration syntax
