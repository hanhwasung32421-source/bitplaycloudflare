<template>
  <div class="h-full w-full">
    <div :id="containerId" class="h-full w-full" />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  symbol: string // 예: OKX:SAMSUNGUSDT.P
  interval?: string // 예: 1, 5, 15
  entryLines?: Array<{ price: number; side: 'long' | 'short' }>
}>()

const containerId = `tv_${Math.random().toString(36).slice(2)}`
const widgetRef = shallowRef<any>(null)
const createdLines = shallowRef<any[]>([])

function loadTvScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById('tradingview-tvjs') as HTMLScriptElement | null
    if (existing) return resolve()

    const s = document.createElement('script')
    s.id = 'tradingview-tvjs'
    s.src = 'https://s3.tradingview.com/tv.js'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('TradingView script load failed'))
    document.head.appendChild(s)
  })
}

async function render() {
  await loadTvScript()
  const tv = (window as any).TradingView
  if (!tv?.widget) throw new Error('TradingView widget not available')

  // eslint-disable-next-line new-cap
  const widget = new tv.widget({
    autosize: true,
    symbol: props.symbol,
    interval: props.interval || '15',
    timezone: 'Asia/Seoul',
    theme: 'dark',
    style: '1',
    locale: 'kr',
    toolbar_bg: '#0b1220',
    enable_publishing: false,
    hide_side_toolbar: false,
    allow_symbol_change: false,
    container_id: containerId
  })

  widgetRef.value = widget

  // 차트 준비 후 진입가격 라인 표시(가능한 경우)
  widget.onChartReady?.(() => {
    applyEntryLines()
  })
}

function clearLines() {
  const lines = createdLines.value || []
  for (const l of lines) {
    try {
      l.remove?.()
    } catch {
      // ignore
    }
  }
  createdLines.value = []
}

function applyEntryLines() {
  try {
    const widget = widgetRef.value
    if (!widget) return
    const chart = widget.activeChart?.() || widget.chart?.()
    if (!chart) return

    clearLines()
    const list = props.entryLines || []
    for (const it of list) {
      const price = Number(it.price)
      if (!Number.isFinite(price)) continue
      // TradingView Charting Library 계열 API가 제공되는 경우에만 동작
      const line = chart.createOrderLine?.()
      if (!line) continue
      const color = it.side === 'long' ? '#60a5fa' : '#fb7185'
      line.setPrice?.(price)
      line.setText?.(it.side === 'long' ? 'LONG' : 'SHORT')
      line.setLineColor?.(color)
      line.setBodyTextColor?.('#0b1220')
      line.setBodyBackgroundColor?.(color)
      createdLines.value.push(line)
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('applyEntryLines failed', e)
  }
}

onMounted(() => {
  render().catch((e) => {
    // 실패 시에도 화면이 죽지 않게
    // eslint-disable-next-line no-console
    console.error(e)
  })
})

watch(
  () => props.entryLines,
  () => applyEntryLines(),
  { deep: true }
)

onBeforeUnmount(() => {
  clearLines()
})
</script>
