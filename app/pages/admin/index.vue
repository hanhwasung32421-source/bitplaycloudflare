<template>
  <div class="space-y-6">
    <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-semibold">관리자 대시보드</h1>
          <p class="mt-1 text-sm text-slate-400">{{ me?.username }} ({{ me?.role }})</p>
        </div>
        <NuxtLink
          v-if="me?.role === 'super_admin'"
          to="/admin/create-branch"
          class="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
        >
          계정생성
        </NuxtLink>
      </div>
    </div>

    <!-- 탭 -->
    <div class="flex flex-wrap gap-1 border-b border-white/10">
      <button
        v-for="t in tabs"
        :key="t.key"
        type="button"
        class="border-b-2 px-4 py-2 text-sm font-medium transition"
        :class="activeTab === t.key ? 'border-indigo-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'"
        @click="activeTab = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- 유저 관리 -->
    <div v-show="activeTab === 'users'" class="space-y-3">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold">유저 관리</h2>
          <p class="mt-1 text-sm text-slate-400">아이디/이름/USDT잔액/추천코드/역할/정산유형/정산비율을 수정하면 바로 반영됩니다.</p>
        </div>
        <div class="flex items-center gap-2">
          <div class="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100">
            총 유저수 <span class="font-mono text-base font-semibold">{{ sortedUsers.length }}</span>명
          </div>
          <button class="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15" @click="load">
            새로고침
          </button>
        </div>
      </div>

      <div class="grid gap-2 md:grid-cols-[360px_minmax(220px,1fr)_160px]">
        <div class="flex items-center gap-2 rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200">
          <input v-model="fromDate" type="date" class="date-input w-full bg-transparent outline-none" />
          <span class="text-slate-500">~</span>
          <input v-model="toDate" type="date" class="date-input w-full bg-transparent outline-none" />
        </div>
        <input
          v-model.trim="userSearch"
          placeholder="아이디/이름 검색"
          class="rounded-md border border-[#173753] bg-[#041425] px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-indigo-400/60"
        />
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

      <div v-if="referralFilter" class="flex items-center gap-2 text-sm text-slate-300">
        <span class="rounded-md bg-indigo-500/15 px-3 py-1.5 text-indigo-200 ring-1 ring-indigo-400/30">
          하부보기: "{{ referralFilter }}"의 전체 하부 조직
        </span>
        <button class="rounded-md bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15" @click="referralFilter = null">
          필터 해제
        </button>
      </div>

      <div>
        <div v-if="loading" class="text-sm text-slate-400">불러오는 중…</div>
        <div v-else>
          <table class="w-full text-sm">
            <thead class="border-b border-[#12314a] text-[11px] text-slate-500">
              <tr>
                <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left" @click="toggleSort('username')">아이디<span class="sort-icon">{{ sortArrow('username') || ' ⇅' }}</span></th>
                <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left" @click="toggleSort('name')">이름<span class="sort-icon">{{ sortArrow('name') || ' ⇅' }}</span></th>
                <th class="whitespace-nowrap px-3 py-3 text-left">계좌정보</th>
                <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left" @click="toggleSort('usdt')">USDT잔액<span class="sort-icon">{{ sortArrow('usdt') || ' ⇅' }}</span></th>
                <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left" @click="toggleSort('referralCode')">추천코드<span class="sort-icon">{{ sortArrow('referralCode') || ' ⇅' }}</span></th>
                <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left" @click="toggleSort('role')">역할<span class="sort-icon">{{ sortArrow('role') || ' ⇅' }}</span></th>
                <th class="whitespace-nowrap px-3 py-3 text-left">정산유형</th>
                <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left" @click="toggleSort('created_at')">가입일<span class="sort-icon">{{ sortArrow('created_at') || ' ⇅' }}</span></th>
                <th class="sortable-th cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left" @click="toggleSort('last_login')">최근 접속일<span class="sort-icon">{{ sortArrow('last_login') || ' ⇅' }}</span></th>
                <th class="whitespace-nowrap px-3 py-3 text-center">하부보기</th>
                <th class="whitespace-nowrap px-3 py-3 text-center">비밀번호</th>
                <th class="whitespace-nowrap px-3 py-3 text-center">로그인</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in pagedUsers" :key="u.id" class="border-b border-[#0d2438] hover:bg-white/[0.02]">
                <template v-if="userDraft[u.id]">
                  <td class="px-3 py-2.5">
                    <input
                      v-model.trim="userDraft[u.id].username"
                      :disabled="isLockedUser(u)"
                      class="w-28 rounded-md border border-[#173753] bg-[#041425] px-2.5 py-1.5 text-sm text-slate-200 outline-none transition focus:border-indigo-400/60 disabled:cursor-not-allowed disabled:opacity-50"
                      @blur="saveUserRow(u.id)"
                      @keyup.enter="saveUserRow(u.id)"
                    />
                  </td>
                  <td class="px-3 py-2.5">
                    <input
                      v-model.trim="userDraft[u.id].name"
                      :disabled="isLockedUser(u)"
                      class="w-24 rounded-md border border-[#173753] bg-[#041425] px-2.5 py-1.5 text-sm text-slate-200 outline-none transition focus:border-indigo-400/60 disabled:cursor-not-allowed disabled:opacity-50"
                      @blur="saveUserRow(u.id)"
                      @keyup.enter="saveUserRow(u.id)"
                    />
                  </td>
                  <td class="px-3 py-2.5">
                    <button
                      class="whitespace-nowrap rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                      :disabled="isLockedUser(u)"
                      @click="openAccountModal(u)"
                    >
                      계좌정보
                    </button>
                  </td>
                  <td class="px-3 py-2.5">
                    <input
                      v-model.number="userDraft[u.id].usdt"
                      type="number"
                      min="0"
                      step="0.01"
                      class="w-28 rounded-md border border-[#173753] bg-[#041425] px-2.5 py-1.5 text-sm text-slate-200 outline-none transition focus:border-indigo-400/60 disabled:cursor-not-allowed disabled:opacity-50"
                      @blur="saveUserRow(u.id)"
                      @keyup.enter="saveUserRow(u.id)"
                    />
                  </td>
                  <td class="px-3 py-2.5">
                    <input
                      v-model.trim="userDraft[u.id].referralCode"
                      :disabled="isLockedUser(u)"
                      class="w-28 rounded-md border border-[#173753] bg-[#041425] px-2.5 py-1.5 text-sm text-slate-200 outline-none transition focus:border-indigo-400/60 disabled:cursor-not-allowed disabled:opacity-50"
                      @blur="saveUserRow(u.id)"
                      @keyup.enter="saveUserRow(u.id)"
                    />
                  </td>
                  <td class="px-3 py-2.5">
                    <select
                      v-model="userDraft[u.id].role"
                      :disabled="isLockedUser(u)"
                      class="w-40 rounded-md border border-[#173753] bg-[#041425] px-2.5 py-1.5 text-sm text-slate-200 outline-none transition focus:border-indigo-400/60 disabled:cursor-not-allowed disabled:opacity-50"
                      @change="saveUserRow(u.id)"
                    >
                      <option value="user">회원 (user)</option>
                      <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.label }} ({{ r.id }})</option>
                      <option value="super_admin">최고관리자 (super_admin)</option>
                    </select>
                  </td>
                  <td class="px-3 py-2.5">
                    <div v-if="u.role !== 'user' && u.role !== 'super_admin'" class="flex items-center gap-1.5">
                      <select
                        v-model="userDraft[u.id].settlementType"
                        class="w-28 rounded-md border border-[#173753] bg-[#041425] px-2.5 py-1.5 text-sm text-slate-200 outline-none transition focus:border-indigo-400/60"
                        @change="saveUserRow(u.id)"
                      >
                        <option value="loss">손실정산</option>
                        <option value="referral">레퍼럴정산</option>
                      </select>
                      <input
                        v-model="userDraft[u.id].settlementPercent"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="기본값"
                        title="이 부관리자 전용 정산비율(%). 비워두면 정산/기타 설정의 기본값을 사용합니다."
                        class="w-16 rounded-md border border-[#173753] bg-[#041425] px-2 py-1.5 text-sm text-slate-200 outline-none transition focus:border-indigo-400/60"
                        @blur="saveUserRow(u.id)"
                        @keyup.enter="saveUserRow(u.id)"
                      />
                      <span class="text-xs text-slate-500">%</span>
                    </div>
                    <span v-else class="text-xs text-slate-600">—</span>
                  </td>
                  <td class="whitespace-nowrap px-3 py-2.5 font-mono text-slate-300">{{ dateOnly(u.created_at) }}</td>
                  <td class="whitespace-nowrap px-3 py-2.5 font-mono text-slate-300">{{ u.last_login ? dateOnly(u.last_login) : '—' }}</td>
                  <td class="px-3 py-2.5 text-center">
                    <button
                      class="whitespace-nowrap rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
                      @click="referralFilter = u.username"
                    >
                      하부보기
                    </button>
                  </td>
                  <td class="px-3 py-2.5 text-center">
                    <button
                      class="whitespace-nowrap rounded-md bg-amber-500/15 px-3 py-1.5 text-sm text-amber-200 ring-1 ring-amber-400/30 hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                      :disabled="userResetting === u.id || isLockedUser(u)"
                      @click="resetUserPassword(u.id)"
                    >
                      초기화
                    </button>
                  </td>
                  <td class="px-3 py-2.5 text-center">
                    <button
                      class="whitespace-nowrap rounded-md bg-emerald-500/15 px-3 py-1.5 text-sm text-emerald-200 ring-1 ring-emerald-400/30 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                      :disabled="loggingInAs === u.id"
                      @click="loginAsUser(u.id)"
                    >
                      로그인
                    </button>
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-4 flex items-center justify-between gap-3">
          <div class="text-sm text-slate-400">페이지 {{ page }} / {{ totalPages }} · 총 {{ sortedUsers.length }}명</div>
          <div class="flex items-center justify-center gap-2" v-if="totalPages > 1">
            <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page <= 1" @click="page = 1">«</button>
            <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page <= 1" @click="page--">‹</button>
            <button
              v-for="p in userPageNumbers"
              :key="`user-page-${p}`"
              class="min-w-9 rounded px-3 py-1.5 text-center text-sm"
              :class="p === page ? 'bg-white/10 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'"
              @click="page = p"
            >
              {{ p }}
            </button>
            <span v-if="showUserPageTail" class="px-1 text-sm text-slate-500">~</span>
            <button
              v-if="showUserPageTail"
              class="min-w-9 rounded bg-white/5 px-3 py-1.5 text-center text-sm text-slate-300 hover:bg-white/10"
              @click="page = totalPages"
            >
              {{ totalPages }}
            </button>
            <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page >= totalPages" @click="page++">›</button>
            <button class="rounded bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30" :disabled="page >= totalPages" @click="page = totalPages">»</button>
          </div>
        </div>

        <p v-if="error" class="mt-3 text-sm text-red-300">{{ error }}</p>
        <p v-if="msg" class="mt-3 text-sm text-emerald-300">{{ msg }}</p>
      </div>
    </div>

    <!-- 계좌정보 팝업 -->
    <div
      v-if="accountModalOpen"
      class="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4"
      @click.self="closeAccountModal"
    >
      <div class="w-full max-w-sm rounded-2xl border border-white/10 bg-[#10171d] p-6 shadow-2xl">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-slate-100">{{ accountModalTarget?.username }} 계좌정보</h3>
          <button type="button" class="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white" @click="closeAccountModal">✕</button>
        </div>
        <div class="mt-4 space-y-3">
          <div>
            <label class="text-sm text-slate-300">은행명</label>
            <select v-model="accountDraft.bankName" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-white/10 focus:ring-indigo-500">
              <option v-for="bank in banks" :key="bank" :value="bank">{{ bank }}</option>
            </select>
          </div>
          <div>
            <label class="text-sm text-slate-300">계좌번호</label>
            <input v-model.trim="accountDraft.bankAccount" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500" />
          </div>
          <div>
            <label class="text-sm text-slate-300">예금주</label>
            <input v-model.trim="accountDraft.accountHolder" class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500" />
          </div>
        </div>
        <p v-if="accountModalError" class="mt-3 text-sm text-red-300">{{ accountModalError }}</p>
        <div class="mt-5 grid grid-cols-2 gap-3">
          <button class="rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10" @click="closeAccountModal">
            취소
          </button>
          <button
            class="rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
            :disabled="accountModalSaving"
            @click="saveAccountModal"
          >
            저장
          </button>
        </div>
      </div>
    </div>

    <!-- 강제청산 기준(%) 설정 -->
    <div v-show="activeTab === 'liquidation'" class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 class="text-lg font-semibold">강제청산 기준 설정</h2>
      <p class="mt-1 text-sm text-slate-400">
        손실률(ROE)이 이 값 이하로 떨어지면 모든 유저의 포지션이 실시간으로 자동 강제청산됩니다.
      </p>
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-2">
          <input
            v-model.number="liquidationPercentDraft"
            type="number"
            min="1"
            max="99"
            step="1"
            class="w-24 rounded-md bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
          <span class="text-sm text-slate-400">% 손실 시 강제청산</span>
        </div>
        <button
          class="rounded-md bg-indigo-500 px-4 py-2 text-sm hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="liquidationSettingSaving"
          @click="saveLiquidationSetting"
        >
          저장
        </button>
        <span class="text-sm text-slate-400">현재 적용값: -{{ liquidationPercent }}%</span>
      </div>
      <p v-if="liquidationSettingError" class="mt-3 text-sm text-red-300">{{ liquidationSettingError }}</p>
      <p v-if="liquidationSettingMsg" class="mt-3 text-sm text-emerald-300">{{ liquidationSettingMsg }}</p>
    </div>

    <!-- 정산/기타 설정 -->
    <div v-show="activeTab === 'misc'" class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 class="text-lg font-semibold">정산/기타 설정</h2>
      <p class="mt-1 text-sm text-slate-400">고객센터 텔레그램 링크, 원/USDT 환율, 정산 비율을 설정합니다.</p>
      <div class="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label class="text-sm text-slate-300">고객센터 텔레그램 링크</label>
          <input
            v-model.trim="miscDraft.telegramUrl"
            placeholder="https://t.me/..."
            class="mt-1 w-full rounded-md bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label class="text-sm text-slate-300">원/USDT 환율 (0 = 매일 09시 자동 환율 사용)</label>
          <input
            v-model.number="miscDraft.krwPerUsdt"
            type="number"
            min="0"
            step="0.01"
            class="mt-1 w-full rounded-md bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
          <p class="mt-1 text-xs text-slate-500">
            현재 자동 환율(매일 오전 9시 빗썸 기준 고정): <span class="font-mono text-slate-300">{{ dailyKrwRate ? `${fmt0(dailyKrwRate)}원` : '아직 없음' }}</span>
            <span v-if="dailyKrwRateDay"> ({{ dailyKrwRateDay }} 갱신)</span>
          </p>
        </div>
        <div>
          <label class="text-sm text-slate-300">손실정산 기본 비율 (%)</label>
          <input
            v-model.number="miscDraft.lossSettlementPercent"
            type="number"
            min="0"
            max="100"
            step="0.1"
            class="mt-1 w-full rounded-md bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
          <p class="mt-1 text-xs text-slate-500">부관리자별 개별 비율을 지정하지 않았을 때 사용되는 기본값입니다.</p>
        </div>
        <div>
          <label class="text-sm text-slate-300">레퍼럴정산 기본 비율 (%)</label>
          <input
            v-model.number="miscDraft.referralSettlementPercent"
            type="number"
            min="0"
            max="100"
            step="0.1"
            class="mt-1 w-full rounded-md bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
          <p class="mt-1 text-xs text-slate-500">부관리자별 개별 비율을 지정하지 않았을 때 사용되는 기본값입니다.</p>
        </div>
      </div>

      <div class="mt-6 border-t border-white/10 pt-5">
        <h3 class="text-sm font-semibold text-slate-200">관리자 메뉴 순서</h3>
        <p class="mt-1 text-xs text-slate-400">상단 관리자 메뉴가 보이는 순서를 바꿉니다. 화살표로 위/아래로 옮기세요.</p>
        <div class="mt-3 space-y-1.5">
          <div
            v-for="(key, idx) in miscDraft.menuOrder"
            :key="key"
            class="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2"
          >
            <span class="text-sm text-slate-200">{{ menuMeta[key]?.label || key }}</span>
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30"
                :disabled="idx === 0"
                @click="moveMenuOrder(idx, -1)"
              >
                ▲
              </button>
              <button
                type="button"
                class="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30"
                :disabled="idx === miscDraft.menuOrder.length - 1"
                @click="moveMenuOrder(idx, 1)"
              >
                ▼
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-4 flex items-center gap-3">
        <button
          class="rounded-md bg-indigo-500 px-4 py-2 text-sm hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="miscSaving"
          @click="saveMiscSettings"
        >
          저장
        </button>
        <p v-if="miscError" class="text-sm text-red-300">{{ miscError }}</p>
        <p v-if="miscMsg" class="text-sm text-emerald-300">{{ miscMsg }}</p>
      </div>
    </div>

    <!-- 메뉴구성 -->
    <div v-show="activeTab === 'nav'" class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 class="text-lg font-semibold">메뉴구성</h2>
      <p class="mt-1 text-sm text-slate-400">
        비회원을 포함해 누구나 보는 최상단 메인 메뉴의 순서를 바꾸거나, 특정 메뉴를 화면에서 숨길 수 있습니다.
      </p>

      <div class="mt-4 space-y-2">
        <div
          v-for="(key, idx) in mainNavDraft.order"
          :key="key"
          class="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3"
        >
          <div class="flex items-center gap-3">
            <div class="flex flex-col">
              <button
                type="button"
                class="rounded bg-white/10 px-1.5 text-[10px] leading-4 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30"
                :disabled="idx === 0"
                @click="moveMainNavOrder(idx, -1)"
              >
                ▲
              </button>
              <button
                type="button"
                class="rounded bg-white/10 px-1.5 text-[10px] leading-4 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30"
                :disabled="idx === mainNavDraft.order.length - 1"
                @click="moveMainNavOrder(idx, 1)"
              >
                ▼
              </button>
            </div>
            <span class="text-sm font-semibold text-slate-100" :class="{ 'text-slate-500 line-through': mainNavDraft.hidden.includes(key) }">
              {{ MAIN_NAV_LABELS[key] }}
            </span>
          </div>
          <label class="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" :checked="!mainNavDraft.hidden.includes(key)" @change="toggleMainNavHidden(key)" />
            화면에 표시
          </label>
        </div>
      </div>

      <div class="mt-4 flex items-center gap-3">
        <button
          class="rounded-md bg-indigo-500 px-4 py-2 text-sm hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="mainNavSaving"
          @click="saveMainNavSettings"
        >
          저장
        </button>
        <p v-if="mainNavError" class="text-sm text-red-300">{{ mainNavError }}</p>
        <p v-if="mainNavMsg" class="text-sm text-emerald-300">{{ mainNavMsg }}</p>
      </div>
    </div>

    <!-- 역할 관리 -->
    <div v-show="activeTab === 'roles'" class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div class="flex items-end justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold">역할 관리</h2>
          <p class="mt-1 text-sm text-slate-400">
            관리자 역할을 추가/삭제하고, 역할마다 관리자 메뉴 권한을 설정합니다. 화살표는 화면에 보이는 순서만 바꾸고,
            실제 권한 서열은 "등급" 숫자로 정해집니다(숫자가 작을수록 상위). 등급이 같은 역할끼리는 서로 역할을 부여할 수 없고,
            자기보다 등급 숫자가 더 큰(아래) 역할만 코드부여할 수 있습니다. 여러 역할에 같은 등급을 입력하면 서로 동급으로 묶입니다.
            총관리자는 항상 최상위입니다.
          </p>
        </div>
        <button class="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15" @click="loadRoles">
          새로고침
        </button>
      </div>

      <div class="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-white/10 bg-white/5 p-4">
        <div>
          <label class="text-xs text-slate-400">역할 ID (영문 소문자, 예: team_lead)</label>
          <input
            v-model.trim="newRoleId"
            placeholder="team_lead"
            class="mt-1 w-40 rounded-md bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label class="text-xs text-slate-400">역할 이름</label>
          <input
            v-model.trim="newRoleLabel"
            placeholder="팀장"
            class="mt-1 w-32 rounded-md bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
        </div>
        <button
          class="rounded-md bg-indigo-500 px-4 py-2 text-sm hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="creatingRole"
          @click="createRoleClick"
        >
          역할 추가
        </button>
        <p v-if="newRoleError" class="w-full text-sm text-red-300">{{ newRoleError }}</p>
      </div>

      <div class="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
        <div v-if="rolesLoading" class="text-sm text-slate-400">불러오는 중…</div>
        <div v-else-if="roles.length === 0" class="text-sm text-slate-400">등록된 역할이 없습니다.</div>
        <div v-else class="space-y-2">
          <div v-for="(r, idx) in roles" :key="r.id" class="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
            <div class="flex items-center gap-3">
              <span class="w-6 text-center font-mono text-xs text-slate-500">{{ idx + 1 }}</span>
              <div class="flex flex-col">
                <button
                  type="button"
                  class="rounded bg-white/10 px-1.5 text-[10px] leading-4 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30"
                  :disabled="idx === 0 || reorderingRoles"
                  @click="moveRoleRank(idx, -1)"
                >
                  ▲
                </button>
                <button
                  type="button"
                  class="rounded bg-white/10 px-1.5 text-[10px] leading-4 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30"
                  :disabled="idx === roles.length - 1 || reorderingRoles"
                  @click="moveRoleRank(idx, 1)"
                >
                  ▼
                </button>
              </div>
              <div>
                <span class="text-sm font-semibold text-slate-100">{{ r.label }}</span>
                <span class="ml-2 font-mono text-xs text-slate-500">{{ r.id }}</span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <div class="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
                <span class="text-xs text-slate-400">등급</span>
                <input
                  v-model="tierDraft[r.id]"
                  type="number"
                  step="1"
                  :disabled="savingTierId === r.id"
                  class="w-14 bg-transparent text-right text-sm text-slate-100 outline-none disabled:opacity-50"
                  @blur="saveRoleTier(r)"
                  @keyup.enter="saveRoleTier(r)"
                />
              </div>
              <button class="rounded-md bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15" @click="openRoleModal(r)">
                메뉴 권한 설정
              </button>
              <button
                class="rounded-md bg-rose-500/15 px-3 py-1.5 text-xs text-rose-200 ring-1 ring-rose-400/20 hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                :disabled="deletingRoleId === r.id"
                @click="deleteRoleClick(r)"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
        <p v-if="rolesError" class="mt-3 text-sm text-red-300">{{ rolesError }}</p>
      </div>
    </div>

    <!-- 킬UP/킬DOWN 이력 -->
    <div v-show="activeTab === 'killEvents'" class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold">킬UP/킬DOWN 이력</h2>
          <p class="mt-1 text-sm text-slate-400">
            삭제하면 모든 유저의 차트에서도 해당 봉의 고가/저가(꼬리)가 사라집니다(잠시 후 자동 반영).
          </p>
        </div>
        <button class="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15" @click="loadKillEvents">
          새로고침
        </button>
      </div>

      <div class="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
        <div v-if="killEventsLoading" class="text-sm text-slate-400">불러오는 중…</div>
        <div v-else-if="killEvents.length === 0" class="text-sm text-slate-400">킬 이력이 없습니다.</div>
        <div v-else class="overflow-auto">
          <table class="w-full text-sm">
            <thead class="text-left text-slate-400">
              <tr>
                <th class="py-2">시각</th>
                <th class="py-2">심볼</th>
                <th class="py-2">방향</th>
                <th class="py-2">퍼센트</th>
                <th class="py-2">기준가 → 도달가</th>
                <th class="py-2"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="k in killEvents" :key="k.id" class="border-t border-white/10">
                <td class="py-2 font-mono text-xs">{{ formatKillTime(k.createdAt) }}</td>
                <td class="py-2 font-mono">{{ k.symbol }}</td>
                <td class="py-2" :class="k.direction === 'up' ? 'text-emerald-300' : 'text-rose-300'">
                  {{ k.direction === 'up' ? '킬UP' : '킬DOWN' }}
                </td>
                <td class="py-2 font-mono">{{ k.percent }}%</td>
                <td class="py-2 font-mono">{{ k.basePrice }} → {{ k.shockedPrice }}</td>
                <td class="py-2">
                  <button
                    class="rounded-md bg-rose-500/15 px-3 py-1 text-xs text-rose-200 ring-1 ring-rose-500/20 hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="killEventDeleting === k.id"
                    @click="deleteKillEvent(k.id)"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="killEventsError" class="mt-3 text-sm text-red-300">{{ killEventsError }}</p>
      </div>
    </div>

    <!-- 수익/손실 이력 -->
    <div v-show="activeTab === 'profitEvents'" class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold">수익/손실 이력</h2>
          <p class="mt-1 text-sm text-slate-400">
            삭제하면 모든 유저의 차트에서도 해당 봉의 고가/저가(꼬리)가 사라집니다(잠시 후 자동 반영).
          </p>
        </div>
        <button class="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15" @click="loadProfitEvents">
          새로고침
        </button>
      </div>

      <div class="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
        <div v-if="profitEventsLoading" class="text-sm text-slate-400">불러오는 중…</div>
        <div v-else-if="profitEvents.length === 0" class="text-sm text-slate-400">수익/손실 이력이 없습니다.</div>
        <div v-else class="overflow-auto">
          <table class="w-full text-sm">
            <thead class="text-left text-slate-400">
              <tr>
                <th class="py-2">시각</th>
                <th class="py-2">심볼</th>
                <th class="py-2">방향</th>
                <th class="py-2">퍼센트</th>
                <th class="py-2">기준가 → 도달가</th>
                <th class="py-2">유지시간</th>
                <th class="py-2"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in profitEvents" :key="p.id" class="border-t border-white/10">
                <td class="py-2 font-mono text-xs">{{ formatKillTime(p.createdAt) }}</td>
                <td class="py-2 font-mono">{{ p.symbol }}</td>
                <td class="py-2" :class="p.direction === 'up' ? 'text-emerald-300' : 'text-rose-300'">
                  {{ p.direction === 'up' ? '수익' : '손실' }}
                </td>
                <td class="py-2 font-mono">{{ p.percent }}%</td>
                <td class="py-2 font-mono">{{ p.basePrice }} → {{ p.shockedPrice }}</td>
                <td class="py-2 font-mono">{{ (p.holdMs / 1000).toFixed(1) }}초</td>
                <td class="py-2">
                  <button
                    class="rounded-md bg-rose-500/15 px-3 py-1 text-xs text-rose-200 ring-1 ring-rose-500/20 hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="profitEventDeleting === p.id"
                    @click="deleteProfitEvent(p.id)"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="profitEventsError" class="mt-3 text-sm text-red-300">{{ profitEventsError }}</p>
      </div>
    </div>

    <!-- 역할 메뉴 권한 설정 팝업 -->
    <div
      v-if="roleModalOpen"
      class="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4"
      @click.self="closeRoleModal"
    >
      <div class="w-full max-w-md rounded-2xl border border-white/10 bg-[#10171d] p-6 shadow-2xl">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-slate-100">{{ roleModalTarget?.label }} 메뉴 권한</h3>
          <button type="button" class="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white" @click="closeRoleModal">✕</button>
        </div>
        <div class="mt-3">
          <label class="text-xs text-slate-400">역할 이름</label>
          <input
            v-model.trim="roleLabelDraft"
            class="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
        </div>
        <div class="mt-4 space-y-3">
          <div v-for="key in menuKeys" :key="key" class="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <div class="flex items-center justify-between">
              <span class="text-sm text-slate-200">{{ menuMeta[key].label }}</span>
              <label class="flex items-center gap-1.5 text-xs text-slate-300">
                <input v-model="roleMenuDraft[key].view" type="checkbox" class="h-4 w-4 accent-indigo-500" />
                보임
              </label>
            </div>
            <label v-if="menuMeta[key].editable" class="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
              <input v-model="roleMenuDraft[key].edit" type="checkbox" class="h-4 w-4 accent-indigo-500" :disabled="!roleMenuDraft[key].view" />
              {{ menuMeta[key].editLabel }} 허용
            </label>
          </div>
        </div>
        <p v-if="roleModalError" class="mt-3 text-sm text-red-300">{{ roleModalError }}</p>
        <div class="mt-5 grid grid-cols-2 gap-3">
          <button class="rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10" @click="closeRoleModal">
            취소
          </button>
          <button
            class="rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
            :disabled="roleModalSaving"
            @click="saveRoleModal"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['admin', 'super-admin'] })
