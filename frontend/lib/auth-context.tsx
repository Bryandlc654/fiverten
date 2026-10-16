'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  api,
  setAccessToken,
  type AuthResponse,
  type LoginPayload,
  type Organization,
  type RegisterPayload,
  type User,
} from './api';

interface AuthState {
  user: User | null;
  organization: Organization | null;
  role: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
}

interface AuthContextValue extends AuthState {
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  /** Vuelve a pedir la sesión al backend (p. ej. tras unirse a una empresa). */
  reloadSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const apply = useCallback((response: AuthResponse) => {
    setAccessToken(response.accessToken);
    setUser(response.user);
    setOrganization(response.organization);
    setRole(response.role);
  }, []);

  useEffect(() => {
    let active = true;
    api
      .refresh()
      .then((response) => {
        if (active) {
          apply(response);
        }
      })
      .catch(() => {
        if (active) {
          setAccessToken(null);
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [apply]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      apply(await api.login(payload));
    },
    [apply],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const response = await api.register(payload);
      // Si la verificación de correo es obligatoria el registro no emite sesión.
      if (response.accessToken) {
        apply(response);
      }
      return response;
    },
    [apply],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
      setOrganization(null);
      setRole(null);
    }
  }, []);

  const reloadSession = useCallback(async () => {
    apply(await api.refresh());
  }, [apply]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      organization,
      role,
      isLoading,
      isAuthenticated: user !== null,
      isSuperAdmin: user?.isSuperAdmin === true,
      login,
      register,
      logout,
      reloadSession,
    }),
    [user, organization, role, isLoading, login, register, logout, reloadSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
