import * as React from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, Button } from "@/components/ui/core";
import { Activity, Eye, EyeOff, AlertCircle, ChevronDown, ChevronUp, User, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const DEMO_ACCOUNTS = [
  { username: "ahmed.alrashidi", name: "Ahmed Al-Rashidi", role: "Engineer" },
  { username: "sarah.mitchell",  name: "Sarah Mitchell",  role: "Supervisor" },
  { username: "khalid.hamdan",   name: "Khalid Hamdan",   role: "Technician" },
  { username: "omar.farouq",     name: "Omar Farouq",     role: "Technician" },
  { username: "priya.nair",      name: "Priya Nair",      role: "Technician" },
] as const;

export function LoginGate({ children }: { children: React.ReactNode }) {
  const { user, login, loginWithCredentials, isLoading: authLoading } = useAuth();

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [rememberMe, setRememberMe] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showDemo, setShowDemo] = React.useState(true);

  // Incremented on every logout so stale in-flight responses are discarded.
  const generationRef = React.useRef(0);

  // Reset form state on logout (user → null)
  React.useEffect(() => {
    if (!user) {
      generationRef.current += 1;
      setLoading(false);
      setError(null);
    }
  }, [user]);

  // Dev-only: ?devUser=N auto-logs in for screenshot/validation
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const devUserId = params.get("devUser");
    if (devUserId && !authLoading && user?.id !== Number(devUserId)) {
      login(Number(devUserId)).catch(() => {});
    }
  }, [authLoading, user, login]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const trimmed = username.trim();
    if (!trimmed) { setError("Please enter your username."); return; }
    if (!password) { setError("Please enter your password."); return; }

    const generation = generationRef.current;
    setLoading(true);
    setError(null);

    try {
      await loginWithCredentials(trimmed, password, rememberMe);
    } catch (err) {
      if (generationRef.current === generation) {
        setError(err instanceof Error ? err.message : "Login failed. Please try again.");
        setLoading(false);
      }
    }
  };

  const fillDemo = (u: typeof DEMO_ACCOUNTS[number]) => {
    setUsername(u.username);
    setPassword("Demo@2024");
    setError(null);
  };

  // One-click demo login — instantly authenticates the selected demo account
  const quickLogin = async (u: typeof DEMO_ACCOUNTS[number]) => {
    if (loading) return;
    const generation = generationRef.current;
    setUsername(u.username);
    setPassword("Demo@2024");
    setError(null);
    setLoading(true);
    try {
      await loginWithCredentials(u.username, "Demo@2024", false);
    } catch (err) {
      if (generationRef.current === generation) {
        setError(err instanceof Error ? err.message : "Login failed. Please try again.");
        setLoading(false);
      }
    }
  };

  // Full-screen spinner while restoring session
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Authenticated — render the app
  if (user) return <>{children}</>;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-sm space-y-3">
        <Card className="p-8 space-y-6">
          {/* Logo + title */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <h1 className="font-display font-bold text-lg text-foreground">
              Turbine QC
            </h1>
            <p className="text-xs text-muted-foreground">
              Sign in to continue
            </p>
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-xs text-destructive leading-snug">{error}</p>
              </div>
            )}

            {/* Username */}
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-xs font-medium text-foreground">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError(null); }}
                  placeholder="e.g. ahmed.alrashidi"
                  disabled={loading}
                  className={cn(
                    "w-full pl-8 pr-3 py-2 text-sm rounded-lg border bg-background transition-colors outline-none",
                    "border-border focus:border-primary focus:ring-2 focus:ring-primary/10",
                    "placeholder:text-muted-foreground/50 disabled:opacity-50 disabled:cursor-not-allowed",
                  )}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(null); }}
                  placeholder="••••••••"
                  disabled={loading}
                  className={cn(
                    "w-full pl-8 pr-9 py-2 text-sm rounded-lg border bg-background transition-colors outline-none",
                    "border-border focus:border-primary focus:ring-2 focus:ring-primary/10",
                    "placeholder:text-muted-foreground/50 disabled:opacity-50 disabled:cursor-not-allowed",
                  )}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword
                    ? <EyeOff className="w-3.5 h-3.5" />
                    : <Eye className="w-3.5 h-3.5" />
                  }
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none group">
              <div className="relative flex-shrink-0">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  disabled={loading}
                  className="sr-only"
                />
                <div className={cn(
                  "w-4 h-4 rounded border transition-colors",
                  rememberMe
                    ? "bg-primary border-primary"
                    : "border-border bg-background group-hover:border-primary/50",
                  loading && "opacity-50",
                )}>
                  {rememberMe && (
                    <svg className="w-3 h-3 text-primary-foreground mx-auto mt-0.5" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                Keep me signed in for 30 days
              </span>
            </label>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current" />
                  Signing in…
                </span>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </Card>

        {/* Demo accounts panel — quick login */}
        <Card className="overflow-hidden">
          <button
            type="button"
            onClick={() => setShowDemo(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/40 transition-colors"
          >
            <span className="text-xs font-medium text-muted-foreground">Quick login</span>
            {showDemo
              ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
              : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            }
          </button>

          {showDemo && (
            <div className="border-t border-border">
              <div className="divide-y divide-border">
                {DEMO_ACCOUNTS.map(account => (
                  <button
                    key={account.username}
                    type="button"
                    disabled={loading}
                    onClick={() => quickLogin(account)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-primary/5 transition-colors text-left group disabled:opacity-50"
                  >
                    <div>
                      <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">{account.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{account.username}</p>
                    </div>
                    <span className={cn(
                      "text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded",
                      account.role === "Engineer"   && "bg-blue-500/10 text-blue-600",
                      account.role === "Supervisor"  && "bg-purple-500/10 text-purple-600",
                      account.role === "Technician"  && "bg-green-500/10 text-green-600",
                    )}>
                      {account.role}
                    </span>
                  </button>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-border">
                <p className="text-[10px] text-muted-foreground text-center">
                  Click any account to sign in instantly
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
