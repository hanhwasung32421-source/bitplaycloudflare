import { randomUUID } from 'node:crypto'
import { setResponseHeader } from 'h3'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    const id = randomUUID()
    ;(event.context as any).requestId = id
    setResponseHeader(event, 'x-request-id', id)
  })
})

