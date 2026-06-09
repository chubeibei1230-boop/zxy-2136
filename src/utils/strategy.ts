import type {
  VisitorGroup,
  ReceptionPoint,
  StrategyTip,
  DispatchSummary,
  LossPointItem,
  KeyAction,
  EfficiencyMetric,
  ImprovementSuggestion,
  RealTimeMetrics,
  GameResult,
  DecisionRecord,
  Difficulty,
} from '@/types/game'
import { GAME_DURATION, formatTime, calculateServiceTime } from '@/types/game'

let tipCounter = 0
function nextTipId(): string {
  return `tip_${++tipCounter}`
}

const TIP_TTL = 45

const DIFFICULTY_CONFIG: Record<Difficulty, {
  avgWaitBenchmark: number
  complaintTolerance: number
  idlePointTolerance: number
  servedTarget: number
  idealWaitRatio: number
  vipWaitTolerance: number
}> = {
  normal: {
    avgWaitBenchmark: 15,
    complaintTolerance: 2,
    idlePointTolerance: 0.15,
    servedTarget: 12,
    idealWaitRatio: 0.5,
    vipWaitTolerance: 12,
  },
  hard: {
    avgWaitBenchmark: 18,
    complaintTolerance: 3,
    idlePointTolerance: 0.25,
    servedTarget: 18,
    idealWaitRatio: 0.6,
    vipWaitTolerance: 10,
  },
}

export function getRealTimeMetrics(
  queue: VisitorGroup[],
  receptionPoints: ReceptionPoint[],
  currentTime: number,
  complaints: number,
  extraUsed: number,
  maxExtraSlots: number,
  pressure: number
): RealTimeMetrics {
  const waits = queue.map((g) => currentTime - g.arrivalTime)
  return {
    avgWaitTime: waits.length > 0 ? waits.reduce((a, b) => a + b, 0) / waits.length : 0,
    maxWaitTime: waits.length > 0 ? Math.max(...waits) : 0,
    vipWaitCount: queue.filter((g) => g.isVip).length,
    idlePointCount: receptionPoints.filter((p) => p.status === 'idle').length,
    busyPointCount: receptionPoints.filter((p) => p.status === 'busy').length,
    maintenanceCount: receptionPoints.filter(
      (p) => p.status === 'maintenance' || p.status === 'paused'
    ).length,
    queueSize: queue.length,
    queuePeople: queue.reduce((s, g) => s + g.size, 0),
    extraUsed,
    extraRemaining: maxExtraSlots - extraUsed,
    pressure,
  }
}

