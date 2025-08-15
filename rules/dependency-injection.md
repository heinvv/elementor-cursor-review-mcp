---
title: "Dependency Injection and SOLID Principles"
severity: "info"
category: "oop"
filePatterns: ["*.php"]
rules:
  - id: "inject-css-parser"
    pattern: "new\\s+CssParser\\s*\\(\\)"
    message: "Inject CssParser via constructor or callback parameters instead of instantiating directly to adhere to DI and ease testing."
    severity: "info"
  - id: "encapsulate-rest-route"
    pattern: "register_rest_route\\s*\\("
    message: "Encapsulate the REST route callback in a controller class and register via a bootstrap/service to improve OOP structure and testability."
    severity: "info"
---

# Dependency Injection and SOLID Principles

## Overview
Follow SOLID principles and dependency injection patterns to create maintainable, testable code.

## Why This Matters
- **Testability**: Injected dependencies can be easily mocked in tests
- **Flexibility**: Different implementations can be swapped without changing code
- **Single Responsibility**: Classes focus on their core purpose
- **Open/Closed**: Code is open for extension, closed for modification

## Rules

### Inject Dependencies Instead of Direct Instantiation
Don't instantiate dependencies directly inside classes. Inject them via constructor or method parameters.

**Bad:**
```php
class VariablesService {
    public function parseCSS($css) {
        $parser = new CssParser(); // Direct instantiation
        return $parser->parse($css);
    }
}
```

**Good:**
```php
class VariablesService {
    private $cssParser;
    
    public function __construct(CssParser $cssParser) {
        $this->cssParser = $cssParser;
    }
    
    public function parseCSS($css) {
        return $this->cssParser->parse($css);
    }
}
```

### Encapsulate REST Routes in Controllers
Don't register route callbacks as anonymous functions. Use controller classes.

**Bad:**
```php
register_rest_route('namespace/v1', '/endpoint', [
    'callback' => function($request) {
        // Handler logic here
    }
]);
```

**Good:**
```php
class EndpointController {
    public function handle($request) {
        // Handler logic here
    }
}

register_rest_route('namespace/v1', '/endpoint', [
    'callback' => [$controller, 'handle']
]);
```
