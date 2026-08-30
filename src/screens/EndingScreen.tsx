import { useEffect, useMemo, useState } from 'react'
import { StardustField } from '../art/StardustField'
import { CoupleHandInHand } from '../art/Characters'
import { RadarChart } from '../report/charts'
import { buildReview, RADAR_AXES } from '../review/compat'
import { downloadShareCard } from '../report/ShareCard'
import {
  APPENDIX_TITLE, CITATIONS_NOTE, CITATIONS_TITLE, ENDING_FOOTER,
  PHILOSOPHY_QUOTES, REVIEW_LEAD, REVIEW_TITLE,
} from '../copy'
import { ENDING_QUOTES_NOTE } from '../copy'
import { CITATIONS } from '../report/citations'
import { TrajectoryExplorer } from '../report/TrajectoryExplorer'
import { relToInit, SCENARIO_CARDS, useApp } from '../store'
import { loadPool, percentile } from '../social/percentile'

const pct = (x: number): string => `${(x * 100).toFixed(1)}%`

export function EndingScreen() {
  const { baseline, scenarioResult, persons, rel, names, masterSeed, scenarioSelection, reset } = useApp()
  const [tab, setTab] = useState<'none' | 'review' | 'appendix' | 'citations'>('none')
  const [percentileText, setPercentileText] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void loadPool().then((pool) => {
      if (!alive || !pool || !baseline) return
      const p = percentile(pool, baseline)
      setPercentileText(`超越了基准宇宙中 ${(p * 100).toFixed(1)}% 的模拟情侣`)
    })
    return () => {
      alive = false
    }
  }, [baseline])

  const dataClosing = useMemo(() => {
    if (!baseline) return ''
    const worlds = Math.round(baseline.p50y * baseline.n)
    if (baseline.p50y > 0.5) return `在 ${worlds.toLocaleString('zh-CN')} 个世界里，他们相爱久久。愿你们，就在其中一个。`
    if (baseline.p50y > 0.15) return `只有 ${worlds.toLocaleString('zh-CN')} 个世界给了他们一生——但爱从不按概率发生。`
    return `哪怕绝大多数世界都写满离别，也总有下一个宇宙，愿意为他们重来一次。`
  }, [baseline])

  const review = useMemo(
    () => (persons ? buildReview(names, persons[0].constructs, persons[1].constructs) : { radarQ: [], radarD: [], findings: [] }),
    [names, persons],
  )

  if (!baseline || !persons) return null
  const init = relToInit(rel)
  void init

  const scenarioLabel =
    scenarioResult && Object.keys(scenarioSelection).length > 0
      ? Object.keys(scenarioSelection)
          .map((id) => SCENARIO_CARDS.find((c) => c.id === id)?.title ?? id)
          .join(' + ')
      : null

  return (
    <div className="screen ending-screen">
      <StardustField theme="warm" />
      <div className="ending-body">
        <div className="intro-couple">
          <CoupleHandInHand size={96} />
        </div>
        <div className="quotes">
          {PHILOSOPHY_QUOTES.map((q) => (
            <blockquote key={q.source}>
              <p>{q.text}</p>
              <cite>—— {q.source}</cite>
            </blockquote>
          ))}
        </div>
        <p className="ending-closing">{dataClosing}</p>
        {percentileText && <p className="muted small">{percentileText}</p>}

        <div className="ending-actions">
          <button
            className="cta-btn"
            onClick={() =>
              downloadShareCard({
                names,
                baseline,
                scenario: scenarioResult,
                scenarioLabel,
                worldNo: masterSeed % 10000,
              })
            }
          >
            保存分享卡片 🖼
          </button>
          <button className="chip" onClick={() => setTab(tab === 'review' ? 'none' : 'review')}>
            {REVIEW_TITLE}
          </button>
          <button className="chip" onClick={() => setTab(tab === 'appendix' ? 'none' : 'appendix')}>
            {APPENDIX_TITLE}
          </button>
          <button className="chip" onClick={() => setTab(tab === 'citations' ? 'none' : 'citations')}>
            {CITATIONS_TITLE}
          </button>
          <button className="chip" onClick={reset}>
            再来一万次 ↺
          </button>
        </div>

        {tab === 'review' && (
          <section className="panel review-panel">
            <h4>{REVIEW_TITLE} · {REVIEW_LEAD}</h4>
            <RadarChart axes={RADAR_AXES.map((a) => a.label)} valuesQ={review.radarQ} valuesD={review.radarD} />
            <div className="review-legend">
              <span><i style={{ background: 'var(--q)' }} /> {names[0]}</span>
              <span><i style={{ background: 'var(--d)' }} /> {names[1]}</span>
            </div>
            <div className="findings">
              {review.findings.map((f, i) => (
                <div key={i} className={`finding ${f.kind}`}>
                  <p>{f.text}</p>
                  <cite>{f.cite}</cite>
                </div>
              ))}
              {review.findings.length === 0 && <p className="muted">参数组合平缓，未触发显著的适配或摩擦模式。</p>}
            </div>
          </section>
        )}

        {tab === 'appendix' && (
          <section className="panel">
            <h4>{APPENDIX_TITLE}</h4>
            <p className="muted small">
              共 {baseline.n.toLocaleString('zh-CN')} 个平行世界 · 相爱久久 {pct(baseline.p50y)}
              {scenarioResult ? ` · 压力下 ${pct(scenarioResult.p50y)}` : ''}
            </p>
            <TrajectoryExplorer
              result={baseline}
              masterSeed={masterSeed}
              persons={persons}
              init={relToInit(rel)}
              names={names}
            />
            {scenarioResult && (
              <>
                <h4 style={{ marginTop: 18 }}>压力宇宙（{scenarioLabel}）</h4>
                <TrajectoryExplorer
                  result={scenarioResult}
                  masterSeed={masterSeed}
                  persons={persons}
                  init={relToInit(rel)}
                  scenarioSelection={scenarioSelection}
                  names={names}
                />
              </>
            )}
            <p className="muted small">{ENDING_QUOTES_NOTE}</p>
          </section>
        )}

        {tab === 'citations' && (
          <section className="panel">
            <h4>{CITATIONS_TITLE}</h4>
            <p className="muted small">{CITATIONS_NOTE}</p>
            <ul className="cite-list">
              {CITATIONS.map((c) => (
                <li key={c.what}>
                  <strong>{c.what}</strong> — {c.ref}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <footer className="screen-foot">{ENDING_FOOTER}</footer>
    </div>
  )
}
