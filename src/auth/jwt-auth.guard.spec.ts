import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard, type AuthenticatedRequest } from './jwt-auth.guard.js';

describe('JwtAuthGuard', () => {
  const jwt = { verify: vi.fn() } as unknown as JwtService;
  const guard = new JwtAuthGuard(jwt);
  const createContext = (request: Partial<AuthenticatedRequest>) =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    }) as never;

  it('rejects requests without a bearer token', () => {
    expect(() => guard.canActivate(createContext({ headers: {} }))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects invalid tokens', () => {
    vi.mocked(jwt.verify).mockImplementation(() => {
      throw new Error('invalid token');
    });

    expect(() =>
      guard.canActivate(
        createContext({
          headers: { authorization: 'Bearer invalid' },
        } as never),
      ),
    ).toThrow(UnauthorizedException);
  });

  it('attaches the verified account ID to the request', () => {
    const request = {
      headers: { authorization: 'Bearer valid' },
    } as Partial<AuthenticatedRequest>;
    vi.mocked(jwt.verify).mockReturnValue({ sub: 'user-1' } as never);

    expect(guard.canActivate(createContext(request))).toBe(true);
    expect(request.user).toEqual({ sub: 'user-1' });
  });

  it('rejects signed tokens without an account ID', () => {
    vi.mocked(jwt.verify).mockReturnValue({} as never);

    expect(() =>
      guard.canActivate(
        createContext({ headers: { authorization: 'Bearer valid' } } as never),
      ),
    ).toThrow(UnauthorizedException);
  });
});
