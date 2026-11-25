#!/usr/bin/env node
// FlowMate build: joins src/ back into one page, in load order.
// src/shell.html lists the parts with lines like  <!--#include js/01-core.js-->
// Each include line is replaced by that file's exact contents. Nothing else
// changes, so the output behaves exactly like the parts in this order.
// Usage: node tools/build.mjs [--out dist/index.html]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const args = process.argv.slice(2);
const outArg = args.indexOf('--out');
const out = resolve(root, outArg >= 0 ? args[outArg + 1] : 'dist/index.html');

const INCLUDE = /^<!--#include ([\w./-]+)-->$/;
const seen = new Set();
const lines = readFileSync(join(src, 'shell.html'), 'utf8').split('\n');
const last = lines.pop();
if (last !== '') throw new Error('src/shell.html must end with a newline');

let html = '';
for (const line of lines) {
  const m = INCLUDE.exec(line);
  if (!m) { html += line + '\n'; continue; }
  const rel = m[1];
  if (seen.has(rel)) throw new Error('Included twice: ' + rel);
  seen.add(rel);
  const part = readFileSync(join(src, rel), 'utf8');
  if (!part.endsWith('\n')) throw new Error(rel + ' must end with a newline');
  html += part;
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
const sha = createHash('sha256').update(html).digest('hex').slice(0, 12);
console.log(`Built ${out.replace(root + '/', '')}: ${seen.size} parts, ${(html.length / 1024).toFixed(0)} KB, sha256 ${sha}`);
