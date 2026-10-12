import {
  Body,
  Controller,
  Module,
  Param,
  Post,
  Query,
  SerializeOptions,
} from '@nestjs/common';
import { z } from 'zod';

// Test-only routes that exercise every kind of declared schema (body, query,
// path parameter, response) without adding product endpoints. Lives under
// test/, so it never reaches dist/ or openapi.json.
export const FixtureBodySchema = z
  .object({ title: z.string().trim().min(1) })
  .meta({ id: 'FixtureBody' });
export type FixtureBody = z.infer<typeof FixtureBodySchema>;

export const FixtureQuerySchema = z
  .object({ verbose: z.stringbool().optional() })
  .meta({ id: 'FixtureQuery' });
export type FixtureQuery = z.infer<typeof FixtureQuerySchema>;

export const FixtureResponseSchema = z
  .object({ id: z.uuid(), title: z.string() })
  .meta({ id: 'FixtureResponse' });
export type FixtureResponse = z.infer<typeof FixtureResponseSchema>;

@Controller('fixtures')
export class FixtureController {
  @Post(':id')
  @SerializeOptions({ schema: FixtureResponseSchema })
  create(
    @Param('id', { schema: z.uuid() }) id: string,
    @Query({ schema: FixtureQuerySchema }) _query: FixtureQuery,
    @Body({ schema: FixtureBodySchema }) body: FixtureBody,
  ): FixtureResponse & { secret: string } {
    // `secret` is not in FixtureResponseSchema, so the serializer must drop it.
    return { id, title: body.title, secret: 'must-not-leak' };
  }
}

@Module({ controllers: [FixtureController] })
export class FixtureModule {}
