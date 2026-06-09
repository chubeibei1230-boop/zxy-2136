import type { ReceptionPoint as RP } from '@/types/game'
import { formatTime, calculateServiceTime } from '@/types/game'
import { useGameStore } from '@/store/gameStore'
import { DoorOpen, DoorClosed, Wrench, Pause, Clock, Timer } from 'lucide-react'

interface ReceptionPointProps {
  point: RP
  currentTime: number
}

export default function ReceptionPoint({ point, currentTime }: ReceptionPointProps) {
  const togglePause = useGameStore((s) => s.togglePause)

  const statusConfig = {
    idle: {
      icon: DoorOpen,
      label: '空闲',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      dot: 'bg-emerald-500',
    },
    busy: {
      icon: DoorClosed,
      label: '接待中',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
      dot: 'bg-blue-500',
    },
    maintenance: {
      icon: Wrench,
      label: '维护中',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      dot: 'bg-amber-500',
    },
    paused: {
      icon: Pause,
      label: '已暂停',
      bg: 'bg-slate-500/10',
      border: 'border-slate-500/30',
      text: 'text-slate-400',
      dot: 'bg-slate-500',
    },
  }

  const config = statusConfig[point.status]
  const Icon = config.icon

  const remaining = point.finishTime ? Math.max(0, Math.round(point.finishTime - currentTime)) : 0
  const total = point.currentGroup ? calculateServiceTime(point.currentGroup.size) : 0
  const progress = total > 0 ? ((total - remaining) / total) * 100 : 0

  const maintRemaining = point.maintenanceUntil
    ? Math.max(0, Math.round(point.maintenanceUntil - currentTime))
    : 0

  return (
    <div
      className={`${config.bg} border ${config.border} rounded-xl p-4 transition-all duration-300 relative overflow-hidden`}
    >
      {point.isTemporary && (
        <div className="absolute top-0 right-0 bg-amber-500/20 text-amber-400 text-[9px] px-2 py-0.5 rounded-bl-lg">
          临时
          {point.temporaryUntil && (
            <span className="ml-1">
              {Math.max(0, Math.round(point.temporaryUntil - currentTime))}分
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${config.dot} animate-pulse`} />
        <span className="text-slate-200 font-medium text-sm">{point.name}</span>
        <span className={`text-xs ${config.text} ml-auto flex items-center gap-1`}>
          <Icon className="w-3 h-3" />
          {config.label}
        </span>
      </div>

      {point.status === 'busy' && point.currentGroup && (
        <div className="space-y-2">
          <div className="text-xs text-slate-400">
            <span className="text-slate-300 font-medium">{point.currentGroup.name}</span>
            <span className="ml-2">{point.currentGroup.size}人</span>
          </div>
          <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-1000 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Clock className="w-3 h-3" />
            <span>剩余 {remaining} 分</span>
            <span className="ml-auto">
              完成 {formatTime(point.finishTime!)}
            </span>
          </div>
        </div>
      )}

      {point.status === 'maintenance' && (
        <div className="space-y-2">
          <div className="flex items-center gap-1 text-xs text-amber-400">
            <Timer className="w-3 h-3" />
            <span>恢复还需 {maintRemaining} 分</span>
          </div>
          <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full"
              style={{
                width: `${point.maintenanceUntil ? ((currentTime - (point.maintenanceUntil - (point.maintenanceUntil - currentTime))) / point.maintenanceUntil) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {point.status === 'idle' && (
        <button
          onClick={() => togglePause(point.id)}
          className="mt-1 w-full py-1.5 text-xs bg-slate-700/50 text-slate-400 rounded-lg hover:bg-slate-700 transition-colors"
        >
          暂停接待
        </button>
      )}

      {point.status === 'paused' && (
        <button
          onClick={() => togglePause(point.id)}
          className="mt-1 w-full py-1.5 text-xs bg-emerald-500/15 text-emerald-400 rounded-lg hover:bg-emerald-500/25 transition-colors"
        >
          恢复接待
        </button>
      )}
    </div>
  )
}
