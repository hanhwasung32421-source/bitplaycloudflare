import type { CandlestickData, LineData } from 'lightweight-charts'

export function calculateMovingAverageLineData(
  candles: CandlestickData[],
  length: number
): Array<LineData | { time: any }> {
  const values = candles.map((d) => Number(d.close))
  const out: Array<LineData | { time: any }> = []
  const window: number[] = []
  let sum = 0

  for (let i = 0; i < candles.length; i++) {
    const value = values[i]
    window.push(value)
    sum += value
    if (window.length > length) sum -= window.shift() as number

    if (window.length === length) {
      out.push({
        time: (candles[i] as any).time,
        value: sum / length
      })
    } else {
      out.push({ time: (candles[i] as any).time })
    }
  }

  return out
}

// 볼린저밴드: 이동평균선(기간 20) + 표준편차(2) 상/하단 밴드, 종가 기준
export function calculateBollingerBands(
  candles: CandlestickData[],
  length = 20,
  stdDevMultiplier = 2
): {
  basis: Array<LineData | { time: any }>
  upper: Array<LineData | { time: any }>
  lower: Array<LineData | { time: any }>
} {
  const values = candles.map((d) => Number(d.close))
  const basis: Array<LineData | { time: any }> = []
  const upper: Array<LineData | { time: any }> = []
  const lower: Array<LineData | { time: any }> = []
  const window: number[] = []
  let sum = 0
  let sumSq = 0

  for (let i = 0; i < candles.length; i++) {
    const value = values[i]
    const time = (candles[i] as any).time
    window.push(value)
    sum += value
    sumSq += value * value
    if (window.length > length) {
      const removed = window.shift() as number
      sum -= removed
      sumSq -= removed * removed
    }

    if (window.length === length) {
      const mean = sum / length
      const variance = Math.max(0, sumSq / length - mean * mean)
      const sd = Math.sqrt(variance)
      basis.push({ time, value: mean })
      upper.push({ time, value: mean + stdDevMultiplier * sd })
      lower.push({ time, value: mean - stdDevMultiplier * sd })
    } else {
      basis.push({ time })
      upper.push({ time })
      lower.push({ time })
    }
  }

  return { basis, upper, lower }
}

