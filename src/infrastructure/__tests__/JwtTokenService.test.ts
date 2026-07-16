import { JwtTokenService } from '../auth/JwtTokenService';
import { ScryptPasswordHasher } from '../auth/ScryptPasswordHasher';

describe('JwtTokenService', () => {
  const service = new JwtTokenService('test-secret', 3600);

  const payload = {
    userId: 'user-1',
    restaurantId: 'rest-1',
    role: 'owner',
  };

  it('round-trips a payload through sign/verify', () => {
    const token = service.sign(payload);
    expect(service.verify(token)).toEqual(payload);
  });

  it('rejects a tampered token', () => {
    const token = service.sign(payload);
    const [header] = token.split('.');
    const tamperedBody = Buffer.from(
      JSON.stringify({
        sub: 'user-1',
        userId: 'user-1',
        restaurantId: 'rest-2', // tenant swapped
        role: 'owner',
        iat: 0,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
      'utf8'
    ).toString('base64url');
    const tampered = `${header}.${tamperedBody}.${token.split('.')[2]}`;

    expect(service.verify(tampered)).toBeNull();
  });

  it('rejects a token signed with a different secret', () => {
    const other = new JwtTokenService('other-secret', 3600);
    expect(service.verify(other.sign(payload))).toBeNull();
  });

  it('rejects an expired token', () => {
    const expired = new JwtTokenService('test-secret', -10);
    expect(service.verify(expired.sign(payload))).toBeNull();
  });

  it('rejects malformed tokens', () => {
    expect(service.verify('not-a-jwt')).toBeNull();
    expect(service.verify('a.b')).toBeNull();
    expect(service.verify('')).toBeNull();
  });
});

describe('ScryptPasswordHasher', () => {
  const hasher = new ScryptPasswordHasher();

  it('verifies a correct password', async () => {
    const hash = await hasher.hash('secret123');
    await expect(hasher.compare('secret123', hash)).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hasher.hash('secret123');
    await expect(hasher.compare('wrong', hash)).resolves.toBe(false);
  });

  it('rejects malformed stored hashes', async () => {
    await expect(hasher.compare('secret123', 'garbage')).resolves.toBe(false);
  });
});
