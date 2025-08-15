---
title: "React Performance Optimization"
severity: "info"
category: "performance"
filePatterns: ["*.ts", "*.tsx", "*.js", "*.jsx"]
rules:
  - id: "use-memo-for-filtered-arrays"
    pattern: "const\\s+filteredVariables\\s*=\\s*variables\\.filter\\("
    negativePattern: "useMemo\\s*\\("
    message: "Wrap derived arrays in useMemo with proper dependencies to avoid unnecessary recalculations."
    severity: "info"
---

# React Performance Optimization

## Overview
Optimize React components to prevent unnecessary re-renders and expensive calculations.

## Why This Matters
- **Performance**: Faster rendering and better user experience
- **Efficiency**: Reduce CPU usage and memory consumption
- **Scalability**: Components perform well with large datasets
- **User Experience**: Smooth interactions and responsive UI

## Rules

### Use useMemo for Expensive Calculations
Wrap derived arrays, filtered lists, and computed values in `useMemo` to prevent recalculation on every render.

**Bad:**
```tsx
function VariablesList({ variables, searchTerm }) {
  // This filter runs on every render
  const filteredVariables = variables.filter(variable => 
    variable.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <ul>
      {filteredVariables.map(variable => (
        <li key={variable.id}>{variable.name}</li>
      ))}
    </ul>
  );
}
```

**Good:**
```tsx
import { useMemo } from 'react';

function VariablesList({ variables, searchTerm }) {
  // Only recalculates when variables or searchTerm change
  const filteredVariables = useMemo(() => 
    variables.filter(variable => 
      variable.name.toLowerCase().includes(searchTerm.toLowerCase())
    ), [variables, searchTerm]
  );
  
  return (
    <ul>
      {filteredVariables.map(variable => (
        <li key={variable.id}>{variable.name}</li>
      ))}
    </ul>
  );
}
```

### Other Performance Patterns

#### Use useCallback for Event Handlers
```tsx
import { useCallback } from 'react';

function SearchInput({ onSearch }) {
  // Prevents child re-renders when this component re-renders
  const handleInputChange = useCallback((event) => {
    onSearch(event.target.value);
  }, [onSearch]);
  
  return <input onChange={handleInputChange} />;
}
```

#### Use React.memo for Pure Components
```tsx
import React from 'react';

const VariableItem = React.memo(({ variable, onSelect }) => (
  <div onClick={() => onSelect(variable.id)}>
    {variable.name}: {variable.value}
  </div>
));
```

#### Optimize Large Lists with Virtualization
```tsx
import { FixedSizeList as List } from 'react-window';

function LargeVariablesList({ variables }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      {variables[index].name}
    </div>
  );
  
  return (
    <List
      height={400}
      itemCount={variables.length}
      itemSize={35}
    >
      {Row}
    </List>
  );
}
```

### Dependencies Best Practices

#### Include All Dependencies
```tsx
// Bad - missing dependency
const filteredItems = useMemo(() => 
  items.filter(item => item.category === selectedCategory),
  [items] // Missing selectedCategory
);

// Good - all dependencies included
const filteredItems = useMemo(() => 
  items.filter(item => item.category === selectedCategory),
  [items, selectedCategory]
);
```

#### Use Dependency Arrays Correctly
```tsx
// Bad - new object on every render
const config = useMemo(() => ({ sort: 'name', order: 'asc' }), []);

// Good - stable reference
const config = useMemo(() => ({ 
  sort: sortBy, 
  order: sortOrder 
}), [sortBy, sortOrder]);
```
