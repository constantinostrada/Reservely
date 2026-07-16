import { container } from '@infrastructure/di/container';
import {
  CreateRestaurantDTO,
  UpdateRestaurantDTO,
} from '@application/dtos/RestaurantDTO';
import { TenantContext } from '@application/common/TenantContext';

export class RestaurantController {
  async create(dto: CreateRestaurantDTO) {
    const useCase = container.getCreateRestaurantUseCase();
    return await useCase.execute(dto);
  }

  async getById(id: string, auth: TenantContext) {
    const useCase = container.getGetRestaurantUseCase();
    return await useCase.execute(id, auth);
  }

  async list(auth: TenantContext) {
    const useCase = container.getListRestaurantsUseCase();
    return await useCase.execute(auth);
  }

  async update(id: string, dto: UpdateRestaurantDTO, auth: TenantContext) {
    const useCase = container.getUpdateRestaurantUseCase();
    return await useCase.execute(id, dto, auth);
  }

  async delete(id: string, auth: TenantContext) {
    const useCase = container.getDeleteRestaurantUseCase();
    return await useCase.execute(id, auth);
  }
}
