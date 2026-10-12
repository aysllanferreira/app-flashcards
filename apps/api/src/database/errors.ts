// Drizzle 0.45 wraps driver errors in DrizzleQueryError; the Postgres error
// (code, constraint) is on its cause.
interface PgError {
  code?: string;
  constraint?: string;
}

function pgError(error: unknown): PgError {
  const cause = (error as { cause?: PgError } | null)?.cause;
  return cause ?? (error as PgError) ?? {};
}

/** True when `error` is a unique violation (23505) of `constraint`. */
export function isUniqueViolation(error: unknown, constraint: string): boolean {
  const pg = pgError(error);
  return pg.code === '23505' && pg.constraint === constraint;
}
