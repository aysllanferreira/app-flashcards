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
import {
  type CreateNoteBody,
  CreateNoteBodySchema,
  NoteIdParamSchema,
  type UpdateNoteBody,
  UpdateNoteBodySchema,
} from './dto/note-body.dto.js';
import { type NoteWithCards, NoteWithCardsSchema } from './dto/note.dto.js';
import { NotesService } from './notes.service.js';

@ApiTags('notes')
@Controller('notes')
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a note and the cards it produces',
    description:
      'Fields are sanitized to bold, italic, underline and line breaks. Answers 400 when the note would produce no card.',
  })
  @ApiResponseSchema(201, NoteWithCardsSchema)
  @ApiErrorResponses({ badRequest: true, unauthorized: true, notFound: true })
  create(
    @CurrentUser() user: User,
    @Body({ schema: CreateNoteBodySchema }) body: CreateNoteBody,
  ): Promise<NoteWithCards> {
    return this.notes.create(user.id, body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a note with its cards' })
  @ApiResponseSchema(200, NoteWithCardsSchema)
  @ApiErrorResponses({ badRequest: true, unauthorized: true, notFound: true })
  get(
    @CurrentUser() user: User,
    @Param('id', { schema: NoteIdParamSchema }) id: string,
  ): Promise<NoteWithCards> {
    return this.notes.get(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: "Edit a note's fields and tags",
    description:
      'Adds any cards the note now produces; never deletes or resets a card.',
  })
  @ApiResponseSchema(200, NoteWithCardsSchema)
  @ApiErrorResponses({ badRequest: true, unauthorized: true, notFound: true })
  update(
    @CurrentUser() user: User,
    @Param('id', { schema: NoteIdParamSchema }) id: string,
    @Body({ schema: UpdateNoteBodySchema }) body: UpdateNoteBody,
  ): Promise<NoteWithCards> {
    return this.notes.update(user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete a note and its cards',
    description: 'Review history is kept.',
  })
  // No body, so no response schema: @ApiResponseSchema needs one.
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiErrorResponses({ badRequest: true, unauthorized: true, notFound: true })
  async remove(
    @CurrentUser() user: User,
    @Param('id', { schema: NoteIdParamSchema }) id: string,
  ): Promise<void> {
    await this.notes.remove(user.id, id);
  }
}
