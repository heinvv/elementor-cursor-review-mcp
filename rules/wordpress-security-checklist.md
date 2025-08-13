---
title: "WordPress Security Checklist"
severity: "error"
category: "security"
filePatterns: ["**/*.php"]
---

# WordPress Security Checklist

Apply these patterns to REST endpoints, Ajax handlers, admin pages, and any DB interaction.

## Core checks
- Guard files: `if ( ! defined( 'ABSPATH' ) ) { exit; }`
- Verify nonce early (`check_ajax_referer` / `wp_verify_nonce`), then check capability (`current_user_can`).
- Sanitize on input: `sanitize_text_field`, `absint`, `sanitize_key`, `esc_url_raw`, etc.
- Escape on output: `esc_html`, `esc_attr`, `esc_url`, and translators-aware functions.
- SQL: Always use `$wpdb->prepare` for dynamic queries.
- HTML: Use `wp_kses` with allowed tags array when outputting rich content.

## Recommended tests
- Permission callback returns false for unauthorized users.
- Nonce required for state-changing requests.
- Input validation rejects invalid types/ranges.