const { me, refresh } = useMe()
await refresh()

type TabKey = 'users' | 'liquidation' | 'misc' | 'nav' | 'roles' | 'killEvents' | 'profitEvents'
const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'users', label: '유저 관리' },
  { key: 'liquidation', label: '강제청산 기준 설정' },
  { key: 'misc', label: '정산/기타 설정' },
  { key: 'nav', label: '메뉴구성' },
  { key: 'roles', label: '역할 관리' },
  { key: 'killEvents', label: '킬UP/킬DOWN 이력' },
  { key: 'profitEvents', label: '수익/손실 이력' }
]
const activeTab = ref<TabKey>('users')

type AdminUserRow = {
  id: number
  username: string
  name: string
  referralCode: string
  bankName: string
  bankAccount: string
  accountHolder: string
  role: string
  usdt: number
  created_at: string
  online: boolean
  last_login: string | null
  settlementType: 'loss' | 'referral'
  settlementPercent: number | null
}
type UserDraft = {
  username: string
  name: string
  usdt: number
  referralCode: string
  role: string
  settlementType: 'loss' | 'referral'
  settlementPercent: string
}

const users = ref<AdminUserRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const msg = ref<string | null>(null)
const userDraft = reactive<Record<number, UserDraft>>({})
const userSaving = ref<number | null>(null)
const userResetting = ref<number | null>(null)
const loggingInAs = ref<number | null>(null)
const userSearch = ref('')
const fromDate = ref('')
const toDate = ref('')
function dateOnly(v: string) {
  const s = String(v || '')
  return s ? s.slice(0, 10) : ''
}
const referralFilter = ref<string | null>(null)
const sortKey = ref<'username' | 'name' | 'usdt' | 'referralCode' | 'role' | 'created_at' | 'last_login'>('username')
const sortDir = ref<'asc' | 'desc'>('asc')
const page = ref(1)
const pageSizeInput = ref(20)
const pageSize = computed(() => {
  const n = Number(pageSizeInput.value || 20)
  return Math.max(1, Math.min(500, Number.isFinite(n) ? Math.floor(n) : 20))
})

