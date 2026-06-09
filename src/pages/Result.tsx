import { useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import type { GameResult, EfficiencyMetric, LossPointItem, KeyAction, ImprovementSuggestion } from '@/types/game'
import { formatTime } from '@/types/game'
import { loadBestScore } from '@/utils/storage'
import { getScoreRating } from '@/utils/scoring'
import { analyzeDispatchPerformance } from '@/utils/strategy'
import { useGameStore } from '@/store/gameStore'
import {
  Trophy,
  Home,
  RotateCcw,
  Clock,
  MessageSquareWarning,
  Users,
  Star,
  ChevronDown,
  ChevronRight,
  Crown,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Target,
  Zap,
  Award,
  ArrowUpRight,
  Clock3,
  ThumbsUp,
  ThumbsDown,
  Minus,
  CalendarDays,
} from 'lucide-react'

const ratingColors: Record<EfficiencyMetric['rating'], {
  bg: string
  border: string
  text: string
  bar: string
  label: string
}> = {
  excellent: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    bar: 'bg-emerald-500',
    label: '优秀',
  },
  good: {
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    text: 'text-sky-400',
    bar: 'bg-sky-500',
    label: '良好',
  },
  average: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    bar: 'bg-amber-500',
    label: '一般',
  },
  poor: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    text: 'text-rose-400',
    bar: 'bg-rose-500',
    label: '待提升',
  },
}

function ScoreCounter({ target, duration = 1200, prefix = '', suffix = '' }: {
  target: number
  duration?: number
  prefix?: string
  suffix?: string
}) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    const start = Date.now()
    const animate = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [target, duration])

  return (
    <span>
      {prefix}
      {value.toLocaleString()}
      {suffix}
    </span>
  )
}

