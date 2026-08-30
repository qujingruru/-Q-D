import { useEffect, useState } from 'react'
import { CoupleHandInHand } from '../art/Characters'
import { StardustField } from '../art/StardustField'
import { CTA_START, INTRO_FOOTER, INTRO_LINES, TITLE } from '../copy'
import { useApp } from '../store'
import { constructsToParams, PERSONAS, randomConstructs } from '../model/params'
import { makeRng } from '../sim/rng'
import { LocalCounter, counterText } from '../social/counter'
import { autoAnswers, drawQuestionnaire } from '../questionnaire/draw'

const PRESET_CHIPS: Array<{ label: string; a: keyof typeof PERSONAS; b: keyof typeof PERSONAS }> = [
  { label: '安全×安全', a: 'secure', b: 'secure' },
  { label: '温和×安全', a: 'gentle', b: 'secure' },
  { label: '火山×火山', a: 'volatile', b: 'volatile' },
  { label: '焦虑×回避', a: 'anxious', b: 'avoidant' },
]

export function IntroScreen() {
  const startQuestionnaire = useApp((s) => s.startQuestionnaire)
  const completeQuestionnaire = useApp((s) => s.completeQuestionnaire)
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    LocalCounter.get().then((n) => alive && setCount(n))
    LocalCounter.listener?.((n) => alive && setCount(n))
    return () => {
      alive = false
    }
  }, [])

  const usePreset = (a: keyof typeof PERSONAS, b: keyof typeof PERSONAS) => {
    completeQuestionnaire([constructsToParams(PERSONAS[a].constructs), constructsToParams(PERSONAS[b].constructs)])
  }

  const useRandom = () => {
    const rng = makeRng((Math.random() * 2 ** 31) | 0)
    completeQuestionnaire([constructsToParams(randomConstructs(rng)), constructsToParams(randomConstructs(rng))])
  }

  /** single-player mode: fill 小Q yourself, 小D is a preset persona */
  const soloWithD = (personaKey: keyof typeof PERSONAS | 'random') => {
    const seed = (Math.random() * 2 ** 31) | 0
    const drawn = drawQuestionnaire(makeRng(seed))
    const constructs =
      personaKey === 'random' ? randomConstructs(makeRng(seed ^ 0x5bf03635)) : PERSONAS[personaKey].constructs
    startQuestionnaire(seed, { side: 'd', answers: autoAnswers(drawn, constructs) })
  }

  return (
    <div className="screen intro-screen">
      <StardustField theme="warm" />
      <div className="intro-body">
        <div className="intro-couple">
          <CoupleHandInHand size={110} />
        </div>
        <h1 className="intro-title">{TITLE}</h1>
        <div className="intro-lines">
          {INTRO_LINES.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>
        <button className="cta-btn" onClick={() => startQuestionnaire()}>
          {CTA_START}
        </button>
        <div className="intro-presets">
          <span>
            <strong>单人模式</strong> · 我扮演小Q，而小D是：
          </span>
          {(Object.keys(PERSONAS) as Array<keyof typeof PERSONAS>).map((k) => (
            <button key={k} className="chip chip-d" onClick={() => soloWithD(k)}>
              {PERSONAS[k].label}的TA
            </button>
          ))}
          <button className="chip chip-rand" onClick={() => soloWithD('random')}>
            随机的TA ✦
          </button>
        </div>
        <div className="intro-presets">
          <span>或，两人都用预设快速开始：</span>
          {PRESET_CHIPS.map((c) => (
            <button key={c.label} className="chip" onClick={() => usePreset(c.a, c.b)}>
              {c.label}
            </button>
          ))}
          <button className="chip chip-rand" onClick={useRandom}>
            随机两人 ✦
          </button>
        </div>
        <p className="intro-counter">{count !== null ? counterText(count) : ''}</p>
      </div>
      <footer className="screen-foot">{INTRO_FOOTER}</footer>
    </div>
  )
}
