/**
 * Zero-backend invite links: encode one person's questionnaire answers into a
 * URL hash. The partner opens the link, fills the other side locally, and the
 * two halves merge in their browser. Contains ONLY the sender's own answers.
 */

export interface InvitePayload {
  /** questionnaire session seed (same item draw) */
  s: number
  /** sender's 12 answers (item index → answer) */
  q: number[]
  /** relationship answers: [togetherMonths, stage, satisfaction] */
  r: [number, string, number]
}

export function encodeInvite(p: InvitePayload): string {
  const json = JSON.stringify(p)
  const b64 = btoa(unescape(encodeURIComponent(json)))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeInvite(hash: string): InvitePayload | null {
  try {
    const b64 = hash.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(escape(atob(b64)))
    const p = JSON.parse(json) as InvitePayload
    if (typeof p.s !== 'number' || !Array.isArray(p.q) || p.q.length !== 12) return null
    if (!Array.isArray(p.r) || p.r.length !== 3) return null
    return p
  } catch {
    return null
  }
}

/** Read the invite hash from the current URL (and its origin for links). */
export function readInviteFromLocation(): InvitePayload | null {
  const h = window.location.hash.replace(/^#/, '')
  if (!h.startsWith('invite=')) return null
  return decodeInvite(h.slice('invite='.length))
}

export function buildInviteUrl(p: InvitePayload): string {
  const base = `${window.location.origin}${window.location.pathname}`
  return `${base}#invite=${encodeInvite(p)}`
}
