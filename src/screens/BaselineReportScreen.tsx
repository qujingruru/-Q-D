import { HistChart, ReasonChart } from '../report/charts'
import { Creature } from '../art/Characters'
import { BASELINE_LEAD_1, BASELINE_LEAD_2, LONGEST_LEAD, SCENARIO_TURN } from '../copy'
import { relToInit, useApp } from '../store'
import { StoryCard } from './StoryCard'

const pct = (x: number): string => `${(x * 100).toFixed(1)}%`

export function BaselineReportScreen() {
  const { baseline, persons, rel, names, go, setTheme, scenarioSelection } = useApp()
  if (!baseline || !persons) return null
  const init = relToInit(rel)

  return (
    <div className="screen report-screen">
      <header className="report-hero">
        <div className="hero-duo">
          <Creature who={0} mood="love" size={78} />
          <Creature who={1} mood="love" size={78} />
        </div>
        <p className="hero-line">{BASELINE_LEAD_1}</p>
        <p className="hero-big">
          {names[0]}和{names[1]}在 <strong>{pct(baseline.p50y)}</strong> 的平行世界中
          <br />
          相爱超过 50 年
        </p>
        <p className="hero-sub">{BASELINE_LEAD_2}</p>
        <p className="hero-meta">
          中位 {baseline.medianYears.toFixed(1)} 年 · 最漫长 {(baseline.curated.longest.durationWeeks / 52).toFixed(0)} 年 ·
          最短暂 {Math.max(1, Math.round(baseline.curated.shortest.durationWeeks / 4.33))} 个月
        </p>
      </header>

      <section className="report-block">
        <h4>{LONGEST_LEAD}</h4>
        <StoryCard
          summary={baseline.curated.longest}
          persons={persons}
          init={init}
          scenarioSelection={scenarioSelection}
          kind="longest"
          names={names}
          variant="gold"
        />
      </section>

      <div className="report-grid">
        <section className="report-block">
          <h4>相爱年数分布</h4>
          <HistChart result={baseline} />
        </section>
        <section className="report-block">
          <h4>结局构成</h4>
          <ReasonChart result={baseline} />
        </section>
      </div>

      <button
        className="cta-btn cta-turn"
        onClick={() => {
          setTheme('gray')
          go('scenarioGate')
        }}
      >
        {SCENARIO_TURN} ↓
      </button>
    </div>
  )
}