function SectionHeader({ icon, title, subtitle, accent }: {
  icon: React.ReactNode
  title: string
  subtitle?: string
  accent?: string
}) {
  return (
    <div className="flex items-start gap-2.5 mb-3">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${accent || 'bg-slate-700/60'}`}>
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-200 leading-tight">{title}</h3>
        {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

function ScoreBreakdownItem({ label, points, detail, positive }: {
  label: string
  points: number
  detail: string
  positive?: boolean
}) {
  const isPositive = positive ?? points >= 0
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-700/40 last:border-0">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
        isPositive ? 'bg-emerald-500/15' : 'bg-rose-500/15'
      }`}>
        {isPositive
          ? <TrendingUp className="w-4 h-4 text-emerald-400" />
          : <TrendingDown className="w-4 h-4 text-rose-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-sm font-medium text-slate-300">{label}</span>
          <span className={`text-base font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPositive ? '+' : ''}{points}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">{detail}</p>
      </div>
    </div>
  )
}

function LossPointCard({ item }: { item: LossPointItem }) {
  const percent = Math.min(100, (item.points / item.maxPoints) * 100)
  return (
    <div className="bg-slate-900/40 rounded-xl p-3.5 border border-slate-700/40">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="text-sm font-semibold text-slate-200 truncate">{item.label}</span>
        </div>
        <span className="text-rose-400 font-bold text-base shrink-0">-{item.points}</span>
      </div>
      <div className="w-full h-1.5 bg-slate-700/60 rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-full transition-all duration-700"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed">{item.detail}</p>
    </div>
  )
}

function KeyActionCard({ action }: { action: KeyAction }) {
  const impactCfg = {
    positive: { icon: <ThumbsUp className="w-3.5 h-3.5" />, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
    negative: { icon: <ThumbsDown className="w-3.5 h-3.5" />, color: 'text-rose-400', bg: 'bg-rose-500/15' },
    neutral: { icon: <Minus className="w-3.5 h-3.5" />, color: 'text-slate-400', bg: 'bg-slate-600/40' },
  }[action.impact]

  const typeIcon = {
    assign: <Users className="w-3.5 h-3.5" />,
    reorder: <ArrowUpRight className="w-3.5 h-3.5" />,
    extra: <Zap className="w-3.5 h-3.5" />,
    pause: <Clock3 className="w-3.5 h-3.5" />,
    resume: <CheckCircle2 className="w-3.5 h-3.5" />,
  }[action.type]

  return (
    <div className="flex items-start gap-2.5 py-2">
      <div className="text-[10px] text-slate-500 w-10 shrink-0 pt-1 text-right font-mono">
        {formatTime(action.time)}
      </div>
      <div className="w-7 h-7 rounded-lg bg-slate-700/50 flex items-center justify-center shrink-0 text-slate-400">
        {typeIcon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-sm font-medium text-slate-200">{action.label}</span>
          {action.impactValue > 0 && (
            <span className={`${impactCfg.bg} ${impactCfg.color} text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-0.5`}>
              {impactCfg.icon}
              {action.impactValue}
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-500 truncate">{action.detail}</p>
      </div>
    </div>
  )
}

function EfficiencyMetricCard({ metric }: { metric: EfficiencyMetric }) {
  const cfg = ratingColors[metric.rating]
  const ratio = Math.min(1.5, metric.value / Math.max(1, metric.benchmark))
  const percent = metric.label.includes('投诉') || metric.label.includes('等待')
    ? Math.max(0, 100 - (ratio - 0.5) * 100)
    : Math.min(100, ratio * 80)

  return (
    <div className={`${cfg.bg} ${cfg.border} border rounded-xl p-3`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-[11px] text-slate-400 mb-0.5">{metric.label}</p>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl font-bold ${cfg.text}`}>
              {metric.value}
              {metric.unit && <span className="text-xs font-medium ml-0.5 opacity-70">{metric.unit}</span>}
            </span>
          </div>
        </div>
        <span className={`${cfg.bg} ${cfg.text} ${cfg.border} border text-[10px] px-2 py-0.5 rounded-md font-semibold`}>
          {cfg.label}
        </span>
      </div>
      <div className="w-full h-1.5 bg-slate-700/60 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full ${cfg.bar} rounded-full transition-all duration-700`}
          style={{ width: `${Math.max(5, percent)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-slate-500">基准: {metric.benchmark}{metric.unit || ''}</span>
        <span className={`${cfg.text} font-medium`}>{metric.comment}</span>
      </div>
    </div>
  )
}

function SuggestionCard({ suggestion }: { suggestion: ImprovementSuggestion }) {
  const priorityCfg = {
    high: { bg: 'bg-rose-500/15', border: 'border-rose-500/30', text: 'text-rose-400', label: '高优先级' },
    medium: { bg: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-400', label: '中优先级' },
    low: { bg: 'bg-sky-500/15', border: 'border-sky-500/30', text: 'text-sky-400', label: '建议参考' },
  }[suggestion.priority]

  return (
    <div className={`${priorityCfg.bg} ${priorityCfg.border} border rounded-xl p-3.5`}>
      <div className="flex items-start gap-2.5">
        <div className={`${priorityCfg.bg} ${priorityCfg.text} w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${priorityCfg.border}`}>
          <Lightbulb className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-slate-200">{suggestion.title}</span>
            <span className={`${priorityCfg.text} text-[10px] font-medium ${priorityCfg.bg} px-1.5 py-0.5 rounded`}>
              {priorityCfg.label}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed mb-2">{suggestion.description}</p>
          <div className="flex items-start gap-1.5">
            <Target className={`w-3 h-3 ${priorityCfg.text} shrink-0 mt-0.5`} />
            <p className={`text-[11px] ${priorityCfg.text} leading-relaxed`}>
              {suggestion.action}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function CollapsibleSection({
  icon,
  title,
  subtitle,
  accent,
  defaultOpen = true,
  children,
  badge,
}: {
  icon: React.ReactNode
  title: string
  subtitle?: string
  accent?: string
  defaultOpen?: boolean
  children: React.ReactNode
  badge?: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center gap-2.5 hover:bg-slate-700/20 transition-colors"
      >
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${accent || 'bg-slate-700/60'}`}>
          {icon}
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
            {badge}
          </div>
          {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1">
          {children}
        </div>
      )}
    </div>
  )
}

