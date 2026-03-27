import * as React from "react";
import { useAuth } from "@/hooks/useAuth";
import { useListUsers } from "@workspace/api-client-react";
import { Card, Button } from "@/components/ui/core";
import { Activity, ChevronRight, RefreshCw, AlertCircle } from "lucide-react";

export function LoginGate({ children }: { children: React.ReactNode }) {
  const { user, login, isLoading: authLoading } = useAuth();

  const {
    data: users,
    isLoading: usersLoading,
    isError: usersError,
    refetch,
  } = useListUsers(
    user ? { query: { enabled: false } } : undefined,
  );

  const [loggingIn, setLoggingIn] = React.useState<number | null>(null);
  const [loginError, setLoginError] = React.useState<string | null>(null);

  // Show a full-screen spinner while auth state is being restored from storage
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Authenticated — render the app
  if (user) {
    return <>{children}</>;
  }

  const handleLogin = async (userId: number) => {
    setLoggingIn(userId);
    setLoginError(null);
    try {
      await login(userId);
    } catch (err) {
      setLoginError(
        err instanceof Error ? err.message : "Login failed. Please try again.",
      );
      setLoggingIn(null);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-sm p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <h1 className="font-display font-bold text-lg text-foreground">
            Turbine QC
          </h1>
          <p className="text-xs text-muted-foreground">
            Select your account to continue
          </p>
        </div>

        {usersLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : usersError ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 space-y-3 text-center">
            <AlertCircle className="w-5 h-5 text-destructive mx-auto" />
            <p className="text-xs text-destructive font-medium">
              Unable to reach the server
            </p>
            <p className="text-[11px] text-muted-foreground">
              Check your connection and try again.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => refetch()}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </Button>
          </div>
        ) : !users?.length ? (
          <div className="text-center py-4 text-xs text-muted-foreground">
            No accounts found. Please seed the database.
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => handleLogin(u.id)}
                disabled={loggingIn !== null}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left group disabled:opacity-50"
              >
                <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-display font-bold text-xs text-primary flex-shrink-0">
                  {loggingIn === u.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                  ) : (
                    u.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">
                    {u.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    {u.role.replace("_", " ")}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>
        )}

        {loginError && (
          <p className="text-xs text-destructive text-center -mt-2">
            {loginError}
          </p>
        )}
      </Card>
    </div>
  );
}
