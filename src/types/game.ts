export type Difficulty = 'normal' | 'hard'

export type VisitorType = 'individual' | 'group' | 'tour'

export type PointStatus = 'idle' | 'busy' | 'maintenance' | 'paused'

export type EventType = 'group_arrival' | 'guide_break' | 'maintenance' | 'vip_arrival'

export interface VisitorGroup {
  id: string
  name: string
  size: number
  arrivalTime: number
  patience: number
  isVip: boolean
  type: VisitorType
}

export interface ReceptionPoint {
  id: string
  name: string
  status: PointStatus
  currentGroup: VisitorGroup | null
  finishTime: number | null
  maintenanceUntil: number | null
  isTemporary: boolean
  temporaryUntil: number | null
  pendingMaintenance: number | null
}

export interface GameEvent {
  id: string
  type: EventType
  triggerTime: number
  description: string
  data: Record<string, unknown>
  resolved: boolean
}

export interface Notification {
  id: string
  message: string
  type: 'info' | 'warning' | 'danger'
  timestamp: number
}

export interface GameResult {
  id: string
  difficulty: Difficulty
  score: number
  complaints: number
  totalWaitTime: number
  servedCount: number
  events: GameEvent[]
  decisions: DecisionRecord[]
  timestamp: number
}

export interface DecisionRecord {
  time: number
  action: string
  detail: string
}

export type StrategyTipType = 'info' | 'warning' | 'danger' | 'success'

export interface StrategyTip {
  id: string
  type: StrategyTipType
  title: string
  message: string
  priority: number
  timestamp: number
  expiresAt?: number
  category: 'vip' | 'wait' | 'queue' | 'maintenance' | 'extra' | 'idle' | 'general'
}

export interface LossPointItem {
  category: string
  label: string
  points: number
  maxPoints: number
  detail: string
}

export interface KeyAction {
  time: number
  type: 'assign' | 'reorder' | 'extra' | 'pause' | 'resume'
  label: string
  detail: string
  impact: 'positive' | 'negative' | 'neutral'
  impactValue: number
}

export interface EfficiencyMetric {
  label: string
  value: number
  unit?: string
  benchmark: number
  rating: 'excellent' | 'good' | 'average' | 'poor'
  comment: string
}

export interface ImprovementSuggestion {
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  action: string
}

export interface DispatchSummary {
  totalScore: number
  scoreBreakdown: {
    served: { label: string; points: number; detail: string }
    waitBonus: { label: string; points: number; detail: string }
    penalties: { label: string; points: number; detail: string }
    extra: { label: string; points: number; detail: string }
  }
  lossPoints: LossPointItem[]
  keyActions: KeyAction[]
  efficiencyMetrics: EfficiencyMetric[]
  suggestions: ImprovementSuggestion[]
  overallComment: string
  dispatchStyle: string
}

export interface RealTimeMetrics {
  avgWaitTime: number
  maxWaitTime: number
  vipWaitCount: number
  idlePointCount: number
  busyPointCount: number
  maintenanceCount: number
  queueSize: number
  queuePeople: number
  extraUsed: number
  extraRemaining: number
  pressure: number
}

export const GAME_START = 540
export const GAME_END = 1020
export const GAME_DURATION = GAME_END - GAME_START

export const GROUP_NAMES: string[] = [
  '晨光旅行团', '星辰中学', '蓝天亲子团', '银发乐游团',
  '少年研学队', '城市探索组', '文化爱好者', '历史研习班',
  '艺术鉴赏团', '科技探索营', '夕阳红团队', '青年文化社',
  '国际交流团', '摄影采风组', '亲子科普团', '学术考察队',
]

export const VIP_NAMES: string[] = [
  '贵宾考察团', '领导视察组', '特邀嘉宾团', '外交参观团',
]

export const RECEPTION_POINT_NAMES: string[] = [
  '展厅A·古代文明', '展厅B·现代艺术', '展厅C·科技前沿',
]

export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.floor(minutes % 60)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

export function calculateServiceTime(size: number): number {
  return Math.max(8, Math.ceil(size * 1.5))
}
