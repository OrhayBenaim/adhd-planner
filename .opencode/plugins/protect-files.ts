/**
 * OpenCode plugin: blocks edits to protected files.
 * Ported from .claude/hooks/protect-files.js
 *
 * Protected patterns:
 * - *.proto files (require proto:generate + rebuild)
 * - .env* files (contain secrets)
 * - opencode.json / .opencode/ config (AI tool configuration)
 * - .claude/settings.json (Claude Code project settings)
 */

const PROTECTED = [
  {
    pattern: /packages\/proto\/proto\/.*\.proto$/,
    reason: "proto definitions (requires proto:generate + rebuild)",
  },
  {
    pattern: /\.claude\/settings\.json$/,
    reason: "Claude Code project settings",
  },
  {
    pattern: /\.env(\.\w+)?$/,
    reason: ".env files may contain secrets",
  },
  {
    pattern: /opencode\.json$/,
    reason: "OpenCode project configuration",
  },
];

export const ProtectFiles = async () => {
  return {
    "tool.execute.before": async (_input: any, output: any) => {
      const filePath =
        output.args?.filePath ||
        output.args?.file_path ||
        output.args?.path ||
        "";

      if (!filePath) return;

      const normalized = filePath.replace(/\\/g, "/");

      const hit = PROTECTED.find(({ pattern }) => pattern.test(normalized));
      if (hit) {
        throw new Error(
          `Protected file: ${filePath}\n` +
            `Reason: ${hit.reason}\n\n` +
            `To edit this file, explicitly say why it needs to change.`,
        );
      }
    },
  };
};
