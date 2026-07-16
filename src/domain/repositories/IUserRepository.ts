import { User } from '../entities/User';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  /**
   * Emails are unique per restaurant, not globally, so the same email
   * may resolve to one user per tenant.
   */
  findByEmail(email: string): Promise<User[]>;
}
