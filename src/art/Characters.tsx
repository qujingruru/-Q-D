/**
 * 小Q & 小D — two gender-free blob creatures.
 * 小Q: rounder, coral. 小D: taller, mist blue. Distinction is shape + colour
 * only (no gender-coded features). Mood states drive eyes/mouth/blush.
 */
import type { CSSProperties } from 'react'

export type Mood = 'happy' | 'calm' | 'low' | 'love' | 'wall'

interface CharacterProps {
  who: 0 | 1
  mood?: Mood
  size?: number
  className?: string
  style?: CSSProperties
}

export function Creature({ who, mood = 'calm', size = 96, className, style }: CharacterProps) {
  const isQ = who === 0
  const fill = isQ ? 'var(--q)' : 'var(--d)'
  const ry = isQ ? 26 : 31
  const rx = isQ ? 27 : 23
  const cy = isQ ? 70 : 66
  const h = isQ ? 96 : 100
  return (
    <svg
      viewBox="0 0 96 104"
      width={size}
      height={(size * h) / 96}
      className={className}
      style={style}
      role="img"
      aria-label={isQ ? '小Q' : '小D'}
    >
      {/* soft shadow */}
      <ellipse cx="48" cy={cy + ry + 4} rx={rx} ry={4} fill="rgba(74,66,56,0.10)" />
      {/* body */}
      <ellipse cx="48" cy={cy} rx={rx} ry={ry} fill={fill} />
      {/* tiny highlight */}
      <ellipse cx={48 - rx * 0.35} cy={cy - ry * 0.45} rx={rx * 0.28} ry={ry * 0.18} fill="rgba(255,255,255,0.35)" />
      {/* mood face */}
      {mood === 'wall' ? (
        <>
          <line x1={36} y1={cy - 6} x2={44} y2={cy - 6} stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line x1={52} y1={cy - 6} x2={60} y2={cy - 6} stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line x1={40} y1={cy + 8} x2={56} y2={cy + 8} stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        </>
      ) : mood === 'happy' ? (
        <>
          <path d={`M ${36} ${cy - 7} q 4 -5 8 0`} stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d={`M ${52} ${cy - 7} q 4 -5 8 0`} stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d={`M ${40} ${cy + 4} q 8 8 16 0`} stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      ) : mood === 'love' ? (
        <>
          <circle cx={40} cy={cy - 6} r={2.6} fill="#fff" />
          <circle cx={56} cy={cy - 6} r={2.6} fill="#fff" />
          <path d={`M ${40} ${cy + 5} q 8 9 16 0`} stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <circle cx={31} cy={cy + 2} r={3.2} fill="rgba(255,255,255,0.55)" />
          <circle cx={65} cy={cy + 2} r={3.2} fill="rgba(255,255,255,0.55)" />
        </>
      ) : mood === 'low' ? (
        <>
          <circle cx={40} cy={cy - 6} r={2.6} fill="#fff" />
          <circle cx={56} cy={cy - 6} r={2.6} fill="#fff" />
          <path d={`M ${41} ${cy + 9} q 7 -6 14 0`} stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx={40} cy={cy - 6} r={2.8} fill="#fff" />
          <circle cx={56} cy={cy - 6} r={2.8} fill="#fff" />
          <line x1={41} y1={cy + 7} x2={55} y2={cy + 7} stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}

/** The couple holding a connecting thread — used on intro / endings. */
export function CoupleHandInHand({ size = 120, moodQ = 'love', moodD = 'love' }: { size?: number; moodQ?: Mood; moodD?: Mood }) {
  return (
    <svg viewBox="0 0 220 110" width={size * 2} height={size} role="img" aria-label="小Q和小D">
      <path d="M 78 82 C 95 70, 125 70, 142 82" fill="none" stroke="var(--gold)" strokeWidth="2" strokeDasharray="1 6" strokeLinecap="round" />
      <g>
        <foreignObject x="0" y="0" width="110" height="110">
          <Creature who={0} mood={moodQ} size={96} />
        </foreignObject>
        <foreignObject x="110" y="0" width="110" height="110">
          <Creature who={1} mood={moodD} size={96} />
        </foreignObject>
      </g>
    </svg>
  )
}
