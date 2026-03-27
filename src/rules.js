"use strict";

/**
 * Each rule: { id, severity, check(content, lines, headings) => { passed, message, line? } }
 * severity: "error" | "warning" | "info"
 */

const PLACEHOLDER_PATTERNS = [
  /\[Project Name\]/i,
  /\[Language\]/i,
  /\[Framework\]/i,
  /\[Your .+?\]/i,
  /\[TODO\]/i,
  /\[PLACEHOLDER\]/i,
  /\[INSERT .+?\]/i,
  /\[CHANGE THIS\]/i,
  /\[FILL IN\]/i,
];

const SECRET_PATTERNS = [
  { pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"][A-Za-z0-9_\-]{20,}['"]/i, name: "API key" },
  { pattern: /(?:secret|token|password|passwd)\s*[:=]\s*['"][A-Za-z0-9_\-]{8,}['"]/i, name: "secret/token" },
  { pattern: /sk-[A-Za-z0-9]{20,}/, name: "OpenAI/Anthropic key" },
  { pattern: /ghp_[A-Za-z0-9]{36,}/, name: "GitHub PAT" },
  { pattern: /(?:AKIA|ASIA)[A-Z0-9]{16}/, name: "AWS access key" },
  { pattern: /xox[bpsa]-[A-Za-z0-9\-]+/, name: "Slack token" },
];

const rules = [
  {
    id: "file-not-empty",
    severity: "error",
    check(content) {
      const trimmed = content.trim();
      if (trimmed.length === 0) {
        return { passed: false, message: "CLAUDE.md is empty" };
      }
      return { passed: true };
    },
  },

  {
    id: "has-title",
    severity: "error",
    check(content, lines) {
      const titleLine = lines.find((l) => /^# .+/.test(l));
      if (!titleLine) {
        return { passed: false, message: "Missing top-level heading (# Title)", line: 1 };
      }
      return { passed: true };
    },
  },

  {
    id: "min-length",
    severity: "warning",
    check(content) {
      if (content.length < 200) {
        return {
          passed: false,
          message: `CLAUDE.md is very short (${content.length} chars). A useful CLAUDE.md typically has 500+ characters with project context, conventions, and guidelines.`,
        };
      }
      return { passed: true };
    },
  },

  {
    id: "has-sections",
    severity: "warning",
    check(content, lines, headings) {
      if (headings.length < 2) {
        return {
          passed: false,
          message: "Only 1 section found. Good CLAUDE.md files have multiple sections (## Tech Stack, ## Code Style, etc.).",
        };
      }
      return { passed: true };
    },
  },

  {
    id: "no-placeholders",
    severity: "error",
    check(content, lines) {
      for (let i = 0; i < lines.length; i++) {
        for (const pattern of PLACEHOLDER_PATTERNS) {
          const match = lines[i].match(pattern);
          if (match) {
            return {
              passed: false,
              message: `Placeholder text found: "${match[0]}". Replace with actual project details.`,
              line: i + 1,
            };
          }
        }
      }
      return { passed: true };
    },
  },

  {
    id: "no-secrets",
    severity: "error",
    check(content, lines) {
      for (let i = 0; i < lines.length; i++) {
        // Skip fenced code blocks that are clearly examples
        if (/^```/.test(lines[i])) continue;

        for (const { pattern, name } of SECRET_PATTERNS) {
          if (pattern.test(lines[i])) {
            return {
              passed: false,
              message: `Possible ${name} detected. Never put credentials in CLAUDE.md — use environment variables.`,
              line: i + 1,
            };
          }
        }
      }
      return { passed: true };
    },
  },

  {
    id: "heading-hierarchy",
    severity: "warning",
    check(content, lines) {
      let prevLevel = 0;
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/^(#{1,6})\s/);
        if (match) {
          const level = match[1].length;
          if (prevLevel > 0 && level > prevLevel + 1) {
            return {
              passed: false,
              message: `Heading level jumps from h${prevLevel} to h${level}. Use sequential levels (h${prevLevel} → h${prevLevel + 1}).`,
              line: i + 1,
            };
          }
          prevLevel = level;
        }
      }
      return { passed: true };
    },
  },

  {
    id: "no-empty-sections",
    severity: "warning",
    check(content, lines) {
      for (let i = 0; i < lines.length; i++) {
        const headingMatch = lines[i].match(/^(#{1,6})\s/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          // Skip h1 title — it's normal for it to be followed directly by h2
          if (level === 1) continue;

          // Check if next non-empty line is another heading or end of file
          let j = i + 1;
          while (j < lines.length && lines[j].trim() === "") j++;
          if (j >= lines.length || /^#{1,6}\s/.test(lines[j])) {
            const heading = lines[i].replace(/^#+\s*/, "");
            return {
              passed: false,
              message: `Empty section: "${heading}". Add content or remove the heading.`,
              line: i + 1,
            };
          }
        }
      }
      return { passed: true };
    },
  },

  {
    id: "has-actionable-content",
    severity: "info",
    check(content) {
      // Check for imperative verbs, rules, or guidelines
      const actionPatterns = [
        /\b(?:always|never|must|should|prefer|avoid|use|do not|don't)\b/i,
        /```/, // code blocks
        /^\s*[-*]\s/m, // bullet lists
      ];
      const hasActionable = actionPatterns.some((p) => p.test(content));
      if (!hasActionable) {
        return {
          passed: false,
          message:
            "No actionable guidelines found. Good CLAUDE.md files contain rules, conventions, or code examples that guide AI behavior.",
        };
      }
      return { passed: true };
    },
  },

  {
    id: "max-length",
    severity: "info",
    check(content) {
      const chars = content.length;
      if (chars > 50000) {
        return {
          passed: false,
          message: `CLAUDE.md is very large (${Math.round(chars / 1000)}K chars). Consider splitting into sub-files to stay within context limits.`,
        };
      }
      return { passed: true };
    },
  },

  {
    id: "consistent-list-style",
    severity: "info",
    check(content, lines) {
      let dashCount = 0;
      let starCount = 0;
      for (const line of lines) {
        if (/^\s*-\s/.test(line)) dashCount++;
        if (/^\s*\*\s/.test(line)) starCount++;
      }
      if (dashCount > 0 && starCount > 0) {
        return {
          passed: false,
          message: `Mixed list markers: ${dashCount} dash (-) and ${starCount} asterisk (*). Pick one style for consistency.`,
        };
      }
      return { passed: true };
    },
  },

  {
    id: "no-bare-urls",
    severity: "info",
    check(content, lines) {
      for (let i = 0; i < lines.length; i++) {
        // Skip code blocks
        if (/^```/.test(lines[i])) continue;
        // Match URLs not inside markdown links or code
        if (/(?<!\(|`)https?:\/\/[^\s)]+(?!\)|`)/.test(lines[i]) && !/\[.+?\]\(https?:\/\//.test(lines[i])) {
          // Only flag if the line ONLY has bare URLs (not in tables or mixed context)
          const stripped = lines[i].replace(/\[.+?\]\(https?:\/\/[^\s)]+\)/g, "");
          if (/(?<!\||`|<)https?:\/\/\S+/.test(stripped)) {
            return {
              passed: false,
              message: "Bare URL found. Use markdown links [text](url) for better readability.",
              line: i + 1,
            };
          }
        }
      }
      return { passed: true };
    },
  },
];

module.exports = { rules };
