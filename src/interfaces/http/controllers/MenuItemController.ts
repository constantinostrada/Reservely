import { container } from '@infrastructure/di/container';
import {
  CreateMenuItemDTO,
  UpdateMenuItemDTO,
} from '@application/dtos/MenuItemDTO';
import { TenantContext } from '@application/common/TenantContext';

export class MenuItemController {
  async create(dto: CreateMenuItemDTO, auth: TenantContext) {
    const useCase = container.getCreateMenuItemUseCase();
    return await useCase.execute(dto, auth);
  }

  async getById(id: string, auth: TenantContext) {
    const useCase = container.getGetMenuItemUseCase();
    return await useCase.execute(id, auth);
  }

  async list(auth: TenantContext) {
    const useCase = container.getListMenuItemsUseCase();
    return await useCase.execute(auth);
  }

  async update(id: string, dto: UpdateMenuItemDTO, auth: TenantContext) {
    const useCase = container.getUpdateMenuItemUseCase();
    return await useCase.execute(id, dto, auth);
  }

  async delete(id: string, auth: TenantContext) {
    const useCase = container.getDeleteMenuItemUseCase();
    return await useCase.execute(id, auth);
  }
}
