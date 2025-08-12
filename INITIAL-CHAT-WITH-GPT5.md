I would like to create a code review MCP that can connect to our GitHub PRs, which I can add guidelines to about clean code etc, which I can operate inside Cursor, and which push the feedback as GitHub comments.

I want to send the PR link to it, and it should be able to review the difference.


ChatGPT said:

Thought for 15s
Nice — this is a great project. Below I’ll give a practical plan, trade-offs, and a small working prototype you can try right away (Node.js + Octokit). I’ll also show how to trigger it from Cursor and explain recommended production details (GitHub App, Checks API, running linters vs. LLM checks, etc.).

Short architecture (what I’ll assume)
A small service (your code-review MCP) that accepts a PR URL (or receives GitHub webhooks).

The service fetches the PR diff (or checks out the branch) and runs one or more analyzers: linters, static analyzers, and optionally an LLM-based guideline checker that you configure.

The service posts feedback back to GitHub as inline PR comments or as a Check Run with annotations.

You operate it from Cursor by either calling a REST endpoint (curl) or using a tiny CLI the MCP exposes (so you paste the PR link in Cursor and run the command).

Key implementation choices & tradeoffs
Authentication: use a GitHub App for production (installation tokens, checks:write and pull_requests:write). Easier and safer than a PAT. GitHub Apps are also needed to create Check Runs. 
GitHub Docs
+1

Where to run analysis:

Quick mode: analyze only the PR patch (no repo checkout). Faster, but limited — good for style/regex rules and many LLM checks.

Deep mode: git clone the PR head ref and run full linters / test tooling (ESLint, Psalm, PHPMD, etc.). Necessary for type-based checks and complex static analysis.

Where to post feedback:

Pull Request Reviews (in-line comments) using the PR Reviews API — immediate, threaded like a human reviewer. Good for a few targeted suggestions. 
GitHub Docs
+1

Checks API (Check Runs + annotations) — better for many automated findings and CI-style reporting; annotations show in “Files changed” and the Checks tab. Note: annotations per request are limited (50), so batch or update the check run repeatedly if you have lots of findings. 
GitHub Docs
+1

Where your guidelines fit
Store rules/guidelines as structured config (YAML/JSON). Examples:

Regex/style rules → run against diff and map to file + position.

Linter configs → run the linter and convert results to GitHub comments.

LLM prompt templates → pass file patch + your guidelines to an LLM to produce human-like suggestions. Keep a provenance field in comments like <!-- mcp:rule-id=... --> so you can update/resolve later.

Minimal prototype (Node.js) — accepts a PR link and posts one review comment per finding
This is a lean prototype to demonstrate the flow. It uses a personal access token (for quick testing). For production replace with a GitHub App flow.

js
Copy
Edit
// file: review-trigger.js
// run: node review-trigger.js "<pull_request_url>"
import { Octokit } from "@octokit/rest";
import fetch from "node-fetch";

const token = process.env.GH_TOKEN; // for prototype only
if (!token) throw new Error("Set GH_TOKEN env var");

const octokit = new Octokit({ auth: token });

function parsePrUrl(url) {
  // e.g. https://github.com/owner/repo/pull/123
  const m = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
  if (!m) throw new Error("Invalid PR url");
  return { owner: m[1], repo: m[2], pull_number: Number(m[3]) };
}

