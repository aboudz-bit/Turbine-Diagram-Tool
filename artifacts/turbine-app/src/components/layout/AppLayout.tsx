import * as React from "react"
import { Link, useLocation } from "wouter"
import { LayoutDashboard, ListTodo, PlusCircle, History, Settings, Activity, LogOut, BarChart2, QrCode } from "lucide-react"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion } from "framer-motion"
import { useAuth } from "@/hooks/useAuth"
import { usePermissions } from "@/hooks/usePermissions"
import { NotificationBell } from "@/components/NotificationBell"
import { useSSE } from "@/hooks/useSSE"
import { BarcodeScanner } from "@/components/BarcodeScanner"

const ALL_NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, requireCreate: false },
  { href: "/tasks", label: "Task List", icon: ListTodo, requireCreate: false },
  { href: "/create-task", label: "Create Task", icon: PlusCircle, requireCreate: true },
  { href: "/analytics", label: "Analytics", icon: BarChart2, requireCreate: false },
  { href: "/history", label: "Asset History", icon: History, requireCreate: false },
]

function UserIdentity() {
  const { user, logout } = useAuth()
  if (!user) return null
  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="flex items-center gap-3">
      <div className="text-right hidden sm:block">
        <div className="text-sm font-semibold text-foreground">{user.name}</div>
        <div className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">{user.role.replace('_', ' ')}</div>
      </div>
      <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-display font-bold text-xs text-primary">
        {initials}
      </div>
      <button onClick={logout} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Sign out">
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  )
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()
  const { canCreateTask } = usePermissions()
  const sseStatus = useSSE()
  const [showScanner, setShowScanner] = React.useState(false)

  const navItems = ALL_NAV_ITEMS.filter(item => !item.requireCreate || canCreateTask)

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden w-[220px] flex-col border-r border-border bg-white md:flex z-10 relative">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-5 border-b border-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <div>
            <span className="font-display text-sm font-bold tracking-widest uppercase text-foreground">Turbine QC</span>
            <p className="text-[9px] font-mono text-muted-foreground tracking-wider uppercase -mt-0.5">SGT-9000HL</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 space-y-0.5">
          <p className="px-3 mb-3 text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">Navigation</p>
          {navItems.map((item) => {
            const isActive = location === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 relative group",
                  isActive
                    ? "bg-primary/8 text-primary border border-primary/15"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-full" />
                )}
                <item.icon className={cn(
                  "h-4 w-4 flex-shrink-0 transition-colors duration-150",
                  isActive ? "text-primary" : "text-muted-foreground/60 group-hover:text-foreground/70"
                )} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="px-3 py-4 border-t border-border">
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150 group">
            <Settings className="h-4 w-4 flex-shrink-0 group-hover:rotate-45 transition-transform duration-300" />
            System Settings
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Top Header Bar */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-white px-5 md:px-8 z-10 relative shadow-sm">
          {/* Mobile: logo */}
          <div className="flex items-center gap-3 md:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <span className="font-display font-bold tracking-widest uppercase text-foreground text-sm">Turbine QC</span>
          </div>

          {/* Desktop: System Online indicator with live SSE status */}
          <div className="hidden md:flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className={cn("flex h-1.5 w-1.5 rounded-full",
              sseStatus === "connected" ? "bg-emerald-500 animate-pulse" :
              sseStatus === "connecting" ? "bg-amber-500 animate-pulse" :
              "bg-emerald-500 animate-pulse"
            )} />
            {sseStatus === "connected" ? "Live" : sseStatus === "connecting" ? "Connecting..." : "System Online"}
          </div>

          {/* Right: Scanner + Notification bell + User identity */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowScanner(true)}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Scan QR Code"
            >
              <QrCode className="w-4 h-4" />
            </button>
            <NotificationBell />
            <UserIdentity />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-5 md:p-8 z-10 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="mx-auto max-w-7xl h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="flex h-16 items-center justify-around border-t border-border bg-white px-4 md:hidden z-20">
          {navItems.map((item) => {
            const isActive = location === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-full h-full transition-colors duration-150",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[9px] font-semibold tracking-wide uppercase">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* QR Scanner Overlay */}
      {showScanner && (
        <BarcodeScanner onClose={() => setShowScanner(false)} />
      )}
    </div>
  )
}
