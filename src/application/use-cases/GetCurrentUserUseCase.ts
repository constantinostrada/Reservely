import { IUserRepository } from '@domain/repositories/IUserRepository';
import { UnauthorizedException } from '@domain/exceptions/DomainException';
import { TenantContext } from '../common/TenantContext';
import { assertSameTenant } from '../common/tenantGuard';
import { AuthUserDTO } from '../dtos/AuthDTO';
import { UserMapper } from '../mappers/UserMapper';

export class GetCurrentUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(context: TenantContext): Promise<AuthUserDTO> {
    const user = await this.userRepository.findById(context.userId);

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    assertSameTenant(user.restaurantId, context);

    return UserMapper.toAuthUserDTO(user);
  }
}
