import { getLiquidationRoe } from '../../utils/system-settings'

export default defineEventHandler(async () => {
  const liquidationRoe = await getLiquidationRoe()
  return { liquidationRoe }
})
