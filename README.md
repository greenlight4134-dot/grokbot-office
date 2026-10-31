# GrokBot Office 🛰️

X에 올라온 **GrokBot Office** 영상을 그대로 재현한 *봇 관제실* 프로그램입니다.
우주에 떠 있는 아이소메트릭 사무실(“GROKBOT STATION · DECK 3”)에서 봇들이 실제로 일하고, 쉬고, 승인이 필요하면 사용자를 부릅니다.
상태는 전부 백엔드 REST API로 들어오고, 화면은 SSE로 실시간 갱신됩니다. 영상처럼 보이기만 하는 데모가 아닙니다.

![team](shots/11-team-handoff.png)

![approval](shots/12-team-paper-approval.png)

## 실행

```bash
npm i
npm start                    # http://localhost:4317 (기본: 내 팀 '초탄 × 밈코인 레이더')
OFFICE_PRESET=demo npm start # 영상 속 데모 봇 7개
```

| 환경변수 | 기본값 | 설명 |
|---|---|---|
| `PORT` | `4317` | 서버 포트 |
| `OFFICE_USER` | `grokbot_owner` | 상단 오른쪽 `@username`, 바닥 테두리 글씨 |
| `OFFICE_API_KEY` | (없음) | 설정하면 봇의 쓰기 요청에 `x-api-key` 헤더가 필요 |
| `OFFICE_PRESET` | `mine` | `mine`(내 팀, 한국어) / `demo`(영상 속 7봇, 영어) |
| `RADAR_SCAN_SEC` | `600` | 밈코인 레이더 스캔 주기(초). 카운트다운에 쓰임 |
| `OFFICE_PASSWORD_FILE` | `.office-password` | 이 파일이 있으면 외부(터널/프록시 경유) 접속에 비밀번호 로그인이 필요 |
| `OFFICE_PASSWORD` | (없음) | 파일 대신 환경변수로 비밀번호 지정 |
| `SIM_SPEED` | `1` | 시뮬레이터 속도 배수 (2 = 2배 빠름) |

### 비밀번호 잠금 (외부 공개용)

`.office-password` 파일(또는 `OFFICE_PASSWORD`)이 있으면, 이 컴퓨터 밖에서 들어오는 요청(터널·리버스 프록시 경유, `X-Forwarded-For`/`CF-Connecting-IP` 헤더가 붙은 요청)은 전부 로그인해야 합니다. 화면, SSE 스트림, 승인 버튼 모두 포함입니다.
- 브라우저: `/login` 에서 비밀번호 입력 → 30일짜리 HttpOnly 쿠키가 발급됩니다. `/?key=비밀번호` 로 열어도 쿠키가 발급됩니다.
- 외부 봇/스크립트: `x-office-key: 비밀번호` 헤더 또는 `Authorization: Bearer 비밀번호`.
- 같은 컴퓨터의 봇(localhost 직접 접속)은 그대로 통과합니다.
- 공개 터널 예: `cloudflared tunnel --url http://localhost:4317` (SSE는 10초마다 ping을 보내서 끊기지 않습니다).

`?mode=night` 를 붙이면 밤 모드로 시작합니다. 프리셋은 오른쪽 위 `@username ⌄` 메뉴에서도 바꿀 수 있습니다.

## 화면 구성 (영상과 동일)

- **우주 배경**: 별, 행성, 태양전지판 위성. 떠 있는 정거장 슬래브, 추진기, 바닥 테두리 “GROKBOT STATION · DECK 3”, `@username`.
- **사무실**: 나무 바닥, 흰 모니터·본체가 놓인 책상 8개, 파랗게 빛나는 서버 기둥, 소파·러그·스탠드·화분 라운지, CHARGE 패드, 초록불이 켜진 AIRLOCK 양문, 카운터와 다음 동기화 카운트다운(“24s”)이 있는 CREW SESSION 벽 디스플레이, 코르크보드.
- **봇**: 검은 네모 눈이 달린 도형(큐브·구·원뿔·알·블롭·박스·실린더). 둥둥 떠다니고, 통로를 따라 걸어 다니며, 이름표·말풍선·빛나는 바닥 패드가 붙어 있습니다.
- **상단 바**: 로고, “GrokBot Office”, 실시간 “7 bots on deck · 5 working”, 실제로 조명이 바뀌는 Day/Night 토글, 배지가 달린 Tasks 버튼, 승인 대기 배지, `@username ⌄`.
- **왼쪽 아래 티커**: 최근 이벤트 3개.
- **오른쪽 CREW 목록**: 상태 점 색은 초록 coding, 주황 idle, 보라 browsing, 빨강 needs you, 파랑 resolving, 회색 stuck.
- **봇 상세**: ← 뒤로, 이름, “Ops · updated 12m ago”, 상태 알약, 진행 바가 있는 작업, HH:MM:SS 타임라인. 선택한 봇을 카메라가 따라갑니다.
- **작업 보드**: “N active tasks…”, In progress/Queued/Done 탭. 카드를 누르면 해당 봇으로 이동합니다.
- **빈 책상(DESK 05)**: 마우스를 올리면 툴팁이 뜨고, 클릭하면 “Add a bot” 모달(실제 curl 4단계와 *Send a test status* 버튼)이 열립니다. 버튼을 누르면 에어락이 열리고 초록 실린더 “My bot”이 들어와 책상까지 걸어가며, 크루 목록에도 추가됩니다.
- **Needs you**: 빨간 바닥 원이 맥동하고, 이름표에 빨간 “!”, 노란 말풍선, 빨간 *Needs you* 알약, 노란 Approve / 회색 Decline 버튼이 나타납니다. 승인하면 “APPROVED · NOVA GOT IT” 토스트가 뜨고, 상태가 파란 *Resolving* 으로 바뀌며, 로그에 “Sending the replies”가 추가됩니다. 결정은 백엔드에 저장되어 봇이 폴링으로 가져갑니다.
- 마우스 드래그로 이동, 휠로 확대·축소, `Esc` 로 패널 닫기.

