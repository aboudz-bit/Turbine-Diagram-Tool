import * as React from "react"
import { Link, useLocation } from "wouter"
import { LayoutDashboard, ListTodo, PlusCircle, History, Settings, Menu, X, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/core"
import { AnimatePresence, motion } from "framer-motion"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Task List", icon: ListTodo },
  { href: "/create-task", label: "Create Task", icon: PlusCircle },
  { href: "/history", label: "Asset History", icon: History },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-white/5 bg-card/50 backdrop-blur-xl md:flex z-10 relative">
        <div className="flex h-16 items-center gap-3 px-6 border-b border-white/5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
            <Activity className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-bold tracking-wider uppercase text-foreground">Turbine QC</span>
        </div>
        
        <nav className="flex-1 space-y-2 p-4">
          <div className="mb-4 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Menu</div>
          {navItems.map((item) => {
            const isActive = location === item.href
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-primary/10 text-primary shadow-[inset_2px_0_0_0_hsl(var(--primary))]" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
                {item.label}
              </Link>
            )
          })}
        </nav>
        
        <div className="p-4 border-t border-white/5">
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all">
            <Settings className="h-5 w-5" />
            System Settings
          </button>
        </div>
      </aside>

      {/* Mobile Header & Bottom Nav */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Subtle background image/effect */}
        <div 
          className="absolute inset-0 z-0 opacity-20 pointer-events-none mix-blend-overlay"
          style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/dashboard-bg.png)`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        />

        <header className="flex h-16 items-center justify-between border-b border-white/5 bg-card/80 backdrop-blur-md px-4 md:px-8 z-10 relative">
          <div className="flex items-center gap-3 md:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <Activity className="h-5 w-5" />
            </div>
            <span className="font-display font-bold tracking-wider uppercase text-foreground">Turbine QC</span>
          </div>
          
          <div className="hidden md:flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            System Online
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-foreground">Admin User</div>
              <div className="text-xs text-muted-foreground">Site Manager</div>
            </div>
            <div className="h-9 w-9 rounded-full bg-secondary border border-white/10 flex items-center justify-center font-display font-bold text-sm text-foreground">
              AU
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 z-10 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="mx-auto max-w-7xl h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="flex h-16 items-center justify-around border-t border-white/5 bg-card/90 backdrop-blur-lg px-4 md:hidden z-20">
          {navItems.map((item) => {
            const isActive = location === item.href
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-full h-full",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_8px_rgba(29,78,216,0.8)]")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
