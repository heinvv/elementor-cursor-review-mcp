---
title: "HTTP Operations and Remote Requests"
severity: "info"
category: "performance"
filePatterns: ["*.php"]
rules:
  - id: "conservative-remote-get"
    pattern: "wp_remote_get\\s*\\("
    message: "Set conservative wp_remote_get args (timeout, redirection) and guard large responses before processing."
    severity: "info"
---

# HTTP Operations and Remote Requests

## Overview
Handle HTTP requests safely and efficiently with proper timeouts, error handling, and resource limits.

## Why This Matters
- **Performance**: Prevent slow requests from blocking the application
- **Security**: Avoid SSRF attacks and resource exhaustion
- **Reliability**: Handle network failures gracefully
- **User Experience**: Don't let external services break your site

## Rules

### Set Conservative Request Arguments
Always specify timeouts and limits when making remote requests.

**Bad:**
```php
// No timeout or limits
$response = wp_remote_get($url);
$body = wp_remote_retrieve_body($response);
```

**Good:**
```php
$args = [
    'timeout'     => 10,           // 10 second timeout
    'redirection' => 2,            // Max 2 redirects
    'user-agent'  => 'MyPlugin/1.0',
    'headers'     => [
        'Accept' => 'text/css'     // Specify expected content
    ]
];

$response = wp_remote_get($url, $args);

// Check for errors
if (is_wp_error($response)) {
    error_log('HTTP request failed: ' . $response->get_error_message());
    return false;
}

// Check response code
$code = wp_remote_retrieve_response_code($response);
if ($code !== 200) {
    error_log("HTTP request returned code: $code");
    return false;
}

// Check content length before processing
$body = wp_remote_retrieve_body($response);
if (strlen($body) > 1024 * 1024) { // 1MB limit
    error_log('Response too large: ' . strlen($body) . ' bytes');
    return false;
}
```

### Validate Response Content
Always validate the response before processing it.

**Bad:**
```php
$response = wp_remote_get($css_url);
$css = wp_remote_retrieve_body($response);
// Process CSS without validation
$parser = new CssParser();
$parsed = $parser->parse($css);
```

**Good:**
```php
$response = wp_remote_get($css_url, [
    'timeout' => 10,
    'headers' => ['Accept' => 'text/css']
]);

if (is_wp_error($response)) {
    throw new Exception('Failed to fetch CSS: ' . $response->get_error_message());
}

$code = wp_remote_retrieve_response_code($response);
if ($code !== 200) {
    throw new Exception("CSS fetch returned HTTP $code");
}

$css = wp_remote_retrieve_body($response);

// Validate content type
$content_type = wp_remote_retrieve_header($response, 'content-type');
if (strpos($content_type, 'text/css') === false) {
    throw new Exception("Expected CSS, got: $content_type");
}

// Check size limits
if (strlen($css) > 512 * 1024) { // 512KB limit
    throw new Exception('CSS file too large: ' . strlen($css) . ' bytes');
}

// Now safe to parse
$parser = new CssParser();
$parsed = $parser->parse($css);
```

### Handle Network Failures
Implement retry logic and fallback strategies for critical requests.

```php
class SafeHttpClient {
    private $max_retries = 3;
    private $retry_delay = 1; // seconds
    
    public function get($url, $args = []) {
        $default_args = [
            'timeout'     => 10,
            'redirection' => 2,
            'user-agent'  => 'SafeClient/1.0'
        ];
        
        $args = wp_parse_args($args, $default_args);
        
        for ($attempt = 1; $attempt <= $this->max_retries; $attempt++) {
            $response = wp_remote_get($url, $args);
            
            if (!is_wp_error($response)) {
                $code = wp_remote_retrieve_response_code($response);
                if ($code === 200) {
                    return $response;
                }
            }
            
            if ($attempt < $this->max_retries) {
                sleep($this->retry_delay * $attempt);
            }
        }
        
        throw new Exception("Failed to fetch $url after {$this->max_retries} attempts");
    }
}
```

### Security Considerations

#### Prevent SSRF Attacks
```php
// Validate URL before making request
function is_safe_url($url) {
    $parsed = parse_url($url);
    
    // Must be HTTP/HTTPS
    if (!in_array($parsed['scheme'], ['http', 'https'])) {
        return false;
    }
    
    // Don't allow private IPs
    $ip = gethostbyname($parsed['host']);
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
        return false;
    }
    
    return true;
}

if (!is_safe_url($url)) {
    throw new Exception('Unsafe URL provided');
}
```
