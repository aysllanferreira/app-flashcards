import { LOCAL_DATABASE_URL, validateEnv } from './env.js';

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
