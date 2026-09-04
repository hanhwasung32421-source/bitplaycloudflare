<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">회원 목록</h1>
        <p class="mt-1 text-sm text-slate-400">회원 목록을 조회합니다.</p>
      </div>
      <div class="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100">
        총 보유금액 <span class="font-mono text-base font-semibold">{{ fmt2(totalBalance) }}</span> USDT
      </div>
    </div>

    <div class="space-y-4">
      <div class="grid gap-2 md:grid-cols-[360px_160px_minmax(220px,1fr)_120px_160px]">
        <div class="flex items-center gap-2 rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200">
          <input v-model="fromDate" type="date" class="date-input w-full bg-transparent outline-none" />
          <span class="text-slate-500">~</span>
          <input v-model="toDate" type="date" class="date-input w-full bg-transparent outline-none" />
        </div>
        <select v-model="roleFilter" class="rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200 outline-none">
          <option value="">유저권한</option>
          <option value="user">회원</option>
          <option value="admin">부관리자</option>
          <option value="super_admin">관리자</option>
        </select>
        <input
          v-model.trim="keyword"
          class="rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500"
          placeholder="검색어를 입력하세요"
        />
        <select v-model="onlineFilter" class="rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200 outline-none">
          <option value="">접속여부</option>
          <option value="접속">접속</option>
          <option value="미접속">미접속</option>
        </select>
        <div class="flex items-center gap-2 rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200">
          <span class="whitespace-nowrap text-slate-400">표시수</span>
          <input
            v-model.number="pageSizeInput"
            type="number"
            min="1"
            max="500"
            class="w-full bg-transparent text-right outline-none"
          />
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-[14px] text-slate-200">
          <thead class="border-b border-[#12314a] text-[13px] text-slate-400">
            <tr>
              <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left" @click="toggleSort('role')">유저권한<span class="sort-icon">{{ sortArrow('role') || ' ⇅' }}</span></th>
              <th class="whitespace-nowrap px-3 py-3 text-left">승인상태</th>
              <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left" @click="toggleSort('username')">아이디<span class="sort-icon">{{ sortArrow('username') || ' ⇅' }}</span></th>
              <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left" @click="toggleSort('name')">회원이름<span class="sort-icon">{{ sortArrow('name') || ' ⇅' }}</span></th>
              <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left" @click="toggleSort('referralCode')">추천코드<span class="sort-icon">{{ sortArrow('referralCode') || ' ⇅' }}</span></th>
              <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left" @click="toggleSort('topCode')">최상위코드<span class="sort-icon">{{ sortArrow('topCode') || ' ⇅' }}</span></th>
              <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-right" @click="toggleSort('balanceUsdt')">보유금액<span class="sort-icon">{{ sortArrow('balanceUsdt') || ' ⇅' }}</span></th>
              <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-right" @click="toggleSort('cumulativeProfit')">누적수익<span class="sort-icon">{{ sortArrow('cumulativeProfit') || ' ⇅' }}</span></th>
              <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left" @click="toggleSort('created_at')">가입일<span class="sort-icon">{{ sortArrow('created_at') || ' ⇅' }}</span></th>
              <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left" @click="toggleSort('last_login')">최근 접속일<span class="sort-icon">{{ sortArrow('last_login') || ' ⇅' }}</span></th>
              <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left" @click="toggleSort('online')">접속여부<span class="sort-icon">{{ sortArrow('online') || ' ⇅' }}</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && filtered.length === 0" class="border-b border-[#0d2438]">
              <td colspan="11" class="px-3 py-8 text-center text-slate-500">데이터가 없습니다.</td>
            </tr>
            <tr v-for="u in paged" :key="u.id" class="border-b border-[#0d2438] hover:bg-white/[0.02]">
              <td class="px-3 py-3">
                <select
                  v-if="canEditRoleOf(u)"
                  v-model="roleDraft[u.id]"
                  class="w-28 rounded-md border border-[#173753] bg-[#041425] px-2 py-1 text-[11px] text-slate-200 outline-none"
                  :disabled="grantingId === u.id"
                  @change="onRoleSelectChange(u)"
                >
                  <option value="user">회원</option>
                  <option v-for="r in grantableRoles" :key="r.id" :value="r.id">{{ r.label }}</option>
                  <option v-if="me?.role === 'super_admin'" value="super_admin">최고관리자</option>
                </select>
                <span v-else class="rounded bg-white/5 px-2 py-1 text-[10px] font-semibold text-slate-100 ring-1 ring-white/10">{{ u.role }}</span>
              </td>
              <td class="px-3 py-3">
                <span class="rounded bg-white/10 px-2 py-1 text-[10px] font-semibold text-slate-100 ring-1 ring-white/10">승인</span>
              </td>
              <td class="whitespace-nowrap px-3 py-3 font-mono text-slate-100">
                <button type="button" class="underline-offset-4 hover:text-cyan-300 hover:underline" @click="openProfileModal(u)">
                  {{ u.username }}
                </button>
              </td>
              <td class="whitespace-nowrap px-3 py-3 text-slate-200">{{ u.name }}</td>
              <td class="whitespace-nowrap px-3 py-3 font-mono text-slate-300">{{ u.referralCode || '—' }}</td>
              <td class="whitespace-nowrap px-3 py-3 font-mono text-slate-300">{{ u.topCode || '—' }}</td>
              <td class="whitespace-nowrap px-3 py-3 text-right font-mono">
                <button
                  v-if="canEditBalance"
                  type="button"
                  class="rounded bg-cyan-500/10 px-2 py-1 text-cyan-100 ring-1 ring-cyan-400/20 hover:bg-cyan-500/15"
                  @click="openBalanceModal(u)"
                >
                  {{ fmt2(u.balanceUsdt) }}
                </button>
                <span v-else class="px-2 py-1 text-slate-300">{{ fmt2(u.balanceUsdt) }}</span>
              </td>
              <td class="whitespace-nowrap px-3 py-3 text-right font-mono">
                <button
                  type="button"
                  class="rounded px-2 py-1 ring-1"
                  :class="
                    u.cumulativeProfit >= 0
                      ? 'bg-rose-500/10 text-rose-300 ring-rose-400/20 hover:bg-rose-500/15'
                      : 'bg-sky-500/10 text-sky-300 ring-sky-400/20 hover:bg-sky-500/15'
                  "
                  @click="openTradeModal(u)"
                >
                  {{ signedProfitText(u.cumulativeProfit) }}
                </button>
              </td>
              <td class="whitespace-nowrap px-3 py-3 font-mono text-slate-300">{{ dateOnly(u.created_at) }}</td>
              <td class="whitespace-nowrap px-3 py-3 font-mono text-slate-300">{{ u.last_login ? dateOnly(u.last_login) : '—' }}</td>
              <td class="whitespace-nowrap px-3 py-3">
                <span
                  class="rounded px-2 py-1 text-[10px] font-semibold ring-1"
                  :class="u.online ? 'bg-[#0c2c26] text-[#22ab94] ring-[#089981]/30' : 'bg-white/5 text-slate-300 ring-white/10'"
                >
                  {{ u.online ? '접속' : '미접속' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between gap-3">
        <div class="text-sm text-slate-400">페이지 {{ page }} / {{ totalPages }} · 총 {{ filtered.length }}명</div>
        <div class="flex items-center justify-center gap-2" v-if="totalPages > 1">
        <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page <= 1" @click="page = 1">«</button>
        <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page <= 1" @click="page--">‹</button>
        <button
          v-for="p in pageNumbers"
          :key="`member-page-${p}`"
          class="min-w-9 rounded px-3 py-1.5 text-center text-sm"
          :class="p === page ? 'bg-white/10 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'"
          @click="page = p"
        >
          {{ p }}
        </button>
        <span v-if="showPageTail" class="px-1 text-sm text-slate-500">~</span>
        <button
          v-if="showPageTail"
          class="min-w-9 rounded bg-white/5 px-3 py-1.5 text-center text-sm text-slate-300 hover:bg-white/10"
          @click="page = totalPages"
        >
          {{ totalPages }}
        </button>
        <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page >= totalPages" @click="page++">›</button>
        <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page >= totalPages" @click="page = totalPages">»</button>
      </div>
      </div>

      <p v-if="error" class="mt-3 text-sm text-rose-300">{{ error }}</p>
    </div>

    <Transition name="member-modal">
      <div v-if="profileModalOpen && selectedMember" class="fixed inset-0 z-[82] flex items-center justify-center bg-black/60 px-4" @click.self="closeProfileModal">
        <div class="w-full max-w-2xl rounded-2xl border border-[#12314a] bg-[#03101d] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-slate-100">회원정보 수정</h2>
              <p class="mt-1 text-sm text-slate-400">아이디 `{{ selectedMember.username }}`</p>
            </div>
            <button type="button" class="rounded-md bg-white/10 px-3 py-2 text-sm text-slate-100 hover:bg-white/15" @click="closeProfileModal">닫기</button>
          </div>

          <div class="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label class="text-sm text-slate-300">이름</label>
              <input v-model.trim="profileDraft.name" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-cyan-500" />
            </div>
            <div>
              <label class="text-sm text-slate-300">생년월일</label>
              <input v-model.trim="profileDraft.birthDate" placeholder="YYYY-MM-DD" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-cyan-500" />
            </div>
            <div>
              <label class="text-sm text-slate-300">은행명</label>
              <select v-model="profileDraft.bankName" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-slate-100 outline-none ring-1 ring-white/10 focus:ring-cyan-500">
                <option v-for="bank in banks" :key="bank" :value="bank">{{ bank }}</option>
              </select>
            </div>
            <div>
              <label class="text-sm text-slate-300">은행계좌</label>
              <input v-model.trim="profileDraft.bankAccount" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-cyan-500" />
            </div>
            <div>
              <label class="text-sm text-slate-300">예금주</label>
              <input v-model.trim="profileDraft.accountHolder" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-cyan-500" />
            </div>
            <div>
              <label class="text-sm text-slate-300">추천코드</label>
              <input
                v-model.trim="profileDraft.referralCode"
                :disabled="me?.role !== 'super_admin'"
                class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-cyan-500 disabled:text-slate-500"
              />
            </div>
          </div>

          <div class="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              class="rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
              :disabled="profileSaving"
              @click="saveProfile"
            >
              {{ profileSaving ? '저장 중...' : '저장' }}
            </button>
          </div>
          <p v-if="profileError" class="mt-3 text-sm text-rose-300">{{ profileError }}</p>
        </div>
      </div>
    </Transition>

    <Transition name="member-modal">
      <div v-if="tradeModalOpen && selectedMember" class="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4" @click.self="closeTradeModal">
        <div class="flex max-h-[88vh] w-full max-w-6xl flex-col rounded-2xl border border-[#12314a] bg-[#03101d] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-slate-100">{{ selectedMember.name }} 거래내역</h2>
              <p class="mt-1 text-sm text-slate-400">
                아이디 `{{ selectedMember.username }}` · 현재 보유금액 {{ fmt2(selectedMember.balanceUsdt) }} USDT
              </p>
            </div>
            <button type="button" class="rounded-md bg-white/10 px-3 py-2 text-sm text-slate-100 hover:bg-white/15" @click="closeTradeModal">닫기</button>
          </div>

          <div class="mt-4 min-h-0 flex-1 overflow-auto">
            <table class="min-w-full text-xs text-slate-200">
              <thead class="border-b border-[#12314a] text-[11px] text-slate-400">
                <tr>
                  <th class="px-3 py-3 text-left">날짜</th>
                  <th class="px-3 py-3 text-left">심볼</th>
                  <th class="px-3 py-3 text-left">주문유형</th>
                  <th class="px-3 py-3 text-left">구분</th>
                  <th class="px-3 py-3 text-right">레버리지</th>
                  <th class="px-3 py-3 text-right">체결가격</th>
                  <th class="px-3 py-3 text-right">체결량</th>
                  <th class="px-3 py-3 text-right">실현손익</th>
                  <th class="px-3 py-3 text-right">수수료</th>
                  <th class="px-3 py-3 text-left">접속상태</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!tradeLoading && pagedMemberTrades.length === 0" class="border-b border-[#0d2438]">
                  <td colspan="10" class="px-3 py-8 text-center text-slate-500">거래 내역이 없습니다.</td>
                </tr>
                <tr v-for="t in pagedMemberTrades" :key="t.id" class="border-b border-[#0d2438] hover:bg-white/[0.02]">
                  <td class="px-3 py-3 font-mono text-slate-300">{{ formatDateTime(t.created_at) }}</td>
                  <td class="px-3 py-3 font-semibold text-slate-100">{{ t.symbol }}</td>
                  <td class="px-3 py-3 text-slate-200">{{ t.orderType }}</td>
                  <td class="px-3 py-3">
                    <span class="rounded px-2 py-1 text-[10px] font-semibold ring-1" :class="tradeResultBadgeClass(t)">
                      {{ tradeResultLabel(t) }}
                    </span>
                  </td>
                  <td class="px-3 py-3 text-right font-mono text-slate-300">x{{ t.leverage }}</td>
                  <td class="px-3 py-3 text-right font-mono text-slate-200">{{ fmtPrice(t.price) }}</td>
                  <td class="px-3 py-3 text-right font-mono text-slate-200">{{ fmt2(t.qty) }}</td>
                  <td class="px-3 py-3 text-right font-mono" :class="t.pnl >= 0 ? 'text-emerald-400' : 'text-blue-400'">
                    {{ t.pnl >= 0 ? '+' : '' }}{{ fmt2(t.pnl) }}
                  </td>
                  <td class="px-3 py-3 text-right font-mono text-slate-300">{{ fmt2(t.fee) }}</td>
                  <td class="px-3 py-3">
                    <span
                      class="rounded px-2 py-1 text-[10px] font-semibold ring-1"
                      :class="t.online ? 'bg-[#0c2c26] text-[#22ab94] ring-[#089981]/30' : 'bg-white/5 text-slate-300 ring-white/10'"
                    >
                      {{ t.online ? '실시간 접속중' : '미접속중' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="mt-4 flex items-center justify-center gap-2" v-if="memberTradeTotalPages > 1">
            <button
              class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30"
              :disabled="memberTradePage <= 1"
              @click="memberTradePage = 1"
            >
              «
            </button>
            <button
              class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30"
              :disabled="memberTradePage <= 1"
              @click="memberTradePage--"
            >
              ‹
            </button>
            <button
              v-for="p in memberTradePageNumbers"
              :key="`member-trade-page-${p}`"
              class="min-w-9 rounded px-3 py-1.5 text-center text-sm"
              :class="p === memberTradePage ? 'bg-white/10 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'"
              @click="memberTradePage = p"
            >
              {{ p }}
            </button>
            <span v-if="showMemberTradeTail" class="px-1 text-sm text-slate-500">~</span>
            <button
              v-if="showMemberTradeTail"
              class="min-w-9 rounded bg-white/5 px-3 py-1.5 text-center text-sm text-slate-300 hover:bg-white/10"
              @click="memberTradePage = memberTradeTotalPages"
            >
              {{ memberTradeTotalPages }}
            </button>
            <button
              class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30"
              :disabled="memberTradePage >= memberTradeTotalPages"
              @click="memberTradePage++"
            >
              ›
            </button>
            <button
              class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30"
              :disabled="memberTradePage >= memberTradeTotalPages"
              @click="memberTradePage = memberTradeTotalPages"
            >
              »
            </button>
          </div>
          <p v-if="tradeError" class="mt-3 text-sm text-rose-300">{{ tradeError }}</p>
        </div>
      </div>
    </Transition>

    <Transition name="member-modal">
      <div v-if="balanceModalOpen && selectedMember" class="fixed inset-0 z-[81] flex items-center justify-center bg-black/60 px-4" @click.self="closeBalanceModal">
        <div class="w-full max-w-md rounded-2xl border border-[#12314a] bg-[#03101d] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-slate-100">{{ selectedMember.name }} 보유금액 수정</h2>
              <p class="mt-1 text-sm text-slate-400">현재 보유 현금 USDT를 직접 수정합니다.</p>
            </div>
            <button type="button" class="rounded-md bg-white/10 px-3 py-2 text-sm text-slate-100 hover:bg-white/15" @click="closeBalanceModal">닫기</button>
          </div>

          <div class="mt-4">
            <label class="text-sm text-slate-300">보유금액 (USDT)</label>
            <input
              v-model.number="balanceDraft"
              type="number"
              min="0"
              step="0.01"
              class="mt-2 w-full rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-100 outline-none"
              :disabled="!canEditBalance || balanceSaving"
            />
          </div>

          <p v-if="balanceError" class="mt-3 text-sm text-rose-300">{{ balanceError }}</p>

          <div class="mt-5 flex justify-end gap-2">
            <button type="button" class="rounded-md bg-white/10 px-4 py-2 text-sm text-slate-100 hover:bg-white/15" @click="closeBalanceModal">
              취소
            </button>
            <button
              type="button"
              class="rounded-md bg-cyan-500/15 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-40"
              :disabled="!canEditBalance || balanceSaving"
              @click="saveBalance"
            >
              수정
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['admin'] })

type MemberRow = {
  id: number
  role: string
  roleId: string
  approved: boolean
  username: string
  name: string
  birthDate: string
  bankName: string
  bankAccount: string
  accountHolder: string
  referralCode: string
  topCode: string
  balanceUsdt: number
  cumulativeProfit: number
  created_at: string
  online: boolean
  last_ip: string | null
  last_login: string | null
}

type MemberTradeRow = {
  id: number
  created_at: string
  symbol: string
  orderType: string
  leverage: number
  price: number
  qty: number
  pnl: number
  fee: number
  online: boolean
  liquidation?: boolean
}

const { me, refresh } = useMe()
await refresh()

const items = ref<MemberRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const keyword = ref('')
const roleFilter = ref('')
const onlineFilter = ref('')
const DEFAULT_FROM_DATE = '2026-01-01'
const DEFAULT_TO_DATE = new Date().toISOString().slice(0, 10)
const fromDate = ref(DEFAULT_FROM_DATE)
const toDate = ref(DEFAULT_TO_DATE)
const page = ref(1)
const pageSizeInput = ref(20)
const tradeModalOpen = ref(false)
const balanceModalOpen = ref(false)
const profileModalOpen = ref(false)
const selectedMember = ref<MemberRow | null>(null)
const memberTrades = ref<MemberTradeRow[]>([])
const tradeLoading = ref(false)
const tradeError = ref<string | null>(null)
const memberTradePage = ref(1)
const memberTradePageSize = 10
const balanceDraft = ref(0)
const balanceSaving = ref(false)
const balanceError = ref<string | null>(null)
const profileSaving = ref(false)
const profileError = ref<string | null>(null)
const profileDraft = reactive({
  name: '',
  birthDate: '',
  bankName: '국민은행',
  bankAccount: '',
  accountHolder: '',
  referralCode: ''
})
const banks = [
  '국민은행', '신한은행', '우리은행', '하나은행', '농협은행', '기업은행', '카카오뱅크', '토스뱅크', '케이뱅크', '새마을금고',
  '수협은행', 'SC제일은행', '씨티은행', '부산은행', '대구은행', '경남은행', '광주은행', '전북은행', '제주은행', '우체국'
]
let pollTimer: any = null
let loadingNow = false
// 총관리자는 항상 가능, 부관리자는 총관리자가 부여한 "회원 목록" 수정 권한이 있을 때만
const canEditBalance = computed(() => {
  if (me.value?.role === 'super_admin') return true
  if (me.value?.role && me.value.role !== 'user') return Boolean((me.value as any)?.permissions?.menus?.members?.edit)
  return false
})
const autoRefreshPaused = computed(() => tradeModalOpen.value || balanceModalOpen.value || profileModalOpen.value)

// 영업 조직 구조: "코드부여"(승격)는 총관리자는 누구에게나,
// 부관리자는 자기 코드로 가입한 직속 하부에게만 할 수 있다.
function isDirectChildOfMe(u: MemberRow) {
  if (!me.value) return false
  if (me.value.role === 'super_admin') return true
  if (me.value.role !== 'user') return u.referralCode.trim() === me.value.username
  return false
}

const roleDraft = reactive<Record<number, string>>({})
const grantingId = ref<number | null>(null)

// 역할 변경: 유저 및 권한 관리 화면과 동일하게, 드롭다운에서 바로 고르면 즉시 저장된다.
// 드롭다운에는 내가 실제로 부여할 수 있는(나보다 서열이 낮은) 역할만 나온다.
// 최고관리자(super_admin) 계정은 사고 방지를 위해 이 화면에서 역할을 바꿀 수 없다.
type RoleOption = { id: string; label: string }
const grantableRoles = ref<RoleOption[]>([])

function canEditRoleOf(u: MemberRow) {
  return isDirectChildOfMe(u) && u.roleId !== 'super_admin' && grantableRoles.value.length > 0
}

async function loadRoles() {
  try {
    const data = await $fetch<{ grantableRoles: RoleOption[] }>('/api/admin/roles')
    grantableRoles.value = data.grantableRoles || []
  } catch {
    grantableRoles.value = []
  }
}

async function onRoleSelectChange(u: MemberRow) {
  const roleId = roleDraft[u.id]
  const prevRoleId = u.roleId
  if (!roleId || roleId === prevRoleId) return
  const roleLabel =
    roleId === 'user' ? '회원' : roleId === 'super_admin' ? '최고관리자' : grantableRoles.value.find((r) => r.id === roleId)?.label || roleId
  if (process.client && !window.confirm(`${u.username} 님의 역할을 "${roleLabel}"(으)로 변경할까요?`)) {
    roleDraft[u.id] = prevRoleId
    return
  }
  grantingId.value = u.id
  try {
    await $fetch('/api/admin/users/update', {
      method: 'POST',
      body: { userId: u.id, role: roleId }
    })
    await load(true)
  } catch (e: any) {
    alert(e?.data?.statusMessage || '역할 변경에 실패했습니다.')
    roleDraft[u.id] = prevRoleId
  } finally {
    grantingId.value = null
  }
}

function syncRoleDraft(list: MemberRow[]) {
  for (const u of list) {
    roleDraft[u.id] = u.roleId
  }
}

const pageSize = computed(() => {
  const n = Number(pageSizeInput.value || 20)
  return Math.max(1, Math.min(500, Number.isFinite(n) ? Math.floor(n) : 20))
})

function dateOnly(v: string) {
  const s = String(v || '')
  return s ? s.slice(0, 10) : ''
}
function fmt2(v: number) {
  return Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function signedProfitText(v: number) {
  const n = Number(v || 0)
  return `${n >= 0 ? '+' : '-'}${fmt2(Math.abs(n))}`
}
function tradeResultLabel(t: Pick<MemberTradeRow, 'liquidation' | 'pnl'>) {
  if (Boolean(t?.liquidation)) return '강제청산'
  return Number(t?.pnl || 0) >= 0 ? '수익' : '손실'
}
function tradeResultBadgeClass(t: Pick<MemberTradeRow, 'liquidation' | 'pnl'>) {
  if (Boolean(t?.liquidation)) return 'bg-rose-500/15 text-rose-300 ring-rose-400/20'
  return Number(t?.pnl || 0) >= 0 ? 'bg-blue-500/15 text-blue-300 ring-blue-400/20' : 'bg-rose-500/15 text-rose-300 ring-rose-400/20'
}
function fmtPrice(v: number) {
  return Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
}
function formatDateTime(v: string) {
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(d)
}

type SortKey =
  | 'role'
  | 'username'
  | 'name'
  | 'referralCode'
  | 'topCode'
  | 'balanceUsdt'
  | 'cumulativeProfit'
  | 'created_at'
  | 'last_login'
  | 'online'
const sortKey = ref<SortKey | null>(null)
const sortDir = ref<'asc' | 'desc'>('asc')

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}
function sortArrow(key: SortKey) {
  if (sortKey.value !== key) return ''
  return sortDir.value === 'asc' ? ' ▲' : ' ▼'
}

const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  const rows = items.value.filter((u) => {
    if (roleFilter.value === 'user' && u.roleId !== 'user') return false
    if (roleFilter.value === 'super_admin' && u.roleId !== 'super_admin') return false
    if (roleFilter.value === 'admin' && (u.roleId === 'user' || u.roleId === 'super_admin')) return false
    if (onlineFilter.value) {
      const want = onlineFilter.value === '접속'
      if (u.online !== want) return false
    }
    if (fromDate.value) {
      const d = dateOnly(u.created_at)
      if (d < fromDate.value) return false
    }
    if (toDate.value) {
      const d = dateOnly(u.created_at)
      if (d > toDate.value) return false
    }
    if (!q) return true
    return [u.username, u.name, String(u.id)].some((v) => String(v).toLowerCase().includes(q))
  })

  if (!sortKey.value) return rows
  const key = sortKey.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    if (key === 'online') return (Number(a.online) - Number(b.online)) * dir
    const av = a[key]
    const bv = b[key]
    if (av === null || av === undefined) return bv === null || bv === undefined ? 0 : 1
    if (bv === null || bv === undefined) return -1
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
    return String(av).localeCompare(String(bv)) * dir
  })
})

