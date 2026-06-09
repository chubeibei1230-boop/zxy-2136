import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '@/store/gameStore'
import { useGameEngine } from '@/hooks/useGameEngine'
import { saveResult } from '@/utils/storage'
import { calculateScore } from '@/utils/scoring'
import TimeBar from '@/components/TimeBar'
import QueueCard from '@/components/QueueCard'
import ReceptionPoint from '@/components/ReceptionPoint'
import PromptPanel from '@/components/PromptPanel'
import EventNotification from '@/components/EventNotification'
import ActionPanel from '@/components/ActionPanel'
import type { GameResult } from '@/types/game'

export default function Game() {
  const navigate = useNavigate()
  const queue = useGameStore((s) => s.queue)
  const receptionPoints = useGameStore((s) => s.receptionPoints)
  const isGameOver = useGameStore((s) => s.isGameOver)
  const isPaused = useGameStore((s) => s.isPaused)
  const toggleGamePause = useGameStore((s) => s.toggleGamePause)
  const setSpeed = useGameStore((s) => s.setSpeed)
  const speed = useGameStore((s) => s.speed)
  const currentTime = useGameStore((s) => s.currentTime)

  useGameEngine()

  const handleGameOver = useCallback(() => {
    const state = useGameStore.getState()
    const score = calculateScore({
      complaints: state.complaints,
      totalWaitTime: state.totalWaitTime,
      servedCount: state.servedCount,
      events: state.triggeredEvents,
      decisions: state.decisions,
      difficulty: state.difficulty,
    })

    const result: GameResult = {
      id: `result_${Date.now()}`,
      difficulty: state.difficulty,
      score,
      complaints: state.complaints,
      totalWaitTime: state.totalWaitTime,
      servedCount: state.servedCount,
      events: state.triggeredEvents,
      decisions: state.decisions,
      timestamp: Date.now(),
    }

    saveResult(result)
    navigate('/result', { state: { result } })
  }, [navigate])

  useEffect(() => {
    if (isGameOver) {
      const timer = setTimeout(handleGameOver, 1500)
      return () => clearTimeout(timer)
    }
  }, [isGameOver, handleGameOver])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault()
        toggleGamePause()
      } else if (e.key === '1') {
        setSpeed(1)
      } else if (e.key === '2') {
        setSpeed(2)
      } else if (e.key === '3') {
        setSpeed(3)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleGamePause, setSpeed])

  return (
    <div className="h-screen bg-slate-900 flex flex-col relative overflow-hidden">
      <TimeBar />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 border-r border-slate-700 flex flex-col bg-slate-850">
          <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-slate-300 font-semibold text-sm">等待队列</h2>
            <span className="text-xs text-slate-500">{queue.length} 组等待</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {queue.length === 0 ? (
              <div className="text-center text-slate-600 text-sm py-8">
                暂无等待团队
              </div>
            ) : (
              queue.map((group, idx) => (
                <QueueCard
                  key={group.id}
                  group={group}
                  index={idx}
                  total={queue.length}
                />
              ))
            )}
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-slate-300 font-semibold text-sm">接待点</h2>
            <span className="text-xs text-slate-500">
              {receptionPoints.filter((p) => p.status === 'idle').length} 空闲
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {receptionPoints.map((point) => (
              <ReceptionPoint
                key={point.id}
                point={point}
                currentTime={currentTime}
              />
            ))}
          </div>

          {isGameOver && (
            <div className="mt-6 bg-slate-800 border border-amber-500/30 rounded-xl p-6 text-center">
              <h3 className="text-amber-400 text-xl font-bold mb-2">闭馆时间到！</h3>
              <p className="text-slate-400 text-sm">正在生成结算报告...</p>
            </div>
          )}
        </div>

        <div className="w-64 border-l border-slate-700 p-3">
          <PromptPanel />
        </div>
      </div>

      <EventNotification />
      <ActionPanel />

      {isPaused && !isGameOver && (
        <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center z-40 backdrop-blur-sm pointer-events-none">
          <div className="pointer-events-auto text-center">
            <h2 className="text-3xl font-bold text-amber-400 mb-2">已暂停</h2>
            <p className="text-slate-400">按空格键或点击继续按钮恢复游戏</p>
          </div>
        </div>
      )}
    </div>
  )
}
