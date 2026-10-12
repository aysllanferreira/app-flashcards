import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Enforces the module layout from CLAUDE.md: every controller and service
// lives in src/modules/<name>/, and every folder there has <name>.module.ts.
const SRC = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../src',
);
const MODULES = path.join(SRC, 'modules');

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

const rel = (file: string) =>
  path.relative(SRC, file).split(path.sep).join('/');

describe('API module layout', () => {
  it('keeps every controller and service in src/modules/<name>/', () => {
    const misplaced = listFiles(SRC)
      .filter((file) => /\.(controller|service)\.ts$/.test(file))
      .map(rel)
      .filter(
        (file) =>
          !/^modules\/[^/]+\/[^/]+\.(controller|service)\.ts$/.test(file),
      );

    expect(
      misplaced,
      `Move these into src/modules/<name>/: ${misplaced.join(', ')}`,
    ).toEqual([]);
  });

  it('gives every folder in src/modules a <name>.module.ts', () => {
    const withoutModule = readdirSync(MODULES)
      .filter((name) => statSync(path.join(MODULES, name)).isDirectory())
      .filter(
        (name) => !existsSync(path.join(MODULES, name, `${name}.module.ts`)),
      )
      .map((name) => `modules/${name}`);

    expect(
      withoutModule,
      `Add <name>.module.ts to: ${withoutModule.join(', ')}`,
    ).toEqual([]);
  });
});
