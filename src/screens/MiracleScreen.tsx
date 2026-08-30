import { StardustField } from '../art/StardustField'
import { Creature } from '../art/Characters'
import { MIRACLE_TURN } from '../copy'
import { relToInit, useApp } from '../store'
import { StoryCard } from './StoryCard'

export function MiracleScreen() {
  const { scenarioResult, baseline, persons, rel, names, go, setTheme, scenarioSelection } = useApp()
  if (!persons) return null
  const init = relToInit(rel)

  // fallback chain: scenario miracle → baseline miracle → longest near-miss
  const pool = scenarioResult ?? baseline
  const target = pool?.curated.miracle ?? baseline?.curated.miracle ?? pool?.curated.longest ?? null
  const fromScenario = scenarioResult?.curated.miracle === target && target !== null

  return (
    <div className="screen miracle-screen theme-light">
      <StardustField theme="light" density={0.00016} />
      <header className="miracle-head">
        <p className="miracle-turn">{MIRACLE_TURN}</p>
        {target && (
          <div className="miracle-hero">
            <span className="miracle-hero-pre">而在这个平行世界里</span>
            <span className="miracle-world-no">世界 #{target.runIndex + 1}</span>
            <span className="miracle-hero-post">{names[0]}和{names[1]}，相爱久久</span>
          </div>
        )}
        {!fromScenario && (
          <p className="muted small">
            （在所选的压力之下，没有一个世界撑到白头偕老——让我们回到没有阻力的宇宙，那里仍有一个奇迹。）
          </p>
        )}
        <div className="hero-duo">
          <Creature who={0} mood="love" size={84} />
          <Creature who={1} mood="love" size={84} />
        </div>
      </header>
      {target && (
        <StoryCard
          summary={target}
          persons={persons}
          init={init}
          scenarioSelection={fromScenario ? scenarioSelection : undefined}
          kind={target.survived ? 'miracle' : 'longest'}
          names={names}
          variant="gold"
        />
      )}
      <p className="miracle-note">
        {target?.survived
          ? '伤痕累累，但没有人松手——他们赢了时间。'
          : '哪怕最长的世界也有终点，但那些被拉回的瞬间，都是真的。'}
      </p>
      <button
        className="cta-btn"
        onClick={() => {
          setTheme('warm')
          go('ending')
        }}
      >
        写在最后 ↓
      </button>
    </div>
  )
}
