// Tags api and web on pushes to dev (prereleases) and main (releases).
//
//   node tooling/versioning/src/cli.ts dev  [--dry-run]   needs BEFORE and GITHUB_SHA
//   node tooling/versioning/src/cli.ts main [--dry-run]   GITHUB_SHA defaults to HEAD
//
// Tags and GitHub Releases are created together with `gh release create`, so
// GH_TOKEN must be set unless --dry-run is passed.
import { execFileSync } from 'node:child_process';
import { cycleDevVersions, planDev, planRelease, type PlannedTag } from './version.ts';

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();

function run(cmd: string, args: string[], env: Record<string, string> = {}): string {
  return execFileSync(cmd, args, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
}

/** Workspace packages under apps/, optionally only those affected between two commits. */
function apps(range?: { base: string; head: string }): string[] {
  const args = ['exec', 'turbo', 'ls', '--output=json'];
  const env = range ? { TURBO_SCM_BASE: range.base, TURBO_SCM_HEAD: range.head } : {};
  if (range) args.splice(3, 0, '--affected');
  const out = run('pnpm', args, env);
  // turbo prints a banner line before the JSON object.
  const json = out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1);
  let parsed: { packages: { items: { name: string; path: string }[] } };
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error(`Could not parse turbo ls output:\n${out}`);
  }
  return parsed.packages.items.filter((p) => p.path.startsWith('apps/')).map((p) => p.name);
}

function lines(out: string): string[] {
  return out.split('\n').map((l) => l.trim()).filter(Boolean);
}

function createRelease(plan: PlannedTag, sha: string, notes: string, prerelease: boolean, dryRun: boolean): void {
  console.log(`${dryRun ? '[dry-run] would create' : 'creating'} ${plan.tag} at ${sha}${prerelease ? ' (prerelease)' : ''}`);
  console.log(notes.replace(/^/gm, '    '));
  if (dryRun) return;
  const args = ['release', 'create', plan.tag, '--target', sha, '--title', plan.tag, '--notes', notes];
  if (prerelease) args.push('--prerelease');
  run('gh', args);
}

function dev(dryRun: boolean): void {
  const before = process.env.BEFORE ?? '';
  const sha = process.env.GITHUB_SHA ?? '';
  if (!/^[0-9a-f]{7,40}$/.test(before) || /^0+$/.test(before)) {
    throw new Error(`BEFORE must be the previous dev commit, got "${before}"`);
  }
  if (!/^[0-9a-f]{7,40}$/.test(sha)) throw new Error(`GITHUB_SHA must be a commit, got "${sha}"`);

  const messages = run('git', ['log', '--format=%B%x00', `${before}..${sha}`])
    .split('\0')
    .map((m) => m.trim())
    .filter(Boolean);
  const plan = planDev({
    affected: apps({ base: before, head: sha }),
    tags: lines(run('git', ['tag', '--list'])),
    tagsAtHead: lines(run('git', ['tag', '--points-at', sha])),
    messages,
  });

  if (plan.length === 0) console.log('No app needs a new dev version.');
  const notes = messages.map((m) => `- ${m.split('\n')[0]}`).join('\n');
  for (const p of plan) createRelease(p, sha, notes, true, dryRun);
}

function main(dryRun: boolean): void {
  const sha = process.env.GITHUB_SHA || run('git', ['rev-parse', 'HEAD']).trim();
  const tags = lines(run('git', ['tag', '--list']));
  const plan = planRelease({ apps: apps(), tags });

  if (plan.length === 0) console.log('No app has a dev version to release.');
  for (const p of plan) {
    const notes = cycleDevVersions(p.app, tags)
      .map((v) => `- ${run('git', ['log', '-1', '--format=%s', `${p.app}@${v}`]).trim()} (${p.app}@${v})`)
      .join('\n');
    createRelease(p, sha, notes, false, dryRun);
  }
}

const [command, ...flags] = process.argv.slice(2);
const dryRun = flags.includes('--dry-run');
try {
  if (command === 'dev') dev(dryRun);
  else if (command === 'main') main(dryRun);
  else throw new Error('Usage: cli.ts <dev|main> [--dry-run]');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
