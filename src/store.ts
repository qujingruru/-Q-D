/**
 * Global session state (zustand) — one journey, nine screens.
 */
import { create } from 'zustand'
import type { CoupleInit, PersonParams } from './types'
import type { McResult } from './report/stats'
import type { ScenarioSelection, ScenarioId } from './model/scenarios'
import { drawQuestionnaire, type DrawnItem } from './questionnaire/draw'
import { makeRng, runSeed } from './sim/rng'

export type Screen =
  | 'intro'
  | 'questionnaire'
  | 'baselineLoading'
  | 'baselineReport'
  | 'scenarioGate'
  | 'scenarioLoading'
  | 'scenarioReport'
  | 'miracle'
  | 'ending'

/** User-visible scenario metadata for the gate screen. */
export interface ScenarioCard {
  id: ScenarioId
  title: string
  desc: string
  cite: string
}

export const SCENARIO_CARDS: ScenarioCard[] = [
  { id: 'ldr', title: '异地恋', desc: '距离拉长思念，也拉长误解；团聚那天，滤镜会碎吗？', cite: 'Stafford & Merolla (2007)' },
  { id: 'parental', title: '父母反对', desc: '没有祝福的爱情，先沸腾，后煎熬。', cite: 'Sinclair et al. (2014)' },
  { id: 'financial', title: '经济压力', desc: '账单不会杀人，但它磨人。', cite: 'Conger et al. 家庭压力模型' },
  { id: 'majorEvent', title: '重大变故', desc: '一场大病，或一次失业。', cite: 'Karney & Bradbury (1995) VSA' },
  { id: 'cohabitation', title: '同居磨合', desc: '同一个屋檐下，理想开始打折。', cite: 'Huston et al. (2001); Stanley et al. (2006)' },
  { id: 'baby', title: '育儿冲击', desc: '一个新生命，两种结局。', cite: 'Cowan & Cowan (1995)' },
  { id: 'busy', title: '事业忙碌', desc: '聚少离多，爱在待办清单的末尾。', cite: 'Greenhaus & Beutell (1985)' },
]

export interface RelAnswers {
  togetherMonths: number
  stage: 'ambiguous' | 'passionate' | 'steady'
  satisfaction: number
}

interface AppState {
  screen: Screen
  theme: 'warm' | 'gray' | 'light'
  names: [string, string]
  sessionSeed: number
  drawn: DrawnItem[]
  answersQ: Array<number | null>
  answersD: Array<number | null>
  /** locked side: 'q' = invited partner answers, 'd' = preset persona */
  lockedSide: 'q' | 'd' | null
  rel: RelAnswers
  persons: [PersonParams, PersonParams] | null
  masterSeed: number
  baseline: McResult | null
  scenarioSelection: ScenarioSelection
  scenarioResult: McResult | null
  go: (s: Screen) => void
  setTheme: (t: AppState['theme']) => void
  startQuestionnaire: (seed?: number, prefill?: { side: 'q' | 'd'; answers: number[] } | null) => void
  answer: (side: 'q' | 'd', index: number, value: number) => void
  setRel: (r: RelAnswers) => void
  completeQuestionnaire: (persons: [PersonParams, PersonParams]) => void
  setBaseline: (r: McResult) => void
  setScenarioSelection: (s: ScenarioSelection) => void
  setScenarioResult: (r: McResult) => void
  reset: () => void
}

const freshSeed = (): number => (Math.random() * 2 ** 31) | 0

const initial = {
  screen: 'intro' as Screen,
  theme: 'warm' as const,
  names: ['小Q', '小D'] as [string, string],
  sessionSeed: freshSeed(),
  drawn: [] as DrawnItem[],
  answersQ: [] as Array<number | null>,
  answersD: [] as Array<number | null>,
  lockedSide: null as 'q' | 'd' | null,
  rel: { togetherMonths: 12, stage: 'steady' as const, satisfaction: 1.0 },
  persons: null,
  masterSeed: freshSeed(),
  baseline: null,
  scenarioSelection: {} as ScenarioSelection,
  scenarioResult: null,
}

export const useApp = create<AppState>((set) => ({
  ...initial,
  go: (screen) => set({ screen }),
  setTheme: (theme) => set({ theme }),
  startQuestionnaire: (seed, prefill) => {
    const sessionSeed = seed ?? freshSeed()
    const drawn = drawQuestionnaire(makeRng(sessionSeed))
    const blank = drawn.map(() => null)
    set({
      sessionSeed,
      drawn,
      lockedSide: prefill?.side ?? null,
      answersQ: prefill?.side === 'q' ? [...prefill.answers] : [...blank],
      answersD: prefill?.side === 'd' ? [...prefill.answers] : [...blank],
      screen: 'questionnaire',
    })
  },
  answer: (side, index, value) =>
    set((s) => {
      const key = side === 'q' ? 'answersQ' : 'answersD'
      const next = [...s[key]]
      next[index] = value
      return { [key]: next } as Pick<AppState, 'answersQ' | 'answersD'>
    }),
  setRel: (rel) => set({ rel }),
  completeQuestionnaire: (persons) =>
    set({ persons, masterSeed: freshSeed(), baseline: null, scenarioResult: null, scenarioSelection: {}, screen: 'baselineLoading' }),
  setBaseline: (baseline) => set({ baseline, screen: 'baselineReport' }),
  setScenarioSelection: (scenarioSelection) => set({ scenarioSelection }),
  setScenarioResult: (scenarioResult) => set({ scenarioResult, screen: 'scenarioReport' }),
  reset: () => set({ ...initial, sessionSeed: freshSeed(), masterSeed: freshSeed() }),
}))

/** Convenience: build CoupleInit from rel answers. */
export function relToInit(rel: RelAnswers): CoupleInit {
  return { togetherMonths: rel.togetherMonths, stage: rel.stage, satisfaction: rel.satisfaction }
}

export { runSeed }
