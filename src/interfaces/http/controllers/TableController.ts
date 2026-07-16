import { container } from '@infrastructure/di/container';
import { CreateTableDTO, UpdateTableDTO } from '@application/dtos/TableDTO';
import { TenantContext } from '@application/common/TenantContext';

export class TableController {
  async create(dto: CreateTableDTO, auth: TenantContext) {
    const useCase = container.getCreateTableUseCase();
    return await useCase.execute(dto, auth);
  }

  async getById(id: string, auth: TenantContext) {
    const useCase = container.getGetTableUseCase();
    return await useCase.execute(id, auth);
  }

  async list(auth: TenantContext) {
    const useCase = container.getListTablesUseCase();
    return await useCase.execute(auth);
  }

  async update(id: string, dto: UpdateTableDTO, auth: TenantContext) {
    const useCase = container.getUpdateTableUseCase();
    return await useCase.execute(id, dto, auth);
  }

  async delete(id: string, auth: TenantContext) {
    const useCase = container.getDeleteTableUseCase();
    return await useCase.execute(id, auth);
  }
}
