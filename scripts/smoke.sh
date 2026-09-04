#!/usr/bin/env bash
# BITPLAY 스모크 테스트 — 기존 거래소 핵심 흐름을 순서대로 두드린다.
# usage: smoke.sh <BASE_URL>
BASE="${1:?BASE_URL required}"
J="$(mktemp -d)"
pass=0; fail=0

chk() { # chk <label> <expected-substring> <actual>
  if printf '%s' "$3" | grep -q "$2"; then
    echo "  PASS  $1"
    pass=$((pass+1))
  else
    echo "  FAIL  $1"
    echo "        expected ~ $2"
    echo "        got      : $(printf '%s' "$3" | head -c 300)"
    fail=$((fail+1))
  fi
}

U="smoke$(date +%s)"

echo "== 1. 공개 엔드포인트 =="
chk "GET /api/version"            '"build"'   "$(curl -s "$BASE/api/version")"
chk "GET /api/markets/list"       'BTCUSDT'   "$(curl -s "$BASE/api/markets/list")"
chk "GET /api/settings/system"    '{'         "$(curl -s "$BASE/api/settings/system")"
chk "GET /api/me (비로그인)"       '"me":null' "$(curl -s "$BASE/api/me")"
chk "GET /api/nav-menu"           '\['        "$(curl -s "$BASE/api/nav-menu")"

echo "== 2. 회원가입 (D1 쓰기) =="
cat > "$J/reg.json" <<EOF
{"username":"$U","password":"Test1234!","name":"홍길동","birthDate":"1990-01-01","bankName":"국민","bankAccount":"1234567890","accountHolder":"홍길동","agreedToTerms":true}
EOF
REG="$(curl -s -c "$J/c.txt" -X POST "$BASE/api/auth/register" -H 'content-type: application/json' --data-binary "@$J/reg.json")"
chk "POST /api/auth/register" '"ok":true' "$REG"

echo "== 3. 로그인 세션 =="
cat > "$J/login.json" <<EOF
{"username":"$U","password":"Test1234!"}
EOF
LOG="$(curl -s -c "$J/c.txt" -X POST "$BASE/api/auth/login" -H 'content-type: application/json' --data-binary "@$J/login.json")"
chk "POST /api/auth/login" '"ok":true' "$LOG"
ME="$(curl -s -b "$J/c.txt" "$BASE/api/me")"
chk "GET /api/me (로그인 후)" "$U" "$ME"
chk "GET /api/account" 'usdt' "$(curl -s -b "$J/c.txt" "$BASE/api/account")"

echo "== 4. 관리자 로그인 =="
cat > "$J/admin.json" <<'EOF'
{"username":"admin","password":"1121"}
EOF
ADM="$(curl -s -c "$J/a.txt" -X POST "$BASE/api/admin/login" -H 'content-type: application/json' --data-binary "@$J/admin.json")"
chk "POST /api/admin/login" '"ok":true' "$ADM"
chk "GET /api/admin/users"   '\[' "$(curl -s -b "$J/a.txt" "$BASE/api/admin/users")"
chk "GET /api/admin/members" '{'  "$(curl -s -b "$J/a.txt" "$BASE/api/admin/members")"
chk "GET /api/admin/roles"   '\[' "$(curl -s -b "$J/a.txt" "$BASE/api/admin/roles")"

echo "== 5. 잔고 지급 -> 거래 =="
USERID="$(printf '%s' "$ME" | sed -n 's/.*"id":\([0-9]*\).*/\1/p' | head -1)"
cat > "$J/credit.json" <<EOF
{"userId":$USERID,"amount":10000}
EOF
chk "POST /api/admin/users/credit" '"ok":true' \
  "$(curl -s -b "$J/a.txt" -X POST "$BASE/api/admin/users/credit" -H 'content-type: application/json' --data-binary "@$J/credit.json")"

cat > "$J/open.json" <<'EOF'
{"symbol":"BTCUSDT","side":"long","margin":100,"leverage":10}
EOF
OPEN="$(curl -s -b "$J/c.txt" -X POST "$BASE/api/trade/open" -H 'content-type: application/json' --data-binary "@$J/open.json")"
chk "POST /api/trade/open" '"ok":true' "$OPEN"
chk "GET /api/account (포지션 반영)" 'positions' "$(curl -s -b "$J/c.txt" "$BASE/api/account")"

POSID="$(curl -s -b "$J/c.txt" "$BASE/api/account" | python -c 'import sys,json; d=json.load(sys.stdin); print((d.get("positions") or [{}])[0].get("id",0))')"
cat > "$J/close.json" <<EOF
{"positionId":${POSID:-0}}
EOF
chk "POST /api/trade/close" '"ok":true' \
  "$(curl -s -b "$J/c.txt" -X POST "$BASE/api/trade/close" -H 'content-type: application/json' --data-binary "@$J/close.json")"
chk "GET /api/trades/history" '\[' "$(curl -s -b "$J/c.txt" "$BASE/api/trades/history")"

echo "== 6. 메시지 / 상담 =="
chk "GET /api/messages/threads" '\[' "$(curl -s -b "$J/c.txt" "$BASE/api/messages/threads")"
chk "GET /api/messages/unread"  '{' "$(curl -s -b "$J/c.txt" "$BASE/api/messages/unread")"
cat > "$J/guest.json" <<'EOF'
{"guestId":"smoke-guest-1","body":"테스트 문의"}
EOF
chk "POST /api/guest-chat/send" '{' \
  "$(curl -s -X POST "$BASE/api/guest-chat/send" -H 'content-type: application/json' --data-binary "@$J/guest.json")"

echo "== 7. SSR 페이지 =="
chk "GET / (HTML)"          'BITPLAY' "$(curl -s "$BASE/")"
chk "GET /admin/login"      '<' "$(curl -s "$BASE/admin/login")"

echo ""
echo "================================"
echo "  PASS: $pass   FAIL: $fail"
echo "================================"
[ "$fail" -eq 0 ]
