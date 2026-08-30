/**
 * Ambient stardust — a light canvas particle field behind the intro and
 * ending scenes. Dots drift slowly upward with slight sway; grey theme
 * desaturates them. Pauses when the tab is hidden.
 */
import { useEffect, useRef } from 'react'

interface Props {
  theme?: 'warm' | 'gray' | 'light'
  density?: number
}

interface Dot {
  x: number
  y: number
  r: number
  vy: number
  sway: number
  phase: number
  alpha: number
}

export function StardustField({ theme = 'warm', density = 0.00012 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0
    let running = true
    const dots: Dot[] = []
    const gold = [217, 164, 65]
    const grey = [150, 150, 150]

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const target = Math.floor(canvas.clientWidth * canvas.clientHeight * density)
      dots.length = 0
      for (let i = 0; i < target; i++) {
        dots.push({
          x: Math.random() * canvas.clientWidth,
          y: Math.random() * canvas.clientHeight,
          r: 0.6 + Math.random() * 1.6,
          vy: 0.06 + Math.random() * 0.22,
          sway: 6 + Math.random() * 14,
          phase: Math.random() * Math.PI * 2,
          alpha: 0.15 + Math.random() * 0.5,
        })
      }
    }
    resize()
    window.addEventListener('resize', resize)

    let t = 0
    const tick = () => {
      if (!running) return
      t += 0.016
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight)
      const rgb = theme === 'gray' ? grey : gold
      for (const d of dots) {
        d.y -= d.vy
        if (d.y < -4) {
          d.y = canvas.clientHeight + 4
          d.x = Math.random() * canvas.clientWidth
        }
        const x = d.x + Math.sin(t * 0.7 + d.phase) * 2
        const tw = 0.6 + 0.4 * Math.sin(t * 1.3 + d.phase)
        ctx.beginPath()
        ctx.arc(x, d.y, d.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${d.alpha * tw})`
        ctx.fill()
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const onVis = () => {
      running = document.visibilityState === 'visible'
      if (running) raf = requestAnimationFrame(tick)
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [theme, density])

  return <canvas ref={ref} className="stardust" aria-hidden />
}
