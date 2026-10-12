import { describe, expect, it } from 'vitest';
import {
  cycleDevVersions,
  nextDevVersion,
  parseBump,
  planDev,
  planRelease,
  promotion,
  versionsOf,
} from './version.ts';

describe('parseBump', () => {
  it('feat is minor', () => {
    expect(parseBump(['feat(api): add decks endpoint (#20)'])).toBe('minor');
  });

  it('fix is patch', () => {
    expect(parseBump(['fix(web): handle empty deck (#21)'])).toBe('patch');
  });

  it('any other type is patch', () => {
    expect(parseBump(['refactor(api): split service (#22)'])).toBe('patch');
    expect(parseBump(['chore(deps): bump next (#23)'])).toBe('patch');
  });

  it('a non-conventional header is patch', () => {
    expect(parseBump(['Update README'])).toBe('patch');
  });

  it('! after the type or scope is major', () => {
    expect(parseBump(['feat(api)!: drop v1 routes (#24)'])).toBe('major');
    expect(parseBump(['refactor!: rename env vars'])).toBe('major');
  });

  it('a BREAKING CHANGE footer is major', () => {
    expect(parseBump(['fix(api): rename field\n\nBREAKING CHANGE: `due` is now `dueAt`'])).toBe('major');
    expect(parseBump(['fix(api): rename field\n\nBREAKING-CHANGE: `due` is now `dueAt`'])).toBe('major');
  });

  it('takes the largest bump over several commits', () => {
    expect(parseBump(['fix: a', 'feat: b', 'chore: c'])).toBe('minor');
  });
});

describe('nextDevVersion', () => {
  it('first version: no tags and a feat gives 0.1.0-dev.1', () => {
    expect(nextDevVersion({ release: null, dev: null }, 'minor')).toBe('0.1.0-dev.1');
  });

  it('patch bump: release 0.2.0 and a fix gives 0.2.1-dev.1', () => {
    expect(nextDevVersion({ release: '0.2.0', dev: null }, 'patch')).toBe('0.2.1-dev.1');
  });

  it('minor bump: release 0.2.0 and a feat gives 0.3.0-dev.1', () => {
    expect(nextDevVersion({ release: '0.2.0', dev: null }, 'minor')).toBe('0.3.0-dev.1');
  });

  it('major bump: release 1.4.2 and a breaking change gives 2.0.0-dev.1', () => {
    expect(nextDevVersion({ release: '1.4.2', dev: null }, 'major')).toBe('2.0.0-dev.1');
  });

  it('breaking change while 0.x: release 0.4.1 gives 0.5.0-dev.1', () => {
    expect(nextDevVersion({ release: '0.4.1', dev: null }, 'major')).toBe('0.5.0-dev.1');
  });

  it('continuing a dev cycle: 0.2.1-dev.2 and a fix gives 0.2.1-dev.3', () => {
    expect(nextDevVersion({ release: '0.2.0', dev: '0.2.1-dev.2' }, 'patch')).toBe('0.2.1-dev.3');
  });

  it('escalating a dev cycle: 0.2.1-dev.2 and a feat gives 0.3.0-dev.1', () => {
    expect(nextDevVersion({ release: '0.2.0', dev: '0.2.1-dev.2' }, 'minor')).toBe('0.3.0-dev.1');
  });

  it('smaller bump inside a larger cycle: 0.3.0-dev.1 and a fix gives 0.3.0-dev.2', () => {
    expect(nextDevVersion({ release: '0.2.0', dev: '0.3.0-dev.1' }, 'patch')).toBe('0.3.0-dev.2');
  });

  it('starts a new cycle when the latest dev version is already released', () => {
    expect(nextDevVersion({ release: '0.3.0', dev: '0.3.0-dev.4' }, 'patch')).toBe('0.3.1-dev.1');
  });
});

describe('promotion', () => {
  it('promotes the base of an open dev cycle', () => {
    expect(promotion({ release: '0.1.0', dev: '0.2.0-dev.4' })).toBe('0.2.0');
  });

  it('promotes a first release', () => {
    expect(promotion({ release: null, dev: '0.1.0-dev.2' })).toBe('0.1.0');
  });

  it('has nothing to promote when the dev version is already released', () => {
    expect(promotion({ release: '0.1.1', dev: '0.1.1-dev.2' })).toBeNull();
  });

  it('has nothing to promote without dev versions', () => {
    expect(promotion({ release: '0.1.0', dev: null })).toBeNull();
  });
});

describe('versionsOf', () => {
  const tags = ['api@0.1.0', 'api@0.2.0-dev.10', 'api@0.2.0-dev.9', 'api@0.1.0-dev.3', 'web@0.9.0', 'api@junk'];

  it('picks the highest release and dev version by semver, ignoring other apps and invalid tags', () => {
    expect(versionsOf('api', tags)).toEqual({ release: '0.1.0', dev: '0.2.0-dev.10' });
  });

  it('returns nulls for an app with no tags', () => {
    expect(versionsOf('mobile', tags)).toEqual({ release: null, dev: null });
  });

  it('lists the open cycle dev versions newest first', () => {
    expect(cycleDevVersions('api', tags)).toEqual(['0.2.0-dev.10', '0.2.0-dev.9']);
  });
});

describe('planDev', () => {
  const tags = ['api@0.1.0', 'web@0.1.0', 'web@0.1.1-dev.1'];

  it('tags only the affected apps', () => {
    expect(planDev({ affected: ['api'], tags, tagsAtHead: [], messages: ['feat(api): x (#30)'] })).toEqual([
      { app: 'api', version: '0.2.0-dev.1', tag: 'api@0.2.0-dev.1' },
    ]);
  });

  it('tags nothing when no app is affected', () => {
    expect(planDev({ affected: [], tags, tagsAtHead: [], messages: ['docs: x (#31)'] })).toEqual([]);
  });

  it('skips an app that already has a tag on the pushed commit', () => {
    expect(
      planDev({ affected: ['api', 'web'], tags, tagsAtHead: ['web@0.1.1-dev.2'], messages: ['fix: x (#32)'] }),
    ).toEqual([{ app: 'api', version: '0.1.1-dev.1', tag: 'api@0.1.1-dev.1' }]);
  });
});

describe('planRelease', () => {
  it('promotes apps with a newer dev version and skips the others', () => {
    const tags = ['api@0.1.0', 'api@0.2.0-dev.4', 'web@0.1.1', 'web@0.1.1-dev.2'];
    expect(planRelease({ apps: ['api', 'web'], tags })).toEqual([
      { app: 'api', version: '0.2.0', tag: 'api@0.2.0' },
    ]);
  });

  it('is a no-op once the release tag exists', () => {
    const tags = ['api@0.2.0', 'api@0.2.0-dev.4'];
    expect(planRelease({ apps: ['api'], tags })).toEqual([]);
  });
});