export default function Result() {
  const location = useLocation()
  const navigate = useNavigate()
  const result = location.state?.result as GameResult | undefined
  const initGame = useGameStore((s) => s.initGame)
  const [displayScore, setDisplayScore] = useState(0)
  const [scoreAnimDone, setScoreAnimDone] = useState(false)

  const bestScore = result ? loadBestScore(result.difficulty) : 0

  const summary = useMemo(() => {
    if (!result) return null
    return analyzeDispatchPerformance(result, result.events, result.decisions)
  }, [result])

  useEffect(() => {
    if (!result) return
    const target = result.score
    const duration = 1500
    const start = Date.now()
    const animate = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayScore(Math.round(target * eased))
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setScoreAnimDone(true)
      }
    }
    const timer = setTimeout(() => requestAnimationFrame(animate), 300)
    return () => clearTimeout(timer)
  }, [result])

  if (!result || !summary) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-slate-400 mb-4">未找到游戏记录</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  const rating = getScoreRating(result.score)
  const isNewBest = result.score >= bestScore && result.score > 0
  const lossTotal = summary.lossPoints.reduce((s, l) => s + l.points, 0)

  const handlePlayAgain = () => {
    initGame(result.difficulty)
    navigate('/game')
  }

  return (
    <div className="min-h-screen bg-slate-900 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-4 pb-8">
        <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-800/80 border border-slate-700 rounded-3xl overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.08),transparent_60%)] pointer-events-none" />

          <div className="relative p-6 pb-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                result.difficulty === 'hard'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
              }`}>
                {result.difficulty === 'hard' ? '困难模式' : '普通模式'}
              </span>
              {isNewBest && (
                <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-400" />
                  新纪录
                </span>
              )}
            </div>

            <div className="relative inline-block mb-4">
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl font-black shadow-xl"
                style={{
                  backgroundColor: `${rating.color}15`,
                  color: rating.color,
                  boxShadow: `0 0 60px ${rating.color}20, inset 0 0 0 1px ${rating.color}30`,
                }}
              >
                {rating.label}
              </div>
              {scoreAnimDone && (
                <div className="absolute -bottom-1 -right-1 bg-slate-700/90 backdrop-blur rounded-full px-2.5 py-1 border border-slate-600">
                  <div className="flex items-center gap-1">
                    <Award className="w-3 h-3 text-amber-400" />
                    <span className="text-[10px] font-semibold text-amber-300">{summary.dispatchStyle}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-3">
              <p className="text-slate-500 text-xs mb-1 flex items-center justify-center gap-1">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                本局得分
              </p>
              <div className="text-6xl font-black text-slate-100 tracking-tight tabular-nums">
                {displayScore.toLocaleString()}
              </div>
            </div>

            {scoreAnimDone && (
              <div className="max-w-md mx-auto bg-slate-900/40 rounded-xl p-3 border border-slate-700/40">
                <p className="text-[12px] text-slate-400 leading-relaxed">
                  {summary.overallComment}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 px-5 pb-5">
            {[
              { icon: <Users className="w-4 h-4" />, label: '已接待', value: result.servedCount, suffix: '组', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { icon: <Clock className="w-4 h-4" />, label: '总等待', value: result.totalWaitTime, suffix: '分', color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { icon: <MessageSquareWarning className="w-4 h-4" />, label: '投诉数', value: result.complaints, suffix: '起', color: result.complaints === 0 ? 'text-emerald-400' : 'text-rose-400', bg: result.complaints === 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10' },
              { icon: <TrendingDown className="w-4 h-4" />, label: '损失分', value: lossTotal, suffix: '分', color: lossTotal === 0 ? 'text-emerald-400' : 'text-amber-400', bg: lossTotal === 0 ? 'bg-emerald-500/10' : 'bg-amber-500/10' },
            ].map((stat, i) => (
              <div key={i} className="bg-slate-900/30 rounded-xl p-2.5 text-center">
                <div className={`${stat.color} ${stat.bg} w-7 h-7 rounded-lg flex items-center justify-center mx-auto mb-1.5`}>
                  {stat.icon}
                </div>
                <div className="text-slate-400 text-[10px] mb-0.5">{stat.label}</div>
                <div className={`${stat.color} text-lg font-bold leading-none`}>
                  {stat.value}
                  <span className="text-[10px] font-medium opacity-70 ml-0.5">{stat.suffix}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <CollapsibleSection
          icon={<Trophy className="w-4 h-4 text-amber-400" />}
          title="得分构成解析"
          subtitle="直观了解每项加减分的来源和原因"
          accent="bg-amber-500/15"
          defaultOpen={true}
        >
          <div className="bg-slate-900/30 rounded-xl p-4 mb-3">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-700/40">
              <span className="text-sm font-semibold text-slate-200">最终得分</span>
              <span className="text-2xl font-black text-amber-400 tabular-nums">
                {result.score}
              </span>
            </div>
            <ScoreBreakdownItem
              label={summary.scoreBreakdown.served.label}
              points={summary.scoreBreakdown.served.points}
              detail={summary.scoreBreakdown.served.detail}
            />
            <ScoreBreakdownItem
              label={summary.scoreBreakdown.waitBonus.label}
              points={summary.scoreBreakdown.waitBonus.points}
              detail={summary.scoreBreakdown.waitBonus.detail}
            />
            <ScoreBreakdownItem
              label={summary.scoreBreakdown.penalties.label}
              points={summary.scoreBreakdown.penalties.points}
              detail={summary.scoreBreakdown.penalties.detail}
            />
            {summary.scoreBreakdown.extra.points !== 0 && (
              <ScoreBreakdownItem
                label={summary.scoreBreakdown.extra.label}
                points={summary.scoreBreakdown.extra.points}
                detail={summary.scoreBreakdown.extra.detail}
              />
            )}
          </div>
        </CollapsibleSection>

        {summary.lossPoints.length > 0 && (
          <CollapsibleSection
            icon={<AlertCircle className="w-4 h-4 text-rose-400" />}
            title="主要失分原因"
            subtitle={`共损失 ${lossTotal} 分，点击卡片查看详情`}
            accent="bg-rose-500/15"
            defaultOpen={true}
            badge={
              <span className="bg-rose-500/20 text-rose-400 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                {summary.lossPoints.length}项
              </span>
            }
          >
            <div className="space-y-2.5">
              {summary.lossPoints.map((item, i) => (
                <LossPointCard key={i} item={item} />
              ))}
            </div>
          </CollapsibleSection>
        )}

        {summary.keyActions.length > 0 && (
          <CollapsibleSection
            icon={<Zap className="w-4 h-4 text-violet-400" />}
            title="关键操作回顾"
            subtitle="按时间顺序展示对你本局影响最大的操作"
            accent="bg-violet-500/15"
            defaultOpen={true}
            badge={
              <span className="bg-violet-500/20 text-violet-400 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                {summary.keyActions.length}个
              </span>
            }
          >
            <div className="bg-slate-900/30 rounded-xl p-1 divide-y divide-slate-700/40">
              {summary.keyActions.map((action, i) => (
                <KeyActionCard key={i} action={action} />
              ))}
            </div>
          </CollapsibleSection>
        )}

        <CollapsibleSection
          icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
          title="队列处理效率评价"
          subtitle={`${result.difficulty === 'hard' ? '困难模式' : '普通模式'}基准下的四维效率评估`}
          accent="bg-emerald-500/15"
          defaultOpen={true}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {summary.efficiencyMetrics.map((metric, i) => (
              <EfficiencyMetricCard key={i} metric={metric} />
            ))}
          </div>
        </CollapsibleSection>

        {summary.suggestions.length > 0 && (
          <CollapsibleSection
            icon={<Lightbulb className="w-4 h-4 text-sky-400" />}
            title="下一局改进建议"
            subtitle="针对本局表现，量身定制的优化方向"
            accent="bg-sky-500/15"
            defaultOpen={true}
            badge={
              <span className="bg-sky-500/20 text-sky-400 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                {summary.suggestions.length}条
              </span>
            }
          >
            <div className="space-y-2.5">
              {summary.suggestions.map((s, i) => (
                <SuggestionCard key={i} suggestion={s} />
              ))}
            </div>
          </CollapsibleSection>
        )}

        <CollapsibleSection
          icon={<CalendarDays className="w-4 h-4 text-slate-400" />}
          title="完整事件时间线"
          subtitle="所有决策和事件的原始记录"
          accent="bg-slate-700/60"
          defaultOpen={false}
        >
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {result.decisions.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-slate-400 mb-2">调度决策 ({result.decisions.length})</p>
                <div className="bg-slate-900/30 rounded-xl p-2 space-y-0.5">
                  {result.decisions.map((d, i) => (
                    <div key={i} className="flex items-start gap-2 py-1">
                      <div className="w-12 shrink-0 text-slate-500 text-[10px] text-right pt-0.5 font-mono">
                        {formatTime(d.time)}
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      <div className="flex-1 text-[11px]">
                        <span className="text-amber-400 font-medium">{d.action}</span>
                        <span className="text-slate-400 ml-1.5">{d.detail}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {result.events.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-slate-400 mb-2">随机事件 ({result.events.length})</p>
                <div className="bg-slate-900/30 rounded-xl p-2 space-y-0.5">
                  {result.events.map((e, i) => (
                    <div key={i} className="flex items-start gap-2 py-1">
                      <div className="w-12 shrink-0 text-slate-500 text-[10px] text-right pt-0.5 font-mono">
                        {formatTime(e.triggerTime)}
                      </div>
                      <div
                        className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                          e.type === 'vip_arrival'
                            ? 'bg-amber-400'
                            : e.type === 'guide_break'
                              ? 'bg-amber-500'
                              : e.type === 'maintenance'
                                ? 'bg-rose-500'
                                : 'bg-blue-500'
                        }`}
                      />
                      <div className="flex-1 text-[11px] text-slate-400">{e.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-3.5 bg-slate-700/50 text-slate-300 rounded-2xl font-semibold hover:bg-slate-700 transition-all duration-200 flex items-center justify-center gap-2 border border-slate-600/40"
          >
            <Home className="w-4 h-4" />
            返回首页
          </button>
          <button
            onClick={handlePlayAgain}
            className="flex-1 py-3.5 bg-gradient-to-r from-amber-500/25 to-amber-600/25 text-amber-300 border border-amber-500/40 rounded-2xl font-semibold hover:from-amber-500/35 hover:to-amber-600/35 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10"
          >
            <RotateCcw className="w-4 h-4" />
            再来一局
          </button>
        </div>

        {bestScore > 0 && (
          <div className="text-center">
            <p className="text-slate-600 text-[11px]">
              {result.difficulty === 'hard' ? '困难模式' : '普通模式'}
              历史最佳: <span className="text-slate-400 font-semibold">{bestScore}</span> 分
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