export function generateStrategyTips(
  queue: VisitorGroup[],
  receptionPoints: ReceptionPoint[],
  currentTime: number,
  metrics: RealTimeMetrics,
  difficulty: Difficulty
): StrategyTip[] {
  const tips: StrategyTip[] = []
  const config = DIFFICULTY_CONFIG[difficulty]

  function addTip(
    type: StrategyTip['type'],
    category: StrategyTip['category'],
    priority: number,
    title: string,
    message: string
  ) {
    tips.push({
      id: nextTipId(),
      type,
      category,
      priority,
      title,
      message,
      timestamp: currentTime,
      expiresAt: currentTime + TIP_TTL,
    })
  }

  const vipGroups = queue.filter((g) => g.isVip)
  for (const vip of vipGroups) {
    const waited = currentTime - vip.arrivalTime
    const ratio = waited / vip.patience
    if (ratio > 0.8) {
      addTip(
        'danger',
        'vip',
        100,
        'VIP紧急预警',
        `${vip.name}已等待${Math.round(waited)}分钟，随时可能投诉！请立即安排接待！`
      )
    } else if (ratio > 0.6) {
      addTip(
        'warning',
        'vip',
        90,
        'VIP等待提醒',
        `${vip.name}已等待${Math.round(waited)}分钟，建议优先安排至空闲接待点`
      )
    } else if (waited > config.vipWaitTolerance && metrics.idlePointCount > 0) {
      addTip(
        'info',
        'vip',
        70,
        'VIP提示',
        `贵宾${vip.name}已等候${Math.round(waited)}分钟，可优先接待`
      )
    }
  }

  const urgentGroups = queue.filter(
    (g) => !g.isVip && (currentTime - g.arrivalTime) / g.patience > 0.85
  )
  if (urgentGroups.length > 0) {
    const names = urgentGroups.slice(0, 2).map((g) => g.name).join('、')
    addTip(
      'danger',
      'wait',
      95,
      '投诉风险极高',
      `${names}等${urgentGroups.length}组即将到达耐心极限！`
    )
  }

  if (metrics.avgWaitTime > config.avgWaitBenchmark * 1.5 && metrics.idlePointCount === 0) {
    if (metrics.extraRemaining > 0) {
      addTip(
        'warning',
        'extra',
        85,
        '建议临时加场',
        `平均等待已达${Math.round(metrics.avgWaitTime)}分钟，建议开启临时加场缓解压力`
      )
    } else {
      addTip(
        'warning',
        'wait',
        80,
        '等待时间过长',
        `平均等待${Math.round(metrics.avgWaitTime)}分钟，加场次数已用尽，请优化调度`
      )
    }
  }

  const largeGroups = queue.filter((g) => g.size >= 15).sort(
    (a, b) => (currentTime - b.arrivalTime) - (currentTime - a.arrivalTime)
  )
  if (largeGroups.length > 0 && metrics.idlePointCount > 0) {
    const lg = largeGroups[0]
    const svcTime = calculateServiceTime(lg.size)
    addTip(
      'info',
      'queue',
      60,
      '大团队提醒',
      `${lg.name}（${lg.size}人）接待需约${svcTime}分钟，尽早安排可避免堆积`
    )
  }

  if (metrics.idlePointCount >= 2 && metrics.queueSize >= metrics.idlePointCount) {
    addTip(
      'info',
      'idle',
      55,
      '资源闲置提醒',
      `${metrics.idlePointCount}个接待点空闲中，抓紧安排团队接待`
    )
  } else if (metrics.idlePointCount > 0 && metrics.queueSize > 0 && vipGroups.length === 0) {
    addTip(
      'info',
      'idle',
      45,
      '可安排接待',
      `有${metrics.idlePointCount}个空闲接待点，队列中${metrics.queueSize}组等待中`
    )
  }

  const maintenancePoints = receptionPoints.filter(
    (p) => p.status === 'maintenance' && p.maintenanceUntil !== null
  )
  for (const mp of maintenancePoints) {
    const remain = mp.maintenanceUntil! - currentTime
    if (remain > 0 && remain <= 10 && metrics.queueSize >= 2) {
      addTip(
        'info',
        'maintenance',
        65,
        '维护即将完成',
        `${mp.name}约${Math.ceil(remain)}分钟后恢复，可提前准备待接待团队`
      )
    }
  }

  if (metrics.queueSize === 0 && metrics.idlePointCount >= 1 && metrics.busyPointCount >= 1) {
    addTip(
      'success',
      'general',
      30,
      '调度良好',
      '队列已清空！继续保持，等待下一批访客到达'
    )
  }

  const veryLongWait = queue.find(
    (g) => currentTime - g.arrivalTime > config.avgWaitBenchmark * 2
  )
  if (veryLongWait && metrics.idlePointCount > 0) {
    addTip(
      'warning',
      'wait',
      75,
      '超长等待预警',
      `${veryLongWait.name}已等待${Math.round(currentTime - veryLongWait.arrivalTime)}分钟！`
    )
  }

  return tips.sort((a, b) => b.priority - a.priority)
}

