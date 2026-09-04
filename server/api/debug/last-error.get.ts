export default defineEventHandler(() => {
  return {
    ok: true,
    lastError: (globalThis as any).__LAST_ERROR__ || null
  }
})

