<template>
  <div ref="root" class="relative inline-block">
    <button
      type="button"
      class="flex items-center gap-2 rounded-md bg-slate-950/60 px-3 py-1 text-xs text-slate-100 ring-1 ring-emerald-400/40 hover:bg-slate-950/75"
      @click="open = !open"
    >
      <span class="truncate">{{ selectedLabel }}</span>
      <span class="text-slate-300">▼</span>
    </button>

    <div
      v-if="open"
      class="absolute left-0 top-[calc(100%+6px)] z-50 max-h-80 min-w-full overflow-y-auto overscroll-contain rounded-md border border-white/10 bg-slate-950 shadow-lg"
    >
      <button
        v-for="opt in options"
        :key="opt.value"
        type="button"
        class="block w-full px-3 py-2 text-left text-xs"
        :class="opt.value === modelValue ? 'bg-blue-600 text-white' : 'text-slate-200 hover:bg-white/5'"
        @click="select(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
type Opt = { value: string; label: string }

const props = defineProps<{
  modelValue: string
  options: Opt[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'change', v: string): void
}>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

const selectedLabel = computed(() => {
  const hit = (props.options || []).find((o) => o.value === props.modelValue)
  return hit?.label || props.modelValue
})

function select(v: string) {
  emit('update:modelValue', v)
  emit('change', v)
  open.value = false
}

function onDocClick(e: MouseEvent) {
  const el = root.value
  if (!el) return
  if (!open.value) return
  const t = e.target as Node | null
  if (t && el.contains(t)) return
  open.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocClick, { capture: true })
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick, { capture: true } as any)
})
</script>

