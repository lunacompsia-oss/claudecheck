# claudecheck

Lint and validate your `CLAUDE.md` — catch mistakes before Claude Code does.

Zero dependencies. Works as CLI, npm package, or GitHub Action.

## Why

A bad `CLAUDE.md` means Claude Code works with wrong context — placeholder text, leaked secrets, empty sections, broken heading structure. `claudecheck` catches these in seconds.

## Quick Start

```bash
npx claudecheck
```

That's it. Finds and checks your `CLAUDE.md` automatically.

## What It Checks

| Rule | Severity | What |
|------|----------|------|
| `file-not-empty` | error | File exists and has content |
| `has-title` | error | Has a top-level `# Heading` |
| `no-placeholders` | error | No `[Project Name]`, `[TODO]`, etc. |
| `no-secrets` | error | No API keys, tokens, or credentials |
| `has-sections` | warning | Multiple `##` sections present |
| `heading-hierarchy` | warning | No skipped heading levels (h2 -> h4) |
| `no-empty-sections` | warning | Every section has content |
| `min-length` | warning | File is substantial (500+ chars) |
| `has-actionable-content` | info | Contains rules, conventions, or examples |
| `max-length` | info | Not too large (under 50K chars) |
| `consistent-list-style` | info | Consistent `-` or `*` markers |
| `no-bare-urls` | info | URLs use markdown link syntax |

## GitHub Action

Add to `.github/workflows/claudecheck.yml`:

```yaml
name: CLAUDE.md Check
on: [push, pull_request]

jobs:
  claudecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: lunacompsia-oss/claudecheck@v1
```

### Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `path` | `.` | Path to CLAUDE.md or directory containing it |
| `fail-on-warning` | `true` | Also fail on warnings (not just errors) |

### Outputs

| Output | Description |
|--------|-------------|
| `errors` | Number of errors found |
| `warnings` | Number of warnings found |
| `passed` | `true` if all checks passed |

## CLI Options

```bash
claudecheck                    # Lint CLAUDE.md in current project
claudecheck ./my-project       # Lint specific directory
claudecheck ./CLAUDE.md        # Lint specific file
claudecheck --json             # JSON output (for CI/tooling)
claudecheck --help             # Show help
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All checks passed |
| 1 | Errors or warnings found |
| 2 | File not found |

## Programmatic API

```js
const { lint } = require("claudecheck");

const content = fs.readFileSync("CLAUDE.md", "utf-8");
const { results, summary } = lint(content);

console.log(summary);
// { errors: 0, warnings: 1, info: 0, passed: 11, total: 12 }
```

## License

MIT
