#!/usr/bin/env node
/**
 * Antigravity PostToolUse Quality Hook for Travel Tracker
 * Validates JS/TS syntax and ESLint rules, runs ast-grep structural rules,
 * and prompts UI verification when Angular components, templates, or styles are modified.
 *
 * Node.js File System Documentation: https://nodejs.org/api/fs.html
 * Node.js Child Process Documentation: https://nodejs.org/api/child_process.html
 */
const fs = require('node:fs');
const { execSync } = require('node:child_process');

function readInputPayload() {
  let inputData = '';
  try {
    inputData = fs.readFileSync(0, 'utf-8');
  } catch {
    return {};
  }
  if (!inputData.trim()) return {};
  try {
    return JSON.parse(inputData);
  } catch {
    return {};
  }
}

function runSyntaxCheck(targetFile) {
  try {
    execSync(`node -c "${targetFile}"`, { stdio: 'pipe' });
    process.stderr.write(`  ✔ Syntax Check: Passed (node -c)\n`);
    return true;
  } catch (syntaxErr) {
    process.stderr.write(`  ✖ Syntax Error in ${targetFile}:\n`);
    process.stderr.write(`${syntaxErr.stderr ? syntaxErr.stderr.toString() : syntaxErr.message}\n`);
    return false;
  }
}

function runEslintCheck(targetFile) {
  try {
    const eslintOut = execSync(`npx eslint "${targetFile}"`, { stdio: 'pipe' }).toString();
    if (eslintOut.trim()) {
      process.stderr.write(`  ℹ ESLint Diagnostics:\n${eslintOut}\n`);
      return false;
    }
    process.stderr.write(`  ✔ ESLint Check: Passed\n`);
    return true;
  } catch (eslintErr) {
    const stdout = eslintErr.stdout ? eslintErr.stdout.toString() : '';
    const stderr = eslintErr.stderr ? eslintErr.stderr.toString() : '';
    process.stderr.write(`  ✖ ESLint Violations:\n${(stdout + stderr).trim()}\n`);
    return false;
  }
}

function runAstGrepCheck(targetFile) {
  try {
    const sgOut = execSync(`ast-grep scan "${targetFile}"`, { stdio: 'pipe' }).toString();
    if (sgOut.trim()) {
      process.stderr.write(`  ℹ ast-grep Findings:\n${sgOut}\n`);
    } else {
      process.stderr.write(`  ✔ ast-grep Scan: Clean\n`);
    }
    return true;
  } catch (astGrepErr) {
    const stdout = astGrepErr.stdout ? astGrepErr.stdout.toString() : '';
    const stderr = astGrepErr.stderr ? astGrepErr.stderr.toString() : '';
    process.stderr.write(`  ℹ ast-grep Warnings:\n${(stdout + stderr).trim()}\n`);
    return false;
  }
}

function verifyCodeFile(targetFile) {
  process.stderr.write(`\n[Quality Hook] Verifying: ${targetFile}\n`);
  const isJsFile = targetFile.endsWith('.js') || targetFile.endsWith('.mjs');
  const syntaxOk = isJsFile ? runSyntaxCheck(targetFile) : true;
  const eslintOk = targetFile.includes('/src/') ? runEslintCheck(targetFile) : true;
  const astGrepOk = runAstGrepCheck(targetFile);

  if (syntaxOk && eslintOk && astGrepOk) {
    process.stderr.write(
      `  ✅ [Quality Hook Authoritative Pass] Syntax, ESLint, and AST checks passed. Run 'make repchecks' upon task completion.\n`,
    );
  }
}

async function main() {
  const payload = readInputPayload();
  const toolArgs = payload?.toolCall?.args || {};
  const targetFile = toolArgs.TargetFile || process.argv[2];

  if (targetFile && fs.existsSync(targetFile)) {
    if (targetFile.endsWith('.ts') || targetFile.endsWith('.js') || targetFile.endsWith('.mjs')) {
      verifyCodeFile(targetFile);
    }

    if (targetFile.endsWith('.md')) {
      try {
        execSync('node scripts/check-markdown-links.js', { stdio: 'pipe' });
        process.stderr.write(`  ✔ Markdown Links Check: Passed (all project-relative)\n`);
      } catch (linkErr) {
        const errOut = linkErr.stdout ? linkErr.stdout.toString() : linkErr.message;
        process.stderr.write(`  ✖ Markdown Links Error:\n${errOut}\n`);
      }
    }

    if (
      targetFile.includes('/src/app/components/') ||
      targetFile.endsWith('.html') ||
      targetFile.endsWith('.css')
    ) {
      process.stderr.write(
        `  🌐 [UI Verification Reminder] Frontend/UI file modified — verify with chrome-devtools-mcp (list_console_messages / take_screenshot on http://localhost:4200) before completion.\n`,
      );
    }
  }

  process.stdout.write(`${JSON.stringify({})}\n`);
}

main().catch(() => {
  process.stdout.write(`${JSON.stringify({})}\n`);
});
