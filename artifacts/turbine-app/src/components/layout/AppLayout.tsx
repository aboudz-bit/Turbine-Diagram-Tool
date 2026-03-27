import * as React from "react"
import { Link, useLocation } from "wouter"
import { LayoutDashboard, ListTodo, PlusCircle, History, Settings, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion } from "framer-motion"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Task List", icon: ListTodo },
  { href: "/create-task", label: "Create Task", icon: PlusCircle },
  { href: "/history", label: "Asset History", icon: History },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden w-[220px] flex-col border-r border-white/[0.06] bg-card/30 backdrop-blur-xl md:flex z-10 relative">
        {/* Sidebar subtle gradient depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent pointer-events-none" />

        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-5 border-b border-white/[0.06] relative">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 border border-primary/20">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <div>
            <span className="font-display text-sm font-bold tracking-widest uppercase text-foreground">Turbine QC</span>
            <p className="text-[9px] font-mono text-muted-foreground/50 tracking-wider uppercase -mt-0.5">SGT-9000HL</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 space-y-0.5 relative">
          <p className="px-3 mb-3 text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40">Navigation</p>
          {navItems.map((item) => {
            const isActive = location === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 relative group",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground/70 hover:bg-white/[0.04] hover:text-foreground"
                )}
              >
                {/* Active left border */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-full shadow-[0_0_6px_rgba(59,130,246,0.6)]" />
                )}
                <item.icon className={cn(
                  "h-4 w-4 flex-shrink-0 transition-colors duration-200",
                  isActive ? "text-primary" : "text-muted-foreground/50 group-hover:text-foreground/70"
                )} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="px-3 py-4 border-t border-white/[0.06] relative">
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground/50 hover:bg-white/[0.04] hover:text-foreground transition-all duration-200 group">
            <Settings className="h-4 w-4 flex-shrink-0 group-hover:rotate-45 transition-transform duration-300" />
            System Settings
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Subtle background overlay */}
        <div
          className="absolute inset-0 z-0 opacity-[0.15] pointer-events-none mix-blend-overlay"
          style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/dashboard-bg.png)`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        />

        {/* Top Header Bar */}
        <header className="flex h-16 items-center justify-between border-b border-white/[0.06] bg-card/60 backdrop-blur-md px-5 md:px-8 z-10 relative">
          {/* Mobile: logo */}
          <div className="flex items-center gap-3 md:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 border border-primary/20">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <span className="font-display font-bold tracking-widest uppercase text-foreground text-sm">Turbine QC</span>
          </div>

          {/* Desktop: System Online indicator */}
          <div className="hidden md:flex items-center gap-2 text-xs font-medium text-muted-foreground/60">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(52,211,153,0.6)] animate-pulse" />
            System Online
          </div>

          {/* User identity */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-foreground/90">Admin User</div>
              <div className="text-[10px] text-muted-foreground/50 font-medium tracking-wide uppercase">Site Manager</div>
            </div>
            <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-display font-bold text-xs text-primary">
              AU
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-5 md:p-8 z-10 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="mx-auto max-w-7xl h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="flex h-16 items-center justify-around border-t border-white/[0.06] bg-card/90 backdrop-blur-lg px-4 md:hidden z-20">
          {navItems.map((item) => {
            const isActive = location === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-full h-full transition-colors duration-200",
                  isActive ? "text-primary" : "text-muted-foreground/50 hover:text-foreground/70"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[9px] font-semibold tracking-wide uppercase">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
