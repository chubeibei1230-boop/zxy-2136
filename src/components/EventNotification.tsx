import { useGameStore } from '@/store/gameStore'
import { AlertTriangle, Bell, X } from 'lucide-react'

export default function EventNotification() {
  const notifications = useGameStore((s) => s.notifications)
  const dismissNotification = useGameStore((s) => s.dismissNotification)

  const recent = notifications.slice(-3)

  if (recent.length === 0) return null

  const typeConfig = {
    info: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      text: 'text-blue-300',
      icon: Bell,
    },
    warning: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-300',
      icon: AlertTriangle,
    },
    danger: {
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      text: 'text-rose-300',
      icon: AlertTriangle,
    },
  }

  return (
    <div className="absolute top-2 right-2 z-50 flex flex-col gap-2 w-72">
      {recent.map((notif) => {
        const config = typeConfig[notif.type]
        const Icon = config.icon
        return (
          <div
            key={notif.id}
            className={`${config.bg} border ${config.border} ${config.text} rounded-lg p-3 animate-slide-in flex items-start gap-2`}
          >
            <Icon className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="text-xs flex-1">{notif.message}</span>
            <button
              onClick={() => dismissNotification(notif.id)}
              className="shrink-0 hover:bg-white/5 rounded p-0.5 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
