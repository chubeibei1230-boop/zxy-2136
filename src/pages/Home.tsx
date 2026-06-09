import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '@/store/gameStore'
import { loadBestScore } from '@/utils/storage'
import type { Difficulty } from '@/types/game'
import { Trophy, Play, BookOpen, Crown, Zap, Users } from 'lucide-react'

export default function Home() {
  const navigate = useNavigate()
  const initGame = useGameStore((s) => s.initGame)
  const [showRules, setShowRules] = useState(false)
  const bestNormal = loadBestScore('normal')
  const bestHard = loadBestScore('hard')

  const startGame = (difficulty: Difficulty) => {
    initGame(difficulty)
    navigate('/game')
  }

  if (showRules) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-slate-800 border border-slate-700 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-amber-400 mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            游戏规则
          </h2>
          <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
            <div className="bg-slate-900/50 rounded-lg p-4">
              <h3 className="text-amber-400 font-semibold mb-2"> 游戏目标</h3>
              <p>在展厅开放时段（9:00-17:00）内，合理安排访客接待顺序，尽量降低等待时间和投诉数量。</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4">
              <h3 className="text-emerald-400 font-semibold mb-2"> 三种角色</h3>
              <ul className="space-y-1">
                <li><span className="text-amber-400">调度员（你）</span> — 拖动预约卡、安排加场、暂停接待点</li>
                <li><span className="text-blue-400">提示员</span> — 实时展示压力值、投诉计数和预警信息</li>
                <li><span className="text-violet-400">结算员</span> — 游戏结束后展示得分和复盘数据</li>
              </ul>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4">
              <h3 className="text-blue-400 font-semibold mb-2"> 核心操作</h3>
              <ul className="space-y-1">
                <li>• 点击预约卡上的「→ 展厅X」按钮将团队分配到空闲接待点</li>
                <li>• 使用上下箭头调整团队在队列中的优先级</li>
                <li>• 临时加场可增加限时接待点（次数有限）</li>
                <li>• 暂停/恢复接待点以应对突发状况</li>
                <li>• VIP团队耐心更短，需要优先安排</li>
              </ul>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4">
              <h3 className="text-rose-400 font-semibold mb-2"> 随机事件</h3>
              <p>临时团体到达、讲解员休息、接待点维护等事件会在特定时间触发，请注意提示员的预警信息！</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4">
              <h3 className="text-violet-400 font-semibold mb-2"> 评分规则</h3>
              <ul className="space-y-1">
                <li>• 基础分 = 已接待团队数 × 100</li>
                <li>• 等待加分 = max(0, 500 - 总等待时间)</li>
                <li>• 投诉扣分 = 投诉数 × 50</li>
              </ul>
            </div>
          </div>
          <button
            onClick={() => setShowRules(false)}
            className="mt-6 w-full py-3 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl font-medium hover:bg-amber-500/30 transition-colors"
          >
            返回
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-1 bg-gradient-to-r from-transparent to-amber-500 rounded" />
            <Crown className="w-8 h-8 text-amber-400" />
            <div className="w-12 h-1 bg-gradient-to-l from-transparent to-amber-500 rounded" />
          </div>
          <h1 className="text-4xl font-bold text-slate-100 mb-3 tracking-tight">
            展厅队列调度
          </h1>
          <p className="text-slate-400 text-lg">
            在开放时段内合理安排接待，让等待和投诉尽量低
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <button
            onClick={() => startGame('normal')}
            className="group bg-slate-800 border border-slate-700 rounded-2xl p-6 text-left hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-emerald-500/15 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-slate-200 font-bold text-lg">普通模式</h3>
                <p className="text-slate-500 text-xs">3个接待点 · 较少事件</p>
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              适合新手，讲解员较多，突发事件较少
            </p>
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 text-sm font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <Play className="w-4 h-4" />
                开始游戏
              </span>
              {bestNormal > 0 && (
                <span className="flex items-center gap-1 text-amber-400 text-xs">
                  <Trophy className="w-3 h-3" />
                  最佳 {bestNormal}
                </span>
              )}
            </div>
          </button>

          <button
            onClick={() => startGame('hard')}
            className="group bg-slate-800 border border-slate-700 rounded-2xl p-6 text-left hover:border-rose-500/50 hover:shadow-lg hover:shadow-rose-500/5 transition-all duration-300"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-rose-500/15 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-slate-200 font-bold text-lg">困难模式</h3>
                <p className="text-slate-500 text-xs">2个接待点 · 更多事件</p>
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              接待点减少，团队和突发事件增多，考验调度能力
            </p>
            <div className="flex items-center justify-between">
              <span className="text-rose-400 text-sm font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <Play className="w-4 h-4" />
                开始游戏
              </span>
              {bestHard > 0 && (
                <span className="flex items-center gap-1 text-amber-400 text-xs">
                  <Trophy className="w-3 h-3" />
                  最佳 {bestHard}
                </span>
              )}
            </div>
          </button>
        </div>

        <div className="text-center">
          <button
            onClick={() => setShowRules(true)}
            className="text-slate-400 hover:text-amber-400 text-sm flex items-center gap-2 mx-auto transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            查看游戏规则
          </button>
        </div>

        <div className="mt-12 text-center text-slate-600 text-xs">
          按 空格 暂停/继续 · 按 1-3 调整速度
        </div>
      </div>
    </div>
  )
}
