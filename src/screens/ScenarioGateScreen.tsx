import { useState } from 'react'
import { SCENARIO_CTA, SCENARIO_TURN, SCENARIO_TURN_2 } from '../copy'
import { SCENARIO_CARDS, useApp } from '../store'
import type { ScenarioId } from '../model/scenarios'

const DEFAULT_CFG: Record<ScenarioId, Record<string, unknown>> = {
  ldr: { durationWeeks: 104 },
  parental: { intensity: 0.7 },
  financial: { severity: 0.6 },
  majorEvent: { count: 1 },
  cohabitation: {},
  baby: {},
  busy: { busyPerson: 'both' },
}

export function ScenarioGateScreen() {
  const { scenarioSelection, setScenarioSelection, go, masterSeed } = useApp()
  const [note, setNote] = useState<string | null>(null)
  const chosen = Object.keys(scenarioSelection) as ScenarioId[]

  const toggle = (id: ScenarioId) => {
    const next = { ...scenarioSelection }
    if (id in next) {
      delete next[id]
      setScenarioSelection(next)
    } else {
      if (chosen.length >= 3) {
        setNote('最多同时叠加三种压力——留一点余地给爱。')
        return
      }
      setNote(null)
      setScenarioSelection({ ...next, [id]: DEFAULT_CFG[id] })
    }
  }

  return (
    <div className="screen gate-screen">
      <header className="gate-head">
        <p className="gate-turn">{SCENARIO_TURN}</p>
        <p className="gate-turn-2">{SCENARIO_TURN_2}</p>
      </header>
      <div className="gate-grid">
        {SCENARIO_CARDS.map((c) => {
          const on = c.id in scenarioSelection
          return (
            <button key={c.id} className={`gate-card${on ? ' on' : ''}`} onClick={() => toggle(c.id)}>
              <span className="gate-card-title">{c.title}</span>
              <span className="gate-card-desc">{c.desc}</span>
              <span className="gate-card-cite">{c.cite}</span>
            </button>
          )
        })}
      </div>
      {note && <p className="gate-note">{note}</p>}
      <button
        className="cta-btn cta-gray"
        disabled={chosen.length === 0}
        onClick={() => go(masterSeed ? 'scenarioLoading' : 'scenarioLoading')}
      >
        {SCENARIO_CTA}（已选 {chosen.length} 项）
      </button>
      <button
        className="back-btn"
        onClick={() => {
          useApp.getState().setTheme('warm')
          useApp.getState().go('baselineReport')
        }}
      >
        ← 回到没有阻力的世界
      </button>
    </div>
  )
}
