import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { ApiResponseSchema } from '../../common/decorators/api-response-schema.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { User } from '../users/provision-user.js';
import {
  type NoteTypeListResponse,
  NoteTypeListResponseSchema,
} from './dto/note-type.dto.js';
import { NoteTypesService } from './note-types.service.js';

@ApiTags('note-types')
@Controller('note-types')
export class NoteTypesController {
  constructor(private readonly noteTypes: NoteTypesService) {}

  @Get()
  @ApiOperation({ summary: 'List your note types with their fields and templates' })
  @ApiResponseSchema(200, NoteTypeListResponseSchema)
  @ApiErrorResponses({ unauthorized: true })
  async list(@CurrentUser() user: User): Promise<NoteTypeListResponse> {
    return { noteTypes: await this.noteTypes.list(user.id) };
  }
}
