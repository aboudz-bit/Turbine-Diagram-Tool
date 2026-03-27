import * as React from "react"
import { Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { NotificationPanel } from "./NotificationPanel"

interface RawNotification {
  id: number
  userId: number
  taskId: number | null
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

async function fetchNotifications(): Promise<RawNotification[]> {
  const token = localStorage.getItem("turbine_auth_token")
  const res = await fetch("/api/notifications", {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return []
  return res.json()
}

export function NotificationBell() {
  const [open, setOpen] = React.useState(false)
  const bellRef = React.useRef<HTMLButtonElement>(null)
  const panelRef = React.useRef<HTMLDivElement>(null)

  const [panelStyle, setPanelStyle] = React.useState<React.CSSProperties>({})

  const { data: notifications = [], refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    refetchInterval: 30_000,
    staleTime: 15_000,
  })

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const handleToggle = () => {
    if (!open && bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect()
      setPanelStyle({
        position: "fixed",
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
        zIndex: 9999,
      })
    }
    setOpen((v) => !v)
  }

  // Close on outside click
  React.useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  // Close on Escape key
  React.useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open])

  return (
    <>
      <button
        ref={bellRef}
        onClick={handleToggle}
        className={cn(
          "relative p-2 rounded-lg transition-colors",
          open
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        title={`${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="w-[18px] h-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center text-[9px] font-bold bg-red-500 text-white rounded-full px-1 leading-none pointer-events-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationPanel
          ref={panelRef}
          style={panelStyle}
          notifications={notifications}
          onRefetch={refetch}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
