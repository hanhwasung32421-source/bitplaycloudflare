import type { CandlestickData, HistogramData, LineData } from 'lightweight-charts'

type Pt = LineData | { time: any }
type Candle = CandlestickData & { time: any }

function closes(c: Candle[]) {
  return c.map((d) => Number(d.close))
}
function highs(c: Candle[]) {
  return c.map((d) => Number(d.high))
}
function lows(c: Candle[]) {
  return c.map((d) => Number(d.low))
}
function typicalPrices(c: Candle[]) {
  return c.map((d) => (Number(d.high) + Number(d.low) + Number(d.close)) / 3)
}
function volumesOf(vols: HistogramData[] | undefined, n: number) {
  if (!vols || vols.length !== n) return new Array(n).fill(0)
  return vols.map((v) => Number((v as any).value ?? 0))
}

// 단순이동평균(SMA)
export function sma(values: number[], length: number): (number | undefined)[] {
  const out: (number | undefined)[] = []
  const win: number[] = []
  let sum = 0
  for (let i = 0; i < values.length; i++) {
    win.push(values[i])
    sum += values[i]
    if (win.length > length) sum -= win.shift() as number
    out.push(win.length === length ? sum / length : undefined)
  }
  return out
}

// 지수이동평균(EMA)
export function ema(values: number[], length: number): (number | undefined)[] {
  const out: (number | undefined)[] = new Array(values.length).fill(undefined)
  const k = 2 / (length + 1)
  let prev: number | undefined
  let sum = 0
  for (let i = 0; i < values.length; i++) {
    if (i < length - 1) {
      sum += values[i]
      continue
    }
    if (i === length - 1) {
      sum += values[i]
      prev = sum / length
      out[i] = prev
      continue
    }
    prev = values[i] * k + (prev as number) * (1 - k)
    out[i] = prev
  }
  return out
}

// 가중이동평균(WMA)
export function wma(values: number[], length: number): (number | undefined)[] {
  const out: (number | undefined)[] = []
  const denom = (length * (length + 1)) / 2
  for (let i = 0; i < values.length; i++) {
    if (i < length - 1) {
      out.push(undefined)
      continue
    }
    let acc = 0
    for (let j = 0; j < length; j++) acc += values[i - length + 1 + j] * (j + 1)
    out.push(acc / denom)
  }
  return out
}

function toLine(candles: Candle[], values: (number | undefined)[]): Pt[] {
  return candles.map((c, i) => (values[i] === undefined ? { time: c.time } : { time: c.time, value: values[i] as number }))
}

export function calcMA(candles: Candle[], length = 20): Pt[] {
  return toLine(candles, sma(closes(candles), length))
}
export function calcEMA(candles: Candle[], length = 20): Pt[] {
  return toLine(candles, ema(closes(candles), length))
}
export function calcWMA(candles: Candle[], length = 20): Pt[] {
  return toLine(candles, wma(closes(candles), length))
}

// 거래량가중이동평균(VWMA)
export function calcVWMA(candles: Candle[], vols: HistogramData[], length = 20): Pt[] {
  const c = closes(candles)
  const v = volumesOf(vols, candles.length)
  const out: (number | undefined)[] = []
  for (let i = 0; i < candles.length; i++) {
    if (i < length - 1) {
      out.push(undefined)
      continue
    }
    let pv = 0
    let vv = 0
    for (let j = i - length + 1; j <= i; j++) {
      pv += c[j] * v[j]
      vv += v[j]
    }
    out.push(vv > 0 ? pv / vv : c[i])
  }
  return toLine(candles, out)
}

