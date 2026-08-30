/**
 * All narrative copy lives here — the product speaks with one voice.
 * Gender-neutral wording throughout: 小Q/小D or TA, never 他/她.
 */

export const TITLE = '小Q和小D的一万次恋爱结局'

export const INTRO_LINES = [
  '小Q和小D是一对恋人。',
  '他们好奇——',
  '假如存在一万个平行世界，',
  '他们会在多少个世界里，相爱久久。',
]

export const CTA_START = '开启平行世界的初始设定'
export const INTRO_FOOTER = '仅供娱乐 · 所有计算在本机完成 · 无性别设定'

export const QUESTIONNAIRE_LEAD = '结局的种子，藏在他们各自的性格里'
export const QUESTIONNAIRE_HINT = '每道题，分别为小Q和小D作答'
export const REL_LEAD = '最后，说说现在的他们'

export const SIM_BEFORE = '现在，让一万次人生开始流转'
export const SCENARIO_TURN = '可是，爱情终究敌不过现实。'
export const SCENARIO_TURN_2 = '以下几个压力场景，请选择——'
export const SCENARIO_CTA = '推演这些世界'
export const SCENARIO_RETRY = '换个压力再试'
export const MIRACLE_TURN = '但是，爱情总会有奇迹的不是吗？'

export const BASELINE_LEAD_1 = '在没有客观阻力的情况下'
export const BASELINE_LEAD_2 = '我们以50年，为相爱久久'
export const SCENARIO_LEAD_1 = '压力之下'

export const LONGEST_LEAD = '其中最长久的一次——'
export const SHORTEST_LEAD = '其中相处最短暂的一次——'
export const MIRACLE_LEAD = '在某个平行世界里——'

export const ENDING_FOOTER = '本模拟基于心理学文献的方向性简化，参数为示意值，仅供娱乐，不构成任何关系建议。'
export const ENDING_QUOTES_NOTE = '注：哲学引言为真实出处的节选或意译。'

/** Poetic labels for end reasons (engine EndReason → display). */
export const END_REASON_LABEL: Record<string, string> = {
  censored: '白头偕老的世界',
  exhaustion: '在漫长的消耗中，有人先放开了手',
  impulsive: '一次盛怒中的告别',
  stonewall: '输给了沉默的世界',
  external: '被生活压垮的世界',
}

/** Philosophy quotes for the ending — real, attributable sources only. */
export const PHILOSOPHY_QUOTES: Array<{ text: string; source: string }> = [
  { text: '爱是一种主动的能力，而不是坠入的状态。', source: '弗洛姆《爱的艺术》' },
  { text: '正是你为你的玫瑰花费的时光，才使你的玫瑰变得如此重要。', source: '圣埃克苏佩里《小王子》' },
  { text: '爱是恒久忍耐，又有恩慈。', source: '《哥林多前书》' },
  { text: '我们蔽体的不是铠甲，而是彼此递来的外衣。', source: '里尔克《给青年诗人的信》（意译）' },
]

export const REVIEW_TITLE = '一键复盘'
export const REVIEW_LEAD = '性格的引力，写在他们各自的手心里'

export const APPENDIX_TITLE = '数据附录'
export const CITATIONS_TITLE = '文献依据'
export const CITATIONS_NOTE = '以下为模型各要素的文献锚点。本产品为方向性简化的娱乐作品，参数为示意值。'
