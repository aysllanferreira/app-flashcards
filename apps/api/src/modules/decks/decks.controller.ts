import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { ApiResponseSchema } from '../../common/decorators/api-response-schema.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { User } from '../users/provision-user.js';
import { DecksService } from './decks.service.js';
import {
  type CreateDeckBody,
  CreateDeckBodySchema,
  DeckIdParamSchema,
  type UpdateDeckBody,
  UpdateDeckBodySchema,
} from './dto/deck-body.dto.js';
import {
  type DeckListResponse,
  DeckListResponseSchema,
} from './dto/deck-list-response.dto.js';
import { type DeckDetail, DeckDetailSchema } from './dto/deck.dto.js';

@ApiTags('decks')
@Controller('decks')
export class DecksController {
  constructor(private readonly decks: DecksService) {}

  @Get()
  @ApiOperation({ summary: 'List your decks with their card counts' })
  @ApiResponseSchema(200, DeckListResponseSchema)
  @ApiErrorResponses({ unauthorized: true })
  async list(@CurrentUser() user: User): Promise<DeckListResponse> {
    return { decks: await this.decks.list(user.id) };
  }

  @Post()
  @ApiOperation({ summary: 'Create a deck' })
  @ApiResponseSchema(201, DeckDetailSchema)
  @ApiErrorResponses({
    badRequest: true,
    unauthorized: true,
    notFound: true,
    conflict: true,
  })
  create(
    @CurrentUser() user: User,
    @Body({ schema: CreateDeckBodySchema }) body: CreateDeckBody,
  ): Promise<DeckDetail> {
    return this.decks.create(user.id, body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a deck with its counts and delete impact' })
  @ApiResponseSchema(200, DeckDetailSchema)
  @ApiErrorResponses({ badRequest: true, unauthorized: true, notFound: true })
  get(
    @CurrentUser() user: User,
    @Param('id', { schema: DeckIdParamSchema }) id: string,
  ): Promise<DeckDetail> {
    return this.decks.get(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename, describe or move a deck' })
  @ApiResponseSchema(200, DeckDetailSchema)
  @ApiErrorResponses({
    badRequest: true,
    unauthorized: true,
    notFound: true,
    conflict: true,
  })
  update(
    @CurrentUser() user: User,
    @Param('id', { schema: DeckIdParamSchema }) id: string,
    @Body({ schema: UpdateDeckBodySchema }) body: UpdateDeckBody,
  ): Promise<DeckDetail> {
    return this.decks.update(user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete a deck, its subdecks and their cards',
    description:
      'Also deletes every note left with no cards. Review history is kept.',
  })
  // No body, so no response schema: @ApiResponseSchema needs one.
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiErrorResponses({ badRequest: true, unauthorized: true, notFound: true })
  async remove(
    @CurrentUser() user: User,
    @Param('id', { schema: DeckIdParamSchema }) id: string,
  ): Promise<void> {
    await this.decks.remove(user.id, id);
  }
}
