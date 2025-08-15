---
title: "TypeScript Safety and Null Handling"
severity: "warning" 
category: "safety"
filePatterns: ["*.ts", "*.tsx"]
rules:
  - id: "guard-optional-values"
    pattern: "label\\.toLowerCase\\(\\)"
    negativePattern: "\\?\\."
    message: "Guard optional values when lowercasing: use label?.toLowerCase() and a safe default for searchValue."
    severity: "warning"
---

# TypeScript Safety and Null Handling

## Overview
Write defensive TypeScript code that handles null, undefined, and optional values safely.

## Why This Matters
- **Runtime Safety**: Prevent null reference errors
- **Type Safety**: Leverage TypeScript's type system fully
- **Reliability**: Code works correctly with incomplete data
- **User Experience**: Graceful handling of edge cases

## Rules

### Use Optional Chaining for Null-Safe Operations
Always use optional chaining (`?.`) when accessing properties or calling methods on values that might be null or undefined.

**Bad:**
```typescript
interface Variable {
  label?: string;
  value: string;
}

function searchVariables(variables: Variable[], searchTerm: string) {
  return variables.filter(variable => 
    // This will throw if label is undefined
    variable.label.toLowerCase().includes(searchTerm.toLowerCase())
  );
}
```

**Good:**
```typescript
interface Variable {
  label?: string;
  value: string;
}

function searchVariables(variables: Variable[], searchTerm: string) {
  const safeTerm = searchTerm.toLowerCase();
  
  return variables.filter(variable => 
    // Safe handling of optional label
    variable.label?.toLowerCase().includes(safeTerm) ?? false
  );
}
```

### Provide Safe Defaults
When working with optional values, provide meaningful defaults.

**Bad:**
```typescript
function formatVariable(variable: { name?: string; value?: string }) {
  // Unsafe - might display "undefined: undefined"
  return `${variable.name}: ${variable.value}`;
}
```

**Good:**
```typescript
function formatVariable(variable: { name?: string; value?: string }) {
  const name = variable.name ?? 'Unnamed';
  const value = variable.value ?? 'No value';
  return `${name}: ${value}`;
}
```

### Type Guards for Complex Checks
Use type guards to safely narrow types.

```typescript
interface ColorVariable {
  type: 'color';
  value: string;
  format: 'hex' | 'rgb' | 'hsl';
}

interface SizeVariable {
  type: 'size';
  value: number;
  unit: 'px' | 'em' | 'rem';
}

type Variable = ColorVariable | SizeVariable;

function isColorVariable(variable: Variable): variable is ColorVariable {
  return variable.type === 'color';
}

function formatVariable(variable: Variable) {
  if (isColorVariable(variable)) {
    // TypeScript knows this is ColorVariable
    return `Color: ${variable.value} (${variable.format})`;
  } else {
    // TypeScript knows this is SizeVariable
    return `Size: ${variable.value}${variable.unit}`;
  }
}
```

### Strict Null Checks
Enable strict null checks in TypeScript configuration and handle them explicitly.

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true
  }
}
```

```typescript
// This forces explicit null handling
function processName(name: string | null): string {
  if (name === null) {
    return 'Anonymous';
  }
  
  return name.toLowerCase();
}
```

### Array Safety
Handle potentially empty arrays safely.

**Bad:**
```typescript
function getFirstVariable(variables: Variable[]) {
  // Might return undefined
  return variables[0].name;
}
```

**Good:**
```typescript
function getFirstVariable(variables: Variable[]): string | null {
  const first = variables[0];
  return first?.name ?? null;
}

// Or with explicit check
function getFirstVariableAlt(variables: Variable[]): string | null {
  if (variables.length === 0) {
    return null;
  }
  
  return variables[0].name ?? null;
}
```

### Object Property Access
Safely access nested object properties.

**Bad:**
```typescript
function getNestedValue(obj: any) {
  // Unsafe - any level could be undefined
  return obj.data.variables.length;
}
```

**Good:**
```typescript
interface DataStructure {
  data?: {
    variables?: Variable[];
  };
}

function getNestedValue(obj: DataStructure): number {
  return obj.data?.variables?.length ?? 0;
}
```
