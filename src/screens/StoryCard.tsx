import { useMemo } from 'react'
import { replayWorld } from '../sim/replay'
import { generateStory } from '../story/generator'
import { END_REASON_LABEL } from '../copy'
import type { CoupleInit, PersonParams, RunSummary } from '../types'
import type { ScenarioSelection } from '../model/scenarios'
import type { StoryKind } from '../story/templates'

/** Replay a curated world and render its story card. */
export function StoryCard(props: {
  summary: RunSummary
  persons: [PersonParams, PersonParams]
  init: CoupleInit
  scenarioSelection?: ScenarioSelection
  kind: StoryKind
  names: [string, string]
  variant?: 'gold' | 'plain' | 'gray'
}) {
  const { summary, persons, init, scenarioSelection, kind, names, variant = 'plain' } = props
  const story = useMemo(
    () => generateStory({ detail: replayWorld({ summary, persons, init, scenarioSelection }), kind, names }),
    [summary, persons, init, scenarioSelection, kind, names],
  )
  return (
    <div className={`story-card story-${variant}`}>
      {story.rare && <span className="rare-badge">✦ 隐藏结局</span>}
      <div className="story-lines">
        {story.lines.map((l, i) => (
          <p key={i}>{l}</p>
        ))}
      </div>
      <p className="story-meta">
        世界 #{summary.runIndex + 1} · {story.survived ? '相爱久久' : END_REASON_LABEL[story.endReason]} ·{' '}
        {summary.durationWeeks < 52
          ? `${Math.max(1, Math.round(summary.durationWeeks / 4.33))} 个月`
          : `${story.years} 年`}
      </p>
    </div>
  )
}
