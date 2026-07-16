import { PrismaClient, User as PrismaUser } from '@prisma/client';
import { IUserRepository } from '@domain/repositories/IUserRepository';
import { User } from '@domain/entities/User';
import { Email } from '@domain/value-objects/Email';
import { UserRole } from '@domain/value-objects/UserRole';

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    return user ? this.toDomain(user) : null;
  }

  async findByEmail(email: string): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      where: { email: email.trim().toLowerCase() },
    });

    return users.map((u) => this.toDomain(u));
  }

  private toDomain(data: PrismaUser): User {
    return new User({
      id: data.id,
      restaurantId: data.restaurantId,
      email: new Email(data.email),
      name: data.name,
      role: UserRole.fromString(data.role),
      passwordHash: data.passwordHash || undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
