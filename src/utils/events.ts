import type { GameEvent, VisitorGroup, Difficulty } from '@/types/game'
import { GAME_START, GROUP_NAMES, VIP_NAMES } from '@/types/game'

let eventCounter = 0
let groupCounter = 0

function nextEventId(): string {
  return `evt_${++eventCounter}`
}

function nextGroupId(): string {
  return `grp_${++groupCounter}`
}

export function resetCounters(): void {
  eventCounter = 0
  groupCounter = 0
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function createVisitorGroup(
  arrivalTime: number,
  isVip: boolean,
  type: VisitorGroup['type']
): VisitorGroup {
  const namePool = isVip ? VIP_NAMES : GROUP_NAMES
  const name = namePool[groupCounter % namePool.length]

  let size: number
  switch (type) {
    case 'individual':
      size = randomBetween(1, 3)
      break
    case 'group':
      size = randomBetween(4, 10)
      break
    case 'tour':
      size = randomBetween(11, 25)
      break
  }

  const patience = isVip
    ? randomBetween(15, 25)
    : type === 'tour'
      ? randomBetween(20, 35)
      : randomBetween(30, 60)

  return {
    id: nextGroupId(),
    name: isVip ? `⭐ ${name}` : name,
    size,
    arrivalTime,
    patience,
    isVip,
    type,
  }
}

export function generateEvents(difficulty: Difficulty): GameEvent[] {
  resetCounters()
  const events: GameEvent[] = []
  const isHard = difficulty === 'hard'
  const pointCount = isHard ? 2 : 3

  const normalGroupCount = isHard ? 14 : 10
  const tourGroupCount = isHard ? 5 : 3
  const vipCount = isHard ? 3 : 2
  const guideBreakCount = isHard ? 4 : 2
  const maintenanceCount = isHard ? 3 : 1

  const usedTimes = new Set<number>()

  function getUniqueTime(): number {
    let t: number
    do {
      t = randomBetween(GAME_START + 10, GAME_START + 440)
    } while (usedTimes.has(t))
    usedTimes.add(t)
    return t
  }

  for (let i = 0; i < normalGroupCount; i++) {
    const t = getUniqueTime()
    const group = createVisitorGroup(t, false, 'group')
    events.push({
      id: nextEventId(),
      type: 'group_arrival',
      triggerTime: t,
      description: `${group.name}（${group.size}人）到达`,
      data: { group },
      resolved: false,
    })
  }

  for (let i = 0; i < tourGroupCount; i++) {
    const t = getUniqueTime()
    const group = createVisitorGroup(t, false, 'tour')
    events.push({
      id: nextEventId(),
      type: 'group_arrival',
      triggerTime: t,
      description: `大型团队 ${group.name}（${group.size}人）到达`,
      data: { group },
      resolved: false,
    })
  }

  for (let i = 0; i < vipCount; i++) {
    const t = getUniqueTime()
    const group = createVisitorGroup(t, true, 'individual')
    events.push({
      id: nextEventId(),
      type: 'vip_arrival',
      triggerTime: t,
      description: `VIP ${group.name} 到达`,
      data: { group },
      resolved: false,
    })
  }

  for (let i = 0; i < guideBreakCount; i++) {
    const t = getUniqueTime()
    const pointIndex = randomBetween(0, pointCount - 1)
    const duration = randomBetween(20, 40)
    events.push({
      id: nextEventId(),
      type: 'guide_break',
      triggerTime: t,
      description: `讲解员需要休息（约${duration}分钟）`,
      data: { pointIndex, duration },
      resolved: false,
    })
  }

  for (let i = 0; i < maintenanceCount; i++) {
    const t = getUniqueTime()
    const pointIndex = randomBetween(0, pointCount - 1)
    const duration = randomBetween(30, 50)
    events.push({
      id: nextEventId(),
      type: 'maintenance',
      triggerTime: t,
      description: `接待点需要维护（约${duration}分钟）`,
      data: { pointIndex, duration },
      resolved: false,
    })
  }

  events.sort((a, b) => a.triggerTime - b.triggerTime)
  return events
}