// VWAP: UTC 하루 단위로 누적을 초기화
export function calcVWAP(candles: Candle[], vols: HistogramData[]): Pt[] {
  const tp = typicalPrices(candles)
  const v = volumesOf(vols, candles.length)
  const out: (number | undefined)[] = []
  let cumPV = 0
  let cumV = 0
  let curDay = -1
  for (let i = 0; i < candles.length; i++) {
    const t = Number(candles[i].time)
    const day = Math.floor(t / 86400)
    if (day !== curDay) {
      curDay = day
      cumPV = 0
      cumV = 0
    }
    cumPV += tp[i] * v[i]
    cumV += v[i]
    out.push(cumV > 0 ? cumPV / cumV : tp[i])
  }
  return toLine(candles, out)
}

// 파라볼릭 SAR
export function calcPSAR(candles: Candle[], step = 0.02, max = 0.2): Pt[] {
  const h = highs(candles)
  const l = lows(candles)
  const out: (number | undefined)[] = new Array(candles.length).fill(undefined)
  if (candles.length < 2) return toLine(candles, out)
  let isUp = true
  let af = step
  let ep = h[0]
  let sar = l[0]
  out[0] = sar
  for (let i = 1; i < candles.length; i++) {
    sar = sar + af * (ep - sar)
    if (isUp) {
      sar = Math.min(sar, l[i - 1], i >= 2 ? l[i - 2] : l[i - 1])
      if (l[i] < sar) {
        isUp = false
        sar = ep
        ep = l[i]
        af = step
      } else if (h[i] > ep) {
        ep = h[i]
        af = Math.min(af + step, max)
      }
    } else {
      sar = Math.max(sar, h[i - 1], i >= 2 ? h[i - 2] : h[i - 1])
      if (h[i] > sar) {
        isUp = true
        sar = ep
        ep = h[i]
        af = step
      } else if (l[i] < ep) {
        ep = l[i]
        af = Math.min(af + step, max)
      }
    }
    out[i] = sar
  }
  return toLine(candles, out)
}

// ATR(Wilder 평활)
export function trueRanges(candles: Candle[]): number[] {
  const h = highs(candles)
  const l = lows(candles)
  const c = closes(candles)
  return candles.map((_, i) => {
    if (i === 0) return h[0] - l[0]
    return Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1]))
  })
}
export function wilderSmooth(values: number[], length: number): (number | undefined)[] {
  const out: (number | undefined)[] = new Array(values.length).fill(undefined)
  let prev: number | undefined
  let sum = 0
  for (let i = 0; i < values.length; i++) {
    if (i < length - 1) {
      sum += values[i]
      continue
    }
    if (i === length - 1) {
      sum += values[i]
      prev = sum / length
      out[i] = prev
      continue
    }
    prev = ((prev as number) * (length - 1) + values[i]) / length
    out[i] = prev
  }
  return out
}
export function calcATR(candles: Candle[], length = 14): Pt[] {
  return toLine(candles, wilderSmooth(trueRanges(candles), length))
}

// 슈퍼트렌드
export function calcSuperTrend(candles: Candle[], length = 10, mult = 3): Pt[] {
  const atr = wilderSmooth(trueRanges(candles), length)
  const h = highs(candles)
  const l = lows(candles)
  const c = closes(candles)
  const out: (number | undefined)[] = new Array(candles.length).fill(undefined)
  let upperPrev = 0
  let lowerPrev = 0
  let trendUp = true
  for (let i = 0; i < candles.length; i++) {
    const a = atr[i]
    if (a === undefined) continue
    const mid = (h[i] + l[i]) / 2
    let upper = mid + mult * a
    let lower = mid - mult * a
    if (i > 0 && upperPrev) {
      upper = c[i - 1] > upperPrev ? Math.min(upper, upperPrev) : upper
      lower = c[i - 1] < lowerPrev ? Math.max(lower, lowerPrev) : lower
    }
    if (c[i] > upper) trendUp = true
    else if (c[i] < lower) trendUp = false
    out[i] = trendUp ? lower : upper
    upperPrev = upper
    lowerPrev = lower
  }
  return toLine(candles, out)
}

