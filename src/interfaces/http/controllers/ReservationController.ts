import { container } from '@infrastructure/di/container';
import { CreateReservationDTO } from '@application/dtos/ReservationDTO';

export class ReservationController {
  async create(dto: CreateReservationDTO) {
    const useCase = container.getCreateReservationUseCase();
    return await useCase.execute(dto);
  }

  async getById(id: string) {
    const useCase = container.getGetReservationUseCase();
    return await useCase.execute(id);
  }

  async list() {
    const useCase = container.getListReservationsUseCase();
    return await useCase.execute();
  }

  async confirm(id: string) {
    const useCase = container.getConfirmReservationUseCase();
    return await useCase.execute(id);
  }

  async cancel(id: string) {
    const useCase = container.getCancelReservationUseCase();
    return await useCase.execute(id);
  }
}
