import { container } from '@infrastructure/di/container';
import { CreateTableDTO } from '@application/dtos/TableDTO';
import { TenantContext } from '@application/common/TenantContext';

export class TableController {
  async create(dto: CreateTableDTO, auth: TenantContext) {
    const useCase = container.getCreateTableUseCase();
    return await useCase.execute(dto, auth);
  }

  async list(auth: TenantContext) {
    const useCase = container.getListTablesUseCase();
    return await useCase.execute(auth);
  }
}