## 봇 연결 API

모든 요청은 JSON입니다. `OFFICE_API_KEY` 를 설정했다면 `-H 'x-api-key: …'` 를 붙이세요.

```bash
BASE=http://localhost:4317

# 1) 봇 등록 (같은 id로 다시 호출해도 안전). 비어 있는 책상 중 DESK 05가 먼저 배정되고, 에어락으로 입장합니다.
curl -X POST $BASE/api/bots -H 'Content-Type: application/json' \
  -d '{"id":"chotan","name":"초탄","role":"러그 체크 · 모의 트레이딩","shape":"cube","color":"#ff8a3d"}'

# 2) 상태 보고: status = coding | browsing | idle | needs_you | resolving | stuck
#    (별칭 working, thinking, error, done 등도 받습니다)
curl -X POST $BASE/api/bots/chotan/status -H 'Content-Type: application/json' \
  -d '{"status":"browsing","action":"러그 체크 중 · $XXX","task":{"title":"$XXX 러그 체크","step":1,"total":3}}'

# 3) 로그 한 줄 추가 (타임라인과 티커에 표시)
curl -X POST $BASE/api/bots/chotan/log -H 'Content-Type: application/json' -d '{"text":"$XXX LP 락 확인"}'

# 4) 사람에게 승인 요청 → 결정 폴링 (wait=N 초 동안 롱폴링, 최대 55초)
curl -X POST $BASE/api/bots/chotan/approval -H 'Content-Type: application/json' \
  -d '{"question":"$XXX 모의 매수 넣을까? 승인?","approveText":"모의 매수 진입 (PAPER)","declineText":"패스"}'
curl "$BASE/api/bots/chotan/decision?wait=25"
# → {"state":"approved"|"declined"|"pending", "approvalId": "...", ...}
```

