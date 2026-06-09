import { useGameStore } from '@/store/gameStore'
import { Plus, Play, Pause, FastForward, SkipForward } from 'lucide-react'

export default function ActionPanel() {
  const speed = useGameStore((s) => s.speed)
  const setSpeed = useGameStore((s) => s.setSpeed)
  const isPaused = useGameStore((s) => s.isPaused)
  const toggleGamePause = useGameStore((s) => s.toggleGamePause)
  const addExtraSlot = useGameStore((s) => s.addExtraSlot)
  const extraSlotsUsed = useGameStore((s) => s.extraSlotsUsed)
  const maxExtraSlots = useGameStore((s) => s.maxExtraSlots)

  const speeds: (1 | 2 | 3)[] = [1, 2, 3]

  return (
    <div className="bg-slate-800/80 border-t border-slate-700 px-6 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleGamePause}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
            isPaused
              ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
              : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30'
          }`}
        >
          {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          {isPaused ? '继续' : '暂停'}
        </button>

        <div className="flex items-center gap-1">
          <FastForward className="w-4 h-4 text-slate-500" />
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                speed === s
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={addExtraSlot}
          disabled={extraSlotsUsed >= maxExtraSlots}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-violet-500/15 text-violet-400 border border-violet-500/30 hover:bg-violet-500/25 transition-all duration-200 disabled:opacity-30 disabled:hover:bg-violet-500/15"
        >
          <Plus className="w-4 h-4" />
          临时加场
          <span className="text-[10px] text-slate-500">
            ({maxExtraSlots - extraSlotsUsed}次剩余)
          </span>
        </button>

        <div className="flex items-center gap-1 text-xs text-slate-500">
          <SkipForward className="w-3.5 h-3.5" />
          <span>快捷键: 空格暂停, 1-3调速</span>
        </div>
      </div>
    </div>
  )
}
