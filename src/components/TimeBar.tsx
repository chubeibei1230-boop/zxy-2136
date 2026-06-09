import { useGameStore } from '@/store/gameStore'
import { formatTime, GAME_START, GAME_END, GAME_DURATION } from '@/types/game'
import { Clock, Gauge } from 'lucide-react'

export default function TimeBar() {
  const currentTime = useGameStore((s) => s.currentTime)
  const pressure = useGameStore((s) => s.pressure)
  const speed = useGameStore((s) => s.speed)
  const isPaused = useGameStore((s) => s.isPaused)

  const progress = ((currentTime - GAME_START) / GAME_DURATION) * 100

  const pressureColor =
    pressure > 70 ? 'text-rose-400' : pressure > 40 ? 'text-amber-400' : 'text-emerald-400'

  const pressureBg =
    pressure > 70 ? 'bg-rose-500' : pressure > 40 ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <div className="bg-slate-800/80 border-b border-slate-700 px-6 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <span className="text-slate-300 text-sm font-medium">
            {formatTime(currentTime)}
          </span>
          <span className="text-slate-500 text-xs">— {formatTime(GAME_END)}</span>
          {isPaused && (
            <span className="ml-2 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
              已暂停
            </span>
          )}
          <span className="ml-2 px-2 py-0.5 bg-slate-700 text-slate-400 text-xs rounded-full">
            {speed}x
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Gauge className={`w-4 h-4 ${pressureColor}`} />
          <span className={`text-sm font-bold ${pressureColor}`}>
            压力 {Math.round(pressure)}%
          </span>
          <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${pressureBg} transition-all duration-500 rounded-full`}
              style={{ width: `${Math.min(100, pressure)}%` }}
            />
          </div>
        </div>
      </div>
      <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-300 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