// 켈트너 채널
export function calcKeltner(candles: Candle[], length = 20, mult = 2): { mid: Pt[]; upper: Pt[]; lower: Pt[] } {
  const basis = ema(closes(candles), length)
  const atr = wilderSmooth(trueRanges(candles), length)
  const upper: (number | undefined)[] = []
  const lower: (number | undefined)[] = []
  for (let i = 0; i < candles.length; i++) {
    if (basis[i] === undefined || atr[i] === undefined) {
      upper.push(undefined)
      lower.push(undefined)
    } else {
      upper.push((basis[i] as number) + mult * (atr[i] as number))
      lower.push((basis[i] as number) - mult * (atr[i] as number))
    }
  }
  return { mid: toLine(candles, basis), upper: toLine(candles, upper), lower: toLine(candles, lower) }
}

// 돈치안 채널
export function calcDonchian(candles: Candle[], length = 20): { mid: Pt[]; upper: Pt[]; lower: Pt[] } {
  const h = highs(candles)
  const l = lows(candles)
  const upper: (number | undefined)[] = []
  const lower: (number | undefined)[] = []
  const mid: (number | undefined)[] = []
  for (let i = 0; i < candles.length; i++) {
    if (i < length - 1) {
      upper.push(undefined)
      lower.push(undefined)
      mid.push(undefined)
      continue
    }
    let hi = -Infinity
    let lo = Infinity
    for (let j = i - length + 1; j <= i; j++) {
      hi = Math.max(hi, h[j])
      lo = Math.min(lo, l[j])
    }
    upper.push(hi)
    lower.push(lo)
    mid.push((hi + lo) / 2)
  }
  return { mid: toLine(candles, mid), upper: toLine(candles, upper), lower: toLine(candles, lower) }
}

// 엔벨로프
export function calcEnvelope(candles: Candle[], length = 20, pct = 2.5): { upper: Pt[]; lower: Pt[] } {
  const basis = sma(closes(candles), length)
  const upper = basis.map((v) => (v === undefined ? undefined : v * (1 + pct / 100)))
  const lower = basis.map((v) => (v === undefined ? undefined : v * (1 - pct / 100)))
  return { upper: toLine(candles, upper), lower: toLine(candles, lower) }
}

// 일목균형표(단순화): 전환선(9)/기준선(26)/선행스팬A/B(26 선행 이동), 후행스팬은 생략
export function calcIchimoku(
  candles: Candle[],
  intervalSeconds: number,
  conv = 9,
  base = 26,
  spanB = 52
): { conversion: Pt[]; baseLine: Pt[]; spanA: Pt[]; spanB: Pt[] } {
  const h = highs(candles)
  const l = lows(candles)
  const midOf = (n: number) => {
    const out: (number | undefined)[] = []
    for (let i = 0; i < candles.length; i++) {
      if (i < n - 1) {
        out.push(undefined)
        continue
      }
      let hi = -Infinity
      let lo = Infinity
      for (let j = i - n + 1; j <= i; j++) {
        hi = Math.max(hi, h[j])
        lo = Math.min(lo, l[j])
      }
      out.push((hi + lo) / 2)
    }
    return out
  }
  const conversion = midOf(conv)
  const baseLine = midOf(base)
  const spanA: (number | undefined)[] = candles.map((_, i) =>
    conversion[i] === undefined || baseLine[i] === undefined ? undefined : ((conversion[i] as number) + (baseLine[i] as number)) / 2
  )
  const spanBArr = midOf(spanB)
  // 선행스팬은 원래 base기간만큼 "미래로" 시프트해서 그리지만, 여기서는 단순화를 위해 같은 시점에 그린다.
  return {
    conversion: toLine(candles, conversion),
    baseLine: toLine(candles, baseLine),
    spanA: toLine(candles, spanA),
    spanB: toLine(candles, spanBArr)
  }
}

