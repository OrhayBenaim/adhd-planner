#!/usr/bin/env node
/**
 * Pre-tool-use hook: blocks edits to important project files.
 *
 * To add/remove protected files, edit the PROTECTED array below.
 * To bypass for a specific edit, explicitly tell Claude "edit the protected file X because..."
 */

import { readFileSync } from 'fs';

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}

// Grab the file path from whichever tool is being used
const filePath =
  input.tool_input?.file_path ||
  input.tool_input?.path ||
  input.tool_input?.notebook_path ||
  '';

if (!filePath) process.exit(0);

// Normalize to forward slashes for consistent matching
const p = filePath.replace(/\\/g, '/');

// ── Protected patterns ────────────────────────────────────────────────────────
// Each entry is a regex tested against the normalized file path.
const PROTECTED = [
  // Proto definitions — changes require `pnpm proto:generate` + rebuild
  { pattern: /packages\/proto\/proto\/.*\.proto$/, reason: 'proto definitions (requires proto:generate + rebuild)' },

  // Claude Code project settings
  { pattern: /\.claude\/settings\.json$/, reason: 'Claude Code project settings' },

  // Environment files
  { pattern: /\.env(\.\w+)?$/, reason: '.env files may contain secrets' },

];
// ─────────────────────────────────────────────────────────────────────────────

const hit = PROTECTED.find(({ pattern }) => pattern.test(p));
if (hit) {
  console.log(
    `\u26d4  Protected file: ${filePath}\n` +
    `   Reason: ${hit.reason}\n\n` +
    `   To edit this file, explicitly say why it needs to change and ask Claude to "edit the protected file".`
  );
  process.exit(2);
}

process.exit(0);
