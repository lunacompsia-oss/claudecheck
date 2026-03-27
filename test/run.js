"use strict";

const { lint } = require("../src/index");

let passed = 0;
let failed = 0;

function assert(name, condition) {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m\u2714\x1b[0m ${name}`);
  } else {
    failed++;
    console.log(`  \x1b[31m\u2716\x1b[0m ${name}`);
  }
}

function test(name, fn) {
  console.log(`\n\x1b[1m${name}\x1b[0m`);
  fn();
}

// --- Tests ---

test("empty file", () => {
  const { summary } = lint("");
  assert("reports error", summary.errors >= 1);
});

test("minimal valid file", () => {
  const content = `# My Project

## Tech Stack
- Node.js 20
- TypeScript 5

## Code Style
- Always use strict mode
- Prefer const over let
- Never use any type
`;
  const { summary } = lint(content);
  assert("no errors", summary.errors === 0);
});

test("placeholder detection", () => {
  const content = `# [Project Name]

## Overview
This is [Your Project] description.
`;
  const { results } = lint(content);
  const placeholderRule = results.find((r) => r.id === "no-placeholders");
  assert("finds placeholder", !placeholderRule.passed);
});

test("secret detection", () => {
  const content = `# My Project

## Setup
api_key: 'sk-1234567890abcdefghijklmnop'
`;
  const { results } = lint(content);
  const secretRule = results.find((r) => r.id === "no-secrets");
  assert("finds secret", !secretRule.passed);
});

test("heading hierarchy", () => {
  const content = `# My Project

#### Skipped Levels

Some content here.
`;
  const { results } = lint(content);
  const hierarchyRule = results.find((r) => r.id === "heading-hierarchy");
  assert("detects skip", !hierarchyRule.passed);
});

test("empty sections", () => {
  const content = `# My Project

## Tech Stack

## Code Style

Some actual content here.
`;
  const { results } = lint(content);
  const emptyRule = results.find((r) => r.id === "no-empty-sections");
  assert("detects empty section", !emptyRule.passed);
});

test("too short", () => {
  const content = `# My Project

Short.
`;
  const { results } = lint(content);
  const lengthRule = results.find((r) => r.id === "min-length");
  assert("warns about length", !lengthRule.passed);
});

test("well-structured file", () => {
  const content = `# My Awesome Project

## Overview
A web application for managing tasks with real-time collaboration.

## Tech Stack
- **Frontend:** React 18 + TypeScript 5
- **Backend:** Node.js 20 + Express 4
- **Database:** PostgreSQL 16
- **Cache:** Redis 7

## File Structure
- \`src/\` — source code
- \`test/\` — test files
- \`docs/\` — documentation

## Code Style
- Always use TypeScript strict mode
- Prefer functional components with hooks
- Never use \`any\` type — use \`unknown\` and narrow
- Use early returns to reduce nesting

## Testing
- Use Jest for unit tests
- Use Playwright for e2e tests
- Always mock external APIs

## Common Pitfalls
- Do not import from \`src/internal\` — use the public API
- Avoid circular dependencies between modules
`;
  const { summary } = lint(content);
  assert("no errors", summary.errors === 0);
  assert("no warnings", summary.warnings === 0);
});

test("code blocks are ignored for secrets", () => {
  const content = `# Config Example

## Setup

\`\`\`bash
export API_KEY="your-key-here"
\`\`\`

Use environment variables. Never hardcode secrets.
`;
  const { results } = lint(content);
  const secretRule = results.find((r) => r.id === "no-secrets");
  assert("no false positive in code block", secretRule.passed);
});

// --- Summary ---
console.log(`\n\x1b[1mResults:\x1b[0m ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
