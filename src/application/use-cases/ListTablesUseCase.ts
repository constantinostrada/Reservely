import { ITableRepository } from '@domain/repositories/ITableRepository';
import { TableListDTO } from '../dtos/TableDTO';
import { TableMapper } from '../mappers/TableMapper';

export class ListTablesUseCase {
  constructor(private readonly tableRepository: ITableRepository) {}

  async execute(): Promise<TableListDTO> {
    const tables = await this.tableRepository.findAll();

    return {
      tables: TableMapper.toDTOList(tables),
      total: tables.length,
    };
  }
}
