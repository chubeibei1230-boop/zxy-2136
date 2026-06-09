import { create } from 'zustand'
import type {
  VisitorGroup,
  ReceptionPoint,
  GameEvent,
  Notification,
  Difficulty,
  DecisionRecord,
  StrategyTip,
} from '@/types/game'
import { GAME_START, GAME_END, RECEPTION_POINT_NAMES, calculateServiceTime } from '@/types/game'
import { generateEvents } from '@/utils/events'
import { calculateScore } from '@/utils/scoring'
import { getRealTimeMetrics, generateStrategyTips } from '@/utils/strategy'

interface GameState {
  isInitialized: boolean
  currentTime: number
  difficulty: Difficulty
  queue: VisitorGroup[]
  receptionPoints: ReceptionPoint[]
  pendingEvents: GameEvent[]
  triggeredEvents: GameEvent[]
  notifications: Notification[]
  complaints: number
  totalWaitTime: number
  servedCount: number
  pressure: number
  isPaused: boolean
  isGameOver: boolean
  isSettling: boolean
  speed: 1 | 2 | 3
  extraSlotsUsed: number
  maxExtraSlots: number
  decisions: DecisionRecord[]
  strategyTips: StrategyTip[]
  lastTipUpdate: number
}

interface GameActions {
  initGame: (difficulty: Difficulty) => void
  tick: (deltaMinutes: number) => void
  assignToReception: (groupId: string, pointId: string) => void
  moveInQueue: (groupId: string, direction: 'up' | 'down') => void
  reorderQueue: (sourceIndex: number, targetIndex: number) => void
  addExtraSlot: () => void
  togglePause: (pointId: string) => void
  resumePoint: (pointId: string) => void
  setSpeed: (speed: 1 | 2 | 3) => void
  toggleGamePause: () => void
  dismissNotification: (id: string) => void
  dismissStrategyTip: (id: string) => void
  setSettling: (settling: boolean) => void
  getScore: () => number
}

