#!/usr/bin/env node
/**
 * Skill and Agent Safety Scanner
 * Performs offline, zero-dependency static analysis on .agents and SKILL.md files.
 *
 * Node.js File System Documentation: https://nodejs.org/api/fs.html
 * Node.js Path Documentation: https://nodejs.org/api/path.html
 */
const fs = require('node:fs');
const path = require('node:path');

class SkillSafetyScanner {
  static INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
    /disregard\s+(all\s+)?(previous|prior|system)\s+instructions/i,
    /bypass\s+(all\s+)?(system|safety|security)\s+rules/i,
    /system\s+prompt\s+override/i,
    /you\s+are\s+now\s+in\s+developer\s+mode/i,
    /jailbreak/i,
  ];

  static EXFILTRATION_PATTERNS = [
    /curl\s+[^|\n]*(-d|--data|--data-raw)\s+[^|\n]*(https?:\/\/|\$)/i,
    /wget\s+--post-(data|file)/i,
    /fetch\s*\(\s*['"`]https?:\/\/[^'"`]+\?[^'"`]*\+/i,
  ];

  static DESTRUCTIVE_PATTERNS = [
    /rm\s+-rf\s+(\/|~|\$HOME|\*)/i,
    /curl\s+[^|\n]+\|\s*(ba)?sh/i,
    /wget\s+[^|\n]+\|\s*(ba)?sh/i,
    /chmod\s+777/i,
    /\b(?:eval|exec)\s*\(\s*['"`]/i,
  ];

  static SECRET_PATTERNS = [
    /AKIA[0-9A-Z]{16}/,
    /ghp_[0-9a-zA-Z]{36}/,
    /github_pat_[0-9a-zA-Z_]{82}/,
    /-----BEGIN\s+(RSA|OPENSSH|EC|DSA)?\s*PRIVATE\s+KEY-----/,
  ];

  static STEALTH_UNICODE_PATTERN = /[\u200B-\u200D\uFEFF\u202A-\u202E\u2066-\u2069]/;

  /**
   * Scans content string and returns found security violations.
   * @param {string} content
   * @param {string} filePath
   * @returns {Array<{type: string, message: string, line: number}>}
   */
  static scanContent(content, filePath = 'unknown') {
    const violations = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      if (this.STEALTH_UNICODE_PATTERN.test(line)) {
        violations.push({
          type: 'STEALTH_UNICODE',
          message: 'Detected hidden zero-width or directional override Unicode character',
          line: lineNumber,
        });
      }

      const isRuleDefinitionOrSpec =
        filePath.includes('ast-grep-rules') || filePath.includes('SPEC-066');

      if (!isRuleDefinitionOrSpec) {
        for (const pattern of this.INJECTION_PATTERNS) {
          if (pattern.test(line)) {
            violations.push({
              type: 'PROMPT_INJECTION',
              message: `Potential prompt injection instruction: ${line.trim()}`,
              line: lineNumber,
            });
          }
        }
      }

      for (const pattern of this.EXFILTRATION_PATTERNS) {
        if (pattern.test(line)) {
          violations.push({
            type: 'DATA_EXFILTRATION',
            message: `Potential outbound data exfiltration command: ${line.trim()}`,
            line: lineNumber,
          });
        }
      }

      if (!isRuleDefinitionOrSpec) {
        for (const pattern of this.DESTRUCTIVE_PATTERNS) {
          if (pattern.test(line)) {
            violations.push({
              type: 'DESTRUCTIVE_SHELL',
              message: `Dangerous shell execution pattern: ${line.trim()}`,
              line: lineNumber,
            });
          }
        }
      }

      for (const pattern of this.SECRET_PATTERNS) {
        if (pattern.test(line)) {
          violations.push({
            type: 'SECRET_LEAK',
            message: 'Potential hardcoded API token or private key',
            line: lineNumber,
          });
        }
      }
    });

    if (filePath.endsWith('SKILL.md')) {
      this._validateFrontmatter(content, violations);
    }

    return violations;
  }

  static _validateFrontmatter(content, violations) {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      violations.push({
        type: 'INVALID_FRONTMATTER',
        message: 'SKILL.md is missing required YAML frontmatter (---)',
        line: 1,
      });
      return;
    }
    const frontmatter = frontmatterMatch[1];
    if (!/^name:\s*[a-zA-Z0-9_-]+/m.test(frontmatter)) {
      violations.push({
        type: 'INVALID_FRONTMATTER',
        message: "YAML frontmatter missing valid 'name' field",
        line: 1,
      });
    }
    if (!/^description:\s*.+/m.test(frontmatter)) {
      violations.push({
        type: 'INVALID_FRONTMATTER',
        message: "YAML frontmatter missing non-empty 'description' field",
        line: 1,
      });
    }
  }

  /**
   * Recursively collects files under target directories.
   * @param {string} dir
   * @returns {string[]}
   */
  static getFiles(dir) {
    if (!fs.existsSync(dir)) return [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git') {
          files.push(...this.getFiles(fullPath));
        }
      } else if (/\.(md|yaml|yml|json|sh)$/i.test(entry.name)) {
        files.push(fullPath);
      }
    }
    return files;
  }

  /**
   * Scans specified paths and outputs report.
   * @param {string[]} paths
   * @returns {{totalFiles: number, totalViolations: number, violations: Array<any>}}
   */
  static runScan(paths) {
    const allFiles = [];
    for (const targetPath of paths) {
      if (fs.existsSync(targetPath)) {
        const stat = fs.statSync(targetPath);
        if (stat.isDirectory()) {
          allFiles.push(...this.getFiles(targetPath));
        } else {
          allFiles.push(targetPath);
        }
      }
    }

    let totalViolations = 0;
    const allViolations = [];

    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const fileViolations = this.scanContent(content, file);
      if (fileViolations.length > 0) {
        totalViolations += fileViolations.length;
        allViolations.push({ file, violations: fileViolations });
      }
    }

    return {
      totalFiles: allFiles.length,
      totalViolations,
      violations: allViolations,
    };
  }
}

function printViolations(violationsList) {
  for (const item of violationsList) {
    process.stdout.write(`\n📄 ${item.file}:\n`);
    item.violations.forEach((violationItem) => {
      process.stdout.write(
        `   [Line ${violationItem.line}] ${violationItem.type}: ${violationItem.message}\n`,
      );
    });
  }
}

if (require.main === module) {
  const defaultTargets = ['.agents', 'specs'];
  const customTargets = process.argv.slice(2);
  const targets = customTargets.length > 0 ? customTargets : defaultTargets;

  const result = SkillSafetyScanner.runScan(targets);
  if (result.totalViolations > 0) {
    process.stdout.write(
      `❌ Skill Safety Scan failed with ${result.totalViolations} violation(s):\n`,
    );
    printViolations(result.violations);
    process.exit(1);
  } else {
    process.stdout.write(
      `✅ Skill Safety Scan passed across ${result.totalFiles} file(s). Zero risks detected.\n`,
    );
    process.exit(0);
  }
}

module.exports = { SkillSafetyScanner };
