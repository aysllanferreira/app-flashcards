import { Module } from '@nestjs/common';

// Owns the users table (schema/users.ts). Clerk user sync arrives in a later
// change.
@Module({})
export class UsersModule {}
