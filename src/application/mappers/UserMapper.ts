import { User } from '@domain/entities/User';
import { AuthUserDTO } from '../dtos/AuthDTO';

export class UserMapper {
  static toAuthUserDTO(user: User): AuthUserDTO {
    return {
      id: user.id,
      restaurantId: user.restaurantId,
      email: user.email.value,
      name: user.name,
      role: user.role.value,
    };
  }
}