export function analyzeDispatchPerformance(
  result: GameResult,
  allEvents: GameResult['events'],
  decisions: DecisionRecord[]
): DispatchSummary {
  const difficulty = result.difficulty
  const config = DIFFICULTY_CONFIG[difficulty]

  const baseServed = result.servedCount * 100
  const waitBonus = Math.max(0, 500 - result.totalWaitTime)
  const complaintPenalty = result.complaints * 50
  const totalBeforeExtra = baseServed + waitBonus - complaintPenalty
  const extraPoints = Math.max(0, result.score - totalBeforeExtra)

  const lossPoints: LossPointItem[] = []

  const maxWaitBonus = 500
  const lostWaitPoints = maxWaitBonus - waitBonus
  if (lostWaitPoints > 50) {
    lossPoints.push({
      category: 'wait',
      label: '等待时间失分',
      points: lostWaitPoints,
      maxPoints: maxWaitBonus,
      detail: `总等待${result.totalWaitTime}分钟，超过理想值${Math.round(maxWaitBonus - 0)}分钟，损失${lostWaitPoints}分等待加分`,
    })
  }

  const maxComplaintTolerance = config.complaintTolerance * 50
  if (complaintPenalty > 0) {
    lossPoints.push({
      category: 'complaint',
      label: '投诉扣分',
      points: complaintPenalty,
      maxPoints: Math.max(complaintPenalty, maxComplaintTolerance),
      detail: `${result.complaints}起投诉，每起扣50分，共损失${complaintPenalty}分${
        result.complaints > config.complaintTolerance
          ? `（超过${difficulty === 'hard' ? '困难' : '普通'}模式容忍值${config.complaintTolerance}起）`
          : ''
      }`,
    })
  }

  const totalExpectedGroups = allEvents.filter(
    (e) => e.type === 'group_arrival' || e.type === 'vip_arrival'
  ).length
  const unserved = totalExpectedGroups - result.servedCount
  if (unserved > 0) {
    const missedPoints = unserved * 100
    lossPoints.push({
      category: 'unserved',
      label: '未接待损失',
      points: missedPoints,
      maxPoints: totalExpectedGroups * 100,
      detail: `预计到达${totalExpectedGroups}组，实际接待${result.servedCount}组，${unserved}组未完成接待，少得${missedPoints}分`,
    })
  }

  const keyActions: KeyAction[] = extractKeyActions(result, decisions, allEvents, config)

  const efficiencyMetrics: EfficiencyMetric[] = calculateEfficiencyMetrics(result, config, totalExpectedGroups)

  const suggestions = generateSuggestions(lossPoints, efficiencyMetrics, keyActions, config, difficulty)

  const { overallComment, dispatchStyle } = generateOverallComment(
    result,
    lossPoints,
    efficiencyMetrics,
    config,
    difficulty
  )

  return {
    totalScore: result.score,
    scoreBreakdown: {
      served: {
        label: '接待得分',
        points: baseServed,
        detail: `成功接待${result.servedCount}组，每组100分`,
      },
      waitBonus: {
        label: '等待加分',
        points: waitBonus,
        detail: waitBonus >= 400
          ? `总等待仅${result.totalWaitTime}分钟，等待加分近乎满分！`
          : waitBonus >= 200
            ? `总等待${result.totalWaitTime}分钟，获得部分等待加分`
            : `总等待${result.totalWaitTime}分钟过长，等待加分较少`,
      },
      penalties: {
        label: '投诉扣分',
        points: -complaintPenalty,
        detail: complaintPenalty === 0
          ? '零投诉！完美的投诉控制'
          : `${result.complaints}起投诉，共扣${complaintPenalty}分`,
      },
      extra: {
        label: '其他加减项',
        points: extraPoints,
        detail: extraPoints > 0
          ? `临时加场等策略带来的额外收益：${extraPoints}分`
          : extraPoints < 0
            ? `策略失误导致的额外扣减：${Math.abs(extraPoints)}分`
            : '无额外加减项',
      },
    },
    lossPoints: lossPoints.sort((a, b) => b.points - a.points),
    keyActions,
    efficiencyMetrics,
    suggestions,
    overallComment,
    dispatchStyle,
  }
}

