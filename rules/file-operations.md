---
title: "File Operations and Security"
severity: "warning"
category: "security"
filePatterns: ["*.php"]
rules:
  - id: "check-file-writes"
    pattern: "file_put_contents\\s*\\("
    message: "Check file writes and handle failures. Prefer WP_Filesystem or validate directory writability before file_put_contents."
    severity: "warning"
  - id: "avoid-plugin-logs-dir"
    pattern: "__DIR__\\s*\\+?\\s*['\"`]\\s*\\/\\.\\.\\/logs|\\/(logs)\\b"
    message: "Persist files under wp_upload_dir() and ensure writability rather than writing inside the plugin directory."
    severity: "warning"
---

# File Operations and Security

## Overview
Handle file operations securely and robustly, following WordPress best practices for file management.

## Why This Matters
- **Security**: Prevent directory traversal and unauthorized file access
- **Reliability**: Handle write failures gracefully
- **Portability**: Work across different server configurations
- **WordPress Standards**: Follow WordPress conventions for file handling

## Rules

### Use WordPress Filesystem API
WordPress provides a robust filesystem abstraction that handles permissions, security, and cross-platform compatibility.

**Bad:**
```php
// Direct file operations
$result = file_put_contents($path, $content);
if ($result === false) {
    // Error handling often forgotten
}
```

**Good:**
```php
// WordPress filesystem API
global $wp_filesystem;
if (empty($wp_filesystem)) {
    require_once ABSPATH . '/wp-admin/includes/file.php';
    WP_Filesystem();
}

$result = $wp_filesystem->put_contents($path, $content, FS_CHMOD_FILE);
if (!$result) {
    wp_die('Failed to write file: ' . $path);
}
```

### Use WordPress Upload Directory
Store files in the WordPress uploads directory, not in the plugin directory.

**Bad:**
```php
// Writing to plugin directory
$log_dir = __DIR__ . '/../logs/';
$log_file = $log_dir . 'debug.log';
file_put_contents($log_file, $content);
```

**Good:**
```php
// Using WordPress uploads directory
$upload_dir = wp_upload_dir();
$log_dir = $upload_dir['basedir'] . '/my-plugin-logs/';

// Ensure directory exists
if (!wp_mkdir_p($log_dir)) {
    wp_die('Failed to create log directory');
}

// Write file
$log_file = $log_dir . 'debug.log';
global $wp_filesystem;
if (empty($wp_filesystem)) {
    require_once ABSPATH . '/wp-admin/includes/file.php';
    WP_Filesystem();
}

$result = $wp_filesystem->put_contents($log_file, $content, FS_CHMOD_FILE);
if (!$result) {
    error_log('Failed to write log file: ' . $log_file);
}
```

### Validate File Operations
Always check if file operations succeed and handle failures appropriately.

**Bad:**
```php
file_put_contents($file, $content); // No error checking
```

**Good:**
```php
$result = file_put_contents($file, $content);
if ($result === false) {
    throw new Exception("Failed to write to file: $file");
}
```

### Security Considerations

#### Validate File Paths
```php
// Prevent directory traversal
$safe_filename = sanitize_file_name($user_filename);
$full_path = $upload_dir . '/' . $safe_filename;

// Ensure path is within expected directory
if (strpos(realpath($full_path), realpath($upload_dir)) !== 0) {
    wp_die('Invalid file path');
}
```

#### Set Proper Permissions
```php
// Use WordPress constants for file permissions
$wp_filesystem->put_contents($file, $content, FS_CHMOD_FILE);
$wp_filesystem->mkdir($dir, FS_CHMOD_DIR);
```
