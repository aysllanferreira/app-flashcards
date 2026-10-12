#!/usr/bin/env node
// PreToolUse hook for Edit|Write: blocks direct edits to system-design diagram
// files. Diagrams are edited in their Excalidraw+ scene and exported from it
// (see "Diagram conventions" in CLAUDE.md). Exit 2 blocks the tool call and
// shows stderr to Claude; exit 0 lets it through.
import path from 'node:path';

const DIAGRAM_FILE = /^system-design\/[^/]+\.(excalidraw|png)$/i;

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

if (!DIAGRAM_FILE.test(relative)) process.exit(0);

const scene = path.basename(relative).replace(/\.(excalidraw|png)$/i, '');
process.stderr.write(
  `Blocked: ${relative} is exported from an Excalidraw+ scene and must not be edited directly.\n` +
    `Use the Excalidraw+ MCP instead:\n` +
    `  1. Edit the scene "${scene}" in the app-flashcards collection with edit_scene_content ` +
    `(or create_diagram for a new scene), then check it with take_screenshot.\n` +
    `  2. Export the repo files from the scene through the shell: ` +
    `${scene}.excalidraw from get_scene_content, ${scene}.png from take_screenshot.\n` +
    `See "Diagram conventions" in CLAUDE.md.\n`,
);
process.exit(2);
