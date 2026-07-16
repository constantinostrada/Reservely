import { createHmac, timingSafeEqual } from 'crypto';
import {
  ITokenService,
  TokenPayload,
} from '@application/ports/ITokenService';

interface JwtClaims extends TokenPayload {
  sub: string;
  iat: number;
  exp: number;
}

/**
 * HS256 JWT implementation on top of node:crypto — no external
 * dependencies. Tokens carry the tenant (restaurantId) so it is resolved
 * once at login and verified on every request.
 */
export class JwtTokenService implements ITokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresInSeconds: number
  ) {
    if (!secret || secret.length === 0) {
      throw new Error('JWT secret must not be empty');
    }
  }

  sign(payload: TokenPayload): string {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const claims: JwtClaims = {
      sub: payload.userId,
      userId: payload.userId,
      restaurantId: payload.restaurantId,
      role: payload.role,
      iat: nowSeconds,
      exp: nowSeconds + this.expiresInSeconds,
    };

    const header = this.base64UrlEncode(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' })
    );
    const body = this.base64UrlEncode(JSON.stringify(claims));
    const signature = this.signInput(`${header}.${body}`);

    return `${header}.${body}.${signature}`;
  }

  verify(token: string): TokenPayload | null {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [header, body, signature] = parts;
    const expected = this.signInput(`${header}.${body}`);

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return null;
    }

    let claims: JwtClaims;
    try {
      claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    } catch {
      return null;
    }

    if (!claims.exp || claims.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    if (!claims.userId || !claims.restaurantId || !claims.role) {
      return null;
    }

    return {
      userId: claims.userId,
      restaurantId: claims.restaurantId,
      role: claims.role,
    };
  }

  private signInput(input: string): string {
    return createHmac('sha256', this.secret).update(input).digest('base64url');
  }

  private base64UrlEncode(value: string): string {
    return Buffer.from(value, 'utf8').toString('base64url');
  }
}
