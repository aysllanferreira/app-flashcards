import semver from 'semver';

export type Bump = 'major' | 'minor' | 'patch';

export interface AppVersions {
  /** Highest `X.Y.Z` release, or null when the app was never released. */
  release: string | null;
  /** Highest `X.Y.Z-dev.N` prerelease, or null when there is none. */
  dev: string | null;
}

export interface PlannedTag {
  app: string;
  version: string;
  tag: string;
}

const RANK: Record<Bump, number> = { patch: 0, minor: 1, major: 2 };
const HEADER = /^(\w+)(\([^)]*\))?(!)?:\s/;
const BREAKING_FOOTER = /^BREAKING[ -]CHANGE:\s/m;

/** Largest bump implied by a list of full commit messages (header + body). */
export function parseBump(messages: string[]): Bump {
  let bump: Bump = 'patch';
  for (const message of messages) {
    const current = bumpOf(message);
    if (RANK[current] > RANK[bump]) bump = current;
  }
  return bump;
}

function bumpOf(message: string): Bump {
  const [header = '', ...rest] = message.trim().split('\n');
  const match = HEADER.exec(header);
  if (match?.[3] === '!' || BREAKING_FOOTER.test(rest.join('\n'))) return 'major';
  if (match?.[1] === 'feat') return 'minor';
  return 'patch';
}

/** `X.Y.Z` of a version, without its prerelease suffix. */
export function baseOf(version: string): string {
  const parsed = semver.parse(version);
  if (!parsed) throw new Error(`Invalid version: ${version}`);
  return `${parsed.major}.${parsed.minor}.${parsed.patch}`;
}

/** The open dev cycle's base, or null when the latest dev version is already released. */
function openCycle({ release, dev }: AppVersions): string | null {
  const last = release ?? '0.0.0';
  if (dev === null) return null;
  const base = baseOf(dev);
  return semver.gt(base, last) ? base : null;
}

/** Next dev version: escalate the open cycle when the bump outgrows it, otherwise continue it. */
export function nextDevVersion(versions: AppVersions, bump: Bump): string {
  const last = versions.release ?? '0.0.0';
  const effective: Bump = bump === 'major' && semver.major(last) === 0 ? 'minor' : bump;
  const candidate = semver.inc(last, effective);
  if (!candidate) throw new Error(`Cannot bump ${last} by ${effective}`);

  const cycle = openCycle(versions);
  if (cycle === null || semver.gt(candidate, cycle)) return `${candidate}-dev.1`;

  const n = Number(semver.prerelease(versions.dev!)?.[1] ?? 0);
  return `${cycle}-dev.${n + 1}`;
}

/** Release version to promote on main, or null when there is nothing new. */
export function promotion(versions: AppVersions): string | null {
  return openCycle(versions);
}

/** Highest release and dev version of one app, read from `<app>@<version>` tag names. */
export function versionsOf(app: string, tags: string[]): AppVersions {
  let release: string | null = null;
  let dev: string | null = null;
  for (const version of versionTags(app, tags)) {
    const pre = semver.prerelease(version);
    if (pre === null) {
      if (release === null || semver.gt(version, release)) release = version;
    } else if (pre[0] === 'dev') {
      if (dev === null || semver.gt(version, dev)) dev = version;
    }
  }
  return { release, dev };
}

/** Dev versions of the open cycle (newer than the last release), newest first. */
export function cycleDevVersions(app: string, tags: string[]): string[] {
  const last = versionsOf(app, tags).release ?? '0.0.0';
  return versionTags(app, tags)
    .filter((v) => semver.prerelease(v)?.[0] === 'dev' && semver.gt(baseOf(v), last))
    .sort(semver.rcompare);
}

function versionTags(app: string, tags: string[]): string[] {
  const prefix = `${app}@`;
  return tags
    .filter((tag) => tag.startsWith(prefix))
    .map((tag) => tag.slice(prefix.length))
    .filter((v) => semver.valid(v) !== null);
}

/**
 * Dev tags for a push to dev. Only affected apps are tagged, and an app that
 * already has a tag on the pushed commit is skipped (re-runs are no-ops).
 */
export function planDev(input: {
  affected: string[];
  tags: string[];
  tagsAtHead: string[];
  messages: string[];
}): PlannedTag[] {
  const bump = parseBump(input.messages);
  return input.affected
    .filter((app) => !input.tagsAtHead.some((tag) => tag.startsWith(`${app}@`)))
    .map((app) => {
      const version = nextDevVersion(versionsOf(app, input.tags), bump);
      return { app, version, tag: `${app}@${version}` };
    });
}

/**
 * Release tags for a push to main. Apps without a dev version newer than their
 * last release are skipped, which also makes re-runs no-ops.
 */
export function planRelease(input: { apps: string[]; tags: string[] }): PlannedTag[] {
  return input.apps.flatMap((app) => {
    const version = promotion(versionsOf(app, input.tags));
    return version === null ? [] : [{ app, version, tag: `${app}@${version}` }];
  });
}