const banks = [
  '국민은행', '신한은행', '우리은행', '하나은행', '농협은행', '기업은행', '카카오뱅크', '토스뱅크', '케이뱅크', '새마을금고',
  '수협은행', 'SC제일은행', '씨티은행', '부산은행', '대구은행', '경남은행', '광주은행', '전북은행', '제주은행', '우체국'
]

// 최고관리자(super_admin) 계정은 실수 방지를 위해 이 화면에서 수정할 수 없다(승격은 계속 허용).
function isLockedUser(u: AdminUserRow) {
  return u.role === 'super_admin'
}

function toggleSort(key: typeof sortKey.value) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}
function sortArrow(key: typeof sortKey.value) {
  if (sortKey.value !== key) return ''
  return sortDir.value === 'asc' ? ' ▲' : ' ▼'
}

// 영업 조직처럼 몇 단계든(총판 > 팀장 > 팀원 > ...) 하부보기가 전체 하부 조직을 보여주도록,
// 직속 추천코드만 비교하지 않고 추천 관계 그래프를 끝까지 따라간다.
function downlineUsernamesOf(root: string) {
  const childrenMap = new Map<string, string[]>()
  for (const u of users.value) {
    const parent = (u.referralCode || '').trim()
    if (!parent) continue
    if (!childrenMap.has(parent)) childrenMap.set(parent, [])
    childrenMap.get(parent)!.push(u.username)
  }
  const result = new Set<string>()
  let frontier = [root]
  let depth = 0
  while (frontier.length && depth < 50) {
    const next: string[] = []
    for (const parent of frontier) {
      for (const child of childrenMap.get(parent) || []) {
        if (result.has(child) || child === root) continue
        result.add(child)
        next.push(child)
      }
    }
    frontier = next
    depth++
  }
  return result
}

