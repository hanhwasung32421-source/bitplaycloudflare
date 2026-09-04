import type {
  AutoscaleInfo,
  Coordinate,
  IChartApi,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  ISeriesApi,
  ISeriesPrimitive,
  Logical,
  SeriesType,
  Time
} from 'lightweight-charts'

type ViewPoint = { x: Coordinate | null; y: Coordinate | null }
type ShapePoint = { time: Time; price: number }

export type CirclePrimitiveOptions = {
  borderColor?: string
  fillColor?: string
  width?: number
  resolveX?: (time: Time) => number | null
  showHandles?: boolean
  handleColor?: string
  formatPrice?: (price: number) => string
}

type ResolvedOptions = Required<Pick<CirclePrimitiveOptions, 'borderColor' | 'fillColor' | 'width'>> &
  Pick<CirclePrimitiveOptions, 'resolveX' | 'showHandles' | 'handleColor' | 'formatPrice'>

class CirclePaneRenderer implements IPrimitivePaneRenderer {
  constructor(
    private p1: ViewPoint,
    private p2: ViewPoint,
    private point1: ShapePoint,
    private point2: ShapePoint,
    private options: ResolvedOptions
  ) {}

  draw(target: any) {
    target.useBitmapCoordinateSpace((scope: any) => {
      if (this.p1.x === null || this.p1.y === null || this.p2.x === null || this.p2.y === null) return
      const ctx = scope.context as CanvasRenderingContext2D
      const x1 = this.p1.x * scope.horizontalPixelRatio
      const y1 = this.p1.y * scope.verticalPixelRatio
      const x2 = this.p2.x * scope.horizontalPixelRatio
      const y2 = this.p2.y * scope.verticalPixelRatio
      const left = Math.min(x1, x2)
      const top = Math.min(y1, y2)
      const width = Math.abs(x2 - x1)
      const height = Math.abs(y2 - y1)
      const cx = left + width / 2
      const cy = top + height / 2
      const rx = width / 2
      const ry = height / 2

      ctx.save()
      ctx.beginPath()
      ctx.ellipse(cx, cy, Math.max(rx, 0.01), Math.max(ry, 0.01), 0, 0, Math.PI * 2)
      ctx.fillStyle = this.options.fillColor
      ctx.fill()
      ctx.lineWidth = this.options.width
      ctx.strokeStyle = this.options.borderColor
      ctx.stroke()

      if (this.options.showHandles) {
        const r = 5 * scope.horizontalPixelRatio
        const fill = this.options.handleColor || this.options.borderColor
        for (const [hx, hy] of [
          [x1, y1],
          [x2, y2]
        ]) {
          ctx.beginPath()
          ctx.arc(hx, hy, r, 0, Math.PI * 2)
          ctx.fillStyle = fill
          ctx.fill()
          ctx.lineWidth = 1.5 * scope.horizontalPixelRatio
          ctx.strokeStyle = '#ffffff'
          ctx.stroke()
        }
      }

      const diff = this.point2.price - this.point1.price
      const pct = this.point1.price > 0 ? (diff / this.point1.price) * 100 : 0
      const positive = diff >= 0
      const fmt = this.options.formatPrice || ((n: number) => n.toFixed(2))
      const sign = positive ? '+' : ''
      const line1 = `${sign}${fmt(diff)} (${sign}${pct.toFixed(2)}%)`
      const line2 = `${fmt(this.point1.price)} , ${fmt(this.point2.price)}`
      const labelY = top - 8 * scope.verticalPixelRatio
      const fontSize = Math.round(11 * scope.verticalPixelRatio)
      ctx.font = `bold ${fontSize}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillStyle = positive ? '#22ab94' : '#f23645'
      ctx.textBaseline = 'bottom'
      ctx.fillText(line2, cx, labelY)
      ctx.fillText(line1, cx, labelY - fontSize - 2)
      ctx.restore()
    })
  }
}

class CirclePaneView implements IPrimitivePaneView {
  private p1: ViewPoint = { x: null, y: null }
  private p2: ViewPoint = { x: null, y: null }

  constructor(private source: CirclePrimitive) {}

  update() {
    const y1 = this.source.series.priceToCoordinate(this.source.point1.price)
    const y2 = this.source.series.priceToCoordinate(this.source.point2.price)
    const timeScale = this.source.chart.timeScale()
    const resolveX = this.source.options.resolveX
    const x1 = resolveX ? resolveX(this.source.point1.time) : timeScale.timeToCoordinate(this.source.point1.time)
    const x2 = resolveX ? resolveX(this.source.point2.time) : timeScale.timeToCoordinate(this.source.point2.time)
    this.p1 = { x: (x1 as Coordinate | null) ?? null, y: y1 }
    this.p2 = { x: (x2 as Coordinate | null) ?? null, y: y2 }
  }

  renderer() {
    return new CirclePaneRenderer(this.p1, this.p2, this.source.point1, this.source.point2, this.source.options)
  }
}

export class CirclePrimitive implements ISeriesPrimitive<Time> {
  readonly chart: IChartApi
  readonly series: ISeriesApi<SeriesType>
  readonly point1: ShapePoint
  readonly point2: ShapePoint
  readonly options: ResolvedOptions
  private readonly _paneViews: CirclePaneView[]
  private readonly minPrice: number
  private readonly maxPrice: number

  constructor(
    chart: IChartApi,
    series: ISeriesApi<SeriesType>,
    point1: ShapePoint,
    point2: ShapePoint,
    options?: CirclePrimitiveOptions
  ) {
    this.chart = chart
    this.series = series
    this.point1 = point1
    this.point2 = point2
    this.options = {
      borderColor: options?.borderColor || '#a855f7',
      fillColor: options?.fillColor || 'rgba(168,85,247,0.12)',
      width: options?.width || 1,
      resolveX: options?.resolveX,
      showHandles: options?.showHandles,
      handleColor: options?.handleColor,
      formatPrice: options?.formatPrice
    }
    this._paneViews = [new CirclePaneView(this)]
    this.minPrice = Math.min(point1.price, point2.price)
    this.maxPrice = Math.max(point1.price, point2.price)
  }

  updateAllViews() {
    this._paneViews.forEach((v) => v.update())
  }

  paneViews() {
    return this._paneViews
  }

  autoscaleInfo(startTimePoint: Logical, endTimePoint: Logical): AutoscaleInfo | null {
    const p1Index = this.pointIndex(this.point1)
    const p2Index = this.pointIndex(this.point2)
    if (p1Index === null || p2Index === null) return null
    if (endTimePoint < Math.min(p1Index, p2Index) || startTimePoint > Math.max(p1Index, p2Index)) return null
    return {
      priceRange: {
        minValue: this.minPrice,
        maxValue: this.maxPrice
      }
    }
  }

  private pointIndex(point: ShapePoint): number | null {
    const coordinate = this.chart.timeScale().timeToCoordinate(point.time)
    if (coordinate === null) return null
    return this.chart.timeScale().coordinateToLogical(coordinate)
  }
}
