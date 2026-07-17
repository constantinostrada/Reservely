'use client';

/**
 * Session state for the authenticated area. Loads the current user once via
 * /api/auth/me and exposes it through useAuth(). The token itself lives in an
 * httpOnly cookie, so "who is logged in" is only knowable by asking the API.
 * An invalid/expired session redirects to /login.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { AuthUserDTO } from '@application/dtos/AuthDTO';
import { api } from '../api/client';
import { ApiError, toError } from '../api/http';

interface AuthContextValue {
  user: AuthUserDTO;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const router = useRouter();
  const [user, setUser] = useState<AuthUserDTO | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setUser(await api.auth.me());
    } catch (err) {
      if (err instanceof ApiError && err.isUnauthorized) {
        router.replace('/login');
        return;
      }
      setError(toError(err));
    }
  }, [router]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await api.auth.logout();
    router.replace('/login');
  }, [router]);

  if (error) {
    return (
      <p role="alert" style={{ padding: '2rem' }}>
        Could not load your session: {error.message}
      </p>
    );
  }

  if (!user) {
    return <p style={{ padding: '2rem' }}>Loading…</p>;
  }

  return (
    <AuthContext.Provider value={{ user, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Current session; only usable inside the authenticated (app) layout. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