const sortedUsers = computed(() => {
  const q = userSearch.value.trim().toLowerCase()
  let filtered = q
    ? users.value.filter((u) => [u.username, u.name, String(u.id)].some((v) => String(v || '').toLowerCase().includes(q)))
    : users.value.slice()
  if (referralFilter.value) {
    const downline = downlineUsernamesOf(referralFilter.value)
    filtered = filtered.filter((u) => downline.has(u.username))
  }
  if (fromDate.value) filtered = filtered.filter((u) => dateOnly(u.created_at) >= fromDate.value)
  if (toDate.value) filtered = filtered.filter((u) => dateOnly(u.created_at) <= toDate.value)
  const dir = sortDir.value === 'asc' ? 1 : -1
  return filtered.sort((a, b) => {
    const key = sortKey.value
    const av = a[key]
    const bv = b[key]
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
    return String(av ?? '').localeCompare(String(bv ?? '')) * dir
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(sortedUsers.value.length / pageSize.value)))
const pagedUsers = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return sortedUsers.value.slice(start, start + pageSize.value)
})
const userPageNumbers = computed(() => {
  const total = totalPages.value
  const start = Math.floor((page.value - 1) / 5) * 5 + 1
  const end = Math.min(total, start + 4)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})
const showUserPageTail = computed(() => {
  const nums = userPageNumbers.value
  return nums.length > 0 && nums[nums.length - 1] < totalPages.value
})