// 피봇 포인트(전일 H/L/C 기준 표준 피봇, 당일 동안 고정값)
export function calcPivot(candles: Candle[]): { pivot: Pt[]; r1: Pt[]; s1: Pt[] } {
  const pivot: (number | undefined)[] = []
  const r1: (number | undefined)[] = []
  const s1: (number | undefined)[] = []
  let curDay = -1
  let prevH = 0
  let prevL = 0
  let prevC = 0
  let dayH = -Infinity
  let dayL = Infinity
  let dayC = 0
  let havePrev = false
  for (let i = 0; i < candles.length; i++) {
    const t = Number(candles[i].time)
    const day = Math.floor(t / 86400)
    if (day !== curDay) {
      if (curDay !== -1) {
        prevH = dayH
        prevL = dayL
        prevC = dayC
        havePrev = true
      }
      curDay = day
      dayH = -Infinity
      dayL = Infinity
    }
    dayH = Math.max(dayH, Number(candles[i].high))
    dayL = Math.min(dayL, Number(candles[i].low))
    dayC = Number(candles[i].close)
    if (havePrev) {
      const p = (prevH + prevL + prevC) / 3
      pivot.push(p)
      r1.push(2 * p - prevL)
      s1.push(2 * p - prevH)
    } else {
      pivot.push(undefined)
      r1.push(undefined)
      s1.push(undefined)
    }
  }
  return { pivot: toLine(candles, pivot), r1: toLine(candles, r1), s1: toLine(candles, s1) }
}

// ---- 하단(오실레이터) 지표 ----

export function calcRSI(candles: Candle[], length = 14): Pt[] {
  const c = closes(candles)
  const gains: number[] = [0]
  const losses: number[] = [0]
  for (let i = 1; i < c.length; i++) {
    const diff = c[i] - c[i - 1]
    gains.push(Math.max(0, diff))
    losses.push(Math.max(0, -diff))
  }
  const avgGain = wilderSmooth(gains, length)
  const avgLoss = wilderSmooth(losses, length)
  const out: (number | undefined)[] = candles.map((_, i) => {
    if (avgGain[i] === undefined || avgLoss[i] === undefined) return undefined
    const ag = avgGain[i] as number
    const al = avgLoss[i] as number
    if (al === 0) return 100
    const rs = ag / al
    return 100 - 100 / (1 + rs)
  })
  return toLine(candles, out)
}

export function calcMACD(candles: Candle[], fast = 12, slow = 26, signalLen = 9): { macd: Pt[]; signal: Pt[]; hist: Pt[] } {
  const c = closes(candles)
  const emaFast = ema(c, fast)
  const emaSlow = ema(c, slow)
  const macdVals = c.map((_, i) => (emaFast[i] === undefined || emaSlow[i] === undefined ? undefined : (emaFast[i] as number) - (emaSlow[i] as number)))
  const macdOnly = macdVals.filter((v) => v !== undefined) as number[]
  const signalOnly = ema(macdOnly, signalLen)
  let si = 0
  const signalVals: (number | undefined)[] = macdVals.map((v) => {
    if (v === undefined) return undefined
    const s = signalOnly[si]
    si++
    return s
  })
  const hist = macdVals.map((v, i) => (v === undefined || signalVals[i] === undefined ? undefined : v - (signalVals[i] as number)))
  return { macd: toLine(candles, macdVals), signal: toLine(candles, signalVals), hist: toLine(candles, hist) }
}

export function calcStochastic(candles: Candle[], length = 14, kSmooth = 3, dSmooth = 3): { k: Pt[]; d: Pt[] } {
  const h = highs(candles)
  const l = lows(candles)
  const c = closes(candles)
  const rawK: (number | undefined)[] = []
  for (let i = 0; i < candles.length; i++) {
    if (i < length - 1) {
      rawK.push(undefined)
      continue
    }
    let hi = -Infinity
    let lo = Infinity
    for (let j = i - length + 1; j <= i; j++) {
      hi = Math.max(hi, h[j])
      lo = Math.min(lo, l[j])
    }
    rawK.push(hi === lo ? 50 : ((c[i] - lo) / (hi - lo)) * 100)
  }
  const kVals = smoothDefined(rawK, kSmooth)
  const dVals = smoothDefined(kVals, dSmooth)
  return { k: toLine(candles, kVals), d: toLine(candles, dVals) }
}

