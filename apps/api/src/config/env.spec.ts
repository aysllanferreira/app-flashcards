import { LOCAL_DATABASE_URL, LOCAL_WEB_ORIGIN, validateEnv } from './env.js';

describe('validateEnv: DATABASE_URL', () => {
  it('defaults to the local Docker database outside production', () => {
    expect(validateEnv({}).DATABASE_URL).toBe(LOCAL_DATABASE_URL);
    expect(validateEnv({ NODE_ENV: 'test' }).DATABASE_URL).toBe(
      LOCAL_DATABASE_URL,
    );
  });

  it('accepts a postgres:// or postgresql:// URL', () => {
    const url = 'postgresql://app:secret@db.example.com:5432/flashcards';
    expect(validateEnv({ DATABASE_URL: url }).DATABASE_URL).toBe(url);
  });

  it('rejects a value that is not a Postgres URL, naming the variable', () => {
    expect(() => validateEnv({ DATABASE_URL: 'not-a-url' })).toThrow(
      /DATABASE_URL/,
    );
    expect(() =>
      validateEnv({ DATABASE_URL: 'https://example.com/db' }),
    ).toThrow(/DATABASE_URL/);
  });

  it('requires it in production, naming the variable', () => {
    expect(() => validateEnv({ NODE_ENV: 'production' })).toThrow(
      /DATABASE_URL: required in production/,
    );
  });
});

// The settings production needs apart from the variable under test.
const PRODUCTION = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgres://app:secret@db.example.com:5432/flashcards',
  WEB_ORIGIN: 'https://app.example.com',
  CLERK_JWT_KEY: 'pem',
};

describe('validateEnv: WEB_ORIGIN', () => {
  it('defaults to the local web app outside production', () => {
    expect(validateEnv({}).WEB_ORIGIN).toEqual([LOCAL_WEB_ORIGIN]);
    expect(validateEnv({ WEB_ORIGIN: '' }).WEB_ORIGIN).toEqual([
      LOCAL_WEB_ORIGIN,
    ]);
  });

  it('parses a comma-separated list of origins', () => {
    expect(
      validateEnv({
        WEB_ORIGIN: 'https://app.example.com, http://localhost:3000',
      }).WEB_ORIGIN,
    ).toEqual(['https://app.example.com', 'http://localhost:3000']);
  });

  it('rejects an entry with a path or that is not http(s), naming the variable', () => {
    expect(() =>
      validateEnv({ WEB_ORIGIN: 'http://localhost:3000/app' }),
    ).toThrow(/WEB_ORIGIN/);
    expect(() => validateEnv({ WEB_ORIGIN: 'http://localhost:3000/' })).toThrow(
      /WEB_ORIGIN/,
    );
    expect(() => validateEnv({ WEB_ORIGIN: 'ftp://example.com' })).toThrow(
      /WEB_ORIGIN/,
    );
  });

  it('requires it in production, naming the variable', () => {
    expect(() => validateEnv({ ...PRODUCTION, WEB_ORIGIN: undefined })).toThrow(
      /WEB_ORIGIN: required in production/,
    );
  });
});

describe('validateEnv: Clerk token verification keys', () => {
  it('are optional outside production, and empty values count as unset', () => {
    const env = validateEnv({ CLERK_JWT_KEY: '', CLERK_SECRET_KEY: '' });
    expect(env.CLERK_JWT_KEY).toBeUndefined();
    expect(env.CLERK_SECRET_KEY).toBeUndefined();
  });

  it('restores escaped newlines in CLERK_JWT_KEY', () => {
    const pem = '-----BEGIN PUBLIC KEY-----\\nabc\\n-----END PUBLIC KEY-----';
    expect(validateEnv({ CLERK_JWT_KEY: pem }).CLERK_JWT_KEY).toBe(
      '-----BEGIN PUBLIC KEY-----\nabc\n-----END PUBLIC KEY-----',
    );
  });

  it('accept either key in production', () => {
    expect(() => validateEnv(PRODUCTION)).not.toThrow();
    expect(() =>
      validateEnv({
        ...PRODUCTION,
        CLERK_JWT_KEY: undefined,
        CLERK_SECRET_KEY: 'sk_live_x',
      }),
    ).not.toThrow();
  });

  it('require one of them in production, naming both', () => {
    expect(() =>
      validateEnv({ ...PRODUCTION, CLERK_JWT_KEY: undefined }),
    ).toThrow(/CLERK_JWT_KEY.*CLERK_SECRET_KEY/);
  });
});
