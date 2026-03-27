"use strict";

const fs = require("fs");
const path = require("path");
const { lint } = require("./index");

// Lightweight GitHub Actions core replacement (zero dependencies)
const actions = {
  getInput(name) {
    const val = process.env[`INPUT_${name.replace(/-/g, "_").toUpperCase()}`];
    return val || "";
  },
  setOutput(name, value) {
    const filePath = process.env.GITHUB_OUTPUT;
    if (filePath) {
      fs.appendFileSync(filePath, `${name}=${value}\n`);
    }
  },
  setFailed(message) {
    console.log(`::error::${message}`);
    process.exitCode = 1;
  },
  warning(message, opts = {}) {
    const loc = opts.file ? `,file=${opts.file}` : "";
    const line = opts.startLine ? `,line=${opts.startLine}` : "";
    console.log(`::warning${loc}${line}::${message}`);
  },
  error(message, opts = {}) {
    const loc = opts.file ? `,file=${opts.file}` : "";
    const line = opts.startLine ? `,line=${opts.startLine}` : "";
    console.log(`::error${loc}${line}::${message}`);
  },
  notice(message, opts = {}) {
    const loc = opts.file ? `,file=${opts.file}` : "";
    const line = opts.startLine ? `,line=${opts.startLine}` : "";
    console.log(`::notice${loc}${line}::${message}`);
  },
};

function run() {
  const inputPath = actions.getInput("path") || ".";
  const failOnWarning = actions.getInput("fail-on-warning") !== "false";

  // Resolve CLAUDE.md path
  let filePath = path.resolve(inputPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "CLAUDE.md");
  }

  if (!fs.existsSync(filePath)) {
    actions.setOutput("errors", "1");
    actions.setOutput("warnings", "0");
    actions.setOutput("passed", "false");
    actions.setFailed(`CLAUDE.md not found at ${filePath}`);
    return;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const { results, summary } = lint(content);

  // Annotate failures
  const failures = results.filter((r) => !r.passed);
  for (const r of failures) {
    const opts = { file: path.relative(process.cwd(), filePath) };
    if (r.line) opts.startLine = r.line;

    const msg = `[${r.id}] ${r.message}`;
    if (r.severity === "error") actions.error(msg, opts);
    else if (r.severity === "warning") actions.warning(msg, opts);
    else actions.notice(msg, opts);
  }

  // Set outputs
  actions.setOutput("errors", String(summary.errors));
  actions.setOutput("warnings", String(summary.warnings));
  actions.setOutput("passed", String(summary.errors === 0 && (!failOnWarning || summary.warnings === 0)));

  // Summary
  const passedChecks = results.filter((r) => r.passed).length;
  console.log(`\nclaudecheck: ${passedChecks}/${summary.total} checks passed`);

  if (summary.errors > 0) {
    actions.setFailed(`${summary.errors} error(s) found in CLAUDE.md`);
  } else if (failOnWarning && summary.warnings > 0) {
    actions.setFailed(`${summary.warnings} warning(s) found in CLAUDE.md`);
  } else {
    console.log("CLAUDE.md looks good!");
  }
}

run();
