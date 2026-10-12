import { Module } from '@nestjs/common';
import { DecksController } from './decks.controller.js';
import { DecksService } from './decks.service.js';

// Owns the deck_presets and decks tables (schema/) and the deck routes.
@Module({
  controllers: [DecksController],
  providers: [DecksService],
  exports: [DecksService],
})
export class DecksModule {}
