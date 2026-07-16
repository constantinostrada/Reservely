type UserRoleValue = 'owner' | 'manager' | 'staff';

export class UserRole {
  private readonly _value: UserRoleValue;

  private constructor(value: UserRoleValue) {
    this._value = value;
  }

  static owner(): UserRole {
    return new UserRole('owner');
  }

  static manager(): UserRole {
    return new UserRole('manager');
  }

  static staff(): UserRole {
    return new UserRole('staff');
  }

  static fromString(value: string): UserRole {
    const normalizedValue = value.toLowerCase();
    switch (normalizedValue) {
      case 'owner':
        return UserRole.owner();
      case 'manager':
        return UserRole.manager();
      case 'staff':
        return UserRole.staff();
      default:
        throw new Error(`Invalid user role: ${value}`);
    }
  }

  get value(): UserRoleValue {
    return this._value;
  }

  public isOwner(): boolean {
    return this._value === 'owner';
  }

  public isManager(): boolean {
    return this._value === 'manager';
  }

  public isStaff(): boolean {
    return this._value === 'staff';
  }

  public equals(other: UserRole): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }
}
