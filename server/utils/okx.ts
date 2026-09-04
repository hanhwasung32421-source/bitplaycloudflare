function toInstId(symbol: string) {
  // 선물(무기한) 기준으로 맞춤: *-USDT-SWAP
  const s = symbol.toUpperCase().replace('-', '').replace('/', '')
  if (s.endsWith('SWAP')) return symbol.toUpperCase()
  if (s === 'BTCUSDT') return 'BTC-USDT-SWAP'
  if (s === 'ETHUSDT') return 'ETH-USDT-SWAP'
  if (s === 'DOGEUSDT') return 'DOGE-USDT-SWAP'
  if (s === 'SAMSUNGUSDT') return 'SAMSUNG-USDT-SWAP'
  if (s === 'SKHYNIXUSDT') return 'SKHYNIX-USDT-SWAP'
  // fallback: {BASE}USDT => {BASE}-USDT-SWAP
  const m = s.match(/^([A-Z0-9]+)USDT$/)
  if (m?.[1]) return `${m[1]}-USDT-SWAP`
  return 'BTC-USDT-SWAP'
}

export async function getOkxLastPrice(symbol: string) {
  const instId = toInstId(symbol)
  const res = await $fetch<any>('https://www.okx.com/api/v5/market/ticker', {
    query: { instId }
  })
  const last = Number(res?.data?.[0]?.last ?? NaN)
  if (!Number.isFinite(last)) {
    throw createError({ statusCode: 502, statusMessage: '시세 조회 실패' })
  }
  return { instId, last }
}
