import { z } from 'zod';

// Environment the API needs at startup. ConfigModule runs `validateEnv` before
// anything is served, so an invalid value stops the app with an error that
// names the variable.
export const EnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  // Serves /docs and /docs-json in production too. Outside production the
  // docs are always served.
  SWAGGER_UI: z.stringbool().default(false),
});

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
