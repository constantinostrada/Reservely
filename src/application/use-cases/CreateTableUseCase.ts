import { ITableRepository } from '@domain/repositories/ITableRepository';
import { CreateTableDTO, TableDTO } from '../dtos/TableDTO';
import { TableMapper } from '../mappers/TableMapper';

export class CreateTableUseCase {
  constructor(private readonly tableRepository: ITableRepository) {}

  async execute(dto: CreateTableDTO): Promise<TableDTO> {
    // Check if table number already exists
    const existingTable = await this.tableRepository.findByTableNumber(
      dto.tableNumber
    );

    if (existingTable) {
      throw new Error(
        `Table number ${dto.tableNumber} already exists`
      );
    }

    // Map DTO to domain entity
    const table = TableMapper.toDomain(dto);

    // Save the table
    const savedTable = await this.tableRepository.save(table);

    // Return DTO
    return TableMapper.toDTO(savedTable);
  }
}
