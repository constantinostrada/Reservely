import { container } from '@infrastructure/di/container';
import { CreateTableDTO } from '@application/dtos/TableDTO';

export class TableController {
  async create(dto: CreateTableDTO) {
    const useCase = container.getCreateTableUseCase();
    return await useCase.execute(dto);
  }

  async list() {
    const useCase = container.getListTablesUseCase();
    return await useCase.execute();
  }
}
