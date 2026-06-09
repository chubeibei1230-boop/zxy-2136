import { useGameStore } from '@/store/gameStore'
import { AlertTriangle, Users, Clock, MessageSquareWarning } from 'lucide-react'

export default function PromptPanel() {
  const pressure = useGameStore((s) => s.pressure)
  const complaints = useGameStore((s) => s.complaints)
  const queue = useGameStore((s) => s.queue)
  const currentTime = useGameStore((s) => s.currentTime)
  const notifications = useGameStore((s) => s.notifications)

  const totalPeople = queue.reduce((s, g) => s + g.size, 0)
  const avgWait =
    queue.length > 0
      ? Math.round(queue.reduce((s, g) => s + (currentTime - g.arrivalTime), 0) / queue.length)
      : 0

  const impatientGroups = queue.filter(
    (g) => (currentTime - g.arrivalTime) / g.patience > 0.7
  )

  const pressureLevel =
    pressure > 70 ? 'high' : pressure > 40 ? 'medium' : 'low'

  const recentWarnings = notifications
    .filter((n) => n.type === 'warning' || n.type === 'danger')
    .slice(-5)

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 h-full flex flex-col">
      <h3 className="text-slate-300 font-semibold text-sm mb-3 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        提示员面板
      </h3>

      <div className="space-y-3 flex-1">
        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-xs">当前压力</span>
            <span
              className={`text-lg font-bold ${
                pressureLevel === 'high'
                  ? 'text-rose-400'
                  : pressureLevel === 'medium'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
              }`}
            >
              {Math.round(pressure)}%
            </span>
          </div>
          <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                pressureLevel === 'high'
                  ? 'bg-gradient-to-r from-rose-600 to-rose-400'
                  : pressureLevel === 'medium'
                    ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                    : 'bg-gradient-to-r from-emerald-600 to-emerald-400'
              }`}
              style={{ width: `${Math.min(100, pressure)}%` }}
            />
          </div>
          {pressureLevel === 'high' && (
            <p className="text-rose-400 text-[10px] mt-1.5 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              压力过高！请尽快安排接待或加场
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-900/50 rounded-lg p-2.5 text-center">
            <Users className="w-4 h-4 text-blue-400 mx-auto mb-1" />
            <div className="text-slate-200 text-lg font-bold">{totalPeople}</div>
            <div className="text-slate-500 text-[10px]">等待人数</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2.5 text-center">
            <Clock className="w-4 h-4 text-violet-400 mx-auto mb-1" />
            <div className="text-slate-200 text-lg font-bold">{avgWait}</div>
            <div className="text-slate-500 text-[10px]">平均等待(分)</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2.5 text-center">
            <MessageSquareWarning className="w-4 h-4 text-rose-400 mx-auto mb-1" />
            <div className="text-rose-300 text-lg font-bold">{complaints}</div>
            <div className="text-slate-500 text-[10px]">投诉数</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2.5 text-center">
            <AlertTriangle className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <div className="text-amber-300 text-lg font-bold">{impatientGroups.length}</div>
            <div className="text-slate-500 text-[10px]">即将投诉</div>
          </div>
        </div>

        {impatientGroups.length > 0 && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5">
            <p className="text-rose-400 text-[10px] font-medium mb-1">⚠ 急需安排</p>
            {impatientGroups.slice(0, 3).map((g) => (
              <p key={g.id} className="text-slate-400 text-[10px] truncate">
                {g.name} ({Math.round(currentTime - g.arrivalTime)}分)
              </p>
            ))}
          </div>
        )}

        {recentWarnings.length > 0 && (
          <div className="space-y-1">
            <p className="text-slate-500 text-[10px] font-medium">最近事件</p>
            {recentWarnings.map((w) => (
              <div
                key={w.id}
                className="text-[10px] text-slate-400 bg-slate-900/30 rounded px-2 py-1 truncate"
              >
                {w.message}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
