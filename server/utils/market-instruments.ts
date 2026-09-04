// OKX(우리가 차트/시세를 가져오는 거래소)의 실제 무기한 스왑(SWAP) 상품 목록을 가져와
// 코인선물 / 해외주식 / ETF / 원자재 / 국내주식 카테고리로 분류한다.
// - instCategory '1' = 코인(암호화폐) 선물
// - instCategory '3' = 주식/ETF/지수 토큰(미국+해외+한국 혼재) → 한국 관련 티커, ETF 티커를 각각 분리
// - instCategory '4' = 귀금속/원자재(금/은/백금/팔라듐/구리/원유/천연가스)
import { okxFetch } from '../upstream/okx-fetch'

export type MarketInstrument = {
  symbol: string // 우리 URL에서 쓰는 형태, 예: BTCUSDT
  instId: string // OKX instId, 예: BTC-USDT-SWAP
  base: string // 기초자산 티커, 예: BTC
  name: string // 화면 표시용 한글/영문 이름
  category: 'coin' | 'stock' | 'etf' | 'commodity' | 'krStock'
  categoryLabel: string
  price: number
  changePct: number
  volUsd: number // 24시간 거래대금(USDT 명목가 기준)
}

// 국내(한국) 관련 티커로 분류할 항목들 — instCategory 3 안에 섞여 있는 것 중 직접 식별.
const KR_TICKERS = new Set(['SAMSUNG', 'SKHYNIX', 'SKHY', 'EWY', 'KORU', 'KR200'])
// instCategory 3 안에서 개별 종목이 아니라 지수/펀드 성격의 ETF로 분류할 티커.
const ETF_TICKERS = new Set(['EWJ', 'EWT', 'EWZ', 'IWM', 'QQQ', 'SPY', 'SMH', 'SOXL', 'SOXS', 'SQQQ', 'TQQQ', 'TMF', 'UVXY', 'USO', 'XBI', 'XLE'])

const CATEGORY_LABELS: Record<MarketInstrument['category'], string> = {
  coin: '암호화폐',
  stock: '해외주식',
  etf: 'ETF',
  commodity: '원자재',
  krStock: '국내주식'
}

const DISPLAY_NAMES: Record<string, string> = {
  // 국내
  SAMSUNG: '삼성전자',
  SKHYNIX: 'SK하이닉스',
  SKHY: 'SK하이닉스',
  EWY: '한국 ETF',
  KORU: '한국 3배 ETF',
  KR200: '코스피200',
  // 해외주식/원자재/ETF
  AAPL: '애플',
  TSLA: '테슬라',
  MSFT: '마이크로소프트',
  GOOGL: '구글',
  AMZN: '아마존',
  META: '메타',
  NVDA: '엔비디아',
  NFLX: '넷플릭스',
  AMD: 'AMD',
  TSM: 'TSMC',
  COIN: '코인베이스',
  MSTR: '마이크로스트래티지',
  PLTR: '팔란티어',
  SHOP: '쇼피파이',
  INTC: '인텔',
  HOOD: '로빈후드',
  IBM: 'IBM',
  ORCL: '오라클',
  CRM: '세일즈포스',
  ADBE: '어도비',
  QCOM: '퀄컴',
  AVGO: '브로드컴',
  ASML: 'ASML',
  UNH: '유나이티드헬스',
  JNJ: '존슨앤드존슨',
  KO: '코카콜라',
  WMT: '월마트',
  COST: '코스트코',
  DIS: '디즈니',
  SONY: '소니',
  SOFTBANK: '소프트뱅크',
  HYUNDAI: '현대차',
  XIAOMI: '샤오미',
  SPY: 'S&P500 ETF',
  QQQ: '나스닥100 ETF',
  IWM: '러셀2000 ETF',
  EWJ: '일본 ETF',
  EWZ: '브라질 ETF',
  EWT: '대만 ETF',
  SMH: '반도체 ETF',
  SOXL: '반도체 3배 ETF',
  SOXS: '반도체 인버스 3배 ETF',
  SQQQ: '나스닥100 인버스 3배 ETF',
  TQQQ: '나스닥100 3배 ETF',
  TMF: '장기국채 3배 ETF',
  UVXY: '변동성 2배 ETF',
  USO: '원유 ETF',
  XBI: '바이오 ETF',
  XLE: '에너지 ETF',
  XAU: '금',
  XAG: '은',
  XPT: '백금',
  XPD: '팔라듐',
  XCU: '구리',
  CL: 'WTI 원유',
  BZ: '브렌트유',
  NG: '천연가스',
  // 코인
  BTC: '비트코인',
  ETH: '이더리움',
  XRP: '리플',
  SOL: '솔라나',
  DOGE: '도지코인',
  BNB: '바이낸스코인',
  ADA: '에이다',
  TRX: '트론',
  LTC: '라이트코인',
  DOT: '폴카닷',
  AVAX: '아발란체',
  LINK: '체인링크',
  BCH: '비트코인캐시',
  SHIB: '시바이누',
  SUI: '수이',
  TON: '톤코인',
  ETC: '이더리움클래식',
  NEAR: '니어프로토콜',
  APT: '앱토스',
  ICP: '인터넷컴퓨터',
  FIL: '파일코인',
  ATOM: '코스모스',
  UNI: '유니스왑',
  XLM: '스텔라루멘',
  HBAR: '헤데라'
}

