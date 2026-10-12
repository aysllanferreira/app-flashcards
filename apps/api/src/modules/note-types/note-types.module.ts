import { Module } from '@nestjs/common';

// Owns the note_types, note_type_fields and card_templates tables (schema/)
// and the built-in note types (stock-note-types.ts).
@Module({})
export class NoteTypesModule {}
