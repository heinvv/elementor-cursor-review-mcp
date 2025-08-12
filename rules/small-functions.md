---
title: "Keep Functions Small"
severity: "warning"
category: "maintainability"
filePatterns: ["*.ts", "*.js", "*.php", "*.jsx", "*.tsx"]
examples:
  - bad: "function processUserData() { /* 50+ lines of mixed logic */ }"
  - good: "function processUserData() { const validated = validateUser(); const formatted = formatUserData(validated); return saveUser(formatted); }"
---

# Keep Functions Small

Functions should be small, focused, and do one thing well. Aim for functions that fit on a single screen (20-30 lines maximum).

## Why This Matters

- Easier to understand and reason about
- Simpler to test in isolation
- More reusable across the codebase
- Easier to debug when issues arise
- Reduces complexity and cognitive load
- Follows the Single Responsibility Principle

## Guidelines

### Size Limits
- **Ideal**: 10-15 lines
- **Maximum**: 30 lines
- **Red flag**: 50+ lines (should be refactored)

### Single Responsibility
Each function should have one clear purpose:
- ✅ `validateEmail(email)` - validates an email
- ✅ `formatCurrency(amount)` - formats a number as currency
- ❌ `processUserRegistration()` - validates, formats, saves, sends email (too many responsibilities)

### Refactoring Strategies

1. **Extract sub-functions**:
   ```javascript
   // Instead of one large function:
   function processOrder(order) {
     // validate order (10 lines)
     // calculate totals (15 lines)
     // apply discounts (20 lines)
     // save to database (10 lines)
     // send confirmation email (15 lines)
   }

   // Break into smaller functions:
   function processOrder(order) {
     const validated = validateOrder(order);
     const totals = calculateOrderTotals(validated);
     const final = applyDiscounts(totals);
     const saved = saveOrder(final);
     return sendConfirmationEmail(saved);
   }
   ```

2. **Use composition**:
   Combine small functions to create larger behaviors

3. **Extract utilities**:
   Move reusable logic to utility functions

## Benefits of Small Functions

- **Testability**: Easy to write unit tests
- **Reusability**: Can be used in multiple places
- **Debugging**: Easier to isolate issues
- **Readability**: Code reads like well-written prose
- **Maintenance**: Changes are localized and safer
