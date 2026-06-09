import { useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import type { GameResult } from '@/types/game'
import { formatTime } from '@/types/game'
import { loadBestScore } from '@/utils/storage'
import { getScoreRating } from '@/utils/scoring'
import { useGameStore } from '@/store/gameStore'
import { Trophy, Home, RotateCcw, Clock, MessageSquareWarning, Users, Star, ChevronRight, Crown } from 'lucide-react'

export default function Result() {
  const location = useLocation()
  const navigate = useNavigate()
  const result = location.state?.result as GameResult | undefined
  const initGame = useGameStore((s) => s.initGame)
  const [displayScore, setDisplayScore] = useState(0)
  const [showDetails, setShowDetails] = useState(false)

  const bestScore = result ? loadBestScore(result.difficulty) : 0

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
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [result])

  if (!result) {
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

  const handlePlayAgain = () => {
    initGame(result.difficulty)
    navigate('/game')
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="relative p-8 text-center border-b border-slate-700">
            <div className="absolute top-4 left-1/2 -translate-x-1/2">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black"
                style={{ backgroundColor: `${rating.color}20`, color: rating.color }}
              >
                {rating.label}
              </div>
            </div>

            <div className="mt-24 mb-4">
              <p className="text-slate-400 text-sm mb-1 flex items-center justify-center gap-1">
                <Crown className="w-4 h-4 text-amber-400" />
                结算员报告
              </p>
              <div className="text-5xl font-black text-slate-100 mb-2">
                {displayScore}
              </div>
              <p className="text-slate-500 text-sm">
                {result.difficulty === 'hard' ? '困难模式' : '普通模式'}
                {isNewBest && (
                  <span className="ml-2 text-amber-400 flex items-center gap-1 inline-flex">
                    <Star className="w-3 h-3 fill-amber-400" />
                    新纪录！
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 p-6 border-b border-slate-700">
            <div className="bg-slate-900/50 rounded-xl p-4 text-center">
              <Users className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-slate-200">{result.servedCount}</div>
              <div className="text-slate-500 text-xs">已接待</div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4 text-center">
              <Clock className="w-5 h-5 text-blue-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-slate-200">{result.totalWaitTime}</div>
              <div className="text-slate-500 text-xs">总等待(分)</div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4 text-center">
              <MessageSquareWarning className="w-5 h-5 text-rose-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-rose-300">{result.complaints}</div>
              <div className="text-slate-500 text-xs">投诉数</div>
            </div>
          </div>

          <div className="p-6 border-b border-slate-700">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between text-sm text-slate-300 hover:text-amber-400 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                事件回顾与复盘
              </span>
              <ChevronRight
                className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-90' : ''}`}
              />
            </button>

            {showDetails && (
              <div className="mt-4 space-y-3 max-h-80 overflow-y-auto">
                {result.decisions.map((d, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 text-sm"
                  >
                    <div className="w-14 shrink-0 text-slate-500 text-xs text-right pt-0.5">
                      {formatTime(d.time)}
                    </div>
                    <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <span className="text-amber-400 font-medium">{d.action}</span>
                      <span className="text-slate-400 ml-2">{d.detail}</span>
                    </div>
                  </div>
                ))}

                {result.events.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <p className="text-slate-500 text-xs font-medium mb-2">随机事件</p>
                    {result.events.map((e, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 text-sm mb-2"
                      >
                        <div className="w-14 shrink-0 text-slate-500 text-xs text-right pt-0.5">
                          {formatTime(e.triggerTime)}
                        </div>
                        <div
                          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            e.type === 'vip_arrival'
                              ? 'bg-amber-400'
                              : e.type === 'guide_break'
                                ? 'bg-amber-500'
                                : e.type === 'maintenance'
                                  ? 'bg-rose-500'
                                  : 'bg-blue-500'
                          }`}
                        />
                        <div className="flex-1 text-slate-400">{e.description}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-6 flex gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex-1 py-3 bg-slate-700/50 text-slate-300 rounded-xl font-medium hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              返回首页
            </button>
            <button
              onClick={handlePlayAgain}
              className="flex-1 py-3 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl font-medium hover:bg-amber-500/30 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              再来一局
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
