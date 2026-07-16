import { ITableRepository } from '@domain/repositories/ITableRepository';
import { EntityNotFoundException } from '@domain/exceptions/DomainException';
import { TenantContext } from '../common/TenantContext';
import { assertSameTenant } from '../common/tenantGuard';
import { TableDTO } from '../dtos/TableDTO';
import { TableMapper } from '../mappers/TableMapper';

export class GetTableUseCase {
  constructor(private readonly tableRepository: ITableRepository) {}

  async execute(id: string, context: TenantContext): Promise<TableDTO> {
    const table = await this.tableRepository.findById(id);

    if (!table) {
      throw new EntityNotFoundException('Table', id);
    }

    assertSameTenant(table.restaurantId, context);

    return TableMapper.toDTO(table);
  }
}