function extractKeyActions(
  result: GameResult,
  decisions: DecisionRecord[],
  events: GameResult['events'],
  _config: typeof DIFFICULTY_CONFIG.normal
): KeyAction[] {
  const actions: KeyAction[] = []

  for (const d of decisions) {
    switch (d.action) {
      case 'VIP优先接待':
        actions.push({
          time: d.time,
          type: 'assign',
          label: 'VIP优先接待',
          detail: d.detail,
          impact: 'positive',
          impactValue: 25,
        })
        break

      case '安排接待':
      case '插队安排接待': {
        const isCut = d.action === '插队安排接待'
        actions.push({
          time: d.time,
          type: 'assign',
          label: isCut ? '插队安排接待' : '安排团队接待',
          detail: d.detail,
          impact: isCut ? 'positive' : 'neutral',
          impactValue: isCut ? 12 : 5,
        })
        break
      }

      case '临时加场':
        actions.push({
          time: d.time,
          type: 'extra',
          label: '临时加场',
          detail: d.detail,
          impact: 'positive',
          impactValue: 18,
        })
        break

      case '提升优先级': {
        const isVip = d.detail.includes('VIP优先')
        const isHighRisk = d.detail.includes('高风险优先')
        actions.push({
          time: d.time,
          type: 'reorder',
          label: isVip ? 'VIP前移优先' : isHighRisk ? '高风险团队前移' : '提升团队优先级',
          detail: d.detail,
          impact: isVip || isHighRisk ? 'positive' : 'neutral',
          impactValue: isVip ? 18 : isHighRisk ? 15 : 6,
        })
        break
      }

      case '降低优先级':
        actions.push({
          time: d.time,
          type: 'reorder',
          label: '降低团队优先级',
          detail: d.detail,
          impact: 'neutral',
          impactValue: 3,
        })
        break

      case '调整队列顺序': {
        const isVip = d.detail.includes('【VIP】')
        const isHighRisk = d.detail.includes('【高风险】')
        const isPromote = d.detail.includes('提升')
        actions.push({
          time: d.time,
          type: 'reorder',
          label: isVip
            ? 'VIP优先排序'
            : isHighRisk
              ? '高风险优先排序'
              : isPromote
                ? '提升排序位置'
                : '推后排序位置',
          detail: d.detail,
          impact: isVip || isHighRisk ? 'positive' : 'neutral',
          impactValue: isVip ? 20 : isHighRisk ? 16 : isPromote ? 7 : 2,
        })
        break
      }

      case '暂停接待点':
        actions.push({
          time: d.time,
          type: 'pause',
          label: '暂停接待点',
          detail: d.detail,
          impact: 'neutral',
          impactValue: 0,
        })
        break

      case '恢复接待点':
        actions.push({
          time: d.time,
          type: 'resume',
          label: '恢复接待点',
          detail: d.detail,
          impact: 'positive',
          impactValue: 8,
        })
        break

      case '提前结束维护':
        actions.push({
          time: d.time,
          type: 'resume',
          label: '提前结束维护',
          detail: d.detail,
          impact: 'positive',
          impactValue: 14,
        })
        break

      case '暂停/恢复接待点':
        actions.push({
          time: d.time,
          type: 'pause',
          label: '接待点状态切换',
          detail: d.detail,
          impact: 'neutral',
          impactValue: 2,
        })
        break

      default:
        break
    }
  }

  if (result.complaints === 0) {
    actions.push({
      time: result.events.length > 0 ? result.events[result.events.length - 1].triggerTime : 540,
      type: 'assign',
      label: '零投诉成就',
      detail: '本局未发生任何投诉事件',
      impact: 'positive',
      impactValue: 50,
    })
  }

  const maintenanceEvents = events.filter((e) => e.type === 'maintenance' || e.type === 'guide_break')
  if (maintenanceEvents.length >= 2) {
    actions.push({
      time: maintenanceEvents[0].triggerTime,
      type: 'resume',
      label: '应对维护事件',
      detail: `处理${maintenanceEvents.length}起接待点中断事件`,
      impact: 'neutral',
      impactValue: 0,
    })
  }

  return actions
    .sort((a, b) => b.impactValue - a.impactValue)
    .slice(0, 10)
    .sort((a, b) => a.time - b.time)
}

