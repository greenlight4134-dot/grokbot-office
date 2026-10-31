// Scripted crews for the built-in simulator.
// Each bot: id, name, role, shape, color, tasks[] (steps), idle[] lines.
// Step: { s: status, a: action }  or  { ask: question, yes: [...steps], no: [...steps] }

const demo = {
  lang: 'en',
  bots: [
    { id: 'atlas', name: 'Atlas', role: 'Research', shape: 'blob', color: '#3ecfa6',
      idle: ['Recharging between tasks', 'Waiting for a new task'],
      tasks: [
        { title: 'Weekly xAI news digest', steps: [
          { s: 'browsing', a: 'Collecting 32 links from the week' },
          { s: 'coding', a: 'Writing short summaries' },
          { s: 'coding', a: 'Ranking stories by impact' },
          { s: 'coding', a: 'Digest ready: 9 stories, 3 tweets queued' } ] },
        { title: 'Competitor review: AI offices', steps: [
          { s: 'browsing', a: 'Opening 6 competitor dashboards' },
          { s: 'browsing', a: 'Taking notes on onboarding flows' },
          { s: 'coding', a: 'Writing the comparison table' },
          { s: 'coding', a: 'Review done: 4 ideas worth stealing' } ] } ] },
    { id: 'forge', name: 'Forge', role: 'Engineering', shape: 'cube', color: '#ff8a3d',
      idle: ['Free for a new task', 'Recharging between tasks'],
      tasks: [
        { title: 'Speed up the dashboard API', steps: [
          { s: 'coding', a: 'Profiling the slowest endpoints' },
          { s: 'coding', a: 'Adding a cache for team stats' },
          { s: 'stuck', a: 'Flaky test, retrying (2/3)' },
          { s: 'coding', a: 'Running the test suite' },
          { s: 'coding', a: 'p95 latency down from 820ms to 140ms' } ] },
        { title: 'Fix the login redirect bug', steps: [
          { s: 'coding', a: 'Reproducing the redirect loop' },
          { s: 'coding', a: 'Patching the session cookie path' },
          { s: 'coding', a: 'Fix shipped, 0 errors in 10 min' } ] } ] },
    { id: 'pixel', name: 'Pixel', role: 'Design', shape: 'cone', color: '#ff4fa3',
      idle: ['Taking a break', 'Looking at cover references'],
      tasks: [
        { title: 'Cover image for the thread', steps: [
          { s: 'browsing', a: 'Looking at cover references' },
          { s: 'coding', a: 'Sketching 3 directions' },
          { s: 'coding', a: 'Exporting the final cover' } ] },
        { title: 'Icons for the office', steps: [
          { s: 'coding', a: 'Drawing 7 bot icons' },
          { s: 'coding', a: 'Matching the pastel palette' },
          { s: 'coding', a: 'Icon set exported as SVG' } ] } ] },
    { id: 'echo', name: 'Echo', role: 'Community', shape: 'sphere', color: '#3b6dff',
      idle: ['Waiting for a new task', 'Recharging between tasks'],
      tasks: [
        { title: 'Reply to the top comments', steps: [
          { s: 'browsing', a: 'Reading replies under the thread' },
          { s: 'coding', a: 'Writing short answers' },
          { s: 'coding', a: 'Answered 18 comments, 3 leads saved' } ] },
        { title: 'Launch thread on X', steps: [
          { s: 'coding', a: 'Drafting a 6-post thread' },
          { ask: 'Thread is ready. Post it now?',
            yes: [ { s: 'resolving', a: 'Posting the thread' }, { s: 'coding', a: 'Thread live, 1.2k views in 5 min' } ],
            no: [ { s: 'resolving', a: 'Saving the thread as a draft' } ] } ] } ] },
    { id: 'ledger', name: 'Ledger', role: 'Finance', shape: 'egg', color: '#7b4dff',
      idle: ['Recharging between tasks', 'Waiting for a new task'],
      tasks: [
        { title: 'October expense check', steps: [
          { s: 'browsing', a: 'Exporting transactions from the bank' },
          { s: 'coding', a: 'Sorting 214 transactions into categories' },
          { s: 'coding', a: 'Flagged 2 duplicate charges' } ] },
        { title: 'Send monthly invoices', steps: [
          { s: 'coding', a: 'Preparing 5 invoices' },
          { ask: '5 invoices, $8,400 total. Send them?',
            yes: [ { s: 'resolving', a: 'Sending the invoices' }, { s: 'coding', a: '5 invoices sent, $8,400 total' } ],
            no: [ { s: 'resolving', a: 'Keeping invoices as drafts' } ] } ] } ] },
    { id: 'nova', name: 'Nova', role: 'Ops', shape: 'blob', color: '#ff3b5c',
      idle: ['Waiting for a new task'],
      tasks: [
        { title: 'Support inbox sweep', steps: [
          { s: 'browsing', a: 'Reading 14 new support emails' },
          { s: 'coding', a: 'Drafting replies for 9 of them' },
          { ask: '2 refund requests. Approve them?',
            yes: [ { s: 'resolving', a: 'Sending the replies' }, { s: 'coding', a: 'Inbox zero, 2 refunds issued' } ],
            no: [ { s: 'resolving', a: 'Declining politely, keeping the money' }, { s: 'coding', a: 'Inbox zero, refunds declined' } ] } ] },
        { title: 'Nightly backup check', steps: [
          { s: 'browsing', a: "Checking last night's backups" },
          { s: 'coding', a: 'Restoring a test snapshot' },
          { s: 'coding', a: 'Comparing checksums' },
          { s: 'coding', a: 'Writing the backup report' },
          { s: 'coding', a: 'All 4 backups verified, restore took 41 s' } ] } ] },
    { id: 'scout', name: 'Scout', role: 'Growth', shape: 'box', color: '#1b1d22',
      idle: ['Off deck, back soon', 'Waiting for a new task'],
      tasks: [
        { title: 'Find 10 creators to collab with', steps: [
          { s: 'coding', a: 'Writing the trend brief' },
          { s: 'browsing', a: 'Scanning X for AI creators' },
          { s: 'coding', a: 'Shortlisted 10 creators' } ] },
        { title: 'Trend report for the week', steps: [
          { s: 'browsing', a: 'Reading the top 50 AI posts' },
          { s: 'coding', a: 'Clustering topics' },
          { s: 'coding', a: 'Report ready: 5 rising topics' } ] } ] },
  ],
};

