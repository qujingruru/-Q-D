/**
 * Story templates — event types × sentence variants.
 * Variant selection is seeded by the world seed, so one world always tells
 * the same story (shareable, replayable).
 */
import type { EventRecord } from '../types'

export type StoryKind = 'longest' | 'shortest' | 'miracle'

export interface TemplateCtx {
  qName: string
  dName: string
  /** who triggered the event (0 → qName, 1 → dName) */
  who: string
  other: string
  year: number
  week: number
  ev: EventRecord
}

type Variants = string[]

const STRESS_LABEL: Record<string, string> = {
  illness: '一场大病',
  jobloss: '一次失业',
}

export function stressLabel(label?: string): string {
  return STRESS_LABEL[label ?? ''] ?? '一场突如其来的变故'
}

/** Sentence variants per event type; {who}/{other}/{year} are interpolated. */
export const EVENT_TEMPLATES: Record<string, Variants> = {
  conflict: [
    '第{year}年，{who}点燃的一场争执席卷了他们',
    '第{year}年，他们在琐事上吵得不可开交',
    '第{year}年，一场没有赢家的争吵在深夜爆发',
  ],
  'conflict+repaired': [
    '但{who}先递出了台阶，风暴渐渐平息',
    '{who}的一次主动示好，让裂痕重新弥合',
    '那晚最后，{who}轻声说了一句"我们好好谈"，火气便散了大半',
  ],
  repair: [
    '第{year}年，{who}的一次主动修复，把关系从低谷里拉了回来',
    '{who}学会了在僵局里先开口，这救了他们很多次',
  ],
  goodnews: [
    '第{year}年，{who}迎来一个好消息，{other}的欢呼让快乐翻倍',
    '第{year}年，{who}的开心事被{other}稳稳接住，那天他们聊到很晚',
  ],
  novelty: [
    '第{year}年，一场说走就走的旅行，让平淡的日子重新发光',
    '第{year}年，他们尝试了一件从没做过的事，心跳回到了最初',
  ],
  'stress:illness': [
    '第{year}年，{who}病倒了，漫长康复期里{other}守在身边',
    '第{year}年，一场大病毫无预兆地降临在{who}身上',
  ],
  'stress:jobloss': [
    '第{year}年，{who}失去了工作，自我怀疑像潮水一样涌来',
    '第{year}年，{who}的职业陷入低谷，家里的空气一度凝重',
  ],
  'stress:generic': [
    '第{year}年，{stress}击中了{who}',
  ],
  nearbreakup: [
    '第{year}年，他们一度走到悬崖边——但这一次，没有人放手',
    '第{year}年，分手两个字几乎说出口，又被咽了回去',
  ],
  'milestone:cohabit': [
    '第{year}年，他们搬进了同一个屋檐，生活开始互相打磨',
    '第{year}年，两把钥匙变成了一把',
  ],
  'milestone:baby': [
    '第{year}年，一个新生命加入了他们，节奏全乱了，心却更近了',
    '第{year}年，他们成了父母，最累也最柔软的一段岁月开始了',
  ],
  'milestone:baby-growth': [
    '熬过最累的两年，他们反而比从前更亲密',
  ],
  'milestone:post-crisis-growth': [
    '劫后余生，他们比从前更懂得珍惜彼此',
  ],
  'milestone:ldr-start': [
    '第{year}年，他们开始了一段异地',
  ],
  reunion: [
    '结束异地的那一周，理想化的滤镜碎了一地，争吵密集袭来',
    '重逢本该甜蜜，但积攒的误解在见面的第一周集中爆发',
  ],
  rare: [
    '第{year}年，他们回到初遇的地方——没想到，心动还在',
  ],
}

export const OPENING: Record<StoryKind, Variants> = {
  longest: [
    '在这个世界里，时间是站在他们这边的。',
    '这是一个缓慢而坚定的世界。',
  ],
  shortest: [
    '在这个世界里，一切结束得很快。',
    '这是一个仓促的世界。',
  ],
  miracle: [
    '这是最惊心动魄的一个世界。',
    '这是一个几乎失败、却最终胜出的世界。',
  ],
}

export const CLOSING: Record<StoryKind, Variants> = {
  longest: [
    '他们相守了{years}年，直到时间的尽头。',
    '第{years}年钟声响起时，他们仍牵着彼此的手。',
  ],
  shortest: [
    '第{endYear}年，他们平静地说了再见。',
    '这段故事，停在了第{endYear}年。',
  ],
  miracle: [
    '历经风雨，他们终究白头偕老。',
    '伤痕累累，但没有人松手——他们赢了时间。',
  ],
}

/** pick a variant deterministically from (seed, salt) */
export function pickVariant(variants: Variants, seed: number, salt: number): string {
  const h = Math.imul(seed ^ (salt + 0x9e3779b9), 0x85ebca6b) >>> 0
  return variants[h % variants.length]
}
