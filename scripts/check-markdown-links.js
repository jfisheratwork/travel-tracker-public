#!/usr/bin/env node

/**
 * Validates that all Markdown links across repository documents are project-relative
 * and do not use machine-relative schemes or paths (e.g. file:///, /Users/, /home/).
 *
 * Enforces AGENTS.md Rule 2: Attribution, Code & Documentation Hygiene.
 */

const fs = require('fs');
const path = require('path');

const IGNORED_DIRS = new Set(['.git', 'node_modules', '.angular', 'dist', '.vscode']);
const MARKDOWN_LINK_REGEX =
  /\[[^\]]*\]\(((?:file:\/\/\/|\/(?:Users|home)\/|[A-Za-z]:[\\/](?:Users|home)\/)[^)]*)\)/g;
const HTML_HREF_REGEX =
  /<a\s+[^>]*href=["']((?:file:\/\/\/|\/(?:Users|home)\/|[A-Za-z]:[\\/](?:Users|home)\/)[^"']*)["']/gi;

const violations = [];
let scannedCount = 0;

function scanDirectory(currentDir) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.txt'))) {
      scannedCount++;
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        const lineNum = index + 1;

        // Skip rule definition itself in AGENTS.md and coding.md
        if (
          (entry.name === 'AGENTS.md' || entry.name === 'coding.md') &&
          line.includes(
            'All Markdown links to repository files and documentation must be project-relative',
          )
        ) {
          return;
        }

        let match;
        MARKDOWN_LINK_REGEX.lastIndex = 0;
        while ((match = MARKDOWN_LINK_REGEX.exec(line)) !== null) {
          violations.push({
            file: fullPath,
            line: lineNum,
            link: match[1],
            type: 'Markdown link',
          });
        }

        HTML_HREF_REGEX.lastIndex = 0;
        while ((match = HTML_HREF_REGEX.exec(line)) !== null) {
          violations.push({
            file: fullPath,
            line: lineNum,
            link: match[1],
            type: 'HTML href',
          });
        }
      });
    }
  }
}

scanDirectory('.');

if (violations.length > 0) {
  console.error(`\n❌ Found ${violations.length} machine-relative link(s) in Markdown files:`);
  violations.forEach((v) => {
    console.error(`  ${v.file}:${v.line} [${v.type}] -> ${v.link}`);
  });
  console.error(
    '\nFix all links to be project-relative (e.g. [architecture.md](architecture.md)).\n',
  );
  process.exit(1);
} else {
  console.log(`✔ Verified ${scannedCount} Markdown/text files: all links are project-relative.`);
  process.exit(0);
}