watch(sortedUsers, () => {
  if (page.value > totalPages.value) page.value = totalPages.value
})

watch(pageSizeInput, (v) => {
  const next = Math.max(1, Math.min(500, Number.isFinite(Number(v)) ? Math.floor(Number(v)) : 20))
  if (next !== Number(v)) pageSizeInput.value = next
  if (page.value > totalPages.value) page.value = totalPages.value
})

async function saveUserRow(userId: number) {
  const draft = userDraft[userId]
  if (!draft) return
  const row = users.value.find((u) => u.id === userId)
  userSaving.value = userId
  error.value = null
  msg.value = null
  try {
    await $fetch('/api/admin/users/update', {
      method: 'POST',
      // 최고관리자(super_admin) 계정은 잔액 외 수정이 서버에서 막혀 있으므로, 다른 칸이 화면에
      // 그대로 있어도 요청에는 절대 같이 실어 보내지 않는다(그래야 잔액만 저장이 가능하다).
      body: row && isLockedUser(row)
        ? { userId, usdt: Number(draft.usdt) || 0 }
        : {
            userId,
            username: draft.username,
            name: draft.name,
            usdt: Number(draft.usdt) || 0,
            referralCode: draft.referralCode,
            role: draft.role,
            ...(draft.role !== 'user' && draft.role !== 'super_admin'
              ? {
                  settlementType: draft.settlementType,
                  settlementPercent: String(draft.settlementPercent ?? '').trim() === '' ? null : Number(draft.settlementPercent)
                }
              : {})
          }
    })
    await load()
    msg.value = '저장되었습니다.'
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '저장 실패'
  } finally {
    userSaving.value = null
  }
}