const totalBalance = computed(() => items.value.reduce((sum, u) => sum + Number(u.balanceUsdt || 0), 0))

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})
const pageNumbers = computed(() => {
  const total = totalPages.value
  const start = Math.floor((page.value - 1) / 5) * 5 + 1
  const end = Math.min(total, start + 4)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})
const showPageTail = computed(() => {
  const nums = pageNumbers.value
  return nums.length > 0 && nums[nums.length - 1] < totalPages.value
})
const memberTradeTotalPages = computed(() => Math.max(1, Math.ceil(memberTrades.value.length / memberTradePageSize)))
const pagedMemberTrades = computed(() => {
  const start = (memberTradePage.value - 1) * memberTradePageSize
  return memberTrades.value.slice(start, start + memberTradePageSize)
})
const memberTradePageNumbers = computed(() => {
  const total = memberTradeTotalPages.value
  const start = Math.floor((memberTradePage.value - 1) / 5) * 5 + 1
  const end = Math.min(total, start + 4)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})
const showMemberTradeTail = computed(() => {
  const nums = memberTradePageNumbers.value
  return nums.length > 0 && nums[nums.length - 1] < memberTradeTotalPages.value
})

watch(filtered, () => {
  if (page.value > totalPages.value) page.value = totalPages.value
})

