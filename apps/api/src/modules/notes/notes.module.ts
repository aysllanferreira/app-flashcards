import { Module } from '@nestjs/common';
import { DecksModule } from '../decks/decks.module.js';
import { NoteTypesModule } from '../note-types/note-types.module.js';
import { NotesController } from './notes.controller.js';
import { NotesService } from './notes.service.js';

// Owns the notes and note_media tables (schema/) and the note routes, which
// generate cards with the shared card-templates package.
@Module({
  imports: [DecksModule, NoteTypesModule],
  controllers: [NotesController],
  providers: [NotesService],
})
export class NotesModule {}
