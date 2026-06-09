import type { VisitorGroup } from '@/types/game'
import { formatTime } from '@/types/game'
import { useGameStore } from '@/store/gameStore'
import { Users, ChevronUp, ChevronDown, Star } from 'lucide-react'

interface QueueCardProps {
  group: VisitorGroup
  index: number
  total: number
}

export default function QueueCard({ group, index, total }: QueueCardProps) {
  const moveInQueue = useGameStore((s) => s.moveInQueue)
  const assignToReception = useGameStore((s) => s.assignToReception)
  const receptionPoints = useGameStore((s) => s.receptionPoints)
  const currentTime = useGameStore((s) => s.currentTime)

  const waitTime = currentTime - group.arrivalTime
  const patienceRatio = Math.min(1, waitTime / group.patience)
  const isImpatient = patienceRatio > 0.7

  const borderColor = group.isVip
    ? 'border-l-amber-400'
    : isImpatient
      ? 'border-l-rose-500'
      : group.type === 'tour'
        ? 'border-l-violet-500'
        : 'border-l-slate-500'

  const typeLabel =
    group.type === 'tour' ? '大型团' : group.type === 'group' ? '团队' : '散客'

  const idlePoints = receptionPoints.filter((p) => p.status === 'idle')

  return (
    <div
      className={`bg-slate-800 border ${borderColor} border-l-4 rounded-lg p-3 transition-all duration-200 hover:shadow-lg hover:shadow-slate-900/50 group cursor-grab active:cursor-grabbing`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            {group.isVip && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
            <span className="text-slate-200 text-sm font-medium truncate">
              {group.name}
            </span>
            <span
              className={`px-1.5 py-0.5 text-[10px] rounded-full font-medium ${
                group.type === 'tour'
                  ? 'bg-violet-500/20 text-violet-300'
                  : group.type === 'group'
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'bg-slate-600/50 text-slate-400'
              }`}
            >
              {typeLabel}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {group.size}人
            </span>
            <span>到达 {formatTime(group.arrivalTime)}</span>
            <span className={isImpatient ? 'text-rose-400 font-medium' : ''}>
              等待 {Math.round(waitTime)}分
            </span>
          </div>
          <div className="mt-1.5 w-full h-1 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                patienceRatio > 0.7
                  ? 'bg-rose-500'
                  : patienceRatio > 0.4
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
              }`}
              style={{ width: `${patienceRatio * 100}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <button
            onClick={() => moveInQueue(group.id, 'up')}
            disabled={index === 0}
            className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button
            onClick={() => moveInQueue(group.id, 'down')}
            disabled={index === total - 1}
            className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {idlePoints.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {idlePoints.map((point) => (
            <button
              key={point.id}
              onClick={() => assignToReception(group.id, point.id)}
              className="px-2 py-1 text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded hover:bg-emerald-500/25 transition-colors"
            >
              → {point.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
