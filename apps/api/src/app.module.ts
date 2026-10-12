import {
  Module,
  StandardSchemaSerializerInterceptor,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { validateEnv } from './config/env.js';
import { DatabaseModule } from './database/database.module.js';
import { CardsModule } from './modules/cards/cards.module.js';
import { DecksModule } from './modules/decks/decks.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { ImportsModule } from './modules/imports/imports.module.js';
import { MediaModule } from './modules/media/media.module.js';
import { NoteTypesModule } from './modules/note-types/note-types.module.js';
import { NotesModule } from './modules/notes/notes.module.js';
import { ReviewsModule } from './modules/reviews/reviews.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    DatabaseModule,
    HealthModule,
    UsersModule,
    DecksModule,
    NoteTypesModule,
    NotesModule,
    CardsModule,
    ReviewsModule,
    MediaModule,
    ImportsModule,
  ],
  providers: [
    // Registered here, not in main.ts, so every app built from AppModule
    // (tests and the OpenAPI generator included) validates requests against
    // their declared schemas and shapes responses with theirs.
    { provide: APP_PIPE, useClass: StandardSchemaValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: StandardSchemaSerializerInterceptor },
  ],
})
export class AppModule {}
