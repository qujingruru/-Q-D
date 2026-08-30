/**
 * 万界展开 — the data-driven loading centrepiece.
 * Phase 1 (~2.5s): a branching light-tree grows from the couple at the
 * bottom centre. Phase 2: every completed simulation run lights one world
 * dot on a phyllotaxis spiral; colour encodes outcome duration, gold glow =
 * 白头偕老. Rendered entirely on one canvas → 10k dots at 60fps.
 */
import { useEffect, useRef } from 'react'

export interface WorldsData {
  durations: Uint16Array
  count: number
}

interface Props {
  theme: 'warm' | 'gray'
  total: number
  /** mutated in place by the parent as batches arrive; read every frame */
  worlds: WorldsData
}

interface Branch {
  x0: number
  y0: number
  angle: number
  len: number
  depth: number
  delay: number
}

export function WorldsCanvas({ theme, total, worlds }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({ theme, total, worlds })
  stateRef.current = { theme, total, worlds }

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0
    let start = performance.now()

    // --- branch tree (phase 1), seeded fixed so it looks the same every run
    const branches: Branch[] = []
    const buildBranches = (w: number, h: number) => {
      branches.length = 0
      const rng = (() => {
        let s = 1234567
        return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
      })()
      const grow = (x: number, y: number, angle: number, len: number, depth: number, delay: number) => {
        branches.push({ x0: x, y0: y, angle, len, depth, delay })
        if (depth >= 5) return
        const spread = 0.5 + rng() * 0.3
        const shrink = 0.68 + rng() * 0.1
        grow(x + Math.cos(angle) * len, y + Math.sin(angle) * len, angle - spread, len * shrink, depth + 1, delay + 120)
        grow(x + Math.cos(angle) * len, y + Math.sin(angle) * len, angle + spread * (0.7 + rng() * 0.6), len * shrink, depth + 1, delay + 140)
      }
      grow(w / 2, h * 0.86, -Math.PI / 2, Math.min(w, h) * 0.09, 0, 0)
    }

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      buildBranches(canvas.clientWidth, canvas.clientHeight)
    }
    resize()
    window.addEventListener('resize', resize)

    const GOLD = '217,164,65'
    const Q_COL = '232,131,111'
    const D_COL = '125,155,179'
    const GREY = '140,140,140'

    const durationColor = (dur: number, survived: boolean): string => {
      if (survived) return GOLD
      if (theme === 'gray') return GREY
      if (dur < 52 * 2) return '150,140,130'
      if (dur < 52 * 8) return '196,150,120'
      if (dur < 52 * 20) return Q_COL
      return D_COL
    }

    const tick = (now: number) => {
      const { theme: th, worlds: wd, total: tot } = stateRef.current
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const t = now - start
      ctx.clearRect(0, 0, w, h)

      // ---- phase 1: branch tree
      const treeFade = Math.max(0, 1 - Math.max(0, t - 2200) / 900)
      if (treeFade > 0.01) {
        ctx.save()
        ctx.lineCap = 'round'
        for (const b of branches) {
          const local = Math.max(0, Math.min(1, (t - b.delay) / 420))
          if (local <= 0) continue
          const x1 = b.x0 + Math.cos(b.angle) * b.len * local
          const y1 = b.y0 + Math.sin(b.angle) * b.len * local
          ctx.strokeStyle = `rgba(${th === 'gray' ? GREY : '217,164,65'},${(0.5 - b.depth * 0.07) * treeFade})`
          ctx.lineWidth = Math.max(0.5, 2.6 - b.depth * 0.45)
          ctx.beginPath()
          ctx.moveTo(b.x0, b.y0)
          ctx.lineTo(x1, y1)
          ctx.stroke()
        }
        ctx.restore()
      }

      // ---- phase 2: worlds on a phyllotaxis spiral
      const cx = w / 2
      const cy = h * 0.48
      const maxR = Math.min(w, h) * 0.46
      const n = wd.count
      const shown = n
      const areaScale = Math.sqrt(Math.max(1, tot)) * 2.1
      for (let i = 0; i < shown; i++) {
        const dur = wd.durations[i]
        const survived = dur >= 2600
        const ang = i * 2.39996 // golden angle
        const rr = (Math.sqrt(i + 0.5) / areaScale) * maxR
        const x = cx + Math.cos(ang) * rr
        const y = cy + Math.sin(ang) * rr * 0.92
        // recent worlds pop in brighter
        const age = shown - i
        const pop = age < 60 ? 1 + (60 - age) * 0.02 : 1
        const alpha = 0.35 + Math.min(0.55, dur / 5200)
        ctx.beginPath()
        ctx.arc(x, y, (survived ? 1.7 : 1.15) * pop, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${durationColor(dur, survived)},${alpha})`
        ctx.fill()
        if (survived) {
          ctx.beginPath()
          ctx.arc(x, y, 3.4 * pop, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${GOLD},${0.12 * alpha + 0.05})`
          ctx.fill()
        }
      }
      void th

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <canvas ref={ref} className="worlds-canvas" aria-hidden />
}