function calculateEfficiencyMetrics(
  result: GameResult,
  config: typeof DIFFICULTY_CONFIG.normal,
  totalExpectedGroups: number
): EfficiencyMetric[] {
  const metrics: EfficiencyMetric[] = []
  const avgWait = result.servedCount > 0 ? result.totalWaitTime / result.servedCount : 0

  metrics.push({
    label: '平均等待时间',
    value: Math.round(avgWait),
    unit: '分钟',
    benchmark: config.avgWaitBenchmark,
    rating: avgWait <= config.avgWaitBenchmark * 0.6
      ? 'excellent'
      : avgWait <= config.avgWaitBenchmark
        ? 'good'
        : avgWait <= config.avgWaitBenchmark * 1.5
          ? 'average'
          : 'poor',
    comment: avgWait <= config.avgWaitBenchmark * 0.6
      ? '远低于基准值，调度效率极佳'
      : avgWait <= config.avgWaitBenchmark
        ? '控制在合理范围内'
        : avgWait <= config.avgWaitBenchmark * 1.5
          ? '略高于基准值，仍有优化空间'
          : '明显偏高，需优化排队策略',
  })

  const serveRate = totalExpectedGroups > 0 ? result.servedCount / totalExpectedGroups : 0
  metrics.push({
    label: '团队接待率',
    value: Math.round(serveRate * 100),
    unit: '%',
    benchmark: 85,
    rating: serveRate >= 0.95
      ? 'excellent'
      : serveRate >= 0.85
        ? 'good'
        : serveRate >= 0.7
          ? 'average'
          : 'poor',
    comment: serveRate >= 0.95
      ? '几乎接待了所有到达的团队！'
      : serveRate >= 0.85
        ? '绝大多数团队都已接待'
        : serveRate >= 0.7
          ? '大部分团队已接待，但仍有遗漏'
          : '较多团队未能接待，需加快调度节奏',
  })

  const complaintRatio = totalExpectedGroups > 0 ? result.complaints / totalExpectedGroups : 0
  metrics.push({
    label: '投诉发生率',
    value: Math.round(complaintRatio * 100),
    unit: '%',
    benchmark: 10,
    rating: complaintRatio === 0
      ? 'excellent'
      : complaintRatio <= 0.08
        ? 'good'
        : complaintRatio <= 0.15
          ? 'average'
          : 'poor',
    comment: complaintRatio === 0
      ? '完美！全程无投诉'
      : complaintRatio <= 0.08
        ? '投诉控制在低水平'
        : complaintRatio <= 0.15
          ? '投诉率略高，注意耐心低的团队'
          : '投诉率过高，优先安排即将投诉的团队',
  })

  const servedPerHour = (result.servedCount / (GAME_DURATION / 60))
  const hourlyBenchmark = config.servedTarget / 8
  metrics.push({
    label: '每小时接待量',
    value: Math.round(servedPerHour * 10) / 10,
    unit: '组/时',
    benchmark: Math.round(hourlyBenchmark * 10) / 10,
    rating: servedPerHour >= hourlyBenchmark * 1.2
      ? 'excellent'
      : servedPerHour >= hourlyBenchmark
        ? 'good'
        : servedPerHour >= hourlyBenchmark * 0.8
          ? 'average'
          : 'poor',
    comment: servedPerHour >= hourlyBenchmark * 1.2
      ? '远超预期的高效输出！'
      : servedPerHour >= hourlyBenchmark
        ? '达到预期处理速度'
        : servedPerHour >= hourlyBenchmark * 0.8
          ? '接近预期，可进一步提升'
          : '处理速度偏慢，建议并行安排更多接待点',
  })

  return metrics
}

