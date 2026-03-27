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
  const [open, setOpen] = React.useState(() =>
    new URLSearchParams(window.location.search).has("notifOpen")
  )
  const panelRef = React.useRef<HTMLDivElement>(null)
  const bellRef = React.useRef<HTMLButtonElement>(null)

  const { data: notifications = [], refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    refetchInterval: 30_000,
    staleTime: 15_000,
  })

  const unreadCount = notifications.filter((n) => !n.isRead).length

  // Close panel when clicking outside
  React.useEffect(() => {
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
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  return (
    <div className="relative">
      <button
        ref={bellRef}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative p-2 rounded-lg transition-colors",
          open
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        title={`${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`}
        aria-label="Notifications"
      >
        <Bell className="w-4.5 h-4.5 w-[18px] h-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center text-[9px] font-bold bg-red-500 text-white rounded-full px-1 leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationPanel
          ref={panelRef}
          notifications={notifications}
          onRefetch={refetch}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}