그 밖의 엔드포인트:

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/state` | 전체 스냅샷 (봇, 작업, 이벤트, 책상) |
| GET | `/api/bots`, `/api/bots/:id` | 봇 목록 / 단일 봇 |
| DELETE | `/api/bots/:id` | 봇 퇴장 |
| POST | `/api/bots/:id/decision` | 화면 대신 API로 승인/거절 `{"decision":"approve"}` |
| GET | `/api/team` | 그룹챗 '초탄 × 밈코인 레이더' 상태 (최근 메시지, 오늘 카운트, 스캔 일정) |
| POST | `/api/team/find` | 레이더 발견 한 줄: `{"ticker","name","mint","who","link"}` → 그룹챗 + 초탄에게 패킷 |
| POST | `/api/team/check` | 초탄 러그체크 결과: `{"ticker","result":"paper"\|"pass","reason"}` |
| POST | `/api/team/chat` | 그룹챗 패널에 한 줄: `{"from","text"}` |
| POST | `/api/team/scan` | 스캔 일정 알림 `{"lastAt","nextAt"}` (카운트다운), `{"now":true}` = 시뮬레이터 즉시 스캔 |
| POST | `/api/preset` | `{"preset":"demo"}` 또는 `{"preset":"mine"}` |
| GET | `/api/stream` | SSE 실시간 스트림 (UI가 사용) |

`status` 필드: `status`, `action`(말풍선 문구), `task`(문자열 또는 `{title, step, total}`), `step`, `total`, `location`, `queue`(대기 작업 제목 배열), `taskDone:true`(작업 완료로 이동).
needs_you 가 아닌 상태를 보내면 열려 있던 승인 요청은 자동으로 철회됩니다.

## 프리셋

- **mine (기본)**: 그룹챗 **'초탄 × 밈코인 레이더'** 팀. 한국어 UI.
  - **밈코인 레이더**: 10분마다 X 대형 계정 15개(elonmusk, cz_binance, a1lon9, aeyakovenko, rajgokal, solana, Pumpfun, blknoiz06, MustStopMurad, cobie, frankdegods, notthreadguy, shawmakesmagic, inversebrah, lookonchain)를 스캔해 Solana/pump.fun 밈코인 티커·CA 언급을 찾고 사칭 계정은 걸러냅니다. 매수 신호를 주거나 거래하지 않고, 아무것도 없으면 조용히 넘어갑니다. 찾으면 한 줄(코인 이름 · 티커 · 민트 주소 · 누가 · 링크)을 그룹챗에 올립니다. 상태: `X 계정 15개 스캔 중` → `$XXX 언급 발견!` / `사칭 계정 걸러냄` → `다음 스캔까지 대기 · mm:ss`.
  - **초탄**: 발견을 받아 러그 체크(LP 락 · 상위 홀더 · 개발자 지갑)를 하고, 통과하면 `$XXX 모의 매수 넣을까? 승인?` 으로 사용자 승인을 받아 **모의(PAPER) 트레이딩**에만 넣습니다. 실제 매수는 없습니다. 상태: `러그 체크 중` → `모의 매수 진입` / `패스 (러그 의심)`.
  - **만능**(빌더·만능 도우미), **트럼프 서칭**, **알려줘**: 일반 작업 상태만 표시.
  - 화면: 레이더가 발견하면 빛나는 패킷이 초탄 책상으로 날아가고 레이더가 초탄 자리로 걸어가 전달합니다. CREW SESSION 옆 **GROUP CHAT** 패널에 최근 한 줄 발견이 뜨고, 아래 티커에도 기록됩니다. 오른쪽 크루 목록 아래 **파이프라인**(레이더 발견 → 초탄 러그체크 → 모의트레이딩, 오늘 카운트 + 다음 스캔 카운트다운)이 붙습니다.
  - 시뮬레이터 데이터는 전부 **예시**입니다 ($TESTCAT, $DEMOFROG … / `Example…pump` 민트 / `x.com/…/status/예시`).
- **demo**: 영상 속 7봇 Atlas·Forge·Pixel·Echo·Ledger·Nova·Scout. 영어 UI입니다.

두 프리셋 모두 시뮬레이터가 봇을 움직입니다. API로 등록한 *진짜* 봇은 같은 사무실에 함께 나타나고, 같은 id(`radar`, `chotan`)로 보내면 시뮬레이션 값을 실제 값으로 덮어씁니다.

### 진짜 레이더·초탄 봇에 붙이는 법

```js
const BASE = 'http://localhost:4317';
const post = (p, b) => fetch(BASE + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json());

// 밈코인 레이더: 스캔 시작/끝
await post('/api/bots/radar/status', { status: 'browsing', action: 'X 계정 15개 스캔 중', stay: true });
await post('/api/team/find', { ticker: 'XXX', name: '코인 이름', mint: '민트주소', who: 'elonmusk', link: 'https://x.com/…' }); // 찾았을 때만
await post('/api/bots/radar/status', { status: 'idle', action: '다음 스캔까지 대기', stay: true });
await post('/api/team/scan', { lastAt: Date.now(), nextAt: Date.now() + 600_000 });

// 초탄: 러그 체크 → 모의 매수 승인
await post('/api/bots/chotan/status', { status: 'browsing', action: '러그 체크 중 · $XXX' });
await post('/api/bots/chotan/approval', { question: '$XXX 모의 매수 넣을까? 승인?', approveText: '모의 매수 진입 · $XXX (PAPER)', declineText: '패스' });
let d; do { d = await fetch(`${BASE}/api/bots/chotan/decision?wait=25`).then(r => r.json()); } while (d.state === 'pending');
await post('/api/team/check', { ticker: 'XXX', result: d.state === 'approved' ? 'paper' : 'pass' });
```

`status` 의 `stay:true` 는 쉴 때도 라운지로 가지 않고 자기 책상에 있게 하고, `visit:"chotan"` 은 다른 봇 책상으로 걸어가게 합니다(`visit:null` 로 복귀).

## 구조

```
server/index.js    Express + SSE 백엔드, 승인 큐, 시뮬레이터
server/presets.js  demo / mine 봇 시나리오
public/index.html  SPA 셸 (Inter, Noto Sans KR)
public/scene.js    Three.js 아이소메트릭 씬 (직교 카메라, 그림자, 경로 이동)
public/textures.js 캔버스로 그린 텍스처 (나무 바닥, 사인, 디스플레이…)
public/app.js      UI: 크루 목록, 상세, 작업 보드, 모달, 승인, i18n(en/ko)
shots.mjs          headless Chrome 스크린샷 (npm run shots)
```

## 영상과 다른 점

- 봇 모양과 색은 영상을 따랐습니다. 예를 들어 Nova는 빨간 블롭이고, 새로 들어오는 “My bot”이 초록 실린더입니다.
- 책상은 영상처럼 8개이고, DESK 05는 새로 들어오는 봇 자리로 비워 둡니다.
