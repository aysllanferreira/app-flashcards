import { Module } from '@nestjs/common';
import { DecksModule } from '../decks/decks.module.js';
import { CardsController } from './cards.controller.js';
import { CardsService } from './cards.service.js';

// Owns the cards table (schema/), which holds the FSRS scheduling state, and
// the card browser routes. Cards are created by the notes module.
@Module({
  imports: [DecksModule],
  controllers: [CardsController],
  providers: [CardsService],
})
export class CardsModule {}
