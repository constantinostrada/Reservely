import { Email } from '../value-objects/Email';
import { UserRole } from '../value-objects/UserRole';

export interface UserProps {
  id?: string;
  restaurantId: string;
  email: Email;
  name: string;
  role: UserRole;
  passwordHash?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class User {
  private readonly props: UserProps;

  constructor(props: UserProps) {
    this.validateProps(props);
    this.props = {
      ...props,
      id: props.id || this.generateId(),
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  private validateProps(props: UserProps): void {
    if (!props.restaurantId || props.restaurantId.trim().length === 0) {
      throw new Error('Restaurant id is required');
    }

    if (!props.name || props.name.trim().length === 0) {
      throw new Error('User name is required');
    }

    if (props.name.length > 100) {
      throw new Error('User name must not exceed 100 characters');
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  get id(): string {
    return this.props.id!;
  }

  get restaurantId(): string {
    return this.props.restaurantId;
  }

  get email(): Email {
    return this.props.email;
  }

  get name(): string {
    return this.props.name;
  }

  get role(): UserRole {
    return this.props.role;
  }

  get passwordHash(): string | undefined {
    return this.props.passwordHash;
  }

  get createdAt(): Date {
    return this.props.createdAt!;
  }

  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  public canLogin(): boolean {
    return !!this.props.passwordHash;
  }

  public belongsTo(restaurantId: string): boolean {
    return this.props.restaurantId === restaurantId;
  }
}
