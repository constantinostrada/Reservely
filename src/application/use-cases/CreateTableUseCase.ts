import { ITableRepository } from '@domain/repositories/ITableRepository';
import { TenantContext } from '../common/TenantContext';
import { CreateTableDTO, TableDTO } from '../dtos/TableDTO';
import { TableMapper } from '../mappers/TableMapper';

export class CreateTableUseCase {
  constructor(private readonly tableRepository: ITableRepository) {}

  async execute(
    dto: CreateTableDTO,
    context: TenantContext
  ): Promise<TableDTO> {
    // Check if table number already exists in this restaurant
    const existingTable = await this.tableRepository.findByTableNumber(
      context.restaurantId,
      dto.tableNumber
    );

    if (existingTable) {
      throw new Error(
        `Table number ${dto.tableNumber} already exists`
      );
    }

    // Map DTO to domain entity, scoped to the authenticated tenant
    const table = TableMapper.toDomain(dto, context.restaurantId);

    // Save the table
    const savedTable = await this.tableRepository.save(table);

    // Return DTO
    return TableMapper.toDTO(savedTable);
  }
}
