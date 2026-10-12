import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from '../users/users.module.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';

// Registers the global auth guard: every route needs a Clerk session token
// unless it is marked @Public() (src/common/decorators/public.decorator.ts).
@Module({
  imports: [UsersModule],
  providers: [AuthService, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AuthModule {}