// undefined가 섞인 배열에서, 정의된 구간만 SMA로 평활(나머지는 undefined 유지)
function smoothDefined(values: (number | undefined)[], length: number): (number | undefined)[] {
  const out: (number | undefined)[] = new Array(values.length).fill(undefined)
  const win: number[] = []
  let sum = 0
  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    if (v === undefined) continue
    win.push(v)
    sum += v
    if (win.length > length) sum -= win.shift() as number
    if (win.length === length) out[i] = sum / length
  }
  return out
}

export function calcStochRSI(candles: Candle[], rsiLen = 14, stochLen = 14, kSmooth = 3, dSmooth = 3): { k: Pt[]; d: Pt[] } {
  const rsiLine = calcRSI(candles, rsiLen)
  const rsiVals = rsiLine.map((p: any) => p.value as number | undefined)
  const rawK: (number | undefined)[] = []
  for (let i = 0; i < rsiVals.length; i++) {
    const window = rsiVals.slice(Math.max(0, i - stochLen + 1), i + 1)
    if (window.some((v) => v === undefined) || window.length < stochLen) {
      rawK.push(undefined)
      continue
    }
    const vals = window as number[]
    const hi = Math.max(...vals)
    const lo = Math.min(...vals)
    rawK.push(hi === lo ? 50 : ((vals[vals.length - 1] - lo) / (hi - lo)) * 100)
  }
  const kVals = smoothDefined(rawK, kSmooth)
  const dVals = smoothDefined(kVals, dSmooth)
  return { k: toLine(candles, kVals), d: toLine(candles, dVals) }
}

// ADX / +DI / -DI
export function calcADX(candles: Candle[], length = 14): { adx: Pt[]; plusDi: Pt[]; minusDi: Pt[] } {
  const h = highs(candles)
  const l = lows(candles)
  const tr = trueRanges(candles)
  const plusDM: number[] = [0]
  const minusDM: number[] = [0]
  for (let i = 1; i < candles.length; i++) {
    const up = h[i] - h[i - 1]
    const down = l[i - 1] - l[i]
    plusDM.push(up > down && up > 0 ? up : 0)
    minusDM.push(down > up && down > 0 ? down : 0)
  }
  const trSm = wilderSmooth(tr, length)
  const plusSm = wilderSmooth(plusDM, length)
  const minusSm = wilderSmooth(minusDM, length)
  const plusDi: (number | undefined)[] = []
  const minusDi: (number | undefined)[] = []
  const dx: (number | undefined)[] = []
  for (let i = 0; i < candles.length; i++) {
    if (trSm[i] === undefined || !trSm[i]) {
      plusDi.push(undefined)
      minusDi.push(undefined)
      dx.push(undefined)
      continue
    }
    const pdi = ((plusSm[i] as number) / (trSm[i] as number)) * 100
    const mdi = ((minusSm[i] as number) / (trSm[i] as number)) * 100
    plusDi.push(pdi)
    minusDi.push(mdi)
    const sum = pdi + mdi
    dx.push(sum === 0 ? 0 : (Math.abs(pdi - mdi) / sum) * 100)
  }
  const dxDefined = dx.map((v) => v ?? 0)
  const adx = wilderSmooth(dxDefined, length).map((v, i) => (dx[i] === undefined ? undefined : v))
  return { adx: toLine(candles, adx), plusDi: toLine(candles, plusDi), minusDi: toLine(candles, minusDi) }
}