function generateSuggestions(
  lossPoints: LossPointItem[],
  metrics: EfficiencyMetric[],
  actions: KeyAction[],
  config: typeof DIFFICULTY_CONFIG.normal,
  difficulty: Difficulty
): ImprovementSuggestion[] {
  const suggestions: ImprovementSuggestion[] = []
  const poorMetrics = metrics.filter((m) => m.rating === 'poor')
  const avgMetrics = metrics.filter((m) => m.rating === 'average')

  const complaintLoss = lossPoints.find((l) => l.category === 'complaint')
  if (complaintLoss || poorMetrics.some((m) => m.label === '投诉发生率')) {
    suggestions.push({
      priority: 'high',
      title: '优先降低投诉率',
      description: '投诉是失分的主要原因。VIP团队耐心值较低，务必优先安排；普通团队等待超过耐心值80%时应立即处理。',
      action: '使用拖拽功能将高风险团队移到队列前部，优先安排到空闲接待点',
    })
  }

  const waitLoss = lossPoints.find((l) => l.category === 'wait')
  if (waitLoss || poorMetrics.some((m) => m.label === '平均等待时间')) {
    suggestions.push({
      priority: 'high',
      title: '缩短团队等待时间',
      description: difficulty === 'hard'
        ? '困难模式下接待点较少，等待时间容易堆积。关键是避免大团队占用接待点时间过长导致后续拥堵。'
        : '普通模式下有充足的接待点，应充分利用空闲资源减少等待。',
      action: '保持至少1-2个接待点随时空闲以应对突发到达；大团队(>15人)提前安排，避免堆积',
    })
  }

  const unservedLoss = lossPoints.find((l) => l.category === 'unserved')
  if (unservedLoss || poorMetrics.some((m) => m.label === '团队接待率')) {
    suggestions.push({
      priority: 'high',
      title: '提高团队接待完成度',
      description: `预计到达的团队中有${Math.round(unservedLoss ? (unservedLoss.points / 100) : 0)}组未能完成接待。闭馆前应尽可能消化队列。`,
      action: '临近闭馆时合理使用临时加场，优先处理剩余队列；必要时跳过较长的接待任务',
    })
  }

  if (avgMetrics.some((m) => m.label === '每小时接待量')) {
    suggestions.push({
      priority: 'medium',
      title: '提升调度响应速度',
      description: '接待点空闲时应尽快安排下一个团队，减少空转时间。',
      action: '尝试将速度调到2x配合手动调度，在接待点即将结束时提前选择好下一个团队',
    })
  }

  const extraUsed = actions.filter((a) => a.type === 'extra').length
  if (extraUsed < (difficulty === 'hard' ? 1 : 2)) {
    suggestions.push({
      priority: difficulty === 'hard' ? 'high' : 'medium',
      title: `善用临时加场功能${difficulty === 'hard' ? '（困难模式关键）' : ''}`,
      description: difficulty === 'hard'
        ? '困难模式仅有2个基础接待点，临时加场是应对高峰期的核心手段。'
        : '临时加场可以在高峰时段提供额外接待能力，有效降低等待时间。',
      action: `在队列超过5组或压力值超过60%时果断加场，每局建议至少使用${difficulty === 'hard' ? 2 : 2}-${difficulty === 'hard' ? 2 : 3}次`,
    })
  }

  if (suggestions.length === 0) {
    suggestions.push({
      priority: 'low',
      title: '保持出色表现！',
      description: '各项指标均表现优秀，尝试挑战更高难度或追求满分。',
      action: '尝试困难模式，或在普通模式下追求零等待+零投诉的完美调度',
    })
  }

  return suggestions.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.priority] - order[b.priority]
  })
}

function generateOverallComment(
  result: GameResult,
  lossPoints: LossPointItem[],
  metrics: EfficiencyMetric[],
  config: typeof DIFFICULTY_CONFIG.normal,
  difficulty: Difficulty
): { overallComment: string; dispatchStyle: string } {
  const excellentCount = metrics.filter((m) => m.rating === 'excellent').length
  const goodCount = metrics.filter((m) => m.rating === 'good').length
  const poorCount = metrics.filter((m) => m.rating === 'poor').length
  const totalLoss = lossPoints.reduce((s, l) => s + l.points, 0)

  let overallComment: string
  let dispatchStyle: string

  if (result.score >= 2000 && excellentCount >= 3) {
    overallComment = '完美调度！你对团队优先级的判断精准，接待资源的分配恰到好处，几乎没有任何浪费。'
    dispatchStyle = '完美调度员'
  } else if (result.score >= 1500 && excellentCount >= 2) {
    overallComment = '非常出色的调度表现！你能在压力下保持冷静判断，绝大多数团队都得到了及时接待。'
    dispatchStyle = '金牌调度员'
  } else if (result.score >= 1000 && poorCount === 0) {
    overallComment = '调度表现稳健，虽然有些地方可以做得更好，但整体控制住了局面。'
    dispatchStyle = '熟练调度员'
  } else if (result.score >= 800) {
    overallComment = '基本合格的调度，但在高峰时段处理略显手忙脚乱，注意提前预判。'
    dispatchStyle = '见习调度员'
  } else {
    overallComment = '调度还有较大提升空间，建议先关注VIP和即将投诉的团队，再逐步优化整体效率。'
    dispatchStyle = '新手调度员'
  }

  const modeTag = difficulty === 'hard' ? '【困难模式】' : '【普通模式】'
  overallComment = modeTag + overallComment

  if (totalLoss > 0 && lossPoints.length > 0) {
    const topLoss = lossPoints[0]
    overallComment += ` 主要失分点：${topLoss.label}（${topLoss.points}分）。`
  }

  if (result.complaints === 0 && result.score >= 1000) {
    overallComment += ' 特别表扬：零投诉！这是调度能力的最佳证明。'
  }

  return { overallComment, dispatchStyle }
}
