/**
 * 万界展开加载场景 — shared by baseline (warm) and scenario (gray) runs.
 * Real progress batches drive the canvas + milestone captions.
 */
import { useEffect, useRef, useState } from 'react'
import { WorldsCanvas, type WorldsData } from '../art/WorldsCanvas'
import { runSimulation } from '../sim/simClient'
import type { CoupleInit, PersonParams, RunSummary } from '../types'
import type { McResult } from '../report/stats'
import type { ScenarioSelection } from '../model/scenarios'

interface Props {
  theme: 'warm' | 'gray'
  lead: string
  total: number
  masterSeed: number
  persons: [PersonParams, PersonParams]
  init: CoupleInit
  scenarioSelection?: ScenarioSelection
  onComplete: (r: McResult) => void
}

export function SimScene({ theme, lead, total, masterSeed, persons, init, scenarioSelection, onComplete }: Props) {
  const [done, setDone] = useState(0)
  const [captions, setCaptions] = useState<string[]>([])
  const worldsRef = useRef<WorldsData>({ durations: new Uint16Array(total), count: 0 })
  const statsRef = useRef({ survived: 0, shortest: Infinity, nextSurvivedMilestone: 1 })
  const completedRef = useRef(false)

  useEffect(() => {
    let alive = true
    const pushCaption = (line: string) => {
      if (!alive) return
      setCaptions((cs) => [...cs.slice(-2), line])
    }
    void runSimulation({
      masterSeed,
      runs: total,
      persons,
      init,
      scenarioSelection,
      onProgress: (d, t, batch) => {
        if (!alive) return
        const wd = worldsRef.current
        for (const s of batch) wd.durations[wd.count++] = Math.min(65535, s.durationWeeks)
        setDone(d)
        const st = statsRef.current
        for (const s of batch) {
          if (s.survived) st.survived++
          if (s.durationWeeks < st.shortest) st.shortest = s.durationWeeks
        }
        if (st.survived >= st.nextSurvivedMilestone) {
          if (st.nextSurvivedMilestone === 1) {
            pushCaption('第一个白头偕老的世界，刚刚诞生 ✦')
            st.nextSurvivedMilestone = 512
          } else {
            pushCaption(`第 ${st.survived.toLocaleString('zh-CN')} 个白头偕老的世界，已诞生`)
            st.nextSurvivedMilestone *= 2
          }
        }
        if (d === t) {
          const shortMonths = Math.max(1, Math.round(st.shortest / 4.33))
          pushCaption(
            st.survived === 0
              ? '在最短暂的那些世界里，他们只相爱了几个月'
              : `在最短暂的那些世界里，他们只相爱了约 ${shortMonths} 个月`,
          )
        }
      },
    }).then((r) => {
      if (!alive || completedRef.current) return
      completedRef.current = true
      // brief beat before transitioning
      setTimeout(() => alive && onComplete(r), 1200)
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pctDone = done / total

  return (
    <div className={`screen sim-screen theme-${theme}`}>
      <WorldsCanvas theme={theme} total={total} worlds={worldsRef.current} />
      <div className="sim-overlay">
        <p className="sim-lead">{lead}</p>
        <p className="sim-count">
          已展开 <strong>{done.toLocaleString('zh-CN')}</strong> / {total.toLocaleString('zh-CN')} 个平行世界
        </p>
        <div className="pv-bar sim-bar">
          <span style={{ width: `${pctDone * 100}%` }} />
        </div>
        <div className="sim-captions">
          {captions.map((c, i) => (
            <p key={i} className="sim-caption">
              {c}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

export type { RunSummary }
