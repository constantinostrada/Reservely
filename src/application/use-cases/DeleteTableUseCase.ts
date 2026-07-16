import { ITableRepository } from '@domain/repositories/ITableRepository';
import { EntityNotFoundException } from '@domain/exceptions/DomainException';
import { TenantContext } from '../common/TenantContext';
import { assertSameTenant } from '../common/tenantGuard';

export class DeleteTableUseCase {
  constructor(private readonly tableRepository: ITableRepository) {}

  async execute(id: string, context: TenantContext): Promise<void> {
    const table = await this.tableRepository.findById(id);

    if (!table) {
      throw new EntityNotFoundException('Table', id);
    }

    assertSameTenant(table.restaurantId, context);

    await this.tableRepository.delete(context.restaurantId, id);
  }
}