export function calcCCI(candles: Candle[], length = 20): Pt[] {
  const tp = typicalPrices(candles)
  const basis = sma(tp, length)
  const out: (number | undefined)[] = []
  for (let i = 0; i < candles.length; i++) {
    if (basis[i] === undefined) {
      out.push(undefined)
      continue
    }
    let dev = 0
    for (let j = i - length + 1; j <= i; j++) dev += Math.abs(tp[j] - (basis[i] as number))
    const meanDev = dev / length
    out.push(meanDev === 0 ? 0 : (tp[i] - (basis[i] as number)) / (0.015 * meanDev))
  }
  return toLine(candles, out)
}

export function calcWilliamsR(candles: Candle[], length = 14): Pt[] {
  const h = highs(candles)
  const l = lows(candles)
  const c = closes(candles)
  const out: (number | undefined)[] = []
  for (let i = 0; i < candles.length; i++) {
    if (i < length - 1) {
      out.push(undefined)
      continue
    }
    let hi = -Infinity
    let lo = Infinity
    for (let j = i - length + 1; j <= i; j++) {
      hi = Math.max(hi, h[j])
      lo = Math.min(lo, l[j])
    }
    out.push(hi === lo ? -50 : ((hi - c[i]) / (hi - lo)) * -100)
  }
  return toLine(candles, out)
}

export function calcOBV(candles: Candle[], vols: HistogramData[]): Pt[] {
  const c = closes(candles)
  const v = volumesOf(vols, candles.length)
  const out: number[] = [0]
  for (let i = 1; i < candles.length; i++) {
    const prev = out[i - 1]
    if (c[i] > c[i - 1]) out.push(prev + v[i])
    else if (c[i] < c[i - 1]) out.push(prev - v[i])
    else out.push(prev)
  }
  return toLine(candles, out)
}

export function calcMFI(candles: Candle[], vols: HistogramData[], length = 14): Pt[] {
  const tp = typicalPrices(candles)
  const v = volumesOf(vols, candles.length)
  const rawMF = tp.map((p, i) => p * v[i])
  const out: (number | undefined)[] = []
  for (let i = 0; i < candles.length; i++) {
    if (i < length) {
      out.push(undefined)
      continue
    }
    let pos = 0
    let neg = 0
    for (let j = i - length + 1; j <= i; j++) {
      if (j === 0) continue
      if (tp[j] > tp[j - 1]) pos += rawMF[j]
      else if (tp[j] < tp[j - 1]) neg += rawMF[j]
    }
    out.push(neg === 0 ? 100 : 100 - 100 / (1 + pos / neg))
  }
  return toLine(candles, out)
}

export function calcROC(candles: Candle[], length = 9): Pt[] {
  const c = closes(candles)
  const out: (number | undefined)[] = candles.map((_, i) => (i < length ? undefined : ((c[i] - c[i - length]) / c[i - length]) * 100))
  return toLine(candles, out)
}

export function calcMomentum(candles: Candle[], length = 10): Pt[] {
  const c = closes(candles)
  const out: (number | undefined)[] = candles.map((_, i) => (i < length ? undefined : c[i] - c[i - length]))
  return toLine(candles, out)
}

// TRIX: 3중 EMA의 변화율(%) * 100
export function calcTRIX(candles: Candle[], length = 15): Pt[] {
  const c = closes(candles)
  const e1 = ema(c, length)
  const e1Filled = e1.map((v) => v ?? NaN)
  const e2 = ema(e1Filled, length)
  const e2Filled = e2.map((v) => v ?? NaN)
  const e3 = ema(e2Filled, length)
  const out: (number | undefined)[] = candles.map((_, i) => {
    if (i === 0 || e3[i] === undefined || e3[i - 1] === undefined || !Number.isFinite(e3[i] as number) || !Number.isFinite(e3[i - 1] as number)) return undefined
    const prev = e3[i - 1] as number
    if (prev === 0) return undefined
    return (((e3[i] as number) - prev) / prev) * 10000
  })
  return toLine(candles, out)
}

