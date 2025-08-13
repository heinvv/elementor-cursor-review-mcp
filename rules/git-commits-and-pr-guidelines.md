---
title: "Git Commits and PR Guidelines"
severity: "info"
category: "process"
filePatterns: ["**/*"]
---

# Git Commits and PR Guidelines

Reference: [Git Commits & PR Guidelines](https://elementor.atlassian.net/wiki/spaces/RDDEP/pages/410719307/Git+Commits+PR+Guidelines)

## Before committing

- Separate code movement from code changes; keep diffs easy to read and understand.
- If a task handles two actions (like infra + fix), commit them separately.
- Include only changes related to the task; avoid opportunistic fixes.
- Limit commits to a maximum of 8 changed files, unless applying the same change type across files (e.g., rename/deprecation).

## Commits — Message

- The message is the public face of the change. Explain for a non-technical reader why this commit is needed and its purpose.
- Use the Jira task title as the first commit name. If it’s an internal task or not in the format below, follow the format.
- If the commit is not related to a Jira task, create one with a description of the change.

## PR Types

- New: A fresh feature for users.
- Tweak: A change that improves or changes the end user experience.
- Fix: A fix for a bug that affects the end user.
- Internal: Any modification that doesn’t impact the user.

## Commit message format

```
<Action>: <Component> - <User Story> [ED-<Jira ID>] (#<Related GitHub Issues>)
```

- Action: One of Internal, New, Tweak, Fix, Experiment, Revert, Deprecated.
- Component: The main component the change refers to (from Jira Component, without core/pro prefix).
- User Story: Short description from the end-user perspective.
  - For Fix: The story MUST describe the problem and why it’s needed, not the implementation details.
- Jira ID: The task ID, e.g., ED-1234.
- Related Issues: If there’s a GitHub issue, reference it (e.g., Fix #1234).

### Examples

- Fix: Panel - Category name is missing [ED-1234] (Fix #2345)
- New: Posts - An option to exclude displayed posts [ED-2345]
- Tweak: Elements Categories - Icons were moved to the `e-icon` font [ED-3456]
- Tweak: Utils - Deprecated methods: `do_action_deprecated` `apply_filters_deprecated` [ED-4567]

## Description

The commit description should expand the message for a technical reader. Communicate the technical problem and why it’s needed, not a detailed list of what is included.

## Pull Requests

- A PR should include one commit by default that covers one task.
- If a PR must handle different actions (like infra + fix), separate them into individual commits.
- A PR should include tests that cover the changes included in the PR.
