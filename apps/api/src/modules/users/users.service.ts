import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB, type Database } from '../../database/database.providers.js';
import { provisionUser, type User } from './provision-user.js';
import { users } from './schema/users.js';

@Injectable()
export class UsersService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** The user for a Clerk account, created and provisioned if it is new. */
  async ensureUser(clerkUserId: string): Promise<User> {
    const { user } = await provisionUser(this.db, { clerkUserId });
    return user;
  }

  /**
   * Applies a Clerk user.created or user.updated event: provisions the
   * account if it is new and stores its primary email.
   */
  async syncFromClerk(
    clerkUserId: string,
    email: string | null,
  ): Promise<User> {
    const { user } = await provisionUser(this.db, { clerkUserId, email });
    if (user.email === email) return user;
    const [updated] = await this.db
      .update(users)
      .set({ email })
      .where(eq(users.id, user.id))
      .returning();
    return updated;
  }
}
