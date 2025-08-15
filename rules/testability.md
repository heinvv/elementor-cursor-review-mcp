---
title: "Testability and Dependency Management"
severity: "info"
category: "testing"
filePatterns: ["*.php"]
rules:
  - id: "avoid-direct-time-calls"
    pattern: "\\btime\\s*\\(\\s*\\)"
    message: "Avoid direct time() calls. Inject a clock or use a time provider for deterministic tests."
    severity: "info"
---

# Testability and Dependency Management

## Overview
Write code that can be easily tested by avoiding hard dependencies on global state, system resources, and non-deterministic functions.

## Why This Matters
- **Deterministic Tests**: Tests produce consistent results
- **Isolation**: Tests don't affect each other or external systems
- **Speed**: Tests run faster without real I/O operations
- **Reliability**: Tests don't fail due to external factors

## Rules

### Avoid Direct Time Calls
Direct calls to `time()`, `date()`, or similar functions make tests non-deterministic and difficult to test time-dependent logic.

**Bad:**
```php
class EventLogger {
    public function logEvent($event) {
        $timestamp = time(); // Hard dependency on current time
        $this->save([
            'event' => $event,
            'timestamp' => $timestamp
        ]);
    }
}
```

**Good:**
```php
interface Clock {
    public function now(): int;
}

class SystemClock implements Clock {
    public function now(): int {
        return time();
    }
}

class EventLogger {
    private $clock;
    
    public function __construct(Clock $clock) {
        $this->clock = $clock;
    }
    
    public function logEvent($event) {
        $timestamp = $this->clock->now();
        $this->save([
            'event' => $event,
            'timestamp' => $timestamp
        ]);
    }
}

// In tests:
class FakeClock implements Clock {
    private $time;
    
    public function __construct($fixedTime) {
        $this->time = $fixedTime;
    }
    
    public function now(): int {
        return $this->time;
    }
}

$logger = new EventLogger(new FakeClock(1640995200));
$logger->logEvent('test'); // Always uses fixed timestamp
```

### Other Testability Patterns

#### Inject HTTP Clients
```php
// Bad
$response = wp_remote_get($url);

// Good
class ApiClient {
    private $httpClient;
    
    public function __construct(HttpClient $httpClient) {
        $this->httpClient = $httpClient;
    }
    
    public function getData($url) {
        return $this->httpClient->get($url);
    }
}
```

#### Inject Filesystem Access
```php
// Bad
file_put_contents($path, $content);

// Good
interface Filesystem {
    public function write(string $path, string $content): bool;
}

class LocalFilesystem implements Filesystem {
    public function write(string $path, string $content): bool {
        return file_put_contents($path, $content) !== false;
    }
}
```
