import { container } from '@infrastructure/di/container';
import { LoginDTO } from '@application/dtos/AuthDTO';
import { TenantContext } from '@application/common/TenantContext';

export class AuthController {
  async login(dto: LoginDTO) {
    const useCase = container.getLoginUseCase();
    return await useCase.execute(dto);
  }

  async me(auth: TenantContext) {
    const useCase = container.getGetCurrentUserUseCase();
    return await useCase.execute(auth);
  }
}