watch(pageSizeInput, (v) => {
  const next = Math.max(1, Math.min(500, Number.isFinite(Number(v)) ? Math.floor(Number(v)) : 20))
  if (next !== Number(v)) pageSizeInput.value = next
  if (page.value > totalPages.value) page.value = totalPages.value
})

watch(memberTrades, () => {
  if (memberTradePage.value > memberTradeTotalPages.value) memberTradePage.value = memberTradeTotalPages.value
})

async function load(silent = false) {
  if (loadingNow) return
  loadingNow = true
  if (!silent) loading.value = true
  try {
    const res = await $fetch<{ items: MemberRow[] }>('/api/admin/members')
    items.value = res.items || []
    syncRoleDraft(items.value)
    if (selectedMember.value) {
      const fresh = (res.items || []).find((u) => Number(u.id) === Number(selectedMember.value?.id))
      if (fresh) selectedMember.value = fresh
    }
    error.value = null
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '회원 목록을 불러오지 못했습니다.'
  } finally {
    loading.value = false
    loadingNow = false
  }
}

async function loadMemberTrades(silent = false) {
  if (!selectedMember.value) return
  if (!silent) tradeLoading.value = true
  try {
    const res = await $fetch<{ items: MemberTradeRow[] }>('/api/admin/trades', {
      query: { limit: 200, offset: 0, userId: selectedMember.value.id }
    })
    memberTrades.value = res.items || []
    memberTradePage.value = 1
    tradeError.value = null
  } catch (e: any) {
    tradeError.value = e?.data?.statusMessage || '거래 내역을 불러오지 못했습니다.'
  } finally {
    tradeLoading.value = false
  }
}

