import { LoginUseCase } from '../use-cases/LoginUseCase';
import { IUserRepository } from '@domain/repositories/IUserRepository';
import { IPasswordHasher } from '../ports/IPasswordHasher';
import { ITokenService } from '../ports/ITokenService';
import { User } from '@domain/entities/User';
import { Email } from '@domain/value-objects/Email';
import { UserRole } from '@domain/value-objects/UserRole';
import { UnauthorizedException } from '@domain/exceptions/DomainException';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let mockUserRepo: jest.Mocked<IUserRepository>;
  let mockPasswordHasher: jest.Mocked<IPasswordHasher>;
  let mockTokenService: jest.Mocked<ITokenService>;

  const user = new User({
    id: 'user-1',
    restaurantId: 'rest-1',
    email: new Email('owner@example.com'),
    name: 'Owner',
    role: UserRole.owner(),
    passwordHash: 'scrypt$salt$hash',
  });

  beforeEach(() => {
    mockUserRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
    };

    mockPasswordHasher = {
      hash: jest.fn(),
      compare: jest.fn(),
    };

    mockTokenService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    useCase = new LoginUseCase(
      mockUserRepo,
      mockPasswordHasher,
      mockTokenService
    );
  });

  it('should issue a token carrying the tenant on valid credentials', async () => {
    mockUserRepo.findByEmail.mockResolvedValue([user]);
    mockPasswordHasher.compare.mockResolvedValue(true);
    mockTokenService.sign.mockReturnValue('jwt-token');

    const result = await useCase.execute({
      email: 'owner@example.com',
      password: 'correct-password',
    });

    expect(result.token).toBe('jwt-token');
    expect(result.user.id).toBe('user-1');
    expect(result.user.restaurantId).toBe('rest-1');
    expect(mockTokenService.sign).toHaveBeenCalledWith({
      userId: 'user-1',
      restaurantId: 'rest-1',
      role: 'owner',
    });
  });

  it('should reject an unknown email', async () => {
    mockUserRepo.findByEmail.mockResolvedValue([]);

    await expect(
      useCase.execute({ email: 'nobody@example.com', password: 'x' })
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should reject a wrong password', async () => {
    mockUserRepo.findByEmail.mockResolvedValue([user]);
    mockPasswordHasher.compare.mockResolvedValue(false);

    await expect(
      useCase.execute({ email: 'owner@example.com', password: 'wrong' })
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should reject users without a password set', async () => {
    const noPasswordUser = new User({
      id: 'user-2',
      restaurantId: 'rest-1',
      email: new Email('nopass@example.com'),
      name: 'No Password',
      role: UserRole.staff(),
    });
    mockUserRepo.findByEmail.mockResolvedValue([noPasswordUser]);

    await expect(
      useCase.execute({ email: 'nopass@example.com', password: 'anything' })
    ).rejects.toThrow(UnauthorizedException);
    expect(mockPasswordHasher.compare).not.toHaveBeenCalled();
  });

  it('should disambiguate same email across tenants by password', async () => {
    const otherTenantUser = new User({
      id: 'user-9',
      restaurantId: 'rest-2',
      email: new Email('owner@example.com'),
      name: 'Other Owner',
      role: UserRole.owner(),
      passwordHash: 'scrypt$other$hash',
    });
    mockUserRepo.findByEmail.mockResolvedValue([user, otherTenantUser]);
    mockPasswordHasher.compare
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    mockTokenService.sign.mockReturnValue('jwt-token');

    const result = await useCase.execute({
      email: 'owner@example.com',
      password: 'other-tenant-password',
    });

    expect(result.user.restaurantId).toBe('rest-2');
  });
});
