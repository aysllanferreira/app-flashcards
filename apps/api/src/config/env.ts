import { z } from 'zod';

// The Postgres started by `docker compose up -d --wait db` (compose.yaml).
export const LOCAL_DATABASE_URL =
  'postgres://flashcards:flashcards@localhost:5432/flashcards';

// The Next.js dev server (apps/web).
export const LOCAL_WEB_ORIGIN = 'http://localhost:3000';

// An http(s) origin: scheme, host and optional port, with no path or trailing
// slash, so it compares equal to a browser's Origin header and a token's azp.
const isOrigin = (value: string) => {
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) && url.origin === value;
  } catch {
    return false;
  }
};

// An optional variable left empty, as copied from .env.example, counts as
// unset.
const unsetIfEmpty = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) => (value === '' ? undefined : value),
    schema.optional(),
  );

// A comma-separated list of web app origins, used for CORS and as the
// authorized parties (azp) of Clerk session tokens.
const WebOriginSchema = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  )
  .pipe(
    z
      .array(
        z.string().refine(isOrigin, {
          message: 'each entry must be an http(s) origin with no path',
        }),
      )
      .min(1),
  );

// Environment the API needs at startup. ConfigModule runs `validateEnv` before
// anything is served, so an invalid value stops the app with an error that
// names the variable.
export const EnvSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    // Serves /docs and /docs-json in production too. Outside production the
    // docs are always served.
    SWAGGER_UI: z.stringbool().default(false),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }).optional(),
    WEB_ORIGIN: unsetIfEmpty(WebOriginSchema),
    // Clerk's PEM public key: verifies session tokens without a network call.
    // A one-line .env value may carry the newlines escaped as \n.
    CLERK_JWT_KEY: unsetIfEmpty(
      z.string().transform((pem) => pem.replace(/\\n/g, '\n')),
    ),
    // Fallback when there is no CLERK_JWT_KEY: fetches and caches Clerk's JWKS.
    CLERK_SECRET_KEY: unsetIfEmpty(z.string()),
  })
  // Production must name its database, web origins and a token verification
  // key; anywhere else the local defaults apply, so dev, tests and the OpenAPI
  // generator need no .env file. Without a key, every non-public route
  // answers 401.
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;
    if (!env.DATABASE_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message: 'required in production',
      });
    }
    if (!env.WEB_ORIGIN) {
      ctx.addIssue({
        code: 'custom',
        path: ['WEB_ORIGIN'],
        message: 'required in production',
      });
    }
    if (!env.CLERK_JWT_KEY && !env.CLERK_SECRET_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['CLERK_JWT_KEY'],
        message: 'set CLERK_JWT_KEY or CLERK_SECRET_KEY in production',
      });
    }
  })
  .transform((env) => ({
    ...env,
    DATABASE_URL: env.DATABASE_URL ?? LOCAL_DATABASE_URL,
    WEB_ORIGIN: env.WEB_ORIGIN ?? [LOCAL_WEB_ORIGIN],
  }));

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment: ${issues}`);
  }
  return result.data;
}
