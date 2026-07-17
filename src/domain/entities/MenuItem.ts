export interface MenuItemProps {
  id?: string;
  restaurantId: string;
  name: string;
  description?: string;
  category: string;
  /** Price in integer cents of the restaurant's currency. */
  priceCents: number;
  isAvailable: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class MenuItem {
  private readonly props: MenuItemProps;

  constructor(props: MenuItemProps) {
    this.validateProps(props);
    this.props = {
      ...props,
      id: props.id || this.generateId(),
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  private validateProps(props: MenuItemProps): void {
    if (!props.restaurantId || props.restaurantId.trim().length === 0) {
      throw new Error('Restaurant id is required');
    }

    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Menu item name is required');
    }

    if (props.name.length > 100) {
      throw new Error('Menu item name must not exceed 100 characters');
    }

    if (!props.category || props.category.trim().length === 0) {
      throw new Error('Menu item category is required');
    }

    if (props.category.length > 50) {
      throw new Error('Category must not exceed 50 characters');
    }

    if (props.description && props.description.length > 500) {
      throw new Error('Description must not exceed 500 characters');
    }

    if (!Number.isInteger(props.priceCents) || props.priceCents < 0) {
      throw new Error('Price must be a non-negative integer amount in cents');
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Getters
  get id(): string {
    return this.props.id!;
  }

  get restaurantId(): string {
    return this.props.restaurantId;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get category(): string {
    return this.props.category;
  }

  get priceCents(): number {
    return this.props.priceCents;
  }

  get isAvailable(): boolean {
    return this.props.isAvailable;
  }

  get createdAt(): Date {
    return this.props.createdAt!;
  }

  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  // Business methods

  /**
   * Applies a partial update, re-running the entity invariants.
   * The name's uniqueness within the restaurant is checked by the use case
   * (it needs the repository); size/format rules live here.
   */
  public updateDetails(changes: {
    name?: string;
    description?: string;
    category?: string;
    priceCents?: number;
  }): void {
    const next: MenuItemProps = {
      ...this.props,
      name: changes.name ?? this.props.name,
      description: changes.description ?? this.props.description,
      category: changes.category ?? this.props.category,
      priceCents: changes.priceCents ?? this.props.priceCents,
    };
    this.validateProps(next);

    this.props.name = next.name;
    this.props.description = next.description;
    this.props.category = next.category;
    this.props.priceCents = next.priceCents;
    this.props.updatedAt = new Date();
  }

  public makeAvailable(): void {
    this.props.isAvailable = true;
    this.props.updatedAt = new Date();
  }

  public makeUnavailable(): void {
    this.props.isAvailable = false;
    this.props.updatedAt = new Date();
  }
}
