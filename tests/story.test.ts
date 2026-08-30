import { describe, expect, it } from 'vitest'
import { generateStory } from '../src/story/generator'
import { replayWorld } from '../src/sim/replay'
import { monteCarlo } from '../src/sim/monteCarlo'
import { constructsToParams, PERSONAS } from '../src/model/params'
import type { CoupleInit, PersonParams } from '../src/types'

const INIT: CoupleInit = { togetherMonths: 12, stage: 'steady', satisfaction: 1.0 }
const persons: [PersonParams, PersonParams] = [
  constructsToParams(PERSONAS.gentle.constructs),
  constructsToParams(PERSONAS.secure.constructs),
]
const NAMES: [string, string] = ['小Q', '小D']

describe('story generator', () => {
  const summaries = monteCarlo({ masterSeed: 21, runs: 120, persons, init: INIT })

  it('produces stable, non-empty, gender-neutral stories for the same world', () => {
    const pick = summaries[5]
    const detail = replayWorld({ summary: pick, persons, init: INIT })
    const a = generateStory({ detail, kind: 'miracle', names: NAMES })
    const b = generateStory({ detail, kind: 'miracle', names: NAMES })
    expect(a.lines).toEqual(b.lines)
    expect(a.lines.length).toBeGreaterThanOrEqual(3)
    // gender-neutral: no singular 他/她 (plural 他们 is the standard neutral form)
    expect(a.lines.join('')).not.toMatch(/他(?!们)|她/)
    expect(a.years).toBe(Math.max(1, Math.round(pick.durationWeeks / 52)))
  })

  it('tells different openings for different story kinds', () => {
    const pick = summaries[9]
    const detail = replayWorld({ summary: pick, persons, init: INIT })
    const longest = generateStory({ detail, kind: 'longest', names: NAMES })
    const shortest = generateStory({ detail, kind: 'shortest', names: NAMES })
    expect(longest.lines[0]).not.toEqual(shortest.lines[0])
  })

  it('uses only the two names for people references', () => {
    for (const idx of [0, 1, 2, 3]) {
      const detail = replayWorld({ summary: summaries[idx], persons, init: INIT })
      const story = generateStory({ detail, kind: 'longest', names: NAMES })
      const text = story.lines.join('')
      expect(text.includes('小Q') || text.includes('小D') || text.includes('他们')).toBe(true)
      expect(text).not.toContain('{')
    }
  })
})

describe('invite codec', () => {
  it('round-trips payloads', async () => {
    const { encodeInvite, decodeInvite } = await import('../src/invite/codec')
    const p = { s: 123456, q: [1, 2, 3, 4, 5, 4, 3, 2, 1, 5, 4, 3], r: [12, 'steady', 1.5] as [number, string, number] }
    const enc = encodeInvite(p)
    expect(enc).not.toMatch(/[+/=]/) // URL-safe
    expect(decodeInvite(enc)).toEqual(p)
    expect(decodeInvite('garbage!!')).toBeNull()
  })
})
