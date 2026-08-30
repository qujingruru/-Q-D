import { SurvivalChart } from '../report/charts'
import { SCENARIO_LEAD_1, SHORTEST_LEAD, MIRACLE_TURN, SCENARIO_RETRY } from '../copy'
import { relToInit, SCENARIO_CARDS, useApp } from '../store'
import { StoryCard } from './StoryCard'

const pct = (x: number): string => `${(x * 100).toFixed(1)}%`

export function ScenarioReportScreen() {
  const { scenarioResult, baseline, persons, rel, names, go, setTheme, scenarioSelection } = useApp()
  if (!scenarioResult || !baseline || !persons) return null
  const init = relToInit(rel)
  const labels = Object.keys(scenarioSelection)
    .map((id) => SCENARIO_CARDS.find((c) => c.id === id)?.title ?? id)
    .join(' + ')
  const drop = baseline.p50y - scenarioResult.p50y

  return (
    <div className="screen report-screen theme-gray">
      <header className="report-hero gray-hero">
        <p className="hero-line">{SCENARIO_LEAD_1} · {labels}</p>
        <p className="hero-big">
          {names[0]}和{names[1]}在 <strong>{pct(scenarioResult.p50y)}</strong> 的平行世界中
          <br />
          相爱超过 50 年
        </p>
        <p className="hero-sub">
          比没有阻力的世界{drop > 0.001 ? `少了 ${(drop * 100).toFixed(1)} 个百分点` : '几乎没有变化'}
        </p>
        <p className="hero-meta">
          中位 {scenarioResult.medianYears.toFixed(1)} 年 · 最漫长{' '}
          {(scenarioResult.curated.longest.durationWeeks / 52).toFixed(0)} 年 · 最短暂{' '}
          {Math.max(1, Math.round(scenarioResult.curated.shortest.durationWeeks / 4.33))} 个月
        </p>
      </header>

      <section className="report-block">
        <h4>{SHORTEST_LEAD}</h4>
        <StoryCard
          summary={scenarioResult.curated.shortest}
          persons={persons}
          init={init}
          scenarioSelection={scenarioSelection}
          kind="shortest"
          names={names}
          variant="gray"
        />
      </section>

      <div className="report-grid">
        <section className="report-block">
          <h4>两个宇宙的生存曲线</h4>
          <SurvivalChart
            lines={[
              { color: 'var(--q)', result: baseline, label: '没有阻力' },
              { color: 'var(--d)', result: scenarioResult, label: labels },
            ]}
          />
        </section>
      </div>

      <button
        className="cta-btn cta-gold"
        onClick={() => {
          setTheme('light')
          go('miracle')
        }}
      >
        {MIRACLE_TURN} ✦
      </button>
      <button
        className="back-btn"
        onClick={() => {
          setTheme('gray')
          go('scenarioGate')
        }}
      >
        {SCENARIO_RETRY} ←
      </button>
    </div>
  )
}
