export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthUserDTO {
  id: string;
  restaurantId: string;
  email: string;
  name: string;
  role: string;
}

export interface LoginResultDTO {
  token: string;
  user: AuthUserDTO;
}
