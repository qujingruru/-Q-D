/**
 * Shared hand-drawn-style SVG/CSS charts (no chart library — keeps the
 * illustrative feel and the bundle small). Used in report + appendix.
 */
import type { McResult } from './stats'

export function HistChart({ result }: { result: McResult }) {
  const max = Math.max(...result.histogram.map((h) => h.count))
  return (
    <div className="pv-hist">
      {result.histogram.map((b) => (
        <div key={b.years} className="pv-hist-col" title={`${b.years}年：${b.count} 个世界`}>
          <span style={{ height: `${(b.count / max) * 100}%` }} />
          {b.years % 10 === 0 && <em>{b.years}</em>}
        </div>
      ))}
    </div>
  )
}

export function SurvivalChart({ lines }: { lines: Array<{ color: string; result: McResult; label: string }> }) {
  const W = 320
  const H = 140
  return (
    <div className="survival-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="pv-svg" preserveAspectRatio="none">
        {lines.map(({ color, result, label }, idx) => {
          const pts = result.survival
            .map((p, i) => `${(i / (result.survival.length - 1)) * W},${H - p.s * (H - 8) - 4}`)
            .join(' ')
          return <polyline key={label + idx} fill="none" stroke={color} strokeWidth="2" strokeDasharray={idx === 0 ? 'none' : '5 4'} points={pts} />
        })}
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="var(--ink)" strokeOpacity="0.12" strokeDasharray="2 4" />
      </svg>
      <div className="survival-legend">
        {lines.map((l, i) => (
          <span key={l.label + i}>
            <i style={{ background: l.color, opacity: i === 0 ? 1 : 0.75 }} /> {l.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function ReasonChart({ result }: { result: McResult }) {
  return (
    <div>
      {result.endReasons.map((r) => (
        <div key={r.reason} className="pv-reason">
          <span className="pv-reason-label">{REASON_LABEL_CN[r.reason] ?? r.reason}</span>
          <span className="pv-reason-bar">
            <span style={{ width: `${r.share * 100}%` }} />
          </span>
          <span className="pv-reason-num">{(r.share * 100).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  )
}

const REASON_LABEL_CN: Record<string, string> = {
  censored: '白头偕老',
  exhaustion: '漫长消耗',
  impulsive: '盛怒告别',
  stonewall: '输给沉默',
  external: '被生活压垮',
}

/** Dual-person radar for the review panel — pure SVG. */
export function RadarChart({
  axes,
  valuesQ,
  valuesD,
  size = 300,
}: {
  axes: string[]
  valuesQ: number[]
  valuesD: number[]
  size?: number
}) {
  const cx = size / 2
  const cy = size / 2
  const R = size / 2 - 42
  const n = axes.length
  const pt = (i: number, v: number): [number, number] => {
    const ang = (Math.PI * 2 * i) / n - Math.PI / 2
    const r = R * Math.max(0.04, Math.min(1, v))
    return [cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]
  }
  const poly = (vals: number[]): string => vals.map((v, i) => pt(i, v).join(',')).join(' ')
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size }} role="img" aria-label="双人性格雷达图">
      {[0.25, 0.5, 0.75, 1].map((g) => (
        <polygon
          key={g}
          points={axes.map((_, i) => pt(i, g).join(',')).join(' ')}
          fill="none"
          stroke="var(--line)"
          strokeWidth="1"
        />
      ))}
      {axes.map((label, i) => {
        const [x, y] = pt(i, 1.18)
        return (
          <text key={label} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="var(--ink-soft)">
            {label}
          </text>
        )
      })}
      <polygon points={poly(valuesQ)} fill="rgba(232,131,111,0.18)" stroke="var(--q)" strokeWidth="2" />
      <polygon points={poly(valuesD)} fill="rgba(125,155,179,0.18)" stroke="var(--d)" strokeWidth="2" />
    </svg>
  )
}