function displayName(base: string) {
  return DISPLAY_NAMES[base] || base
}

let cache: { at: number; data: { instruments: any[]; tickers: Map<string, { last: number; open24h: number; volCcy24h: number }> } } | null = null
const CACHE_MS = 20_000

async function loadOkxSwapData() {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data

  // okxFetch 를 거치면 429 시 재시도 + 스테일 폴백이 적용됩니다.
  // 위의 CACHE_MS(20초) 캐시와 별개로, 상류가 잠깐 막혀도 목록이 비지 않게 해 줍니다.
  const [instRes, tickerRes] = await Promise.all([
    okxFetch<any>(
      'https://www.okx.com/api/v5/public/instruments',
      { instType: 'SWAP' },
      { freshMs: 60000, staleMs: 3600000 }
    ),
    okxFetch<any>(
      'https://www.okx.com/api/v5/market/tickers',
      { instType: 'SWAP' },
      { freshMs: 10000, staleMs: 120000 }
    )
  ])

  const instruments = (instRes?.data || []).filter((x: any) => x.state === 'live')
  const tickers = new Map<string, { last: number; open24h: number; volCcy24h: number }>()
  for (const t of tickerRes?.data || []) {
    tickers.set(String(t.instId), {
      last: Number(t.last || 0),
      open24h: Number(t.open24h || 0),
      volCcy24h: Number(t.volCcy24h || 0)
    })
  }

  const data = { instruments, tickers }
  cache = { at: Date.now(), data }
  return data
}

function resolveCategory(instCategory: string, base: string): MarketInstrument['category'] | null {
  if (instCategory === '1') return 'coin'
  if (instCategory === '4') return 'commodity'
  if (instCategory === '3') {
    if (KR_TICKERS.has(base)) return 'krStock'
    if (ETF_TICKERS.has(base)) return 'etf'
    return 'stock'
  }
  return null
}

function toMarketInstrument(inst: any, tickers: Map<string, { last: number; open24h: number; volCcy24h: number }>): MarketInstrument | null {
  const instId = String(inst.instId || '')
  const m = instId.match(/^([A-Z0-9]+)-USDT-SWAP$/)
  if (!m) return null
  const base = m[1]
  const category = resolveCategory(String(inst.instCategory || ''), base)
  if (!category) return null
  const t = tickers.get(instId)
  const price = t?.last || 0
  const open24h = t?.open24h || 0
  const changePct = open24h > 0 ? ((price - open24h) / open24h) * 100 : 0
  return {
    symbol: `${base}USDT`,
    instId,
    base,
    name: displayName(base),
    category,
    categoryLabel: CATEGORY_LABELS[category],
    price,
    changePct,
    volUsd: t?.volCcy24h || 0
  }
}

async function loadAllInstruments(): Promise<MarketInstrument[]> {
  const { instruments, tickers } = await loadOkxSwapData()
  const items: MarketInstrument[] = []
  for (const inst of instruments) {
    const item = toMarketInstrument(inst, tickers)
    if (item) items.push(item)
  }
  return items
}

export async function listCategorizedMarketInstruments(): Promise<{
  coin: MarketInstrument[]
  globalStock: MarketInstrument[]
  krStock: MarketInstrument[]
}> {
  const all = await loadAllInstruments()
  const byBase = (a: MarketInstrument, b: MarketInstrument) => a.base.localeCompare(b.base)
  const coin = all.filter((i) => i.category === 'coin').sort(byBase)
  const globalStock = all.filter((i) => i.category === 'stock' || i.category === 'etf' || i.category === 'commodity').sort(byBase)
  const krStock = all.filter((i) => i.category === 'krStock').sort(byBase)
  return { coin, globalStock, krStock }
}

export type MarketOverview = {
  items: MarketInstrument[]
  totalVolUsd: number
  totalCount: number
  btcSharePct: number
  upCount: number
  downCount: number
  flatCount: number
  topGainers: MarketInstrument[]
  topLosers: MarketInstrument[]
  categoryCounts: Record<MarketInstrument['category'], number>
}

export async function getMarketOverview(): Promise<MarketOverview> {
  const items = await loadAllInstruments()
  const totalVolUsd = items.reduce((sum, i) => sum + i.volUsd, 0)
  const btc = items.find((i) => i.base === 'BTC')
  const btcSharePct = totalVolUsd > 0 && btc ? (btc.volUsd / totalVolUsd) * 100 : 0
  const upCount = items.filter((i) => i.changePct > 0).length
  const downCount = items.filter((i) => i.changePct < 0).length
  const flatCount = items.length - upCount - downCount

  const byChangeDesc = [...items].sort((a, b) => b.changePct - a.changePct)
  const topGainers = byChangeDesc.slice(0, 4)
  const topLosers = byChangeDesc.slice(-4).reverse()

  const categoryCounts = { coin: 0, stock: 0, etf: 0, commodity: 0, krStock: 0 } as Record<MarketInstrument['category'], number>
  for (const i of items) categoryCounts[i.category]++

  return {
    items,
    totalVolUsd,
    totalCount: items.length,
    btcSharePct,
    upCount,
    downCount,
    flatCount,
    topGainers,
    topLosers,
    categoryCounts
  }
}
