import { create } from 'zustand'
import type {
  VisitorGroup,
  ReceptionPoint,
  GameEvent,
  Notification,
  Difficulty,
  DecisionRecord,
} from '@/types/game'
import { GAME_START, GAME_END, RECEPTION_POINT_NAMES, calculateServiceTime } from '@/types/game'
import { generateEvents } from '@/utils/events'
import { calculateScore } from '@/utils/scoring'

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
  speed: 1 | 2 | 3
  extraSlotsUsed: number
  maxExtraSlots: number
  decisions: DecisionRecord[]
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
  speed: 1,
  extraSlotsUsed: 0,
  maxExtraSlots: 3,
  decisions: [],

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
      speed: 1,
      extraSlotsUsed: 0,
      maxExtraSlots: difficulty === 'hard' ? 2 : 3,
      decisions: [],
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
    })
  },

  assignToReception: (groupId, pointId) => {
    const state = get()
    if (!state.isInitialized) return
    const group = state.queue.find((g) => g.id === groupId)
    const point = state.receptionPoints.find((p) => p.id === pointId)
    if (!group || !point || point.status !== 'idle') return

    const serviceTime = calculateServiceTime(group.size)
    const finishTime = state.currentTime + serviceTime

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
          action: '安排接待',
          detail: `${group.name} → ${point.name}`,
        },
      ],
    })
  },

  moveInQueue: (groupId, direction) => {
    const state = get()
    const idx = state.queue.findIndex((g) => g.id === groupId)
    if (idx === -1) return

    const newQueue = [...state.queue]
    if (direction === 'up' && idx > 0) {
      ;[newQueue[idx - 1], newQueue[idx]] = [newQueue[idx], newQueue[idx - 1]]
    } else if (direction === 'down' && idx < newQueue.length - 1) {
      ;[newQueue[idx + 1], newQueue[idx]] = [newQueue[idx], newQueue[idx + 1]]
    }

    set({
      queue: newQueue,
    })
  },

  reorderQueue: (sourceIndex, targetIndex) => {
    const state = get()
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
    set({ queue: newQueue })
  },

  addExtraSlot: () => {
    const state = get()
    if (state.extraSlotsUsed >= state.maxExtraSlots) return

    const idx = state.receptionPoints.length
    const newPoint: ReceptionPoint = {
      id: `rp_temp_${idx}`,
      name: `临时展厅${idx + 1}`,
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
          detail: `开启 ${newPoint.name}（60分钟限时）`,
        },
      ],
    })
  },

  togglePause: (pointId) => {
    const state = get()
    set({
      receptionPoints: state.receptionPoints.map((p) => {
        if (p.id !== pointId) return p
        if (p.status === 'idle') {
          return { ...p, status: 'paused' as const }
        }
        if (p.status === 'paused') {
          return { ...p, status: 'idle' as const }
        }
        return p
      }),
      decisions: [
        ...state.decisions,
        {
          time: state.currentTime,
          action: '暂停/恢复接待点',
          detail: pointId,
        },
      ],
    })
  },

  resumePoint: (pointId) => {
    const state = get()
    set({
      receptionPoints: state.receptionPoints.map((p) =>
        p.id === pointId ? { ...p, status: 'idle' as const, maintenanceUntil: null, pendingMaintenance: null } : p
      ),
    })
  },

  setSpeed: (speed) => set({ speed }),

  toggleGamePause: () => set((s) => ({ isPaused: !s.isPaused })),

  dismissNotification: (id) =>
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
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