let notifCounter = 0

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  isInitialized: false,
  currentTime: GAME_START,
  difficulty: 'normal',
  queue: [],
  receptionPoints: [],
  pendingEvents: [],
  triggeredEvents: [],
  notifications: [],
  complaints: 0,
  totalWaitTime: 0,
  servedCount: 0,
  pressure: 0,
  isPaused: false,
  isGameOver: false,
  isSettling: false,
  speed: 1,
  extraSlotsUsed: 0,
  maxExtraSlots: 3,
  decisions: [],
  strategyTips: [],
  lastTipUpdate: 0,

  initGame: (difficulty) => {
    const events = generateEvents(difficulty)
    const pointCount = difficulty === 'hard' ? 2 : 3
    const receptionPoints: ReceptionPoint[] = RECEPTION_POINT_NAMES.slice(0, pointCount).map(
      (name, i) => ({
        id: `rp_${i}`,
        name,
        status: 'idle',
        currentGroup: null,
        finishTime: null,
        maintenanceUntil: null,
        isTemporary: false,
        temporaryUntil: null,
        pendingMaintenance: null,
      })
    )

    set({
      isInitialized: true,
      currentTime: GAME_START,
      difficulty,
      queue: [],
      receptionPoints,
      pendingEvents: events,
      triggeredEvents: [],
      notifications: [],
      complaints: 0,
      totalWaitTime: 0,
      servedCount: 0,
      pressure: 0,
      isPaused: false,
      isGameOver: false,
      isSettling: false,
      speed: 1,
      extraSlotsUsed: 0,
      maxExtraSlots: difficulty === 'hard' ? 2 : 3,
      decisions: [],
      strategyTips: [],
      lastTipUpdate: 0,
    })
  },

  tick: (deltaMinutes) => {
    const state = get()
    if (!state.isInitialized || state.isPaused || state.isGameOver) return

    const newTime = state.currentTime + deltaMinutes
    if (newTime >= GAME_END) {
      const remainingQueue = state.queue
      const unservedWait = remainingQueue.reduce(
        (sum, g) => sum + (GAME_END - g.arrivalTime),
        0
      )
      set({
        currentTime: GAME_END,
        isGameOver: true,
        totalWaitTime: state.totalWaitTime + unservedWait,
      })
      return
    }

    const newNotifications = [...state.notifications]
    const newQueue = state.queue.map((g) => ({ ...g }))
    const newPoints = state.receptionPoints.map((p) => ({ ...p }))
    const newPending = [...state.pendingEvents]
    const newTriggered = [...state.triggeredEvents]
    let newComplaints = state.complaints
    let newTotalWait = state.totalWaitTime
    let newServed = state.servedCount
    let newExtraUsed = state.extraSlotsUsed

    for (const event of newPending) {
      if (event.triggerTime > newTime) break
      if (event.resolved) continue

      event.resolved = true
      newTriggered.push({ ...event })

      switch (event.type) {
        case 'group_arrival':
        case 'vip_arrival': {
          const group = event.data.group as VisitorGroup
          newQueue.push({ ...group })
          newNotifications.push({
            id: `notif_${++notifCounter}`,
            message: event.description,
            type: event.type === 'vip_arrival' ? 'warning' : 'info',
            timestamp: event.triggerTime,
          })
          break
        }
        case 'guide_break':
        case 'maintenance': {
          const { pointIndex, duration } = event.data as { pointIndex: number; duration: number }
          const point = newPoints[pointIndex]
          if (point) {
            if (point.status === 'idle') {
              point.status = 'maintenance'
              point.maintenanceUntil = event.triggerTime + duration
            } else if (point.status === 'busy' && point.finishTime !== null) {
              point.pendingMaintenance = duration
            } else if (point.status === 'paused') {
              point.status = 'maintenance'
              point.maintenanceUntil = event.triggerTime + duration
            }
          }
          newNotifications.push({
            id: `notif_${++notifCounter}`,
            message: event.description,
            type: event.type === 'maintenance' ? 'danger' : 'warning',
            timestamp: event.triggerTime,
          })
          break
        }
      }
    }

    for (const point of newPoints) {
      if (point.status === 'busy' && point.finishTime !== null && newTime >= point.finishTime) {
        const group = point.currentGroup
        if (group) {
          const actualStart = point.finishTime - calculateServiceTime(group.size)
          const waitTime = Math.max(0, actualStart - group.arrivalTime)
          newTotalWait += Math.round(waitTime)
          newServed++
        }
        point.currentGroup = null
        point.finishTime = null

        if (point.pendingMaintenance !== null) {
          point.status = 'maintenance'
          point.maintenanceUntil = newTime + point.pendingMaintenance
          point.pendingMaintenance = null
          newNotifications.push({
            id: `notif_${++notifCounter}`,
            message: `${point.name} 接待结束，进入维护状态`,
            type: 'warning',
            timestamp: newTime,
          })
        } else {
          point.status = 'idle'
        }
      }

      if (point.status === 'maintenance' && point.maintenanceUntil !== null && newTime >= point.maintenanceUntil) {
        point.status = 'idle'
        point.maintenanceUntil = null
        newNotifications.push({
          id: `notif_${++notifCounter}`,
          message: `${point.name} 维护完成，恢复接待`,
          type: 'info',
          timestamp: newTime,
        })
      }

      if (point.isTemporary && point.temporaryUntil !== null && newTime >= point.temporaryUntil) {
        if (point.status === 'idle') {
          const idx = newPoints.indexOf(point)
          if (idx > -1) {
            newPoints.splice(idx, 1)
            newExtraUsed--
          }
        }
      }
    }

    const toComplain: string[] = []
    for (const group of newQueue) {
      const waited = newTime - group.arrivalTime
      if (waited > group.patience) {
        toComplain.push(group.id)
        newComplaints++
        newTotalWait += Math.round(waited)
        newNotifications.push({
          id: `notif_${++notifCounter}`,
          message: `${group.name} 等待过久，已投诉！`,
          type: 'danger',
          timestamp: newTime,
        })
      }
    }

    const filteredQueue = newQueue.filter((g) => !toComplain.includes(g.id))

    const totalPeople = filteredQueue.reduce((s, g) => s + g.size, 0)
    const avgWait = filteredQueue.length > 0
      ? filteredQueue.reduce((s, g) => s + (newTime - g.arrivalTime), 0) / filteredQueue.length
      : 0
    const pressure = Math.min(100, Math.round(totalPeople * 1.5 + avgWait * 0.5 + newComplaints * 5))

    let newStrategyTips = state.strategyTips.filter((t) => !t.expiresAt || t.expiresAt > newTime)
    if (newTime - state.lastTipUpdate >= 5) {
      const metrics = getRealTimeMetrics(
        filteredQueue,
        newPoints,
        newTime,
        newComplaints,
        newExtraUsed,
        state.maxExtraSlots,
        pressure
      )
      const freshTips = generateStrategyTips(filteredQueue, newPoints, newTime, metrics, state.difficulty)
      const existingCategories = new Set(newStrategyTips.map((t) => `${t.category}-${t.title}`))
      for (const tip of freshTips) {
        const key = `${tip.category}-${tip.title}`
        if (!existingCategories.has(key)) {
          newStrategyTips.push(tip)
        }
      }
      newStrategyTips = newStrategyTips
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 6)
    }

    set({
      currentTime: newTime,
      queue: filteredQueue,
      receptionPoints: newPoints,
      pendingEvents: newPending,
      triggeredEvents: newTriggered,
      notifications: newNotifications.filter(
        (n) => newTime - n.timestamp < 180
      ),
      complaints: newComplaints,
      totalWaitTime: newTotalWait,
      servedCount: newServed,
      pressure,
      extraSlotsUsed: newExtraUsed,
      strategyTips: newStrategyTips,
      lastTipUpdate: newTime - state.lastTipUpdate >= 5 ? newTime : state.lastTipUpdate,
    })
  },

  assignToReception: (groupId, pointId) => {
    const state = get()
    if (!state.isInitialized || state.isPaused || state.isGameOver || state.isSettling) return
    const group = state.queue.find((g) => g.id === groupId)
    const point = state.receptionPoints.find((p) => p.id === pointId)
    if (!group || !point || point.status !== 'idle') return

    const serviceTime = calculateServiceTime(group.size)
    const finishTime = state.currentTime + serviceTime
    const queueIdx = state.queue.findIndex((g) => g.id === groupId)

    let actionType = '安排接待'
    let detailExtra = ''
    if (group.isVip && queueIdx > 0) {
      actionType = 'VIP优先接待'
      detailExtra = `（跳过${queueIdx}组优先安排）`
    } else if (queueIdx >= 3) {
      actionType = '插队安排接待'
      detailExtra = `（从第${queueIdx + 1}位提前）`
    }

    set({
      queue: state.queue.filter((g) => g.id !== groupId),
      receptionPoints: state.receptionPoints.map((p) =>
        p.id === pointId
          ? { ...p, status: 'busy', currentGroup: { ...group }, finishTime }
          : p
      ),
      decisions: [
        ...state.decisions,
        {
          time: state.currentTime,
          action: actionType,
          detail: `${group.name} → ${point.name}${detailExtra}`,
        },
      ],
    })
  },

  moveInQueue: (groupId, direction) => {
    const state = get()
    if (!state.isInitialized || state.isPaused || state.isGameOver || state.isSettling) return
    const idx = state.queue.findIndex((g) => g.id === groupId)
    if (idx === -1) return

    const newQueue = [...state.queue]
    const group = state.queue[idx]
    let moved = false
    let detail = ''

    if (direction === 'up' && idx > 0) {
      const otherGroup = newQueue[idx - 1]
      ;[newQueue[idx - 1], newQueue[idx]] = [newQueue[idx], newQueue[idx - 1]]
      moved = true
      if (group.isVip) {
        detail = `${group.name} 前移（VIP优先），超越 ${otherGroup.name}`
      } else if ((state.currentTime - group.arrivalTime) / group.patience > 0.6) {
        detail = `${group.name} 前移（高风险优先），超越 ${otherGroup.name}`
      } else {
        detail = `${group.name} 前移一位，超越 ${otherGroup.name}`
      }
    } else if (direction === 'down' && idx < newQueue.length - 1) {
      const otherGroup = newQueue[idx + 1]
      ;[newQueue[idx + 1], newQueue[idx]] = [newQueue[idx], newQueue[idx + 1]]
      moved = true
      detail = `${group.name} 后移一位，让位于 ${otherGroup.name}`
    }

    if (!moved) return

    set({
      queue: newQueue,
      decisions: [
        ...state.decisions,
        {
          time: state.currentTime,
          action: direction === 'up' ? '提升优先级' : '降低优先级',
          detail,
        },
      ],
    })
  },

  reorderQueue: (sourceIndex, targetIndex) => {
    const state = get()
    if (!state.isInitialized || state.isPaused || state.isGameOver || state.isSettling) return
    if (
      sourceIndex < 0 ||
      sourceIndex >= state.queue.length ||
      targetIndex < 0 ||
      targetIndex >= state.queue.length ||
      sourceIndex === targetIndex
    ) return

    const newQueue = [...state.queue]
    const [item] = newQueue.splice(sourceIndex, 1)
    newQueue.splice(targetIndex, 0, item)

    const direction = targetIndex < sourceIndex ? '提升' : '降低'
    const distance = Math.abs(targetIndex - sourceIndex)
    const priorityTag = item.isVip ? '【VIP】' : (state.currentTime - item.arrivalTime) / item.patience > 0.6 ? '【高风险】' : ''

    set({
      queue: newQueue,
      decisions: [
        ...state.decisions,
        {
          time: state.currentTime,
          action: '调整队列顺序',
          detail: `${priorityTag}${item.name} ${direction}${distance}位（第${sourceIndex + 1}→第${targetIndex + 1}）`,
        },
      ],
    })
  },

  addExtraSlot: () => {
    const state = get()
    if (!state.isInitialized || state.isPaused || state.isGameOver || state.isSettling) return
    if (state.extraSlotsUsed >= state.maxExtraSlots) return

    const idx = state.receptionPoints.length
    const existingTemps = state.receptionPoints.filter((p) => p.isTemporary).length
    const newPoint: ReceptionPoint = {
      id: `rp_temp_${idx}`,
      name: `临时展厅${existingTemps + 1}`,
      status: 'idle',
      currentGroup: null,
      finishTime: null,
      maintenanceUntil: null,
      isTemporary: true,
      temporaryUntil: state.currentTime + 60,
      pendingMaintenance: null,
    }

    set({
      receptionPoints: [...state.receptionPoints, newPoint],
      extraSlotsUsed: state.extraSlotsUsed + 1,
      decisions: [
        ...state.decisions,
        {
          time: state.currentTime,
          action: '临时加场',
          detail: `开启 ${newPoint.name}（60分钟限时，队列${state.queue.length}组）`,
        },
      ],
    })
  },

  togglePause: (pointId) => {
    const state = get()
    if (!state.isInitialized || state.isPaused || state.isGameOver || state.isSettling) return
    const targetPoint = state.receptionPoints.find((p) => p.id === pointId)
    if (!targetPoint) return

    let actionType = ''
    let newStatus: typeof targetPoint.status | null = null
    if (targetPoint.status === 'idle') {
      actionType = '暂停接待点'
      newStatus = 'paused'
    } else if (targetPoint.status === 'paused') {
      actionType = '恢复接待点'
      newStatus = 'idle'
    } else {
      return
    }

    set({
      receptionPoints: state.receptionPoints.map((p) =>
        p.id === pointId ? { ...p, status: newStatus as 'idle' | 'paused' } : p
      ),
      decisions: [
        ...state.decisions,
        {
          time: state.currentTime,
          action: actionType,
          detail: `${targetPoint.name}（${actionType === '暂停接待点' ? '进入待命' : '恢复可用'}）`,
        },
      ],
    })
  },

  resumePoint: (pointId) => {
    const state = get()
    if (!state.isInitialized || state.isPaused || state.isGameOver || state.isSettling) return
    const targetPoint = state.receptionPoints.find((p) => p.id === pointId)
    if (!targetPoint) return
    set({
      receptionPoints: state.receptionPoints.map((p) =>
        p.id === pointId ? { ...p, status: 'idle' as const, maintenanceUntil: null, pendingMaintenance: null } : p
      ),
      decisions: [
        ...state.decisions,
        {
          time: state.currentTime,
          action: '提前结束维护',
          detail: `${targetPoint.name} 强制恢复接待`,
        },
      ],
    })
  },

  setSpeed: (speed) => set({ speed }),

  toggleGamePause: () => set((s) => ({ isPaused: !s.isPaused })),

  setSettling: (settling) => set({ isSettling: settling }),

  dismissNotification: (id) =>
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
    })),

  dismissStrategyTip: (id) =>
    set((s) => ({
      strategyTips: s.strategyTips.filter((t) => t.id !== id),
    })),

  getScore: () => {
    const state = get()
    return calculateScore({
      complaints: state.complaints,
      totalWaitTime: state.totalWaitTime,
      servedCount: state.servedCount,
      events: state.triggeredEvents,
      decisions: state.decisions,
      difficulty: state.difficulty,
    })
  },
}))
