import { useEffect, useRef, useCallback } from 'react'
import { useGameStore } from '@/store/gameStore'

export function useGameEngine() {
  const tick = useGameStore((s) => s.tick)
  const speed = useGameStore((s) => s.speed)
  const isPaused = useGameStore((s) => s.isPaused)
  const isGameOver = useGameStore((s) => s.isGameOver)
  const lastFrameRef = useRef<number | null>(null)

  const gameLoop = useCallback(
    (timestamp: number) => {
      if (lastFrameRef.current !== null) {
        const deltaMs = timestamp - lastFrameRef.current
        const deltaMinutes = (deltaMs / 1000) * speed
        if (deltaMinutes > 0 && deltaMinutes < 10) {
          tick(deltaMinutes)
        }
      }
      lastFrameRef.current = timestamp

      if (!isPaused && !isGameOver) {
        requestAnimationFrame(gameLoop)
      }
    },
    [tick, speed, isPaused, isGameOver]
  )

  useEffect(() => {
    if (!isPaused && !isGameOver) {
      lastFrameRef.current = null
      const id = requestAnimationFrame(gameLoop)
      return () => cancelAnimationFrame(id)
    }
  }, [gameLoop, isPaused, isGameOver])
}