async function openTradeModal(member: MemberRow) {
  selectedMember.value = member
  tradeModalOpen.value = true
  memberTradePage.value = 1
  await loadMemberTrades()
}

function closeTradeModal() {
  tradeModalOpen.value = false
  memberTrades.value = []
  memberTradePage.value = 1
  tradeError.value = null
  if (!balanceModalOpen.value) selectedMember.value = null
}

function openBalanceModal(member: MemberRow) {
  selectedMember.value = member
  balanceDraft.value = Number(member.balanceUsdt || 0)
  balanceError.value = null
  balanceModalOpen.value = true
}

function openProfileModal(member: MemberRow) {
  selectedMember.value = member
  profileDraft.name = member.name || ''
  profileDraft.birthDate = member.birthDate || ''
  profileDraft.bankName = member.bankName || banks[0]
  profileDraft.bankAccount = member.bankAccount || ''
  profileDraft.accountHolder = member.accountHolder || ''
  profileDraft.referralCode = member.referralCode || ''
  profileError.value = null
  profileModalOpen.value = true
}

function closeProfileModal() {
  profileModalOpen.value = false
  profileError.value = null
  if (!tradeModalOpen.value && !balanceModalOpen.value) selectedMember.value = null
}

function closeBalanceModal() {
  balanceModalOpen.value = false
  balanceError.value = null
  balanceDraft.value = 0
  if (!tradeModalOpen.value) selectedMember.value = null
}

