import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { SessionUser } from '@tamizh/core/types';
import { api } from './api';
import { session } from './session';

/**
 * Who is signed in.
 *
 * The token itself lives in the keychain (session.ts) and goes out on every
 * request; this keeps the account it belongs to, checked against the server
 * once at start-up so a deleted or blocked account does not linger.
 */

interface AuthResponse {
  user: SessionUser;
  /** Present because every request asks for bearer transport. */
  token?: string;
}

interface AuthContextValue {
  user: SessionUser | null;
  /** True until the stored token has been checked at start-up. */
  checking: boolean;
  signIn: (input: { email: string; password: string }) => Promise<SessionUser>;
  register: (input: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<SessionUser>;
  signOut: () => Promise<void>;
  /** For screens that change the account (profile edit): the new user and token. */
  setSignedIn: (response: AuthResponse) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checking, setChecking] = useState(Boolean(session.token));

  useEffect(() => {
    if (!session.token) return;
    api
      .get<{ user: SessionUser | null }>('/api/auth/me')
      .then(async ({ user: current }) => {
        if (current) setUser(current);
        else await session.setToken(null);
      })
      .catch(() => {
        // Offline at start-up: keep the token and try again on the next request.
      })
      .finally(() => setChecking(false));
  }, []);

  const setSignedIn = useCallback(
    async (response: AuthResponse) => {
      if (response.token) await session.setToken(response.token);
      setUser(response.user);
      // The guest cart was folded into the account on the server.
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    [queryClient],
  );

  const signIn = useCallback<AuthContextValue['signIn']>(
    async (input) => {
      const response = await api.post<AuthResponse>('/api/auth/login', input);
      await setSignedIn(response);
      return response.user;
    },
    [setSignedIn],
  );

  const register = useCallback<AuthContextValue['register']>(
    async (input) => {
      const response = await api.post<AuthResponse>('/api/auth/register', input);
      await setSignedIn(response);
      return response.user;
    },
    [setSignedIn],
  );

  const signOut = useCallback(async () => {
    await session.setToken(null);
    await session.setCoupon(null);
    setUser(null);
    // Everything personal goes; the catalogue stays.
    queryClient.removeQueries({ queryKey: ['cart'] });
    queryClient.removeQueries({ queryKey: ['account'] });
  }, [queryClient]);

  const value = useMemo(
    () => ({ user, checking, signIn, register, signOut, setSignedIn }),
    [user, checking, signIn, register, signOut, setSignedIn],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>.');
  return value;
}
