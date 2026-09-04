export type IndicatorCategory = 'overlay' | 'oscillator'

export type IndicatorMeta = {
  id: string
  labelKo: string
  labelEn: string
  category: IndicatorCategory
}

// BOL(볼린저밴드)은 자체 설정 팝업/선택 강조 기능이 있어 별도(chartPrefs.indicators.bol)로 관리되지만,
// 지표 선택 목록에는 다른 지표들과 함께 "상단 지표"에 노출된다.
export const INDICATOR_LIST: IndicatorMeta[] = [
  // 상단 지표(가격 차트 위에 겹쳐 그리는 지표)
  { id: 'ma', labelKo: '이동평균선', labelEn: 'Moving Average (SMA)', category: 'overlay' },
  { id: 'ema', labelKo: '지수이동평균', labelEn: 'Exponential Moving Average (EMA)', category: 'overlay' },
  { id: 'wma', labelKo: '가중이동평균', labelEn: 'Weighted Moving Average (WMA)', category: 'overlay' },
  { id: 'vwma', labelKo: '거래량가중이동평균', labelEn: 'Volume Weighted Moving Average (VWMA)', category: 'overlay' },
  { id: 'ichimoku', labelKo: '일목균형표', labelEn: 'Ichimoku Cloud', category: 'overlay' },
  { id: 'vwap', labelKo: 'VWAP', labelEn: 'VWAP', category: 'overlay' },
  { id: 'psar', labelKo: '파라볼릭 SAR', labelEn: 'Parabolic SAR', category: 'overlay' },
  { id: 'supertrend', labelKo: '슈퍼트렌드', labelEn: 'SuperTrend', category: 'overlay' },
  { id: 'keltner', labelKo: '켈트너 채널', labelEn: 'Keltner Channels', category: 'overlay' },
  { id: 'donchian', labelKo: '돈치안 채널', labelEn: 'Donchian Channels', category: 'overlay' },
  { id: 'envelope', labelKo: '엔벨로프', labelEn: 'Envelope', category: 'overlay' },
  { id: 'pivot', labelKo: '피봇 포인트', labelEn: 'Pivot Points', category: 'overlay' },

  // 하단 지표(별도 창에 그리는 오실레이터 계열)
  { id: 'rsi', labelKo: 'RSI', labelEn: 'RSI', category: 'oscillator' },
  { id: 'macd', labelKo: 'MACD', labelEn: 'MACD', category: 'oscillator' },
  { id: 'stoch', labelKo: '스토캐스틱', labelEn: 'Stochastic', category: 'oscillator' },
  { id: 'stochrsi', labelKo: '스토캐스틱 RSI', labelEn: 'Stochastic RSI', category: 'oscillator' },
  { id: 'atr', labelKo: 'ATR', labelEn: 'Average True Range (ATR)', category: 'oscillator' },
  { id: 'adx', labelKo: 'ADX', labelEn: 'ADX (DMI)', category: 'oscillator' },
  { id: 'cci', labelKo: 'CCI', labelEn: 'Commodity Channel Index (CCI)', category: 'oscillator' },
  { id: 'willr', labelKo: '윌리엄스 %R', labelEn: 'Williams %R', category: 'oscillator' },
  { id: 'obv', labelKo: 'OBV', labelEn: 'On Balance Volume (OBV)', category: 'oscillator' },
  { id: 'mfi', labelKo: 'MFI', labelEn: 'Money Flow Index (MFI)', category: 'oscillator' },
  { id: 'roc', labelKo: 'ROC', labelEn: 'Rate of Change (ROC)', category: 'oscillator' },
  { id: 'momentum', labelKo: '모멘텀', labelEn: 'Momentum', category: 'oscillator' },
  { id: 'trix', labelKo: 'TRIX', labelEn: 'TRIX', category: 'oscillator' },
  { id: 'uo', labelKo: '얼티밋 오실레이터', labelEn: 'Ultimate Oscillator', category: 'oscillator' },
  { id: 'cmf', labelKo: '차이킨 자금흐름', labelEn: 'Chaikin Money Flow (CMF)', category: 'oscillator' },
  { id: 'aroon', labelKo: '아룬', labelEn: 'Aroon', category: 'oscillator' },
  { id: 'stddev', labelKo: '표준편차', labelEn: 'Standard Deviation', category: 'oscillator' }
]