// The user's real team (group chat '초탄 × 밈코인 레이더').
// 밈코인 레이더 and 초탄 are driven by the pipeline simulator in index.js (custom: 'radar' | 'chotan'),
// everything is PAPER trading, and every ticker / mint in the simulator is a clearly fake 예시.
const RADAR_ACCOUNTS = ['elonmusk', 'cz_binance', 'a1lon9', 'aeyakovenko', 'rajgokal', 'solana', 'Pumpfun', 'blknoiz06', 'MustStopMurad', 'cobie', 'frankdegods', 'notthreadguy', 'shawmakesmagic', 'inversebrah', 'lookonchain'];
const EXAMPLE_COINS = [
  { ticker: 'TESTCAT', name: 'Test Cat' }, { ticker: 'DEMOFROG', name: 'Demo Frog' }, { ticker: 'FAKEWIF', name: 'Fake Wif Hat' },
  { ticker: 'SAMPLEDOG', name: 'Sample Dog' }, { ticker: 'MOCKPEPE', name: 'Mock Pepe' }, { ticker: 'NOTREAL', name: 'Not Real Coin' },
  { ticker: 'EXMPLBONK', name: 'Example Bonk' }, { ticker: 'DUMMYAI', name: 'Dummy AI' },
];
const IMPOSTERS = ['elonmuskk_', 'cz_blnance', 'a1lon9_pump', 'solana__official', 'lookonchaln'];

const mine = {
  lang: 'ko',
  pipeline: true,
  bots: [
    { id: 'radar', desk: 6, name: '밈코인 레이더', role: 'X 스캐너 · 10분 주기', shape: 'cone', color: '#7b4dff', custom: 'radar',
      idle: ['다음 스캔까지 대기'], tasks: [{ title: 'X 계정 15개 정기 스캔', steps: [
        { s: 'browsing', a: 'X 계정 15개 스캔 중' }, { s: 'coding', a: '사칭 계정 걸러냄' }, { s: 'idle', a: '다음 스캔까지 대기' } ] }] },
    { id: 'chotan', desk: 7, name: '초탄', role: '러그 체크 · 모의 트레이딩', shape: 'cube', color: '#ff8a3d', custom: 'chotan',
      idle: ['레이더 발견 대기 중'], tasks: [{ title: '러그 체크', steps: [
        { s: 'browsing', a: '러그 체크 중' }, { s: 'coding', a: '패스 (러그 의심)' } ] }] },
    { id: 'manneung', desk: 3, name: '만능', role: '빌더 · 만능 도우미', shape: 'box', color: '#1b1d22',
      idle: ['무엇이든 대기 중', '소파에서 쉬는 중'],
      tasks: [
        { title: '사무실 업데이트', steps: [
          { s: 'coding', a: '사무실 업데이트 중' },
          { s: 'coding', a: '그룹챗 패널 연결 중' },
          { s: 'coding', a: '업데이트 배포 완료' } ] },
        { title: '그룹챗 정리', steps: [
          { s: 'browsing', a: '초탄 × 밈코인 레이더 대화 읽는 중' },
          { s: 'coding', a: '오늘 발견 목록 요약 중' } ] },
        { title: '봇 상태 점검', steps: [
          { s: 'coding', a: '크루 헬스체크 중' },
          { s: 'coding', a: '모두 정상 작동 중' } ] } ] },
    { id: 'trump', desk: 2, name: '트럼프 서칭', role: '서칭', shape: 'sphere', color: '#ff3b5c',
      idle: ['대기 중', '쉬는 중'],
      tasks: [
        { title: '검색 요청 처리', steps: [
          { s: 'browsing', a: '요청받은 주제 검색 중' },
          { s: 'coding', a: '검색 결과 정리 중' } ] } ] },
    { id: 'notify', desk: 8, name: '알려줘', role: '알림', shape: 'egg', color: '#ffc531',
      idle: ['알림 대기 중', '충전 중'],
      tasks: [
        { title: '알림 정리', steps: [
          { s: 'coding', a: '알림 큐 정리 중' },
          { s: 'coding', a: '알림 전달 완료' } ] } ] },
  ],
};

module.exports = { demo, mine, RADAR_ACCOUNTS, EXAMPLE_COINS, IMPOSTERS };