async function resetUserPassword(userId: number) {
  if (process.client && !window.confirm('이 유저의 비밀번호를 아이디와 동일하게 초기화할까요?')) return
  userResetting.value = userId
  error.value = null
  msg.value = null
  try {
    await $fetch('/api/admin/users/reset-password', { method: 'POST', body: { userId } })
    msg.value = '비밀번호가 아이디와 동일하게 초기화되었습니다.'
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '초기화 실패'
  } finally {
    userResetting.value = null
  }
}

async function loginAsUser(userId: number) {
  if (process.client && !window.confirm('이 유저 계정으로 새 창에서 로그인할까요? (관리자 세션은 이 창에 그대로 유지됩니다)')) return
  // 팝업 차단을 피하려면 window.open은 클릭 핸들러 안에서 await 전에(동기적으로) 호출해야 한다.
  const win = process.client ? window.open('about:blank', '_blank') : null
  loggingInAs.value = userId
  error.value = null
  try {
    const res = await $fetch<{ ok: true; username: string; token: string }>('/api/admin/users/login-as', {
      method: 'POST',
      body: { userId }
    })
    if (win) {
      if (res?.token) {
        win.location.href = `/impersonate?token=${encodeURIComponent(res.token)}`
      } else {
        win.close()
      }
    }
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '로그인 실패'
    win?.close()
  } finally {
    loggingInAs.value = null
  }
}

// 계좌정보 팝업
const accountModalOpen = ref(false)
const accountModalTarget = ref<AdminUserRow | null>(null)
const accountDraft = reactive({ bankName: banks[0], bankAccount: '', accountHolder: '' })
const accountModalSaving = ref(false)
const accountModalError = ref<string | null>(null)

function openAccountModal(u: AdminUserRow) {
  accountModalTarget.value = u
  accountDraft.bankName = u.bankName || banks[0]
  accountDraft.bankAccount = u.bankAccount || ''
  accountDraft.accountHolder = u.accountHolder || ''
  accountModalError.value = null
  accountModalOpen.value = true
}

function closeAccountModal() {
  accountModalOpen.value = false
  accountModalTarget.value = null
}

async function saveAccountModal() {
  if (!accountModalTarget.value) return
  accountModalSaving.value = true
  accountModalError.value = null
  try {
    await $fetch('/api/admin/users/update', {
      method: 'POST',
      body: {
        userId: accountModalTarget.value.id,
        bankName: accountDraft.bankName,
        bankAccount: accountDraft.bankAccount,
        accountHolder: accountDraft.accountHolder
      }
    })
    await load()
    closeAccountModal()
  } catch (e: any) {
    accountModalError.value = e?.data?.statusMessage || '저장 실패'
  } finally {
    accountModalSaving.value = false
  }
}

// 역할 관리(역할별 관리자 메뉴 권한)
type MenuKey = 'members' | 'online' | 'trades' | 'transfers' | 'positions' | 'messages' | 'settlement' | 'deposits'
const menuKeys: MenuKey[] = ['members', 'online', 'trades', 'transfers', 'positions', 'messages', 'settlement', 'deposits']
const menuMeta: Record<MenuKey, { label: string; editable: boolean; editLabel?: string }> = {
  members: { label: '회원 목록', editable: true, editLabel: '보유금액 수정' },
  online: { label: '실시간 접속', editable: false },
  trades: { label: '거래 내역', editable: false },
  transfers: { label: '입출금 내역', editable: false },
  positions: { label: '포지션 목록', editable: true, editLabel: '포지션 수정' },
  messages: { label: '쪽지관리', editable: false },
  settlement: { label: '정산내역', editable: false },
  deposits: { label: '입출금 내역', editable: true, editLabel: '입금/출금 승인/거절' }
}
type RoleRow = { id: string; label: string; menus: Record<MenuKey, { view: boolean; edit: boolean }>; tier: number; createdAt: string }
const roles = ref<RoleRow[]>([])
const tierDraft = reactive<Record<string, string>>({})
const savingTierId = ref<string | null>(null)
const rolesLoading = ref(false)
const rolesError = ref<string | null>(null)
const newRoleId = ref('')
const newRoleLabel = ref('')
const creatingRole = ref(false)
const newRoleError = ref<string | null>(null)
const deletingRoleId = ref<string | null>(null)

const roleModalOpen = ref(false)
const roleModalTarget = ref<RoleRow | null>(null)
const roleLabelDraft = ref('')
const roleMenuDraft = reactive<Record<MenuKey, { view: boolean; edit: boolean }>>({
  members: { view: true, edit: false },
  online: { view: true, edit: false },
  trades: { view: true, edit: false },
  transfers: { view: true, edit: false },
  positions: { view: true, edit: false },
  messages: { view: true, edit: false },
  settlement: { view: true, edit: false },
  deposits: { view: true, edit: false }
})
const roleModalSaving = ref(false)
const roleModalError = ref<string | null>(null)

async function loadRoles() {
  rolesLoading.value = true
  rolesError.value = null
  try {
    const data = await $fetch<{ roles: RoleRow[] }>('/api/admin/roles')
    roles.value = data.roles || []
    for (const r of roles.value) {
      if (savingTierId.value !== r.id) tierDraft[r.id] = String(r.tier)
    }
  } catch (e: any) {
    rolesError.value = e?.data?.statusMessage || '역할 목록 불러오기 실패'
  } finally {
    rolesLoading.value = false
  }
}

