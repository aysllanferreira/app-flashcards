import { z } from 'zod';

// The Postgres started by `docker compose up -d --wait db` (compose.yaml).
export const LOCAL_DATABASE_URL =
  'postgres://flashcards:flashcards@localhost:5432/flashcards';

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
  })
  // Production must name its database; anywhere else the local Docker
  // database is the default, so dev, tests and the OpenAPI generator need no
  // .env file.
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && !env.DATABASE_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message: 'required in production',
      });
    }
  })
  .transform((env) => ({
    ...env,
    DATABASE_URL: env.DATABASE_URL ?? LOCAL_DATABASE_URL,
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