async function run(prUrl) {
  const { owner, repo, pull_number } = parsePrUrl(prUrl);

  // 1) fetch files changed and their patches
  const files = await octokit.rest.pulls.listFiles({
    owner, repo, pull_number, per_page: 100
  });

  // Example quick "rule": flag TODO comments in added lines of the patch
  const comments = [];
  for (const f of files.data) {
    const patch = f.patch || "";
    const path = f.filename;

    // simple parse: look at patch lines starting with '+'
    const lines = patch.split("\n");
    let position = 0; // GitHub expects `position` = diff position (best effort)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('+')) {
        position += 1; // naive; in production use the 'position' field from files API
        if (line.includes("TODO")) {
          comments.push({
            path,
            // position within the diff. This prototype uses a naive counter.
            position,
            body: "Found `TODO` — please either resolve or add a ticket. (rule: todo-check)"
          });
        }
      } else if (line.startsWith('-')) {
        // removal line, do not increment position
      } else {
        position += 1;
      }
    }
  }

  if (comments.length === 0) {
    // post a single summary review
    await octokit.rest.pulls.createReview({
      owner, repo, pull_number,
      event: "COMMENT",
      body: "Quick code-review MCP: no issues found by quick rules."
    });
    console.log("No findings.");
    return;
  }

  // GitHub expects up to ~ a few hundred comments in createReview, but keep it reasonable
  await octokit.rest.pulls.createReview({
    owner, repo, pull_number,
    event: "REQUEST_CHANGES", // or 'COMMENT' or 'APPROVE'
    comments
  });

  console.log("Posted review with", comments.length, "comments.");
}

// CLI
const prUrl = process.argv[2];
if (!prUrl) {
  console.error("Usage: node review-trigger.js <pr-url>");
  process.exit(1);
}
run(prUrl).catch(err => { console.error(err); process.exit(1); });
Notes:

This is intentionally simple. The position calculation is tricky — the PR files API returns a patch string but also returns a changes object and sometimes a blob_url. For robust in-line comments use the position value from the files response (or run git checkout and calculate exact line numbers). See the API docs. 
actions-cool.github.io
GitHub Docs

Triggering from Cursor
Option A (quick): in Cursor’s terminal run node review-trigger.js https://github.com/org/repo/pull/123 (or a small bash script). Cursor is an IDE so it’s straightforward to run CLI tools. 
Cursor
Cursor

Option B (better): expose an HTTP endpoint /review?pr=... on your MCP; from Cursor make a curl call (or use Postman) to trigger a run:

bash
Copy
Edit
curl -X POST "https://mcp.yourdomain/review" -d '{"pr":"https://github.com/org/repo/pull/123"}' -H "Authorization: Bearer <token>" -H "Content-Type: application/json"
Option C (integrated): build a Cursor plugin/extension if Cursor exposes an official extension API (more work). Cursor does provide extension points and you can integrate via a CLI/webhook pattern. 
GitHub
help.aikido.dev

Advanced improvements (production)
Implement as a GitHub App. Use App JWT → installation tokens. Grants scoped permissions and supports Checks API. 
GitHub Docs

Use Checks API for many automated findings and to show CI-like annotations. Batch annotations (50 per request) and update the run multiple times if needed. 
GitHub Docs
+1

Support idempotency: detect existing MCP comments (use a unique signature in comment body HTML like <!-- mcp:rule=todo-check -->) and update or resolve instead of duplicating.

Support deep analysis: clone PR head and run language-specific tools (ESLint, rust-clippy, go vet, PHPStan, etc.). Map their output to comments/annotations.

Consider an LLM layer for "explainability": turn linter output into human-friendly suggestions. Keep an audit trail showing which suggestions are machine-generated.

Caveats / gotchas
Posting many inline comments can overwhelm a PR. Use checks for bulk output and add a few high-value inline comments.

Calculating the correct position for an inline comment is subtle — either rely on the position field from the pulls.listFiles() response (when present) or compute diff-to-file mapping by checking out the commit. See the Pull Request comments API docs. 
actions-cool.github.io
GitHub Docs

Useful docs I used while writing this (so you can read deeper)
GitHub Pull Request Reviews API (create reviews/comments). 
GitHub Docs
+1

GitHub Checks API / annotations (best for CI-style output, 50 annotation limit). 
GitHub Docs
+1

Building CI checks with a GitHub App (tutorial + why use an App). 
GitHub Docs

Cursor / Cursor docs (how Cursor is positioned as an AI code editor — you can run commands or integrate). 
Cursor
Cursor

If you want, next I can:

