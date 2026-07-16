import { ITableRepository } from '@domain/repositories/ITableRepository';
import { TenantContext } from '../common/TenantContext';
import { TableListDTO } from '../dtos/TableDTO';
import { TableMapper } from '../mappers/TableMapper';

export class ListTablesUseCase {
  constructor(private readonly tableRepository: ITableRepository) {}

  async execute(context: TenantContext): Promise<TableListDTO> {
    const tables = await this.tableRepository.findAll(context.restaurantId);

    return {
      tables: TableMapper.toDTOList(tables),
      total: tables.length,
    };
  }
}
