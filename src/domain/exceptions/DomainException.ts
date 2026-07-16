export class DomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainException';
    Object.setPrototypeOf(this, DomainException.prototype);
  }
}

export class EntityNotFoundException extends DomainException {
  constructor(entityName: string, id: string) {
    super(`${entityName} with id ${id} not found`);
    this.name = 'EntityNotFoundException';
    Object.setPrototypeOf(this, EntityNotFoundException.prototype);
  }
}

export class InvalidOperationException extends DomainException {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidOperationException';
    Object.setPrototypeOf(this, InvalidOperationException.prototype);
  }
}

export class ValidationException extends DomainException {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationException';
    Object.setPrototypeOf(this, ValidationException.prototype);
  }
}

export class UnauthorizedException extends DomainException {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedException';
    Object.setPrototypeOf(this, UnauthorizedException.prototype);
  }
}

export class ForbiddenException extends DomainException {
  constructor(message: string = 'Access to this resource is forbidden') {
    super(message);
    this.name = 'ForbiddenException';
    Object.setPrototypeOf(this, ForbiddenException.prototype);
  }
}