Scaffold a full MCP repo (Node.js + Express + Octokit) with GitHub App auth, webhook handler, example linters, and the CLI endpoint for Cursor — fully working and ready to deploy.

Or I can adapt the prototype to your preferred language (Python, Go, or PHP) and show how to run full repo checkout + ESLint + post comments reliably.

Which do you prefer? Also: which languages/tools do your repos mainly use (JS/TS, PHP, Python, mixed)? That lets me tailor the scaffold.












Sources
You said:
I prefer to build the MCP with typescript.

I would like to deploy the MCP on localhost.

I want it to be a real application that can be deployed. I would like it to include a rules folder, that I can populate with .MD rule files.


ChatGPT said:
Got it ✅ — you basically want a TypeScript MCP server that:

Runs locally (localhost) for development, but could be deployed later.

Has a rules/ folder with .md files describing clean-code guidelines.

Accepts a GitHub PR link (via CLI or API call).

Fetches the PR diff and files.

Runs the content through both:

Static checks (regex, etc.).

LLM or heuristic checks based on the .md rules.

Posts results as inline PR review comments back to GitHub.

📦 Project Structure
pgsql
Copy
Edit
code-review-mcp/
│
├── src/
│   ├── index.ts           # Entry point / CLI + server
│   ├── github.ts          # GitHub API helpers (Octokit)
│   ├── review.ts          # PR analysis + comment posting
│   ├── rules-loader.ts    # Reads .md rules into memory
│   ├── analyzers/
│   │   ├── regex-check.ts # Example: regex-based rule matcher
│   │   └── llm-check.ts   # Example: GPT-based analysis
│   ├── types.ts           # Shared interfaces
│   └── config.ts          # Config loader (env, etc.)
│
├── rules/
│   ├── no-todo.md
│   ├── small-functions.md
│   └── avoid-magic-numbers.md
│
├── .env
├── package.json
├── tsconfig.json
└── README.md
🛠 Step-by-step Implementation
1. Install dependencies
bash
Copy
Edit
npm init -y
npm install typescript ts-node @octokit/rest dotenv gray-matter
npm install --save-dev @types/node
npx tsc --init
2. .env file
env
Copy
Edit
GITHUB_TOKEN=ghp_xxx...   # Personal Access Token for dev; replace with GitHub App later
3. src/types.ts
ts
Copy
Edit
export interface Rule {
  id: string;
  title: string;
  description: string;
}

export interface Finding {
  path: string;
  position: number;
  message: string;
  ruleId?: string;
}
4. src/rules-loader.ts
ts
Copy
Edit
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { Rule } from "./types";

export function loadRules(): Rule[] {
  const rulesDir = path.join(__dirname, "../rules");
  const files = fs.readdirSync(rulesDir).filter(f => f.endsWith(".md"));

  return files.map(file => {
    const raw = fs.readFileSync(path.join(rulesDir, file), "utf8");
    const { content, data } = matter(raw);
    return {
      id: path.basename(file, ".md"),
      title: data.title || path.basename(file, ".md"),
      description: content.trim()
    };
  });
}
This lets you write Markdown like:

md
Copy
Edit
---
title: Avoid TODO comments
---
Do not leave `TODO` comments in committed code.
5. src/github.ts
ts
Copy
Edit
import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";

dotenv.config();
const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error("Missing GITHUB_TOKEN in .env");

export const octokit = new Octokit({ auth: token });

export function parsePrUrl(url: string) {
  const m = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
  if (!m) throw new Error("Invalid PR url");
  return { owner: m[1], repo: m[2], pull_number: Number(m[3]) };
}
6. src/analyzers/regex-check.ts
ts
Copy
Edit
import { Finding } from "../types";

