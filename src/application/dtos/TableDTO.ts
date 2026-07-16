export interface CreateTableDTO {
  tableNumber: number;
  capacity: number;
  location?: string;
}

export interface UpdateTableDTO {
  tableNumber?: number;
  capacity?: number;
  location?: string;
  status?: string;
}

export interface TableDTO {
  id: string;
  restaurantId: string;
  tableNumber: number;
  capacity: number;
  location?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface TableListDTO {
  tables: TableDTO[];
  total: number;
}
