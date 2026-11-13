#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Automated validation for NovaLoad Markdown documentation and SVG assets.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const errors = [];

function walkFiles(dir, predicate) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'target') {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full, predicate));
    } else if (predicate(full)) {
      results.push(full);
    }
  }
  return results;
}

function slugifyHeading(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[`*_~]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function extractHeadings(markdown) {
  const counts = new Map();
  const anchors = new Set();
  let inCode = false;
  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    const match = /^#{1,6}\s+(.+?)\s*#*$/.exec(line);
    if (!match) continue;
    const base = slugifyHeading(match[1]);
    if (!base) continue;
    const seen = counts.get(base) || 0;
    counts.set(base, seen + 1);
    anchors.add(seen === 0 ? base : `${base}-${seen}`);
  }
  return anchors;
}

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const validScripts = new Set(Object.keys(pkg.scripts || {}));

const rootMarkdown = [
  'README.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'SUPPORT.md',
  'CHANGELOG.md',
  'ROADMAP.md',
  'CODE_OF_CONDUCT.md',
  'AUTHORS.md',
]
  .map((f) => path.join(ROOT, f))
  .filter((f) => fs.existsSync(f));

const docMarkdown = walkFiles(path.join(ROOT, 'docs'), (f) => f.endsWith('.md'));
const screenshotDocs = walkFiles(path.join(ROOT, 'assets'), (f) => f.endsWith('.md'));
const allMarkdown = [...rootMarkdown, ...docMarkdown, ...screenshotDocs];

const headingCache = new Map();
function getAnchors(filePath) {
  if (!headingCache.has(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    headingCache.set(filePath, extractHeadings(content));
  }
  return headingCache.get(filePath);
}

for (const mdFile of allMarkdown) {
  const relFile = path.relative(ROOT, mdFile);
  const content = fs.readFileSync(mdFile, 'utf8');

  if (content.trim().length < 40) {
    errors.push(`${relFile}: documentation file appears empty or too short.`);
  }

  // Check balanced fenced code / mermaid blocks
  const fences = content.match(/^\s*```/gm) || [];
  if (fences.length % 2 !== 0) {
    errors.push(`${relFile}: unmatched fenced code/mermaid block (\`\`\`).`);
  }

  // Check npm run <script> references outside generic prose
  for (const m of content.matchAll(/\bnpm run ([a-zA-Z0-9:_-]+)/g)) {
    const scriptName = m[1];
    if (!validScripts.has(scriptName)) {
      errors.push(`${relFile}: references unknown npm script "npm run ${scriptName}".`);
    }
  }

  // Check Markdown links [label](target) outside fenced and inline code spans
  const strippedCode = content.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]+`/g, '');
  for (const m of strippedCode.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const rawTarget = m[1].trim().split(/\s+/)[0];
    if (
      !rawTarget ||
      rawTarget.startsWith('http://') ||
      rawTarget.startsWith('https://') ||
      rawTarget.startsWith('mailto:') ||
      rawTarget.startsWith('data:')
    ) {
      continue;
    }
    const [rawPath, rawAnchor] = rawTarget.split('#');
    const resolvedTarget = rawPath ? path.resolve(path.dirname(mdFile), rawPath) : mdFile;

    if (!fs.existsSync(resolvedTarget)) {
      errors.push(`${relFile}: broken link target "${rawTarget}".`);
      continue;
    }

    if (rawAnchor && resolvedTarget.endsWith('.md')) {
      const anchors = getAnchors(resolvedTarget);
      if (!anchors.has(rawAnchor.toLowerCase())) {
        errors.push(`${relFile}: broken heading anchor "#${rawAnchor}" in ${path.relative(ROOT, resolvedTarget)}.`);
      }
    }
  }

  // Check HTML <img src="..."> tags inside Markdown
  for (const m of strippedCode.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
    const src = m[1].trim();
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) continue;
    const resolvedImg = path.resolve(path.dirname(mdFile), src);
    if (!fs.existsSync(resolvedImg)) {
      errors.push(`${relFile}: missing image asset "${src}".`);
    }
  }
}

// Validate all SVGs under assets/
const svgFiles = walkFiles(path.join(ROOT, 'assets'), (f) => f.endsWith('.svg'));
if (svgFiles.length === 0) {
  errors.push('assets/: no SVG files found.');
}

for (const svgFile of svgFiles) {
  const relSvg = path.relative(ROOT, svgFile);
  const raw = fs.readFileSync(svgFile, 'utf8');
  if (!/<svg\b[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/i.test(raw)) {
    errors.push(`${relSvg}: missing root <svg> element or xmlns.`);
  }
  if (!/viewBox="[0-9.\s-]+"/i.test(raw)) {
    errors.push(`${relSvg}: missing viewBox attribute.`);
  }
  if (!/<\/svg>\s*$/i.test(raw)) {
    errors.push(`${relSvg}: missing closing </svg> tag.`);
  }
  if (/<script\b/i.test(raw)) {
    errors.push(`${relSvg}: embedded <script> tags are disallowed for GitHub compatibility and security.`);
  }
}

if (errors.length > 0) {
  console.error(`Documentation validation failed with ${errors.length} issue(s):`);
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log(
  `docs:validate passed — ${allMarkdown.length} Markdown files and ${svgFiles.length} SVG assets verified with 0 errors.`
);
