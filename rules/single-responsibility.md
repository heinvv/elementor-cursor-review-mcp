---
title: "Single Responsibility Principle"
severity: "warning"
category: "oop"
filePatterns: ["*.php"]
rules:
  - id: "handler-mixed-concerns"
    pattern: "function\\s+handle_variables_import\\s*\\("
    message: "This handler mixes concerns (I/O, parsing, normalization, response). Apply Single Responsibility: extract parser, normalizer, converter, and response mapping."
    severity: "warning"
  - id: "inject-dependencies-for-testing"
    pattern: "function\\s+handle_variables_import\\s*\\("
    message: "Use dependency injection for parser, HTTP client, filesystem, and clock to enable unit tests without side effects."
    severity: "warning"
---

# Single Responsibility Principle

## Overview
Each class and function should have only one reason to change. When a function handles multiple concerns, it becomes difficult to test, maintain, and understand.

## Why This Matters
- **Maintainability**: Changes to one concern don't affect others
- **Testability**: Each piece can be tested in isolation
- **Readability**: Code is easier to understand when focused
- **Reusability**: Single-purpose components can be reused

## Rules

### Extract Mixed Concerns
When a function handles multiple responsibilities, extract them into separate classes or functions.

**Bad:**
```php
function handle_variables_import($request) {
    // I/O - Reading request data
    $css = $request->get_param('css');
    $url = $request->get_param('url');
    
    // HTTP - Fetching remote content  
    if ($url) {
        $css = wp_remote_get($url);
    }
    
    // Parsing - Processing CSS
    $parser = new CssParser();
    $variables = $parser->extractVariables($css);
    
    // Normalization - Converting data
    $normalized = [];
    foreach ($variables as $var) {
        $normalized[] = normalize_variable($var);
    }
    
    // File I/O - Saving debug files
    file_put_contents('/tmp/debug.css', $css);
    
    // Response - Building output
    return new WP_REST_Response($normalized);
}
```

**Good:**
```php
class VariablesImportController {
    private $cssRetriever;
    private $cssParser;
    private $variableNormalizer;
    private $debugLogger;
    
    public function __construct(
        CssRetriever $cssRetriever,
        CssParser $cssParser, 
        VariableNormalizer $variableNormalizer,
        DebugLogger $debugLogger
    ) {
        $this->cssRetriever = $cssRetriever;
        $this->cssParser = $cssParser;
        $this->variableNormalizer = $variableNormalizer;
        $this->debugLogger = $debugLogger;
    }
    
    public function handle($request) {
        $css = $this->cssRetriever->retrieve($request);
        $variables = $this->cssParser->extractVariables($css);
        $normalized = $this->variableNormalizer->normalize($variables);
        $this->debugLogger->log($css);
        
        return new WP_REST_Response($normalized);
    }
}
```

### Use Dependency Injection for Side Effects
Inject dependencies that have side effects (HTTP, filesystem, time) to enable testing.

**Bad:**
```php
function processData() {
    $time = time(); // Direct time dependency
    $data = wp_remote_get($url); // Direct HTTP dependency
    file_put_contents($file, $data); // Direct filesystem dependency
}
```

**Good:**
```php
class DataProcessor {
    private $clock;
    private $httpClient;
    private $filesystem;
    
    public function __construct(Clock $clock, HttpClient $httpClient, Filesystem $filesystem) {
        $this->clock = $clock;
        $this->httpClient = $httpClient;
        $this->filesystem = $filesystem;
    }
    
    public function processData() {
        $time = $this->clock->now();
        $data = $this->httpClient->get($url);
        $this->filesystem->write($file, $data);
    }
}
```
