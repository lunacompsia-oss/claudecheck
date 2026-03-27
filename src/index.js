"use strict";

const { rules } = require("./rules");

/**
 * Parse markdown headings from lines.
 * Returns array of { level, text, line }
 */
function parseHeadings(lines) {
  const headings = [];
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    if (/^```/.test(lines[i])) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = lines[i].match(/^(#{1,6})\s+(.+)/);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
        line: i + 1,
      });
    }
  }

  return headings;
}

/**
 * Run all rules against CLAUDE.md content.
 * @param {string} content - Raw file content
 * @param {object} options - { rules?: string[] } to filter specific rules
 * @returns {{ results: Array<{id, severity, passed, message?, line?}>, summary: {errors, warnings, info, passed} }}
 */
function lint(content, options = {}) {
  const lines = content.split("\n");
  const headings = parseHeadings(lines);

  const activeRules = options.rules
    ? rules.filter((r) => options.rules.includes(r.id))
    : rules;

  const results = [];

  for (const rule of activeRules) {
    try {
      const result = rule.check(content, lines, headings);
      results.push({
        id: rule.id,
        severity: rule.severity,
        passed: result.passed,
        message: result.message || null,
        line: result.line || null,
      });
    } catch (err) {
      results.push({
        id: rule.id,
        severity: rule.severity,
        passed: false,
        message: `Rule crashed: ${err.message}`,
        line: null,
      });
    }
  }

  const summary = {
    errors: results.filter((r) => !r.passed && r.severity === "error").length,
    warnings: results.filter((r) => !r.passed && r.severity === "warning").length,
    info: results.filter((r) => !r.passed && r.severity === "info").length,
    passed: results.filter((r) => r.passed).length,
    total: results.length,
  };

  return { results, summary };
}

module.exports = { lint, parseHeadings, rules };
