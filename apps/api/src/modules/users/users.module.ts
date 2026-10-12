import { Module } from '@nestjs/common';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

// Owns the users table (schema/users.ts) and account provisioning
// (provision-user.ts). Other modules reach users through UsersService.
@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
