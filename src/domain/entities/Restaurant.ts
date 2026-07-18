import { ValidationException } from '../exceptions/DomainException';

export interface RestaurantProps {
  id?: string;
  name: string;
  slug: string;
  timezone?: string;
  currency?: string;
  address?: string;
  phone?: string;
  /**
   * Minutes past a reservation's start time before an unseated guest is
   * considered a no-show and the table is released.
   */
  noShowGraceMinutes?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RestaurantUpdate {
  name?: string;
  timezone?: string;
  currency?: string;
  address?: string;
  phone?: string;
  noShowGraceMinutes?: number;
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;

export const DEFAULT_NO_SHOW_GRACE_MINUTES = 15;
const MAX_NO_SHOW_GRACE_MINUTES = 24 * 60;

export class Restaurant {
  private readonly props: Required<
    Pick<
      RestaurantProps,
      'id' | 'name' | 'slug' | 'timezone' | 'currency' | 'noShowGraceMinutes'
    >
  > &
    RestaurantProps;

  constructor(props: RestaurantProps) {
    const normalized = {
      ...props,
      id: props.id || this.generateId(),
      timezone: props.timezone || 'UTC',
      currency: props.currency || 'USD',
      noShowGraceMinutes:
        props.noShowGraceMinutes ?? DEFAULT_NO_SHOW_GRACE_MINUTES,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
    this.validateProps(normalized);
    this.props = normalized;
  }

  private validateProps(props: RestaurantProps): void {
    if (!props.name || props.name.trim().length === 0) {
      throw new ValidationException('Restaurant name is required');
    }

    if (props.name.length > 100) {
      throw new ValidationException(
        'Restaurant name must not exceed 100 characters'
      );
    }

    if (!props.slug || !SLUG_PATTERN.test(props.slug)) {
      throw new ValidationException(
        'Slug must contain only lowercase letters, numbers and hyphens'
      );
    }

    if (props.slug.length > 50) {
      throw new ValidationException('Slug must not exceed 50 characters');
    }

    if (props.timezone !== undefined && props.timezone.trim().length === 0) {
      throw new ValidationException('Timezone must not be empty');
    }

    if (
      props.currency !== undefined &&
      !CURRENCY_PATTERN.test(props.currency)
    ) {
      throw new ValidationException(
        'Currency must be a 3-letter ISO 4217 code (e.g. USD)'
      );
    }

    if (props.address && props.address.length > 200) {
      throw new ValidationException('Address must not exceed 200 characters');
    }

    if (props.phone && props.phone.length > 30) {
      throw new ValidationException('Phone must not exceed 30 characters');
    }

    if (props.noShowGraceMinutes !== undefined) {
      if (
        !Number.isInteger(props.noShowGraceMinutes) ||
        props.noShowGraceMinutes < 0 ||
        props.noShowGraceMinutes > MAX_NO_SHOW_GRACE_MINUTES
      ) {
        throw new ValidationException(
          `No-show grace period must be an integer between 0 and ${MAX_NO_SHOW_GRACE_MINUTES} minutes`
        );
      }
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get slug(): string {
    return this.props.slug;
  }

  get timezone(): string {
    return this.props.timezone;
  }

  get currency(): string {
    return this.props.currency;
  }

  get address(): string | undefined {
    return this.props.address;
  }

  get phone(): string | undefined {
    return this.props.phone;
  }

  /** Minutes past a reservation's start before an unseated guest is a no-show. */
  get noShowGraceMinutes(): number {
    return this.props.noShowGraceMinutes;
  }

  get createdAt(): Date {
    return this.props.createdAt!;
  }

  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  // Business methods

  /**
   * Applies a partial update. The slug is intentionally immutable — it is
   * the restaurant's public identifier.
   */
  public updateDetails(changes: RestaurantUpdate): void {
    const next: RestaurantProps = {
      ...this.props,
      name: changes.name ?? this.props.name,
      timezone: changes.timezone ?? this.props.timezone,
      currency: changes.currency ?? this.props.currency,
      address: changes.address ?? this.props.address,
      phone: changes.phone ?? this.props.phone,
      noShowGraceMinutes:
        changes.noShowGraceMinutes ?? this.props.noShowGraceMinutes,
    };
    this.validateProps(next);

    this.props.name = next.name;
    this.props.timezone = next.timezone!;
    this.props.currency = next.currency!;
    this.props.address = next.address;
    this.props.phone = next.phone;
    this.props.noShowGraceMinutes = next.noShowGraceMinutes!;
    this.props.updatedAt = new Date();
  }
}
