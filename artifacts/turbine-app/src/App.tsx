import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { LoginGate } from "@/components/LoginGate";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Tasks from "@/pages/Tasks";
import TaskDetail from "@/pages/TaskDetail";
import CreateTask from "@/pages/CreateTask";
import AssetHistory from "@/pages/AssetHistory";
import NotFound from "@/pages/not-found";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import * as React from "react";

// ─── Query client ──────────────────────────────────────────────────────────
// A module-level ref lets the QueryClient call logout without needing React
// context at the time of creation.
let _logoutRef: (() => void) | null = null;
export function registerLogout(fn: () => void) {
  _logoutRef = fn;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      // Never retry on 401/403 — the token is bad and retrying wastes time.
      retry: (failureCount, error: unknown) => {
        const status = (error as { response?: { status?: number } })?.response
          ?.status;
        if (status === 401 || status === 403) return false;
        return failureCount < 1;
      },
    },
    mutations: {
      onError: (error: unknown) => {
        const status = (error as { response?: { status?: number } })?.response
          ?.status;
        if (status === 401) {
          console.warn(
            "[auth] 401 from mutation — clearing session",
          );
          _logoutRef?.();
        }
      },
    },
  },
});

// ─── Global 401 handler wired into QueryClient ───────────────────────────
queryClient.getQueryCache().subscribe((event) => {
  if (event.type === "updated" && event.action.type === "error") {
    const status = (
      event.action.error as { response?: { status?: number } }
    )?.response?.status;
    if (status === 401) {
      console.warn("[auth] 401 from query — clearing session");
      _logoutRef?.();
    }
  }
});

// ─── Auth connector ───────────────────────────────────────────────────────
// Registers the logout callback as soon as the AuthProvider is mounted so
// the QueryClient can call it when it detects a 401.
function AuthConnector() {
  const { logout } = useAuth();
  React.useEffect(() => {
    registerLogout(logout);
    return () => {
      _logoutRef = null;
    };
  }, [logout]);
  return null;
}

// ─── Router ───────────────────────────────────────────────────────────────
function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/tasks/:id" component={TaskDetail} />
        <Route path="/create-task" component={CreateTask} />
        <Route path="/history" component={AssetHistory} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────
function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthConnector />
          <TooltipProvider>
            <LoginGate>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
            </LoginGate>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