async function saveBalance() {
  if (!selectedMember.value) return
  const usdt = Number(balanceDraft.value)
  if (!Number.isFinite(usdt) || usdt < 0) {
    balanceError.value = '0 이상 금액만 입력할 수 있습니다.'
    return
  }
  balanceSaving.value = true
  try {
    await $fetch('/api/admin/users/update', {
      method: 'POST',
      body: { userId: selectedMember.value.id, usdt }
    })
    await load(true)
    closeBalanceModal()
  } catch (e: any) {
    balanceError.value = e?.data?.statusMessage || '보유금액 수정에 실패했습니다.'
  } finally {
    balanceSaving.value = false
  }
}

async function saveProfile() {
  if (!selectedMember.value) return
  profileSaving.value = true
  profileError.value = null
  try {
    await $fetch('/api/admin/users/update', {
      method: 'POST',
      body: {
        userId: selectedMember.value.id,
        name: profileDraft.name,
        birthDate: profileDraft.birthDate,
        bankName: profileDraft.bankName,
        bankAccount: profileDraft.bankAccount,
        accountHolder: profileDraft.accountHolder,
        ...(me?.role === 'super_admin' ? { referralCode: profileDraft.referralCode } : {})
      }
    })
    await load(true)
    closeProfileModal()
  } catch (e: any) {
    profileError.value = e?.data?.statusMessage || '회원정보 저장에 실패했습니다.'
  } finally {
    profileSaving.value = false
  }
}

onMounted(async () => {
  await loadRoles()
  await load()
  pollTimer = setInterval(() => {
    if (autoRefreshPaused.value) return
    load(true).catch(() => {})
  }, 1000)
})

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
})
</script>

<style scoped>
.sortable-th {
  color: rgb(203 213 225 / 0.9);
  transition: color 0.15s ease;
}
.sortable-th:hover {
  color: #fff;
}
.sortable-th .sort-icon {
  margin-left: 2px;
  font-size: 10px;
  color: rgb(148 163 184 / 0.6);
}
.sortable-th:hover .sort-icon {
  color: rgb(203 213 225 / 0.9);
}

.date-input {
  position: relative;
  min-width: 140px;
  padding-right: 24px;
  color-scheme: dark;
}

.date-input::-webkit-calendar-picker-indicator {
  margin-left: auto;
  cursor: pointer;
  opacity: 0.9;
}

.member-modal-enter-active,
.member-modal-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.member-modal-enter-from,
.member-modal-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}
</style>
