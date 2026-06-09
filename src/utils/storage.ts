import type { GameResult, Difficulty } from '@/types/game'

const RESULTS_KEY = 'queue-game-results'
const BEST_NORMAL_KEY = 'queue-game-best-normal'
const BEST_HARD_KEY = 'queue-game-best-hard'

export function loadResults(): GameResult[] {
  try {
    const raw = localStorage.getItem(RESULTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveResult(result: GameResult): void {
  const results = loadResults()
  results.push(result)
  localStorage.setItem(RESULTS_KEY, JSON.stringify(results))

  const key = result.difficulty === 'normal' ? BEST_NORMAL_KEY : BEST_HARD_KEY
  const prev = localStorage.getItem(key)
  const prevScore = prev ? parseInt(prev, 10) : 0
  if (result.score > prevScore) {
    localStorage.setItem(key, result.score.toString())
  }
}

export function loadBestScore(difficulty: Difficulty): number {
  const key = difficulty === 'normal' ? BEST_NORMAL_KEY : BEST_HARD_KEY
  const raw = localStorage.getItem(key)
  return raw ? parseInt(raw, 10) : 0
}

export function clearResults(): void {
  localStorage.removeItem(RESULTS_KEY)
  localStorage.removeItem(BEST_NORMAL_KEY)
  localStorage.removeItem(BEST_HARD_KEY)
}
