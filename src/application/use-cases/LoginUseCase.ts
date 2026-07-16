import { IUserRepository } from '@domain/repositories/IUserRepository';
import { UnauthorizedException } from '@domain/exceptions/DomainException';
import { IPasswordHasher } from '../ports/IPasswordHasher';
import { ITokenService } from '../ports/ITokenService';
import { LoginDTO, LoginResultDTO } from '../dtos/AuthDTO';
import { UserMapper } from '../mappers/UserMapper';

export class LoginUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService
  ) {}

  async execute(dto: LoginDTO): Promise<LoginResultDTO> {
    // The same email may exist in several restaurants; the password
    // disambiguates which tenant's user is logging in.
    const candidates = await this.userRepository.findByEmail(dto.email);

    for (const user of candidates) {
      if (!user.canLogin()) {
        continue;
      }

      const matches = await this.passwordHasher.compare(
        dto.password,
        user.passwordHash!
      );

      if (matches) {
        const token = this.tokenService.sign({
          userId: user.id,
          restaurantId: user.restaurantId,
          role: user.role.value,
        });

        return { token, user: UserMapper.toAuthUserDTO(user) };
      }
    }

    throw new UnauthorizedException('Invalid email or password');
  }
}
