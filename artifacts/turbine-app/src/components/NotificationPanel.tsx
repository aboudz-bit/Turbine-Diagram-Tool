import * as React from "react"
import { Bell, BellOff, CheckCheck, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { useLocation } from "wouter"

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

interface NotificationPanelProps {
  notifications: RawNotification[]
  onRefetch: () => void
  onClose: () => void
}

const TYPE_STYLES: Record<string, { dot: string; badge: string }> = {
  task_assigned: { dot: "bg-blue-500", badge: "text-blue-700 bg-blue-50" },
  task_submitted: { dot: "bg-purple-500", badge: "text-purple-700 bg-purple-50" },
  task_rejected: { dot: "bg-red-500", badge: "text-red-700 bg-red-50" },
  task_revision_needed: { dot: "bg-amber-500", badge: "text-amber-700 bg-amber-50" },
  task_approved: { dot: "bg-emerald-500", badge: "text-emerald-700 bg-emerald-50" },
  task_overdue: { dot: "bg-orange-500", badge: "text-orange-700 bg-orange-50" },
}

async function markOneRead(id: number): Promise<void> {
  const token = localStorage.getItem("turbine_auth_token")
  await fetch(`/api/notifications/${id}/read`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  })
}

async function markAllRead(): Promise<void> {
  const token = localStorage.getItem("turbine_auth_token")
  await fetch("/api/notifications/read-all", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  })
}

export const NotificationPanel = React.forwardRef<
  HTMLDivElement,
  NotificationPanelProps
>(({ notifications, onRefetch, onClose }, ref) => {
  const [, navigate] = useLocation()
  const [marking, setMarking] = React.useState(false)

  const handleMarkAll = async () => {
    setMarking(true)
    try {
      await markAllRead()
      onRefetch()
    } finally {
      setMarking(false)
    }
  }

  const handleClickNotification = async (n: RawNotification) => {
    if (!n.isRead) {
      await markOneRead(n.id).catch(() => {})
      onRefetch()
    }
    if (n.taskId) {
      navigate(`/tasks/${n.taskId}`)
      onClose()
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-[360px] max-h-[480px] flex flex-col bg-white border border-border rounded-xl shadow-xl z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            disabled={marking}
            className="flex items-center gap-1.5 text-[11px] text-primary font-medium hover:text-primary/70 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* Notification list */}
      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
            <BellOff className="w-8 h-8 opacity-30" />
            <p className="text-xs font-medium">No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => {
            const style = TYPE_STYLES[n.type] ?? { dot: "bg-gray-400", badge: "text-gray-600 bg-gray-50" }
            return (
              <button
                key={n.id}
                onClick={() => handleClickNotification(n)}
                className={cn(
                  "w-full text-left px-4 py-3 transition-colors hover:bg-muted/50 flex gap-3 items-start",
                  !n.isRead && "bg-primary/[0.03]"
                )}
              >
                {/* Unread dot */}
                <div className="flex-shrink-0 mt-1.5">
                  <div className={cn("w-2 h-2 rounded-full", !n.isRead ? style.dot : "bg-transparent border border-border")} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full", style.badge)}>
                      {n.type.replace(/_/g, " ")}
                    </span>
                    {n.taskId && (
                      <ExternalLink className="w-2.5 h-2.5 text-muted-foreground/50" />
                    )}
                  </div>
                  <p className={cn("text-xs font-medium text-foreground leading-snug", !n.isRead ? "font-semibold" : "font-medium")}>
                    {n.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                    {n.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </button>
            )
          })
        )}
      </div>

      {notifications.length > 0 && (
        <div className="px-4 py-2.5 border-t border-border bg-muted/20 text-center">
          <span className="text-[10px] text-muted-foreground">
            Showing {notifications.length} most recent notification{notifications.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}
    </div>
  )
})
NotificationPanel.displayName = "NotificationPanel"