// Simple example: look for TODOs
export function checkTodos(filePath: string, patch: string): Finding[] {
  const findings: Finding[] = [];
  const lines = patch.split("\n");
  let position = 0;

  for (let line of lines) {
    if (line.startsWith("+")) {
      position++;
      if (/TODO/i.test(line)) {
        findings.push({
          path: filePath,
          position,
          message: "Found TODO comment — please remove or resolve.",
          ruleId: "no-todo"
        });
      }
    } else if (!line.startsWith("-")) {
      position++;
    }
  }

  return findings;
}
7. src/review.ts
ts
Copy
Edit
import { octokit, parsePrUrl } from "./github";
import { Finding } from "./types";
import { checkTodos } from "./analyzers/regex-check";

export async function reviewPr(prUrl: string) {
  const { owner, repo, pull_number } = parsePrUrl(prUrl);
  const files = await octokit.rest.pulls.listFiles({
    owner, repo, pull_number, per_page: 100
  });

  const findings: Finding[] = [];

  for (const f of files.data) {
    if (!f.patch) continue;
    findings.push(...checkTodos(f.filename, f.patch));
  }

  if (findings.length === 0) {
    await octokit.rest.pulls.createReview({
      owner, repo, pull_number,
      event: "COMMENT",
      body: "No issues found by MCP automated rules."
    });
    return;
  }

  await octokit.rest.pulls.createReview({
    owner, repo, pull_number,
    event: "REQUEST_CHANGES",
    comments: findings.map(f => ({
      path: f.path,
      position: f.position,
      body: `${f.message} _(rule: ${f.ruleId})_`
    }))
  });
}
8. src/index.ts
ts
Copy
Edit
#!/usr/bin/env ts-node
import { reviewPr } from "./review";

const prUrl = process.argv[2];
if (!prUrl) {
  console.error("Usage: ts-node src/index.ts <PR_URL>");
  process.exit(1);
}

reviewPr(prUrl)
  .then(() => console.log("Review posted."))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
Make it executable:

bash
Copy
Edit
chmod +x src/index.ts
9. Running locally
bash
Copy
Edit
# Install deps
npm install
# Run review
ts-node src/index.ts https://github.com/owner/repo/pull/123
10. Next steps
Add LLM analysis: load .md rules, feed them + patch into GPT via OpenAI API, parse suggestions into Finding[].

Add configurable rule mapping: map .md filenames to analyzer functions.

Expose a localhost HTTP API so Cursor can call it:

ts
Copy
Edit
import express from "express";
const app = express();
app.use(express.json());

