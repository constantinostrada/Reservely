export interface TokenPayload {
  userId: string;
  restaurantId: string;
  role: string;
}

export interface ITokenService {
  sign(payload: TokenPayload): string;
  /**
   * Returns the payload if the token is authentic and unexpired,
   * null otherwise.
   */
  verify(token: string): TokenPayload | null;
}
