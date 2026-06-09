import { useGameStore } from '@/store/gameStore'
import {
  AlertTriangle,
  Users,
  Clock,
  MessageSquareWarning,
  Zap,
  Crown,
  Bell,
  X,
  Info,
  CheckCircle2,
  Lightbulb,
} from 'lucide-react'
import type { StrategyTip, StrategyTipType } from '@/types/game'

const typeConfig: Record<StrategyTipType, {
  bg: string
  border: string
  title: string
  icon: string
  iconColor: string
}> = {
  danger: {
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/40',
    title: 'text-rose-300',
    icon: 'bg-rose-500/20',
    iconColor: 'text-rose-400',
  },
  warning: {
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/40',
    title: 'text-amber-300',
    icon: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
  },
  info: {
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    title: 'text-sky-300',
    icon: 'bg-sky-500/20',
    iconColor: 'text-sky-400',
  },
  success: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    title: 'text-emerald-300',
    icon: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
  },
}

function getTipIcon(type: StrategyTipType) {
  switch (type) {
    case 'danger':
      return <AlertTriangle className="w-3.5 h-3.5" />
    case 'warning':
      return <Bell className="w-3.5 h-3.5" />
    case 'success':
      return <CheckCircle2 className="w-3.5 h-3.5" />
    default:
      return <Lightbulb className="w-3.5 h-3.5" />
  }
}

function TipCard({ tip }: { tip: StrategyTip }) {
  const dismissStrategyTip = useGameStore((s) => s.dismissStrategyTip)
  const cfg = typeConfig[tip.type]

  return (
    <div
      className={`${cfg.bg} ${cfg.border} border rounded-lg p-2.5 relative group animate-[slideIn_0.3s_ease-out]`}
    >
      <button
        onClick={() => dismissStrategyTip(tip.id)}
        className="absolute top-1.5 right-1.5 w-4 h-4 flex items-center justify-center rounded text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-3 h-3" />
      </button>
      <div className="flex items-start gap-2 pr-3">
        <div className={`${cfg.icon} ${cfg.iconColor} w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5`}>
          {getTipIcon(tip.type)}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`${cfg.title} text-[11px] font-semibold mb-0.5 leading-tight`}>
            {tip.title}
          </p>
          <p className="text-slate-400 text-[10px] leading-relaxed">
            {tip.message}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function PromptPanel() {
  const pressure = useGameStore((s) => s.pressure)
  const complaints = useGameStore((s) => s.complaints)
  const queue = useGameStore((s) => s.queue)
  const currentTime = useGameStore((s) => s.currentTime)
  const notifications = useGameStore((s) => s.notifications)
  const strategyTips = useGameStore((s) => s.strategyTips)
  const difficulty = useGameStore((s) => s.difficulty)

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
    .slice(-3)

  const dangerTips = strategyTips.filter((t) => t.type === 'danger')
  const warningTips = strategyTips.filter((t) => t.type === 'warning')
  const infoTips = strategyTips.filter((t) => t.type === 'info' || t.type === 'success')
  const orderedTips = [...dangerTips, ...warningTips, ...infoTips]

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 h-full flex flex-col gap-3 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <h3 className="text-slate-300 font-semibold text-xs flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          提示员面板
        </h3>
        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
          difficulty === 'hard'
            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
        }`}>
          {difficulty === 'hard' ? '困难模式' : '普通模式'}
        </span>
      </div>

      <div className="space-y-2 shrink-0">
        <div className="bg-slate-900/50 rounded-lg p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-slate-400 text-[10px]">当前压力</span>
            <span
              className={`text-base font-bold ${
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
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
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
            <p className="text-rose-400 text-[9px] mt-1 flex items-center gap-1">
              <AlertTriangle className="w-2.5 h-2.5" />
              压力过高，立即采取行动
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <div className="bg-slate-900/50 rounded-lg p-2 text-center">
            <Users className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1" />
            <div className="text-slate-200 text-base font-bold leading-none">{totalPeople}</div>
            <div className="text-slate-500 text-[9px] mt-0.5">等待人数</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2 text-center">
            <Clock className="w-3.5 h-3.5 text-violet-400 mx-auto mb-1" />
            <div className="text-slate-200 text-base font-bold leading-none">{avgWait}</div>
            <div className="text-slate-500 text-[9px] mt-0.5">平均等待(分)</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2 text-center">
            <MessageSquareWarning className="w-3.5 h-3.5 text-rose-400 mx-auto mb-1" />
            <div className="text-rose-300 text-base font-bold leading-none">{complaints}</div>
            <div className="text-slate-500 text-[9px] mt-0.5">投诉数</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2 text-center">
            <Zap className="w-3.5 h-3.5 text-amber-400 mx-auto mb-1" />
            <div className="text-amber-300 text-base font-bold leading-none">{impatientGroups.length}</div>
            <div className="text-slate-500 text-[9px] mt-0.5">即将投诉</div>
          </div>
        </div>

        {impatientGroups.length > 0 && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-2">
            <p className="text-rose-400 text-[10px] font-semibold mb-1 flex items-center gap-1">
              <Crown className="w-3 h-3" />
              急需优先安排
            </p>
            {impatientGroups.slice(0, 2).map((g) => (
              <p key={g.id} className="text-slate-400 text-[10px] truncate">
                {g.isVip && '⭐ '}
                {g.name}
                <span className="text-rose-400 ml-1">
                  ({Math.round(currentTime - g.arrivalTime)}分)
                </span>
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-1.5 shrink-0">
          <p className="text-slate-400 text-[10px] font-semibold flex items-center gap-1">
            <Info className="w-3 h-3" />
            策略提示
          </p>
          <span className="text-[9px] text-slate-600">
            {orderedTips.length > 0 ? `${orderedTips.length}条` : '暂无'}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
          {orderedTips.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
              <p className="text-slate-600 text-[10px]">
                当前局势平稳
              </p>
              <p className="text-slate-600/70 text-[9px] mt-0.5">
                保持良好调度节奏
              </p>
            </div>
          ) : (
            orderedTips.map((tip) => <TipCard key={tip.id} tip={tip} />)
          )}
        </div>
      </div>

      {recentWarnings.length > 0 && (
        <div className="shrink-0 pt-2 border-t border-slate-700/50">
          <p className="text-slate-500 text-[9px] font-medium mb-1">最近事件</p>
          <div className="space-y-1">
            {recentWarnings.map((w) => (
              <div
                key={w.id}
                className={`text-[10px] rounded px-2 py-1 truncate ${
                  w.type === 'danger'
                    ? 'bg-rose-500/10 text-rose-400/80'
                    : 'bg-amber-500/10 text-amber-400/80'
                }`}
              >
                {w.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