async function saveRoleTier(r: RoleRow) {
  const raw = String(tierDraft[r.id] ?? '').trim()
  const tier = Number(raw)
  if (raw === '' || !Number.isFinite(tier)) {
    tierDraft[r.id] = String(r.tier)
    return
  }
  if (tier === r.tier) return
  savingTierId.value = r.id
  rolesError.value = null
  try {
    await $fetch('/api/admin/roles/update', { method: 'POST', body: { id: r.id, tier } })
    await loadRoles()
  } catch (e: any) {
    rolesError.value = e?.data?.statusMessage || '등급 변경 실패'
    tierDraft[r.id] = String(r.tier)
  } finally {
    savingTierId.value = null
  }
}

const reorderingRoles = ref(false)
async function moveRoleRank(idx: number, dir: -1 | 1) {
  const next = idx + dir
  if (next < 0 || next >= roles.value.length || reorderingRoles.value) return
  const arr = [...roles.value]
  ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
  roles.value = arr
  reorderingRoles.value = true
  try {
    await $fetch('/api/admin/roles/reorder', {
      method: 'POST',
      body: { order: arr.map((r) => r.id) }
    })
  } catch (e: any) {
    rolesError.value = e?.data?.statusMessage || '순서 변경 실패'
    await loadRoles()
  } finally {
    reorderingRoles.value = false
  }
}

async function createRoleClick() {
  newRoleError.value = null
  if (!newRoleId.value || !newRoleLabel.value) {
    newRoleError.value = '역할 ID와 이름을 모두 입력해주세요.'
    return
  }
  creatingRole.value = true
  try {
    await $fetch('/api/admin/roles/create', {
      method: 'POST',
      body: { id: newRoleId.value, label: newRoleLabel.value }
    })
    newRoleId.value = ''
    newRoleLabel.value = ''
    await loadRoles()
  } catch (e: any) {
    newRoleError.value = e?.data?.statusMessage || '역할 추가 실패'
  } finally {
    creatingRole.value = false
  }
}

async function deleteRoleClick(r: RoleRow) {
  if (process.client && !window.confirm(`"${r.label}" 역할을 삭제할까요?`)) return
  deletingRoleId.value = r.id
  rolesError.value = null
  try {
    await $fetch('/api/admin/roles/delete', { method: 'POST', body: { id: r.id } })
    await loadRoles()
  } catch (e: any) {
    rolesError.value = e?.data?.statusMessage || '역할 삭제 실패'
  } finally {
    deletingRoleId.value = null
  }
}

function openRoleModal(r: RoleRow) {
  roleModalTarget.value = r
  roleLabelDraft.value = r.label
  for (const key of menuKeys) {
    roleMenuDraft[key].view = r.menus?.[key]?.view !== false
    roleMenuDraft[key].edit = Boolean(r.menus?.[key]?.edit)
  }
  roleModalError.value = null
  roleModalOpen.value = true
}

function closeRoleModal() {
  roleModalOpen.value = false
  roleModalTarget.value = null
}

async function saveRoleModal() {
  if (!roleModalTarget.value) return
  roleModalSaving.value = true
  roleModalError.value = null
  try {
    const menus: Record<string, { view: boolean; edit: boolean }> = {}
    for (const key of menuKeys) menus[key] = { view: roleMenuDraft[key].view, edit: roleMenuDraft[key].edit }
    await $fetch('/api/admin/roles/update', {
      method: 'POST',
      body: { id: roleModalTarget.value.id, label: roleLabelDraft.value, menus }
    })
    await loadRoles()
    closeRoleModal()
  } catch (e: any) {
    roleModalError.value = e?.data?.statusMessage || '저장 실패'
  } finally {
    roleModalSaving.value = false
  }
}

type KillEventRow = {
  id: number
  symbol: string
  direction: 'up' | 'down'
  percent: number
  basePrice: number
  shockedPrice: number
  createdAt: string
}
const killEvents = ref<KillEventRow[]>([])
const killEventsLoading = ref(false)
const killEventsError = ref<string | null>(null)
const killEventDeleting = ref<number | null>(null)

function formatKillTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('ko-KR', { hour12: false })
}

async function loadKillEvents() {
  killEventsLoading.value = true
  killEventsError.value = null
  try {
    const data = await $fetch<{ items: KillEventRow[] }>('/api/admin/kill/list')
    killEvents.value = data.items || []
  } catch (e: any) {
    killEventsError.value = e?.data?.statusMessage || '킬 이력 불러오기 실패'
  } finally {
    killEventsLoading.value = false
  }
}

async function deleteKillEvent(id: number) {
  killEventDeleting.value = id
  killEventsError.value = null
  try {
    await $fetch('/api/admin/kill/delete', { method: 'POST', body: { id } })
    killEvents.value = killEvents.value.filter((k) => k.id !== id)
  } catch (e: any) {
    killEventsError.value = e?.data?.statusMessage || '삭제 실패'
  } finally {
    killEventDeleting.value = null
  }
}

type ProfitEventRow = {
  id: number
  symbol: string
  direction: 'up' | 'down'
  percent: number
  basePrice: number
  shockedPrice: number
  holdMs: number
  createdAt: string
}
const profitEvents = ref<ProfitEventRow[]>([])
const profitEventsLoading = ref(false)
const profitEventsError = ref<string | null>(null)
const profitEventDeleting = ref<number | null>(null)

async function loadProfitEvents() {
  profitEventsLoading.value = true
  profitEventsError.value = null
  try {
    const data = await $fetch<{ items: ProfitEventRow[] }>('/api/admin/profit/list')
    profitEvents.value = data.items || []
  } catch (e: any) {
    profitEventsError.value = e?.data?.statusMessage || '수익/손실 이력 불러오기 실패'
  } finally {
    profitEventsLoading.value = false
  }
}

async function deleteProfitEvent(id: number) {
  profitEventDeleting.value = id
  profitEventsError.value = null
  try {
    await $fetch('/api/admin/profit/delete', { method: 'POST', body: { id } })
    profitEvents.value = profitEvents.value.filter((p) => p.id !== id)
  } catch (e: any) {
    profitEventsError.value = e?.data?.statusMessage || '삭제 실패'
  } finally {
    profitEventDeleting.value = null
  }
}

const liquidationPercent = ref(40)
const liquidationPercentDraft = ref(40)
const liquidationSettingSaving = ref(false)
const liquidationSettingError = ref<string | null>(null)
const liquidationSettingMsg = ref<string | null>(null)

async function loadLiquidationSetting() {
  try {
    const data = await $fetch<{ liquidationRoe: number }>('/api/settings/system')
    const percent = Math.abs(Number(data.liquidationRoe) || 40)
    liquidationPercent.value = percent
    liquidationPercentDraft.value = percent
  } catch {
    // 기본값 유지
  }
}

