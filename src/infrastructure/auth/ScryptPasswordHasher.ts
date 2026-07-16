import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { IPasswordHasher } from '@application/ports/IPasswordHasher';

const KEY_LENGTH = 64;

/**
 * Password hashing via node:crypto scrypt. Stored format:
 * `scrypt$<salt hex>$<derived key hex>`.
 */
export class ScryptPasswordHasher implements IPasswordHasher {
  async hash(plainText: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derived = await this.deriveKey(plainText, salt);
    return `scrypt$${salt}$${derived.toString('hex')}`;
  }

  async compare(plainText: string, hash: string): Promise<boolean> {
    const parts = hash.split('$');
    if (parts.length !== 3 || parts[0] !== 'scrypt') {
      return false;
    }

    const [, salt, storedHex] = parts;
    const stored = Buffer.from(storedHex, 'hex');
    const derived = await this.deriveKey(plainText, salt);

    return (
      stored.length === derived.length && timingSafeEqual(stored, derived)
    );
  }

  private deriveKey(plainText: string, salt: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      scrypt(plainText, salt, KEY_LENGTH, (error, derivedKey) => {
        if (error) {
          reject(error);
        } else {
          resolve(derivedKey);
        }
      });
    });
  }
}
