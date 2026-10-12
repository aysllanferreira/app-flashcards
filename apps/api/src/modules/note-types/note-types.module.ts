import { Module } from '@nestjs/common';
import { NoteTypesController } from './note-types.controller.js';
import { NoteTypesService } from './note-types.service.js';

// Owns the note_types, note_type_fields and card_templates tables (schema/)
// and the stock note types. Note types are read-only through the API.
@Module({
  controllers: [NoteTypesController],
  providers: [NoteTypesService],
  exports: [NoteTypesService],
})
export class NoteTypesModule {}