async function saveLiquidationSetting() {
  const percent = Math.round(Number(liquidationPercentDraft.value))
  if (!Number.isFinite(percent) || percent < 1 || percent > 99) {
    liquidationSettingError.value = '1~99 사이의 숫자를 입력해주세요.'
    return
  }
  liquidationSettingSaving.value = true
  liquidationSettingError.value = null
  liquidationSettingMsg.value = null
  try {
    const res = await $fetch<{ liquidationRoe: number }>('/api/admin/settings/system', {
      method: 'POST',
      body: { liquidationRoe: -percent }
    })
    liquidationPercent.value = Math.abs(res.liquidationRoe)
    liquidationPercentDraft.value = liquidationPercent.value
    liquidationSettingMsg.value = '저장되었습니다. 모든 유저에게 실시간으로 반영됩니다.'
  } catch (e: any) {
    liquidationSettingError.value = e?.data?.statusMessage || '저장 실패'
  } finally {
    liquidationSettingSaving.value = false
  }
}

async function load() {
  loading.value = true
  error.value = null
  msg.value = null
  try {
    const data = await $fetch<{ users: AdminUserRow[] }>('/api/admin/users')
    users.value = data.users
    for (const u of users.value) {
      userDraft[u.id] = {
        username: u.username,
        name: u.name || '',
        usdt: Number(u.usdt ?? 0),
        referralCode: u.referralCode || '',
        role: u.role || 'user',
        settlementType: u.settlementType === 'referral' ? 'referral' : 'loss',
        settlementPercent: typeof u.settlementPercent === 'number' ? String(u.settlementPercent) : ''
      }
    }
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '불러오기 실패'
  } finally {
    loading.value = false
  }
}

// 정산/기타 설정
const miscDraft = reactive({
  telegramUrl: '',
  krwPerUsdt: 0,
  lossSettlementPercent: 0,
  referralSettlementPercent: 0,
  menuOrder: menuKeys.filter((k) => k !== 'transfers') as string[]
})

function moveMenuOrder(idx: number, dir: -1 | 1) {
  const next = idx + dir
  if (next < 0 || next >= miscDraft.menuOrder.length) return
  const arr = miscDraft.menuOrder
  ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
}
const miscSaving = ref(false)
const miscError = ref<string | null>(null)
const miscMsg = ref<string | null>(null)
const dailyKrwRate = ref(0)
const dailyKrwRateDay = ref('')

// 메뉴구성: 비회원도 보는 최상단 메인 메뉴(관리자 전용 서브메뉴와는 별개)
type MainNavKey = 'coin' | 'stock' | 'kr' | 'markets' | 'wallet' | 'invest' | 'support'
const MAIN_NAV_KEYS: MainNavKey[] = ['coin', 'stock', 'kr', 'markets', 'wallet', 'invest', 'support']
const MAIN_NAV_LABELS: Record<MainNavKey, string> = {
  coin: '코인선물',
  stock: '해외주식',
  kr: '국내주식',
  markets: '마켓',
  wallet: '내 지갑',
  invest: '투자내역',
  support: '고객센터'
}
const mainNavDraft = reactive<{ order: MainNavKey[]; hidden: MainNavKey[] }>({
  order: [...MAIN_NAV_KEYS],
  hidden: []
})
const mainNavSaving = ref(false)
const mainNavError = ref<string | null>(null)
const mainNavMsg = ref<string | null>(null)

function moveMainNavOrder(idx: number, dir: -1 | 1) {
  const next = idx + dir
  if (next < 0 || next >= mainNavDraft.order.length) return
  const arr = mainNavDraft.order
  ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
}
function toggleMainNavHidden(key: MainNavKey) {
  mainNavDraft.hidden = mainNavDraft.hidden.includes(key) ? mainNavDraft.hidden.filter((k) => k !== key) : [...mainNavDraft.hidden, key]
}
async function saveMainNavSettings() {
  mainNavSaving.value = true
  mainNavError.value = null
  mainNavMsg.value = null
  try {
    await $fetch('/api/admin/settings/misc', {
      method: 'POST',
      body: { mainNavOrder: mainNavDraft.order, mainNavHidden: mainNavDraft.hidden }
    })
    mainNavMsg.value = '저장되었습니다.'
  } catch (e: any) {
    mainNavError.value = e?.data?.statusMessage || '저장 실패'
  } finally {
    mainNavSaving.value = false
  }
}

function fmt0(v: number) {
  return Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

async function loadMiscSettings() {
  try {
    const data = await $fetch<any>('/api/admin/settings/misc')
    miscDraft.telegramUrl = data.telegramUrl || ''
    miscDraft.krwPerUsdt = Number(data.krwPerUsdt || 0)
    miscDraft.lossSettlementPercent = Number(data.lossSettlementPercent || 0)
    miscDraft.referralSettlementPercent = Number(data.referralSettlementPercent || 0)
    if (Array.isArray(data.menuOrder) && data.menuOrder.length) {
      const known = new Set(menuKeys.filter((k) => k !== 'transfers'))
      const fromServer = data.menuOrder.filter((k: string) => known.has(k as MenuKey))
      const missing = menuKeys.filter((k) => k !== 'transfers' && !fromServer.includes(k))
      miscDraft.menuOrder = [...fromServer, ...missing]
    }
    dailyKrwRate.value = Number(data.dailyKrwRate || 0)
    dailyKrwRateDay.value = String(data.dailyKrwRateDay || '')

    if (Array.isArray(data.mainNavOrder) && data.mainNavOrder.length) {
      const known = new Set(MAIN_NAV_KEYS)
      const fromServer = data.mainNavOrder.filter((k: string) => known.has(k as MainNavKey)) as MainNavKey[]
      const missing = MAIN_NAV_KEYS.filter((k) => !fromServer.includes(k))
      mainNavDraft.order = [...fromServer, ...missing]
    }
    if (Array.isArray(data.mainNavHidden)) {
      const known = new Set(MAIN_NAV_KEYS)
      mainNavDraft.hidden = data.mainNavHidden.filter((k: string) => known.has(k as MainNavKey))
    }
  } catch {
    // 기본값 유지
  }
}

async function saveMiscSettings() {
  miscSaving.value = true
  miscError.value = null
  miscMsg.value = null
  try {
    await $fetch('/api/admin/settings/misc', {
      method: 'POST',
      body: {
        telegramUrl: miscDraft.telegramUrl,
        krwPerUsdt: Number(miscDraft.krwPerUsdt) || 0,
        lossSettlementPercent: Number(miscDraft.lossSettlementPercent) || 0,
        referralSettlementPercent: Number(miscDraft.referralSettlementPercent) || 0,
        menuOrder: miscDraft.menuOrder
      }
    })
    miscMsg.value = '저장되었습니다.'
  } catch (e: any) {
    miscError.value = e?.data?.statusMessage || '저장 실패'
  } finally {
    miscSaving.value = false
  }
}

await load()
await loadLiquidationSetting()
await loadMiscSettings()
await loadKillEvents()
await loadProfitEvents()
await loadRoles()
</script>

<style scoped>
.sortable-th {
  color: rgb(203 213 225 / 0.9); /* slate-300, brighter than the default slate-500 header text */
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
  color-scheme: dark;
}
.date-input::-webkit-calendar-picker-indicator {
  margin-left: auto;
  cursor: pointer;
  opacity: 0.9;
}
</style>