app.post("/review", async (req, res) => {
  try {
    await reviewPr(req.body.pr);
    res.send({ status: "ok" });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.listen(3000, () => console.log("MCP listening on http://localhost:3000"));
If you want, I can now extend this into a full deployable MCP server with:

HTTP API + CLI

Dynamic .md rule parsing with LLM integration

Proper GitHub App authentication for posting comments

Do you want me to make that full version?
It would be basically “drop in, run npm start, and review PRs” locally.








You said:
We can exclude linting checks etc, because that is done on the CI already.


ChatGPT said:
Perfect — that makes the MCP much simpler.
We can skip all the ESLint/PHPStan/etc. and focus only on guideline-based analysis coming from your .md files.

That means the workflow is:

Load all .md rules from rules/ folder.

For each file change in the PR, grab the added lines (+) from the diff.

Send those lines + relevant rules to an LLM for review.

Parse the LLM output into inline GitHub comments.

Post them back to the PR as a review.

Updated structure
bash
Copy
Edit
code-review-mcp/
│
├── src/
│   ├── index.ts           # CLI & HTTP entry
│   ├── github.ts          # GitHub API helper
│   ├── review.ts          # Orchestrates review flow
│   ├── rules-loader.ts    # Reads .md rule files
│   ├── llm-check.ts       # Sends diff+rules to LLM
│   ├── types.ts
│   └── config.ts
│
├── rules/                 # Only .md guidelines, human-written
│   ├── avoid-todo.md
│   ├── clear-naming.md
│   └── ...
1. src/rules-loader.ts
ts
Copy
Edit
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { Rule } from "./types";

export function loadRules(): Rule[] {
  const rulesDir = path.join(__dirname, "../rules");
  const files = fs.readdirSync(rulesDir).filter(f => f.endsWith(".md"));

  return files.map(file => {
    const raw = fs.readFileSync(path.join(rulesDir, file), "utf8");
    const { content, data } = matter(raw);
    return {
      id: path.basename(file, ".md"),
      title: data.title || path.basename(file, ".md"),
      description: content.trim()
    };
  });
}
2. src/llm-check.ts
Here we take:

The added lines

All .md rules

Ask the LLM for suggestions

ts
Copy
Edit
import OpenAI from "openai";
import { Rule, Finding } from "./types";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function runLLMCheck(
  filePath: string,
  addedLines: string[],
  rules: Rule[]
): Promise<Finding[]> {
  const systemPrompt = `You are a code review assistant. Review the code diff according to the provided coding guidelines.
Respond with JSON array of objects: [{ "message": "...", "line": <1-based position> }]`;

  const userPrompt = `
Guidelines:
${rules.map(r => `- ${r.title}: ${r.description}`).join("\n")}

File: ${filePath}
Added lines:
${addedLines.join("\n")}
`;

  const resp = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  });

  try {
    const text = resp.choices[0].message?.content || "[]";
    const parsed = JSON.parse(text);
    return parsed.map((p: any) => ({
      path: filePath,
      position: p.line,
      message: p.message
    }));
  } catch {
    return [];
  }
}
3. src/review.ts
ts
Copy
Edit
import { octokit, parsePrUrl } from "./github";
import { loadRules } from "./rules-loader";
import { runLLMCheck } from "./llm-check";
import { Finding } from "./types";

export async function reviewPr(prUrl: string) {
  const { owner, repo, pull_number } = parsePrUrl(prUrl);
  const files = await octokit.rest.pulls.listFiles({
    owner, repo, pull_number, per_page: 100
  });

  const rules = loadRules();
  const findings: Finding[] = [];

  for (const f of files.data) {
    if (!f.patch) continue;

    const addedLines = f.patch
      .split("\n")
      .filter(line => line.startsWith("+") && !line.startsWith("+++"))
      .map(line => line.slice(1));

    if (addedLines.length > 0) {
      const llmFindings = await runLLMCheck(f.filename, addedLines, rules);
      findings.push(...llmFindings);
    }
  }

  if (findings.length === 0) {
    await octokit.rest.pulls.createReview({
      owner, repo, pull_number,
      event: "COMMENT",
      body: "No issues found by guideline checks."
    });
    return;
  }

  await octokit.rest.pulls.createReview({
    owner, repo, pull_number,
    event: "REQUEST_CHANGES",
    comments: findings.map(f => ({
      path: f.path,
      position: f.position,
      body: f.message
    }))
  });
}
4. src/index.ts
ts
Copy
Edit
#!/usr/bin/env ts-node
import { reviewPr } from "./review";

const prUrl = process.argv[2];
if (!prUrl) {
  console.error("Usage: ts-node src/index.ts <PR_URL>");
  process.exit(1);
}

reviewPr(prUrl)
  .then(() => console.log("Review posted."))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
5. How you’d use it locally
bash
Copy
Edit
export GITHUB_TOKEN=ghp_xxx
export OPENAI_API_KEY=sk-xxx
ts-node src/index.ts https://github.com/org/repo/pull/123
6. How this fits with Cursor
Keep MCP running locally as an HTTP service (express).

In Cursor, paste PR link into a command palette script that does curl http://localhost:3000/review -d '{"pr":"..."}'.

MCP reviews only the added lines in the PR against your .md rules.

No linting duplication — only guideline/clean-code style checks.

If you want, I can now:

Add the Express HTTP layer so Cursor can talk to it directly

Include a full starter repo with rules folder, .env example, and working scripts

Make the LLM check output inline PR comments with correct GitHub diff positions

Do you want me to go ahead and build that HTTP + starter repo version? That would make it fully deployable.