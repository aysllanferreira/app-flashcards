import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { ApiResponseSchema } from '../../common/decorators/api-response-schema.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { User } from '../users/provision-user.js';
import { CardsService } from './cards.service.js';
import {
  CardIdParamSchema,
  type CardListQuery,
  CardListQuerySchema,
  type CardListResponse,
  CardListResponseSchema,
  type CardRow,
  CardRowSchema,
  type MoveCardBody,
  MoveCardBodySchema,
} from './dto/card.dto.js';

@ApiTags('cards')
@Controller('cards')
export class CardsController {
  constructor(private readonly cards: CardsService) {}

  @Get()
  @ApiOperation({
    summary: 'Browse your cards',
    description:
      'Filter by deck (subdecks included) and sort-field text, sort, and page with nextCursor.',
  })
  @ApiResponseSchema(200, CardListResponseSchema)
  @ApiErrorResponses({ badRequest: true, unauthorized: true, notFound: true })
  list(
    @CurrentUser() user: User,
    @Query({ schema: CardListQuerySchema }) query: CardListQuery,
  ): Promise<CardListResponse> {
    return this.cards.list(user.id, query);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Move a card to another deck' })
  @ApiResponseSchema(200, CardRowSchema)
  @ApiErrorResponses({ badRequest: true, unauthorized: true, notFound: true })
  move(
    @CurrentUser() user: User,
    @Param('id', { schema: CardIdParamSchema }) id: string,
    @Body({ schema: MoveCardBodySchema }) body: MoveCardBody,
  ): Promise<CardRow> {
    return this.cards.move(user.id, id, body.deckId);
  }
}
