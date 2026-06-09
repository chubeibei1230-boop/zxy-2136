import type { GameResult, DecisionRecord } from '@/types/game'

export function calculateScore(result: Omit<GameResult, 'id' | 'score' | 'timestamp'>): number {
  const baseScore = result.servedCount * 100
  const waitBonus = Math.max(0, 500 - result.totalWaitTime)
  const complaintPenalty = result.complaints * 50
  return Math.max(0, baseScore + waitBonus - complaintPenalty)
}

export function getScoreRating(score: number): { label: string; color: string } {
  if (score >= 2000) return { label: 'S', color: '#f59e0b' }
  if (score >= 1500) return { label: 'A', color: '#10b981' }
  if (score >= 1000) return { label: 'B', color: '#3b82f6' }
  if (score >= 500) return { label: 'C', color: '#8b5cf6' }
  return { label: 'D', color: '#ef4444' }
}

export function formatDecisionLog(decisions: DecisionRecord[]): string {
  return decisions
    .map((d) => {
      const h = Math.floor(d.time / 60)
      const m = Math.floor(d.time % 60)
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
      return `[${time}] ${d.action}: ${d.detail}`
    })
    .join('\n')
}
