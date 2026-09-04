import type {
  Coordinate,
  IChartApi,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  ISeriesApi,
  ISeriesPrimitive,
  SeriesType,
  Time
} from 'lightweight-charts'

export type VerticalLinePrimitiveOptions = {
  lineColor?: string
  width?: number
  // 실제 데이터가 없는 여백(현재가 오른쪽 등) 구간의 좌표는 기본 timeToCoordinate로 계산되지 않아,
  // 호출 측에서 로지컬 좌표로 보정한 값을 넘겨줄 수 있게 함.
  resolveX?: (time: Time) => number | null
  showHandle?: boolean
  handleColor?: string
}

class VerticalLinePaneRenderer implements IPrimitivePaneRenderer {
  constructor(
    private x: Coordinate | null,
    private options: Required<Pick<VerticalLinePrimitiveOptions, 'lineColor' | 'width'>> &
      Pick<VerticalLinePrimitiveOptions, 'showHandle' | 'handleColor'>
  ) {}

  draw(target: any) {
    target.useBitmapCoordinateSpace((scope: any) => {
      if (this.x === null) return
      const ctx = scope.context as CanvasRenderingContext2D
      const x = this.x * scope.horizontalPixelRatio
      const height = scope.bitmapSize.height
      ctx.save()
      ctx.lineWidth = this.options.width
      ctx.strokeStyle = this.options.lineColor
      ctx.beginPath()
      ctx.moveTo(Math.round(x), 0)
      ctx.lineTo(Math.round(x), height)
      ctx.stroke()

      if (this.options.showHandle) {
        const r = 5 * scope.horizontalPixelRatio
        const midY = height / 2
        ctx.beginPath()
        ctx.arc(x, midY, r, 0, Math.PI * 2)
        ctx.fillStyle = this.options.handleColor || this.options.lineColor
        ctx.fill()
        ctx.lineWidth = 1.5 * scope.horizontalPixelRatio
        ctx.strokeStyle = '#ffffff'
        ctx.stroke()
      }
      ctx.restore()
    })
  }
}

class VerticalLinePaneView implements IPrimitivePaneView {
  private x: Coordinate | null = null

  constructor(private source: VerticalLinePrimitive) {}

  update() {
    const timeScale = this.source.chart.timeScale()
    const resolveX = this.source.options.resolveX
    const x = resolveX ? resolveX(this.source.time) : timeScale.timeToCoordinate(this.source.time)
    this.x = (x as Coordinate | null) ?? null
  }

  renderer() {
    return new VerticalLinePaneRenderer(this.x, this.source.options)
  }
}

export class VerticalLinePrimitive implements ISeriesPrimitive<Time> {
  readonly chart: IChartApi
  readonly series: ISeriesApi<SeriesType>
  readonly time: Time
  readonly options: Required<Pick<VerticalLinePrimitiveOptions, 'lineColor' | 'width'>> &
    Pick<VerticalLinePrimitiveOptions, 'resolveX' | 'showHandle' | 'handleColor'>
  private readonly _paneViews: VerticalLinePaneView[]

  constructor(chart: IChartApi, series: ISeriesApi<SeriesType>, time: Time, options?: VerticalLinePrimitiveOptions) {
    this.chart = chart
    this.series = series
    this.time = time
    this.options = {
      lineColor: options?.lineColor || '#facc15',
      width: options?.width || 2,
      resolveX: options?.resolveX,
      showHandle: options?.showHandle,
      handleColor: options?.handleColor
    }
    this._paneViews = [new VerticalLinePaneView(this)]
  }

  updateAllViews() {
    this._paneViews.forEach((v) => v.update())
  }

  paneViews() {
    return this._paneViews
  }
}
