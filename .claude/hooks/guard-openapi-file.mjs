#!/usr/bin/env node
// PreToolUse hook for Edit|Write: blocks direct edits to the committed API
// contract. apps/api/openapi.json is generated from the code (see "API
// (apps/api)" in CLAUDE.md). Exit 2 blocks the tool call and shows stderr to
// Claude; exit 0 lets it through.
import path from 'node:path';

const OPENAPI_FILE = 'apps/api/openapi.json';

let input = '';
for await (const chunk of process.stdin) input += chunk;

let payload;
try {
  payload = JSON.parse(input);
} catch {
  process.exit(0);
}

const filePath = payload?.tool_input?.file_path;
if (typeof filePath !== 'string' || filePath === '') process.exit(0);

const cwd = typeof payload.cwd === 'string' ? payload.cwd : process.cwd();
const projectDir = process.env.CLAUDE_PROJECT_DIR || cwd;
const relative = path
  .relative(projectDir, path.resolve(cwd, filePath))
  .split(path.sep)
  .join('/');

if (relative !== OPENAPI_FILE) process.exit(0);

process.stderr.write(
  `Blocked: ${OPENAPI_FILE} is generated from the code and must not be edited directly.\n` +
    `Change the routes, schemas or Swagger decorators in apps/api/src, then run:\n` +
    `  pnpm --filter api openapi\n` +
    `and commit the regenerated file. See "API (apps/api)" in CLAUDE.md.\n`,
);
process.exit(2);
