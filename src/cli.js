#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { lint } = require("./index");

const SEVERITY_ICONS = {
  error: "\x1b[31m\u2716\x1b[0m",   // red ✖
  warning: "\x1b[33m\u26a0\x1b[0m",  // yellow ⚠
  info: "\x1b[36m\u2139\x1b[0m",     // cyan ℹ
};

const SEVERITY_LABELS = {
  error: "\x1b[31merror\x1b[0m",
  warning: "\x1b[33mwarning\x1b[0m",
  info: "\x1b[36minfo\x1b[0m",
};

function findClaudeMd(startDir) {
  let dir = startDir;
  while (true) {
    const candidate = path.join(dir, "CLAUDE.md");
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function printUsage() {
  console.log(`
\x1b[1mclaudecheck\x1b[0m — Lint and validate your CLAUDE.md

\x1b[1mUsage:\x1b[0m
  claudecheck [path]         Lint CLAUDE.md (default: searches up from cwd)
  claudecheck --json [path]  Output results as JSON
  claudecheck --help         Show this help
  claudecheck --version      Show version

\x1b[1mExamples:\x1b[0m
  npx claudecheck                    # Lint CLAUDE.md in current project
  npx claudecheck ./my-project       # Lint specific directory
  npx claudecheck ./CLAUDE.md        # Lint specific file

\x1b[1mExit codes:\x1b[0m
  0  All checks passed (or only info-level issues)
  1  Errors or warnings found
  2  File not found or read error
`);
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  if (args.includes("--version") || args.includes("-v")) {
    const pkg = require("../package.json");
    console.log(pkg.version);
    process.exit(0);
  }

  const jsonMode = args.includes("--json");
  const positional = args.filter((a) => !a.startsWith("-"));

  let filePath;

  if (positional.length > 0) {
    const target = path.resolve(positional[0]);
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
      filePath = path.join(target, "CLAUDE.md");
    } else {
      filePath = target;
    }
  } else {
    filePath = findClaudeMd(process.cwd());
  }

  if (!filePath || !fs.existsSync(filePath)) {
    if (jsonMode) {
      console.log(JSON.stringify({ error: "CLAUDE.md not found", path: filePath }, null, 2));
    } else {
      console.error("\x1b[31mError:\x1b[0m CLAUDE.md not found.");
      console.error("Run this command from a directory with a CLAUDE.md file, or specify the path:");
      console.error("  claudecheck ./path/to/CLAUDE.md");
    }
    process.exit(2);
  }

  let content;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch (err) {
    console.error(`\x1b[31mError:\x1b[0m Could not read ${filePath}: ${err.message}`);
    process.exit(2);
  }

  const { results, summary } = lint(content);

  if (jsonMode) {
    console.log(JSON.stringify({ file: filePath, results, summary }, null, 2));
    process.exit(summary.errors > 0 || summary.warnings > 0 ? 1 : 0);
    return;
  }

  // Pretty output
  const relPath = path.relative(process.cwd(), filePath);
  console.log(`\n\x1b[1m  claudecheck\x1b[0m  ${relPath}\n`);

  const failures = results.filter((r) => !r.passed);
  const passes = results.filter((r) => r.passed);

  if (failures.length === 0) {
    console.log(`  \x1b[32m\u2714\x1b[0m  All ${summary.total} checks passed!\n`);
    process.exit(0);
    return;
  }

  for (const r of failures) {
    const loc = r.line ? `\x1b[2m:${r.line}\x1b[0m` : "";
    console.log(`  ${SEVERITY_ICONS[r.severity]}  ${SEVERITY_LABELS[r.severity]}  ${r.message}  \x1b[2m(${r.id}${loc})\x1b[0m`);
  }

  if (passes.length > 0) {
    console.log(`\n  \x1b[32m\u2714\x1b[0m  ${passes.length} check${passes.length === 1 ? "" : "s"} passed`);
  }

  console.log(
    `\n  \x1b[1mSummary:\x1b[0m ${summary.errors} error${summary.errors === 1 ? "" : "s"}, ${summary.warnings} warning${summary.warnings === 1 ? "" : "s"}, ${summary.info} info\n`
  );

  process.exit(summary.errors > 0 || summary.warnings > 0 ? 1 : 0);
}

main();
