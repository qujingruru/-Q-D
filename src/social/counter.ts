/**
 * Homepage counter — two implementations behind one interface.
 * v1.0 Local: 10,000 symbolic base + local session count (zero backend).
 * v1.1 Remote: ~30-line KV worker increments atomically (same interface).
 */
export interface CounterSource {
  get(): Promise<number>
  increment(): Promise<number>
  /** subscribe to count changes (optional; no-op for local) */
  listener?(cb: (n: number) => void): void
}

const BASE = 10000
const LS_KEY = 'qd.localCount'

function readLocal(): number {
  try {
    const v = Number(localStorage.getItem(LS_KEY) ?? '0')
    return Number.isFinite(v) ? v : 0
  } catch {
    return 0
  }
}

function writeLocal(v: number): void {
  try {
    localStorage.setItem(LS_KEY, String(v))
  } catch {
    /* private mode: counter is best-effort */
  }
}

export const LocalCounter: CounterSource = {
  async get() {
    return BASE + readLocal()
  },
  async increment() {
    const next = readLocal() + 1
    writeLocal(next)
    return BASE + next
  },
  listener(cb) {
    try {
      window.addEventListener('qd-count', (e) => cb((e as CustomEvent<number>).detail))
    } catch {
      /* ignore */
    }
  },
}

/** Fire-and-forget increment used when the journey starts. */
export function bumpCounter(): void {
  void LocalCounter.increment().then(() => {
    try {
      void LocalCounter.get().then((n) => window.dispatchEvent(new CustomEvent('qd-count', { detail: n })))
    } catch {
      /* ignore */
    }
  })
}

export function counterText(n: number): string {
  return `已有 ${n.toLocaleString('zh-CN')} 人开启了小Q和小D的模拟世界`
}
