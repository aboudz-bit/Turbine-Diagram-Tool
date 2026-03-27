import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
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
import { queryClient, registerLogout } from "@/lib/queryClient";

// ─── Auth connector ───────────────────────────────────────────────────────
// Registers the logout callback so the QueryClient can call it on 401.
function AuthConnector() {
  const { logout } = useAuth();
  React.useEffect(() => {
    registerLogout(logout);
    return () => {
      registerLogout(() => {});
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
