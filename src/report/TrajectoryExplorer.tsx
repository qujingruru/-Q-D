/**
 * 轨迹浏览器 — the process-prediction entry: click ANY world on the star
 * map (or a curated one) and see its full weekly trajectory + event nodes.
 * Worlds are recreated deterministically from (masterSeed, runIndex).
 */
import { useMemo, useRef, useState } from 'react'
import { replayWorld } from '../sim/replay'
import { runSeed } from '../sim/rng'
import { downsample } from '../sim/replay'
import type { CoupleInit, PersonParams, RunSummary } from '../types'
import type { McResult } from './stats'
import type { ScenarioSelection } from '../model/scenarios'

interface Props {
  result: McResult
  masterSeed: number
  persons: [PersonParams, PersonParams]
  init: CoupleInit
  scenarioSelection?: ScenarioSelection
  names: [string, string]
}

const GOLD_ANGLE = 2.39996

export function TrajectoryExplorer({ result, masterSeed, persons, init, scenarioSelection, names }: Props) {
  const [selected, setSelected] = useState<RunSummary | null>(() => result.curated.longest)
  const [hoverText, setHoverText] = useState<string | null>(null)

  const summaryFor = (r: number): RunSummary => {
    const dur = result.durations[r] ?? 2600
    return {
      runIndex: r,
      seed: runSeed(masterSeed, r),
      durationWeeks: dur,
      survived: dur >= 2600,
      endReason: dur >= 2600 ? 'censored' : 'exhaustion',
      leaver: null,
      dramaScore: 0,
    }
  }

  const detail = useMemo(
    () => (selected ? replayWorld({ summary: selected, persons, init, scenarioSelection }) : null),
    [selected, persons, init, scenarioSelection],
  )

  // ---- star map (canvas, click = nearest world) ---------------------------
  const drawMap = (cv: HTMLCanvasElement) => {
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = cv.clientWidth
    const h = cv.clientHeight
    cv.width = w * dpr
    cv.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    const cx = w / 2
    const cy = h / 2
    const maxR = Math.min(w, h) / 2 - 10
    const areaScale = Math.sqrt(Math.max(1, result.n)) * 2.1
    for (let i = 0; i < result.n; i++) {
      const dur = result.durations[i]
      const survived = dur >= 2600
      const ang = i * GOLD_ANGLE
      const rr = (Math.sqrt(i + 0.5) / areaScale) * maxR
      const x = cx + Math.cos(ang) * rr
      const y = cy + Math.sin(ang) * rr * 0.92
      const sel = selected?.runIndex === i
      ctx.beginPath()
      ctx.arc(x, y, sel ? 4.5 : survived ? 1.8 : 1.2, 0, Math.PI * 2)
      ctx.fillStyle = survived ? 'rgba(217,164,65,0.9)' : sel ? 'rgba(232,131,111,1)' : 'rgba(196,150,120,0.5)'
      ctx.fill()
      if (sel) {
        ctx.beginPath()
        ctx.arc(x, y, 8, 0, Math.PI * 2)
        ctx.strokeStyle = 'var(--q)'
        ctx.strokeStyle = '#e8836f'
        ctx.stroke()
      }
    }
  }

  const mapRef = useRef<HTMLCanvasElement | null>(null)
  const redraw = () => {
    if (mapRef.current) requestAnimationFrame(() => mapRef.current && drawMap(mapRef.current))
  }
  const canvasCb = (cv: HTMLCanvasElement | null) => {
    mapRef.current = cv
    if (cv) requestAnimationFrame(() => drawMap(cv))
  }
  // redraw when selection changes
  useMemo(() => {
    redraw()
  }, [selected, result])

  const onMapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const cv = e.currentTarget
    const rect = cv.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const w = cv.clientWidth
    const h = cv.clientHeight
    const cx = w / 2
    const cy = h / 2
    const maxR = Math.min(w, h) / 2 - 10
    const areaScale = Math.sqrt(Math.max(1, result.n)) * 2.1
    let best = -1
    let bestD = 144 // 12px radius
    for (let i = 0; i < result.n; i++) {
      const ang = i * GOLD_ANGLE
      const rr = (Math.sqrt(i + 0.5) / areaScale) * maxR
      const dx = cx + Math.cos(ang) * rr - x
      const dy = cy + Math.sin(ang) * rr * 0.92 - y
      const dd = dx * dx + dy * dy
      if (dd < bestD) {
        bestD = dd
        best = i
      }
    }
    if (best >= 0) {
      setSelected(summaryFor(best))
      setHoverText(null)
    }
  }

  const tr = detail ? downsample(detail.trajectory, 400) : []

  return (
    <div className="explorer">
      <p className="muted small">
        星图中每一个光点都是一个平行世界（金色 = 相爱久久）。点击任意光点，查看那个世界逐周走过的路。
      </p>
      <canvas
        ref={canvasCb}
        className="explorer-map"
        onClick={onMapClick}
        onMouseMove={(e) => {
          const cv = e.currentTarget
          const rect = cv.getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top
          const w = cv.clientWidth
          const h = cv.clientHeight
          const cx = w / 2
          const cy = h / 2
          const maxR = Math.min(w, h) / 2 - 10
          const areaScale = Math.sqrt(Math.max(1, result.n)) * 2.1
          let best = -1
          let bestD = 100
          for (let i = 0; i < result.n; i++) {
            const ang = i * GOLD_ANGLE
            const rr = (Math.sqrt(i + 0.5) / areaScale) * maxR
            const dx = cx + Math.cos(ang) * rr - x
            const dy = cy + Math.sin(ang) * rr * 0.92 - y
            const dd = dx * dx + dy * dy
            if (dd < bestD) {
              bestD = dd
              best = i
            }
          }
          if (best >= 0) {
            const dur = result.durations[best]
            const y2 = dur >= 2600 ? 50 : Math.floor(dur / 52)
            setHoverText(`世界 #${best + 1} · ${dur >= 2600 ? '相爱久久' : `相爱约 ${y2} 年`}`)
          } else setHoverText(null)
        }}
      />
      {hoverText && <p className="muted small">{hoverText}</p>}

      <div className="explorer-curated">
        <button className="chip" onClick={() => setSelected(result.curated.longest)}>最漫长</button>
        <button className="chip" onClick={() => setSelected(result.curated.shortest)}>最短暂</button>
        {result.curated.miracle && (
          <button className="chip chip-rand" onClick={() => setSelected(result.curated.miracle)}>奇迹世界 ✦</button>
        )}
        <button
          className="chip"
          onClick={() => setSelected(summaryFor((Math.random() * result.n) | 0))}
        >
          随机一个世界
        </button>
      </div>

      {detail && selected && (
        <div className="explorer-detail">
          <h5>
            世界 #{selected.runIndex + 1} ·{' '}
            {selected.survived
              ? '相爱久久'
              : `${selected.durationWeeks < 52 ? `${Math.max(1, Math.round(selected.durationWeeks / 4.33))} 个月` : `${Math.round(selected.durationWeeks / 52)} 年`}后分开`}
          </h5>
          <TrajectoryChart weeks={tr.map((p) => p.week)} q={tr.map((p) => p.moodQ)} d={tr.map((p) => p.moodD)} />
          <div className="explorer-events">
            {detail.events
              .filter((ev) => Math.abs(ev.magnitude) >= 1.4 || ev.type === 'nearbreakup' || ev.type === 'reunion' || ev.type === 'rare' || ev.type === 'milestone')
              .slice(0, 24)
              .map((ev, i) => (
                <span key={i} className={`ev ev-${ev.type}`}>
                  第{Math.max(1, Math.round(ev.week / 52))}年 · {EV_LABEL[ev.type] ?? ev.type}
                  {ev.who === 0 ? `（${names[0]}）` : ev.who === 1 ? `（${names[1]}）` : ''}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

const EV_LABEL: Record<string, string> = {
  conflict: '争执',
  repair: '修复',
  goodnews: '喜事',
  novelty: '新奇',
  stress: '变故',
  milestone: '里程碑',
  reunion: '团聚冲击',
  nearbreakup: '濒临分手',
  rare: '✦ 隐藏事件',
}

function TrajectoryChart({ weeks, q, d }: { weeks: number[]; q: number[]; d: number[] }) {
  const W = 640
  const H = 180
  const maxY = 10
  const toXY = (i: number, v: number): string => {
    const x = (weeks[i] / (weeks[weeks.length - 1] || 1)) * W
    const y = H / 2 - (v / maxY) * (H / 2 - 8)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="explorer-svg" preserveAspectRatio="none">
      <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="var(--line)" strokeWidth="1" />
      <polyline fill="none" stroke="var(--q)" strokeWidth="1.8" points={q.map((v, i) => toXY(i, v)).join(' ')} />
      <polyline fill="none" stroke="var(--d)" strokeWidth="1.8" strokeDasharray="4 3" points={d.map((v, i) => toXY(i, v)).join(' ')} />
    </svg>
  )
}
