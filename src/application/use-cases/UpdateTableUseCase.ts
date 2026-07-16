import { ITableRepository } from '@domain/repositories/ITableRepository';
import {
  ConflictException,
  EntityNotFoundException,
} from '@domain/exceptions/DomainException';
import { TableStatus } from '@domain/value-objects/TableStatus';
import { TenantContext } from '../common/TenantContext';
import { assertSameTenant } from '../common/tenantGuard';
import { UpdateTableDTO, TableDTO } from '../dtos/TableDTO';
import { TableMapper } from '../mappers/TableMapper';

export class UpdateTableUseCase {
  constructor(private readonly tableRepository: ITableRepository) {}

  async execute(
    id: string,
    dto: UpdateTableDTO,
    context: TenantContext
  ): Promise<TableDTO> {
    const table = await this.tableRepository.findById(id);

    if (!table) {
      throw new EntityNotFoundException('Table', id);
    }

    assertSameTenant(table.restaurantId, context);

    if (
      dto.tableNumber !== undefined &&
      dto.tableNumber !== table.tableNumber
    ) {
      const existing = await this.tableRepository.findByTableNumber(
        context.restaurantId,
        dto.tableNumber
      );

      if (existing) {
        throw new ConflictException(
          `Table number ${dto.tableNumber} already exists`
        );
      }
    }

    table.updateDetails({
      tableNumber: dto.tableNumber,
      capacity: dto.capacity,
      location: dto.location,
    });

    if (dto.status !== undefined) {
      table.changeStatus(TableStatus.fromString(dto.status));
    }

    const updated = await this.tableRepository.update(table);

    return TableMapper.toDTO(updated);
  }
}
