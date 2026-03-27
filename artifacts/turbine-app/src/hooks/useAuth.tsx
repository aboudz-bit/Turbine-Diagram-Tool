import * as React from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { clearQueryCache } from "@/lib/queryClient";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (userId: number) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = React.createContext<AuthContextValue>({
  user: null,
  token: null,
  login: async () => {},
  logout: () => {},
  isLoading: true,
});

const TOKEN_KEY = "turbine_auth_token";
const USER_KEY = "turbine_auth_user";

function clearStorage() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload.exp) return false;
    return Date.now() / 1000 > payload.exp;
  } catch {
    return true;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [token, setToken] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      // Dev-only: ?devUser=N forces a switch to that user ID for screenshot validation
      const urlDevUser = new URLSearchParams(window.location.search).get("devUser");

      let savedToken = localStorage.getItem(TOKEN_KEY);
      let savedUser = localStorage.getItem(USER_KEY);

      if (urlDevUser) {
        const storedUser = savedUser ? JSON.parse(savedUser) : null;
        if (!storedUser || storedUser.id !== Number(urlDevUser)) {
          // Clear existing session and re-login as the requested user
          clearStorage();
          savedToken = null;
          savedUser = null;
          try {
            const res = await fetch("/api/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: Number(urlDevUser) }),
            });
            if (res.ok) {
              const data: { token: string; user: AuthUser } = await res.json();
              localStorage.setItem(TOKEN_KEY, data.token);
              localStorage.setItem(USER_KEY, JSON.stringify(data.user));
              savedToken = data.token;
            }
          } catch {
            // Ignore — fall through to normal login screen
          }
        }
      }

      // Register the token getter immediately so API calls have auth headers
      setAuthTokenGetter(() => localStorage.getItem(TOKEN_KEY));

      if (!savedToken || !savedUser) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      // Client-side expiry check — avoids unnecessary network roundtrip
      if (isTokenExpired(savedToken)) {
        console.warn("[auth] Stored token is expired — clearing session");
        clearStorage();
        if (!cancelled) setIsLoading(false);
        return;
      }

      // Verify the token is still accepted by the server
      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${savedToken}` },
        });

        if (!res.ok) {
          console.warn(
            `[auth] /auth/me returned ${res.status} — clearing session`,
          );
          clearStorage();
          if (!cancelled) setIsLoading(false);
          return;
        }

        const serverUser: AuthUser = await res.json();

        if (!cancelled) {
          // Update localStorage with fresh user data from server
          localStorage.setItem(USER_KEY, JSON.stringify(serverUser));
          setToken(savedToken);
          setUser(serverUser);
        }
      } catch (err) {
        console.error("[auth] /auth/me network error during bootstrap:", err);
        // Network error: keep cached session so the app still works
        try {
          const cachedUser = JSON.parse(savedUser);
          if (!cancelled) {
            setToken(savedToken);
            setUser(cachedUser);
          }
        } catch {
          clearStorage();
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = React.useCallback(async (userId: number) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        (body as { error?: string }).error ?? `Login failed (${res.status})`,
      );
    }

    const data: { token: string; user: AuthUser } = await res.json();

    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    clearQueryCache();
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = React.useCallback(() => {
    clearStorage();
    clearQueryCache();
    setToken(null);
    setUser(null);
  }, []);

  const value = React.useMemo(
    () => ({ user, token, login, logout, isLoading }),
    [user, token, login, logout, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return React.useContext(AuthContext);
}
