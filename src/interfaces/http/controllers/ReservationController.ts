import { container } from '@infrastructure/di/container';
import {
  CreateReservationDTO,
  UpdateReservationDTO,
} from '@application/dtos/ReservationDTO';
import { GetAvailabilityDTO } from '@application/dtos/AvailabilityDTO';
import { TenantContext } from '@application/common/TenantContext';

export class ReservationController {
  async create(dto: CreateReservationDTO, auth: TenantContext) {
    const useCase = container.getCreateReservationUseCase();
    return await useCase.execute(dto, auth);
  }

  async availability(dto: GetAvailabilityDTO, auth: TenantContext) {
    const useCase = container.getGetAvailabilityUseCase();
    return await useCase.execute(dto, auth);
  }

  async getById(id: string, auth: TenantContext) {
    const useCase = container.getGetReservationUseCase();
    return await useCase.execute(id, auth);
  }

  async list(auth: TenantContext) {
    const useCase = container.getListReservationsUseCase();
    return await useCase.execute(auth);
  }

  async modify(id: string, dto: UpdateReservationDTO, auth: TenantContext) {
    const useCase = container.getModifyReservationUseCase();
    return await useCase.execute(id, dto, auth);
  }

  async confirm(id: string, auth: TenantContext) {
    const useCase = container.getConfirmReservationUseCase();
    return await useCase.execute(id, auth);
  }

  async cancel(id: string, auth: TenantContext) {
    const useCase = container.getCancelReservationUseCase();
    return await useCase.execute(id, auth);
  }

  async sweepNoShows(auth: TenantContext) {
    const useCase = container.getMarkNoShowReservationsUseCase();
    return await useCase.execute(auth);
  }
}