// Ultimate Oscillator(7,14,28)
export function calcUltimateOscillator(candles: Candle[], p1 = 7, p2 = 14, p3 = 28): Pt[] {
  const c = closes(candles)
  const l = lows(candles)
  const h = highs(candles)
  const bp: number[] = [0]
  const tr: number[] = [trueRanges(candles)[0]]
  for (let i = 1; i < candles.length; i++) {
    const minLowPrevClose = Math.min(l[i], c[i - 1])
    bp.push(c[i] - minLowPrevClose)
    const maxHighPrevClose = Math.max(h[i], c[i - 1])
    tr.push(maxHighPrevClose - minLowPrevClose)
  }
  const avg = (period: number, i: number) => {
    if (i < period - 1) return undefined
    let sumBp = 0
    let sumTr = 0
    for (let j = i - period + 1; j <= i; j++) {
      sumBp += bp[j]
      sumTr += tr[j]
    }
    return sumTr === 0 ? 0 : sumBp / sumTr
  }
  const out: (number | undefined)[] = candles.map((_, i) => {
    const a1 = avg(p1, i)
    const a2 = avg(p2, i)
    const a3 = avg(p3, i)
    if (a1 === undefined || a2 === undefined || a3 === undefined) return undefined
    return ((4 * a1 + 2 * a2 + a3) / 7) * 100
  })
  return toLine(candles, out)
}

// Chaikin Money Flow
export function calcCMF(candles: Candle[], vols: HistogramData[], length = 20): Pt[] {
  const h = highs(candles)
  const l = lows(candles)
  const c = closes(candles)
  const v = volumesOf(vols, candles.length)
  const mfv = candles.map((_, i) => {
    const range = h[i] - l[i]
    if (range === 0) return 0
    return (((c[i] - l[i]) - (h[i] - c[i])) / range) * v[i]
  })
  const out: (number | undefined)[] = []
  for (let i = 0; i < candles.length; i++) {
    if (i < length - 1) {
      out.push(undefined)
      continue
    }
    let sumMfv = 0
    let sumV = 0
    for (let j = i - length + 1; j <= i; j++) {
      sumMfv += mfv[j]
      sumV += v[j]
    }
    out.push(sumV === 0 ? 0 : sumMfv / sumV)
  }
  return toLine(candles, out)
}

// Aroon Up/Down
export function calcAroon(candles: Candle[], length = 14): { up: Pt[]; down: Pt[] } {
  const h = highs(candles)
  const l = lows(candles)
  const up: (number | undefined)[] = []
  const down: (number | undefined)[] = []
  for (let i = 0; i < candles.length; i++) {
    if (i < length) {
      up.push(undefined)
      down.push(undefined)
      continue
    }
    let hiIdx = i
    let loIdx = i
    let hi = -Infinity
    let lo = Infinity
    for (let j = i - length; j <= i; j++) {
      if (h[j] >= hi) {
        hi = h[j]
        hiIdx = j
      }
      if (l[j] <= lo) {
        lo = l[j]
        loIdx = j
      }
    }
    up.push(((length - (i - hiIdx)) / length) * 100)
    down.push(((length - (i - loIdx)) / length) * 100)
  }
  return { up: toLine(candles, up), down: toLine(candles, down) }
}

// 표준편차
export function calcStdDev(candles: Candle[], length = 20): Pt[] {
  const c = closes(candles)
  const out: (number | undefined)[] = []
  const win: number[] = []
  let sum = 0
  let sumSq = 0
  for (let i = 0; i < c.length; i++) {
    win.push(c[i])
    sum += c[i]
    sumSq += c[i] * c[i]
    if (win.length > length) {
      const removed = win.shift() as number
      sum -= removed
      sumSq -= removed * removed
    }
    if (win.length === length) {
      const mean = sum / length
      out.push(Math.sqrt(Math.max(0, sumSq / length - mean * mean)))
    } else {
      out.push(undefined)
    }
  }
  return toLine(candles, out)
}
