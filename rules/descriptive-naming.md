---
title: "Use Descriptive Names"
severity: "error"
category: "readability"
filePatterns: ["*.ts", "*.js", "*.php", "*.jsx", "*.tsx"]
examples:
  - bad: "const d = new Date()"
  - good: "const currentTimestamp = new Date()"
  - bad: "function calc(a, b) { return a * b * 0.1; }"
  - good: "function calculateTaxAmount(price, quantity) { return price * quantity * TAX_RATE; }"
---

# Use Descriptive Names

Variables, functions, and classes should have clear, descriptive names that explain their purpose without requiring comments.

## Why This Matters

- Code is read far more often than it's written
- Descriptive names serve as inline documentation
- Reduces cognitive load for other developers
- Makes debugging and maintenance easier
- Eliminates the need for explanatory comments

## Guidelines

### Variables
- Use nouns that describe the data: `userEmail`, `totalPrice`, `isAuthenticated`
- Avoid abbreviations: `userInfo` not `usrInf`
- Use `is`, `has`, `can` prefixes for booleans: `isVisible`, `hasPermission`

### Functions
- Use verbs that describe the action: `calculateTotal()`, `validateEmail()`, `renderComponent()`
- Be specific about what is returned: `getUserById()` not `getUser()`
- Avoid generic names: `processData()` → `validateUserInput()`

### Classes
- Use nouns that represent the entity: `EmailValidator`, `PaymentProcessor`
- Follow PascalCase convention
- Avoid suffixes like `Manager` or `Helper` unless necessary

## Constants
- Use UPPER_SNAKE_CASE: `MAX_RETRY_ATTEMPTS`, `API_BASE_URL`
- Group related constants: `API_ENDPOINTS.USERS`, `VALIDATION_RULES.EMAIL`
