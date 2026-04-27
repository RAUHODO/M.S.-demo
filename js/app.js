/* ═══════════════════════════════════════════
   MoSphere Demo — Main Application
   ═══════════════════════════════════════════ */

let data = null;
let currentLang = 'cn';
let activeBuilding = -1;
const openSections = new Set([0]); // 日记默认展开
const openConvs = new Set();

// ── 翻面机制（桌面 + 手机共用，参照 dashboard）────────
// 全反触发：赐福点 (id="grace")，按 id 锁定不依赖 cell 位置（demo 按活跃度排序）
let demoGlobalFlipActive = false;
let demoFlippedBuildingId = null;
const LS_DEMO_FLIP = 'mosphere.demo.flipState';
const DEMO_GLOBAL_TRIGGER_ID = 'grace';

function saveDemoFlipState() {
  try {
    localStorage.setItem(LS_DEMO_FLIP, JSON.stringify({
      globalFlipActive: demoGlobalFlipActive,
      flippedBuildingId: demoGlobalFlipActive ? null : demoFlippedBuildingId,
    }));
  } catch {}
}
function loadDemoFlipState() {
  try {
    const s = JSON.parse(localStorage.getItem(LS_DEMO_FLIP) || '{}');
    demoGlobalFlipActive = !!s.globalFlipActive;
    demoFlippedBuildingId = demoGlobalFlipActive ? null : (s.flippedBuildingId || null);
  } catch {
    demoGlobalFlipActive = false;
    demoFlippedBuildingId = null;
  }
}
function demoCardFlipClass(id) {
  if (demoGlobalFlipActive) return 'flipped';
  if (demoFlippedBuildingId === id) return 'flipped';
  return '';
}
function demoHandleFlip(id) {
  if (id === DEMO_GLOBAL_TRIGGER_ID) {
    demoGlobalFlipActive = !demoGlobalFlipActive;
    demoFlippedBuildingId = null;
  } else {
    if (demoGlobalFlipActive) {
      demoGlobalFlipActive = false;
      demoFlippedBuildingId = id;
    } else if (demoFlippedBuildingId === id) {
      demoFlippedBuildingId = null;
    } else {
      demoFlippedBuildingId = id;
    }
  }
  saveDemoFlipState();
}

// ── Placeholder logo（金色版，沿用 demo --gold #C8AA6E）────
// 保留作 fallback：未来新建筑没自己的 logo 时回落到此
function demoPlaceholderLogoSvg() {
  return `<svg class="bf-logo" viewBox="0 0 100 100" width="90" height="90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" stroke-width="2"/>
    <rect x="40" y="44" width="20" height="30" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <polygon points="36,44 64,44 50,28" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="50" cy="56" r="5.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <line x1="50" y1="56" x2="50" y2="52.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="50" y1="56" x2="53" y2="56" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;
}

// ── 8 栋专属 logo（阶段 1.5 定稿：7 栋 base + manor v2）────
// 风格：03 印章圆环 + 06 空心建筑线稿 + 比例 B + 正面无透视
// 全 currentColor 驱动；灰色降级（待落地）自动跟随
const DEMO_LOGO_BODIES = {
  // 赐福点 — v5：拉长水滴火焰（尖朝上）+ 6 根木刺 180° 散开（鸟巢俯视）+ 椭圆地面光圈
  grace: `
    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" stroke-width="2"/>
    <path d="M 50 18 Q 57 24 57 40 Q 57 54 50 66 Q 43 54 43 40 Q 43 24 50 18 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <line x1="50" y1="68" x2="28" y2="70" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="50" y1="68" x2="32" y2="76" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="50" y1="68" x2="40" y2="82" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="50" y1="68" x2="60" y2="82" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="50" y1="68" x2="68" y2="76" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="50" y1="68" x2="72" y2="70" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <ellipse cx="50" cy="82" rx="30" ry="4" fill="none" stroke="currentColor" stroke-width="1.5"/>`,
  // 圆桌厅堂 — v2 双侧高塔（城堡群）+ 中央低圆顶（外方内圆）+ 拱门
  roundtable: `
    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" stroke-width="2"/>
    <line x1="14" y1="82" x2="86" y2="82" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <rect x="18" y="38" width="10" height="44" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <rect x="72" y="38" width="10" height="44" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <rect x="28" y="44" width="44" height="38" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <path d="M 30 44 Q 50 32 70 44" fill="none" stroke="currentColor" stroke-width="2"/>
    <path d="M 44 82 Q 44 64 50 64 Q 56 64 56 82" fill="none" stroke="currentColor" stroke-width="1.5"/>`,
  // 蔷薇教堂 — v4：钟楼瘦高顶部断裂 + 主堂双残柱+尖拱残顶 + 红色史莱姆从中部涌出（与埃雷区分点 = 大史莱姆 + 主堂残柱）
  perfumer: `
    <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" stroke-width="2"/>
    <line x1="18" y1="82" x2="82" y2="82" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <rect x="22" y="18" width="12" height="64" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <path d="M 22 18 L 25 14 L 28 18 L 31 14 L 34 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <path d="M 25 38 Q 25 30 28 30 Q 31 30 31 38 L 31 44 L 25 44 Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <line x1="38" y1="82" x2="38" y2="50" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <line x1="70" y1="82" x2="70" y2="50" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M 38 50 L 54 38 L 70 50" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <path d="M 36 82 Q 38 64 50 60 Q 60 50 70 56 Q 78 64 80 82 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <path d="M 44 64 Q 50 56 56 64" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M 60 60 Q 66 52 72 60" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>`,
  // 大赐福·密室 — 拱形入口 + 中央大光柱
  clocktower: `
    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" stroke-width="2"/>
    <line x1="22" y1="82" x2="78" y2="82" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M 24 82 L 24 50 Q 24 26 50 26 Q 76 26 76 50 L 76 82" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <path d="M 50 82 Q 38 54 50 30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <circle cx="50" cy="24" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>`,
  // 魔法学院 — 双塔 + 飞拱
  ruins: `
    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" stroke-width="2"/>
    <line x1="20" y1="82" x2="80" y2="82" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <rect x="24" y="28" width="14" height="54" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <polygon points="22,28 40,28 31,18" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <rect x="62" y="28" width="14" height="54" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <polygon points="60,28 78,28 69,18" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <path d="M 38 42 Q 50 28 62 42" fill="none" stroke="currentColor" stroke-width="2"/>`,
  // 黄金树大教堂 — 树冠 + 树干嵌门
  library: `
    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" stroke-width="2"/>
    <line x1="22" y1="82" x2="78" y2="82" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <circle cx="50" cy="42" r="22" fill="none" stroke="currentColor" stroke-width="2"/>
    <line x1="46" y1="64" x2="46" y2="82" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <line x1="54" y1="64" x2="54" y2="82" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M 46 76 Q 46 70 50 70 Q 54 70 54 76" fill="none" stroke="currentColor" stroke-width="1.5"/>`,
  // 埃雷教堂 — 墨鱼定稿（按真实图比例：高瘦钟楼左偏 + 主堂矮宽右侧 + 藤蔓）
  merchant: `
    <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" stroke-width="2"/>
    <rect x="28" y="22" width="14" height="58" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <path d="M 31 38 Q 31 33 35 33 Q 39 33 39 38 L 39 46 L 31 46 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M 26 22 L 35 14 L 44 22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="35" y1="14" x2="35" y2="11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M 42 80 L 42 56 L 76 56 L 76 80" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M 42 56 L 59 46 L 76 56" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M 55 80 L 55 70 Q 55 66 59 66 Q 63 66 63 70 L 63 80" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="69" y1="64" x2="69" y2="70" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <line x1="20" y1="80" x2="80" y2="80" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M 28 32 Q 25 38 28 44 Q 31 50 28 56" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M 50 52 Q 52 58 49 64" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  // 火山官邸 — v2：火山主体（占主导）+ 山脚小宅 + 顶部喷烟
  manor: `
    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" stroke-width="2"/>
    <line x1="18" y1="82" x2="82" y2="82" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M 18 82 L 38 26 L 44 32 L 50 24 L 56 32 L 62 26 L 82 82" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <path d="M 44 22 Q 50 14 56 20 Q 60 12 50 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <rect x="28" y="70" width="14" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <polygon points="26,70 44,70 35,62" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>`,
};

function demoBuildingLogoSvg(id) {
  const body = DEMO_LOGO_BODIES[id];
  if (!body) return demoPlaceholderLogoSvg();
  return `<svg class="bf-logo" viewBox="0 0 100 100" width="90" height="90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;
}

// 8 栋功能说明（双语）— key 对齐 demo_cn.json 实际 building.id
const DEMO_FUNCTION_LABELS = {
  cn: {
    grace: '见证日常',
    roundtable: '交易记录',  // 圆桌厅堂 = 策略室对应（基甸的战略 + 资产交易）
    perfumer: '健康记录',    // 蔷薇教堂 = 药房
    clocktower: '日程任务',  // 大赐福·密室 = 时钟塔
    ruins: '灵感收集',       // 魔法学院 = 杂货铺
    library: '用户档案',     // 黄金树大教堂 = 档案室
    merchant: '财务记录',    // 埃雷教堂 = 钱庄
    manor: '人际关系',       // 火山官邸 = 茶馆
  },
  en: {
    grace: 'Witness daily',
    roundtable: 'Trading',
    perfumer: 'Health records',
    clocktower: 'Schedule tasks',
    ruins: 'Inspiration',
    library: 'Profile',
    merchant: 'Finance',
    manor: 'Relations',
  },
};
function demoFunctionLabel(id) {
  return (DEMO_FUNCTION_LABELS[currentLang] || DEMO_FUNCTION_LABELS.cn)[id] || '';
}

// ── 手机版界面状态持久化（活跃建筑 / 展开 section / 展开对话） ──
const LS_MOBILE_STATE = 'mosphere.demo.mobile';
function saveMobileUiState() {
  try {
    localStorage.setItem(LS_MOBILE_STATE, JSON.stringify({
      activeBuilding,
      openSections: [...openSections],
      openConvs: [...openConvs],
    }));
  } catch {}
}
function loadMobileUiState() {
  try {
    const s = JSON.parse(localStorage.getItem(LS_MOBILE_STATE) || 'null');
    if (!s) return;
    if (typeof s.activeBuilding === 'number') activeBuilding = s.activeBuilding;
    if (Array.isArray(s.openSections)) {
      openSections.clear();
      s.openSections.forEach(i => openSections.add(i));
    }
    if (Array.isArray(s.openConvs)) {
      openConvs.clear();
      s.openConvs.forEach(i => openConvs.add(i));
    }
  } catch {}
}

// Fixed color palette for buildings (by index)
const BUILDING_COLORS = ['#4ade80','#60a5fa','#fbbf24','#fb923c','#f87171','#d97706','#818cf8','#c084fc'];

const SECTIONS = {
  cn: [
    { icon: '📔', label: '梅梅日记',     tooltip: '梅琳娜每天凌晨写的观察日记。她眼中的褪色者，有主观判断，不是流水账。' },
    { icon: '🌊', label: '凝月之地',     tooltip: '梅琳娜的每周直觉备忘。记录"说不清楚但有感觉的东西"——跨天看下来觉得不对劲的、有规律的观察。' },
    { icon: '⏰', label: '大赐福·密室', tooltip: '褪色者的任务管理。本周待办、循环习惯、长期目标，由解指恩雅看护。' },
    { icon: '💡', label: '魔法学院',     tooltip: '褪色者的灵感收集站。瑟濂负责分类存档，按战技、探索、装备、魔法等标签整理。' },
    { icon: '💊', label: '蔷薇教堂',     tooltip: '褪色者的身体与状态数据。饮食、睡眠、体重、运动记录，由白面具梵雷看护。' },
    { icon: '📊', label: '圆桌厅堂',     tooltip: '褪色者的战略分析与资产交易记录。基甸负责复盘和持仓管理。' },
    { icon: '💰', label: '埃雷教堂',     tooltip: '褪色者的收支流水。卢恩的来源与去向，由流浪商人记账。' },
    { icon: '📚', label: '黄金树大教堂', tooltip: '褪色者的个人档案。已确认的事实、梅琳娜的推断、其他NPC的评价，由柯林管理。' },
    { icon: '🌋', label: '火山官邸',     tooltip: '菈雅管理的人物档案。记录褪色者在交界地遇见的至交、战友、伙伴、熟人、路人，各自归档。' },
    { icon: '🏛️', label: '大书库',       tooltip: '每日客观数据自动聚合。天气、睡眠、消费、完成事项，零AI参与，纯数字记录。' },
    { icon: '📋', label: '巡逻报告',     tooltip: '梅琳娜定时巡查各建筑后生成的简报。包含各建筑近期动态和本周习惯任务完成情况。' },
  ],
  en: [
    { icon: '📔', label: "Melina's Journal",   tooltip: "Melina's daily observation journal, written each night. Her view of the Tarnished — subjective, with real opinions." },
    { icon: '🌊', label: 'Moongazing Grounds', tooltip: "Melina's weekly intuition memo. Things she noticed across the week that feel significant but hard to explain." },
    { icon: '⏰', label: 'Inner Sanctum',      tooltip: "The Tarnished's task management. Weekly to-dos, recurring habits, long-term goals, maintained by Enia the Finger Reader." },
    { icon: '💡', label: 'Academy',            tooltip: "The Tarnished's idea collection. Sellen categorizes and archives ideas by tags like combat arts, exploration, equipment, and magic." },
    { icon: '💊', label: 'Rose Church',        tooltip: "The Tarnished's physical and behavioral data. Diet, sleep, weight, exercise records, maintained by White Mask Varré." },
    { icon: '📊', label: 'Roundtable Hold',    tooltip: 'Strategic analysis and asset trading records. Gideon handles reviews and position management.' },
    { icon: '💰', label: "Church of Elleh",    tooltip: "The Tarnished's financial ledger. Rune income and expenses, tracked by the Nomadic Merchant." },
    { icon: '📚', label: 'Erdtree Sanctuary',  tooltip: "The Tarnished's personal archive. Confirmed facts, Melina's inferences, and assessments from other NPCs, managed by Brother Corhyn." },
    { icon: '🌋', label: 'Volcano Manor',      tooltip: "Rya's people registry. Soul-bound, comrades, companions, acquaintances, passersby — each filed in her hand." },
    { icon: '🏛️', label: 'Grand Library',      tooltip: 'Daily objective data, auto-aggregated. Weather, sleep, expenses, completed tasks. Zero AI involvement, pure numbers.' },
    { icon: '📋', label: 'Patrol Report',      tooltip: "Melina's periodic building inspection briefing. Includes recent activity from each building and weekly habit task completion status." },
  ]
};

const L = {
  cn: {
    buildings: '⚡ 建筑活跃度',
    buildingsTooltip: '交界地各建筑最近的使用频率。数字越高说明褪色者最近常去那栋建筑。',
    conversations: '💬 示范对话',
    conversationsTooltip: '褪色者与交界地居民的实际交流记录。可转接不同建筑与对应NPC对话。',
    headerTooltip: '褪色者的个人中枢。梅琳娜在此观察、记录、做出判断。',
    headerSubtitle: '个人 AI 助手系统 · 本地优先 · 所有数据均为虚构演示',
    statusRunning: '运行中',
    uptime: '运行', backup: '备份',
    today: '今日', sevenD: '7日共',
    thisWeek: '本周', thisMonth: '本月', longTerm: '远期', habits: '习惯',
    done: '已完成', pending: '未完成',
    openPos: '持仓中', closedPos: '近期平仓',
    income: '收入', expense: '支出', net: '净额', currency: '卢恩',
    recentTx: '最近收支',
    confirmed: '✅ 已确认', inferred: '🔍 推断', external: '🌐 外部',
    diet: '饮食', sleep: '睡眠', weight: '体重', bath: '洗澡',
    exercise: '运动', steps: '步数',
    homeCooked: '自煮', bodyFat: '体脂',
    timesUnit: '次', stepsUnit: '步/日均',
    toggleTo: 'EN',
    tradeUnit: '笔',
    historyTotal: '历史共',
    storageMain: '随身包', storageSD: '木箱',
    fixedAssets: '固定资产', totalValuation: '总估值',
    viewMobile: '📱 手机版', viewDesktop: '🖥️ 桌面版',
  },
  en: {
    buildings: '⚡ Building Activity',
    buildingsTooltip: 'Recent usage frequency of each building in the Lands Between. Higher numbers mean the Tarnished visits that building more often.',
    conversations: '💬 Demo Conversations',
    conversationsTooltip: 'Real exchanges between the Tarnished and residents of the Lands Between. You can transfer between buildings to talk to different NPCs.',
    headerTooltip: "The Tarnished's personal hub. Melina observes, records, and makes decisions here.",
    headerSubtitle: 'Personal AI assistant OS · Local-first · All data is fictional',
    statusRunning: 'Running',
    uptime: 'Uptime', backup: 'Backup',
    today: 'Today', sevenD: '7d total ',
    thisWeek: 'This Week', thisMonth: 'This Month', longTerm: 'Long Term', habits: 'Habits',
    done: 'Done', pending: 'Pending',
    openPos: 'Open Positions', closedPos: 'Recently Closed',
    income: 'Income', expense: 'Expense', net: 'Net', currency: 'CAD',
    recentTx: 'Recent Transactions',
    confirmed: '✅ Confirmed', inferred: '🔍 Inferred', external: '🌐 External',
    diet: 'Meals', sleep: 'Sleep', weight: 'Weight', bath: 'Bath',
    exercise: 'Exercise', steps: 'Steps',
    homeCooked: 'Home-cooked', bodyFat: 'Body fat',
    timesUnit: '×', stepsUnit: 'steps/day',
    toggleTo: '中',
    viewMobile: '📱 Mobile', viewDesktop: '🖥️ Desktop',
    tradeUnit: '',
    historyTotal: 'Total ',
    storageMain: 'Pouch', storageSD: 'Chest',
    fixedAssets: 'Fixed Assets', totalValuation: 'Total Valuation',
  }
};

function formatBackupDate(iso, lang) {
  if (!iso) return '';
  const parts = iso.split('-');
  return parts.length === 3 ? `${parts[1]}-${parts[2]}` : iso;
}

// ── Tooltip Helper ──
function infoIcon(text) {
  if (!text) return '';
  return `<span class="tooltip-wrapper" onclick="event.stopPropagation()">` +
    `<span class="info-icon">ⓘ</span>` +
    `<span class="tooltip-text">${text}</span>` +
    `</span>`;
}

// ── Init ──
async function init() {
  await loadData();
  // 恢复上次手机版状态（手机版默认所有 conv 折叠，桌面版在 renderDesktop 里另设默认）
  loadMobileUiState();
  loadDemoFlipState();
  render();
  wireViewSwitch();
}

function wireViewSwitch() {
  document.querySelectorAll('.view-switch .view-opt').forEach(btn => {
    if (btn.dataset.wired) return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', () => {
      const v = btn.dataset.view;
      if (!v) return;
      try { localStorage.setItem('demo_view', v); } catch(e) {}
      if (v === 'desktop' && !document.body.classList.contains('view-desktop')) {
        location.replace('desktop.html');
      } else if (v === 'mobile' && document.body.classList.contains('view-desktop')) {
        location.replace('./');
      }
    });
  });
}

async function loadData() {
  // 数据 JSON 不在 HTML cache-bust 链上，单独防缓存
  const resp = await fetch(`data/demo_${currentLang}.json?v=20260424u`, { cache: 'no-cache' });
  data = await resp.json();
}

function setLang(lang) {
  if (lang === currentLang) return;
  currentLang = lang;
  // 切语言保留所有界面状态（activeBuilding / openSections / openConvs）
  // 索引基础不变，只是文本内容跨语言渲染
  loadData().then(render);
}
// 兼容旧入口
function toggleLang() { setLang(currentLang === 'cn' ? 'en' : 'cn'); }

// ── Data helpers (normalize CN new format vs EN old format) ──
function getMeta() {
  if (data.meta) return {
    title: data.meta.title,
    subtitle: data.meta.subtitle,
    status: data.meta.status,
    uptime: data.meta.uptime,
    backup: data.meta.backup_date,
    storageMain: data.meta.storage_main,
    storageSD: data.meta.storage_sd,
  };
  const ss = data.system_status;
  return { title: null, subtitle: null, status: ss.status, uptime: ss.uptime, backup: ss.last_backup };
}

function getBuildings() {
  return data.buildings.map((b, i) => ({
    id: b.id || `b${i}`,
    name: b.name,
    npc_name: b.npc_name,
    npc_handle: b.npc_title || b.npc_handle,
    emoji: b.emoji,
    color: b.color || BUILDING_COLORS[i % BUILDING_COLORS.length],
    today: b.today_calls ?? b.activity_today ?? 0,
    week:  b.week_calls  ?? b.activity_7d   ?? 0,
    history: b.history_calls ?? b.total_calls  ?? null,
    sparkline: b.sparkline || b.daily_counts || [],
    description: b.description,
    recent_logs: (b.recent_logs || []).map(l => ({
      date: l.date || '',
      time: l.time || '',
      summary: l.summary,
    })),
  }));
}

// ── Main Render ──
function render() {
  const lbl = L[currentLang];
  const meta = getMeta();

  // Header
  const titleEl = document.getElementById('main-title');
  const titleText = meta.title || (currentLang === 'cn' ? 'MoSphere · 赐福点' : 'MoSphere · Site of Grace');
  // 标题旁的 demo 说明 tooltip — 仅桌面版显示，手机版省略保持简洁
  const demoTip = currentLang === 'cn'
    ? '本页面为 MoSphere 项目演示，所有数据均为虚构，采用《艾尔登法环》世界观包装。MoSphere 是一个个人 AI 操作系统项目。'
    : 'This page is a MoSphere project demo. All data is fictional, themed in the Elden Ring universe. MoSphere is a personal AI operating system.';
  const isDesktop = document.body.classList.contains('view-desktop');
  titleEl.innerHTML = isDesktop ? `${titleText}${infoIcon(demoTip)}` : titleText;
  document.getElementById('header-subtitle').textContent = lbl.headerSubtitle;

  // lang-switch active state
  document.querySelectorAll('.lang-opt').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });
  // body 语言 class，给 CSS 做英文字号细调
  document.body.classList.toggle('lang-en', currentLang === 'en');
  document.body.classList.toggle('lang-cn', currentLang === 'cn');
  // view-switch 按钮双语文字
  document.querySelectorAll('.view-opt').forEach(btn => {
    const v = btn.dataset.view;
    if (v === 'mobile')  btn.textContent = lbl.viewMobile;
    if (v === 'desktop') btn.textContent = lbl.viewDesktop;
  });
  const statusLabel = currentLang === 'cn' ? '状态' : 'Status';
  document.getElementById('status-bar').innerHTML =
    `<div class="status-item"><span class="label">${statusLabel}</span><span class="value"><span class="status-dot"></span>${lbl.statusRunning}</span></div>` +
    `<div class="status-item"><span class="label">⏱ ${lbl.uptime}</span><span class="value">${meta.uptime}</span></div>` +
    (meta.storageMain ? `<div class="status-item"><span class="label">🎒 ${lbl.storageMain}</span><span class="value">${meta.storageMain}</span></div>` : '') +
    (meta.storageSD   ? `<div class="status-item"><span class="label">📦 ${lbl.storageSD}</span><span class="value">${meta.storageSD}</span></div>` : '');

  const footerEl = document.getElementById('footer-text');
  if (footerEl) {
    footerEl.textContent = currentLang === 'cn'
      ? '本页面为 MoSphere 项目演示，所有数据均为虚构，采用《艾尔登法环》世界观包装。MoSphere 是一个个人 AI 操作系统项目。'
      : 'Demo with fictional data. MoSphere is a personal AI OS project.';
  }
  renderConvAccordion();
  renderBuildings();
  renderAccordion();
}

// ── Buildings ──
function renderBuildings() {
  const lbl = L[currentLang];
  const sorted = getBuildings().sort((a, b) => b.today - a.today);
  const grid = document.getElementById('buildings-grid');

  const cards = sorted.map((b, i) => {
    const isActive = i === activeBuilding;
    const grade = i < 3 ? 1 : i < 6 ? 2 : 3;

    const BW = 7, GAP = 2, SH = 24;
    const max = Math.max(...b.sparkline, 1);
    const svgW = b.sparkline.length * (BW + GAP) - GAP;
    const bars = b.sparkline.map((v, j) => {
      const h = v > 0 ? Math.max(Math.round((v / max) * SH), 1) : 0;
      const op = j === b.sparkline.length - 1 ? '1' : '0.65';
      return `<rect x="${j*(BW+GAP)}" y="${SH-h}" width="${BW}" height="${h}" fill="currentColor" opacity="${op}" rx="1"/>`;
    }).join('');

    const flipClass = demoCardFlipClass(b.id);
    return `
      <div class="building-card grade-${grade} ${isActive ? 'active' : ''} ${flipClass}"
           data-id="${b.id}"
           onclick="toggleBuilding(${i}, '${b.id}')">
        <div class="card-flip-container">
          <div class="card-front">
            <div class="card-name">${b.emoji}${b.name}</div>
            <div class="card-npc">${b.npc_handle}</div>
            <div class="bf-logo-wrap">${demoBuildingLogoSvg(b.id)}</div>
            <div class="bf-spacer"></div>
            <div class="bf-est">${demoFunctionLabel(b.id)}</div>
          </div>
          <div class="card-back">
            <div class="card-name">${b.emoji}${b.name}</div>
            <div class="card-npc">${b.npc_handle}</div>
            <div class="card-count">${b.today}</div>
            <div class="card-sub">${lbl.today} · ${lbl.sevenD}${b.week}${b.history != null ? `<br>${lbl.historyTotal}${b.history}` : ''}</div>
            <svg width="${svgW}" height="${SH}">${bars}</svg>
          </div>
        </div>
      </div>`;
  }).join('');

  grid.innerHTML = cards;
  renderBuildingDetail(sorted);
}

function toggleBuilding(idx, id) {
  // 翻面状态机
  if (id) demoHandleFlip(id);
  activeBuilding = activeBuilding === idx ? -1 : idx;
  saveMobileUiState();
  renderBuildings();
}

function renderBuildingDetail(sorted) {
  const el = document.getElementById('building-detail');
  if (!el) return; // 桌面版无此元素
  if (activeBuilding < 0 || activeBuilding >= sorted.length) {
    el.style.display = 'none';
    return;
  }
  const b = sorted[activeBuilding];
  el.style.display = 'block';
  el.innerHTML = `
    <div class="detail-header">
      <span class="detail-emoji">${b.emoji}</span>
      <div>
        <div class="detail-name">${b.name}</div>
        <div class="detail-npc">${b.npc_name} ${b.npc_handle}</div>
      </div>
    </div>
    <div class="detail-desc">${b.description}</div>
    ${b.recent_logs.map(l =>
      `<div class="log-row"><span class="log-time">${l.date}${l.time ? ' ' + l.time : ''}</span><span class="log-summary">${l.summary}</span></div>`
    ).join('')}
    ${b.recent_logs.length < 5 ? `<div style="text-align:center;color:var(--text-dim);font-size:0.72rem;font-style:italic;margin-top:8px;padding-top:6px;border-top:1px solid var(--border)">—— 近三日无更多记录 ——</div>` : ''}
  `;
}

// ── Accordion ──
function renderAccordion() {
  const sections = SECTIONS[currentLang];
  const renderers = [
    renderDiary, renderReflection,
    renderSchedule, renderInspirations, renderHealth,
    renderTrades, renderFinance, renderArchive, renderTeahouse,
    renderChronicle, renderPatrol
  ];
  const container = document.getElementById('accordion');
  container.innerHTML = sections.map((s, i) => {
    const isOpen = openSections.has(i);
    return `
      <div class="accordion-item" id="acc-item-${i}">
        <div class="accordion-header ${isOpen ? 'open' : ''}" onclick="toggleAccordion(${i})">
          <span class="accordion-title">${s.icon} ${s.label}${infoIcon(s.tooltip)}</span>
          <span class="accordion-chevron">▾</span>
        </div>
        <div class="accordion-body ${isOpen ? 'open' : ''}" id="acc-body-${i}">
          ${isOpen ? renderers[i]() : ''}
        </div>
      </div>`;
  }).join('');
}

function toggleAccordion(i) {
  const renderers = [
    renderDiary, renderReflection,
    renderSchedule, renderInspirations, renderHealth,
    renderTrades, renderFinance, renderArchive, renderTeahouse,
    renderChronicle, renderPatrol
  ];
  const header = document.querySelector(`#acc-item-${i} .accordion-header`);
  const body   = document.getElementById(`acc-body-${i}`);
  if (openSections.has(i)) {
    openSections.delete(i);
    header.classList.remove('open');
    body.classList.remove('open');
  } else {
    openSections.add(i);
    header.classList.add('open');
    body.innerHTML = renderers[i]();
    body.classList.add('open');
  }
  saveMobileUiState();
}

// ── Section Renderers ──

function renderDiary() {
  const list = data.diary || [];
  const renderEntry = d => {
    const meta = [d.weekday, d.weather].filter(Boolean).join('　');
    return `<div style="margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #2a2a2a">
      <div style="color:var(--gold);font-weight:600;margin-bottom:2px">
        ${d.date}
        ${meta ? `<span style="color:var(--text-dim);font-weight:400;font-size:0.75rem">　${meta}</span>` : ''}
        ${d.mood ? `<span style="color:var(--text-dim);font-weight:400;font-size:0.75rem">　${d.mood}</span>` : ''}
      </div>
      <div style="font-size:0.92rem;line-height:1.5;color:var(--text-primary)">${d.content}</div>
    </div>`;
  };
  const recent = list.slice(0, 3).map(renderEntry).join('');
  const older = list.slice(3);
  const olderLabel = currentLang === 'cn' ? '📚 更多' : '📚 More';
  const olderHtml = older.length
    ? `<details class="diary-older"><summary>${olderLabel}  <span style="color:var(--text-dim);font-weight:400">${older.length}</span></summary>
        <div class="diary-older-body">${older.map(renderEntry).join('')}</div>
      </details>`
    : '';
  return recent + olderHtml;
}

function renderReflection() {
  const list = data.reflections || data.reflection || [];
  return list.map(r => `
    <div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #2a2a2a">
      <div style="color:var(--gold);font-weight:600">${r.week}
        ${r.date_range ? `<span style="color:var(--text-dim);font-weight:400;font-size:0.75rem">　${r.date_range}</span>` : ''}
      </div>
      <div style="color:var(--text-dim);font-size:0.72rem;margin-bottom:8px">${r.written_at || r.created_at || ''}</div>
      <div style="font-size:0.92rem;line-height:1.5;white-space:pre-line">${r.content}</div>
    </div>`
  ).join('');
}

function renderChronicle() {
  const list = data.chronicle || [];
  const renderEntry = c => {
    const meta = [c.weekday, c.weather].filter(Boolean).join('　');
    const tags = [];
    if (c.sleep)   tags.push(`😴 ${c.sleep}`);
    if (c.expense) tags.push(`💰 ${c.expense}卢恩`);
    const tagsHtml = tags.length
      ? `<span style="color:var(--text-secondary);font-size:0.75rem;margin-left:10px">${tags.join('　')}</span>`
      : '';
    const completed = (c.completed || []).map(t =>
      `<span style="color:var(--green);font-size:0.75rem;margin-right:8px">✓ ${t}</span>`
    ).join('');
    const summaries = (c.summary || [c.content]).filter(Boolean).map(s =>
      `<div style="font-size:0.92rem;line-height:1.6">${s}</div>`
    ).join('');
    return `<div style="margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid #2a2a2a">
      <div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;margin-bottom:2px">
        <span style="color:var(--gold);font-weight:600">${c.date}</span>
        ${meta ? `<span style="color:var(--text-secondary);font-size:0.75rem">　${meta}</span>` : ''}
        ${tagsHtml}
      </div>
      ${completed ? `<div style="margin-bottom:2px">${completed}</div>` : ''}
      ${summaries}
    </div>`;
  };
  const recent = list.slice(0, 5).map(renderEntry).join('');
  const older = list.slice(5);
  const olderLabel = currentLang === 'cn' ? '📚 更多' : '📚 More';
  const olderHtml = older.length
    ? `<details class="diary-older"><summary>${olderLabel}  <span style="color:var(--text-dim);font-weight:400">${older.length}</span></summary>
        <div class="diary-older-body">${older.map(renderEntry).join('')}</div>
      </details>`
    : '';
  return recent + olderHtml;
}

function renderSchedule() {
  const lbl = L[currentLang];
  const s = data.schedule;
  const dotClass = { high: 'pdot-high', medium: 'pdot-medium', low: 'pdot-low' };

  function row(t) {
    const done = t.status === 'done';
    const pClass = done ? 'pdot-done' : (dotClass[t.priority] || 'pdot-medium');
    return `<div class="data-row">
      <span class="pdot ${pClass}"></span>
      <span class="dr-main ${done ? 'done-task' : ''}">${t.task}</span>
      ${t.deadline ? `<span class="dr-meta">${t.deadline}</span>` : ''}
    </div>`;
  }

  function habitRow(t) {
    const done = t.status === 'done';
    const overdue = !done && (t.days_overdue ?? 0) > 14;
    const light = done ? '🟢' : overdue ? '🔴' : '🟡';
    return `<div class="data-row">
      <span style="font-size:0.8rem">${light}</span>
      <span class="dr-main ${done ? 'done-task' : ''}">${t.task}</span>
      ${t.completed_date ? `<span class="dr-meta">${t.completed_date}</span>` : ''}
    </div>`;
  }

  const habits = s.habits || s.recurring || [];
  const thisMonth = s.this_month || [];
  const longTerm = s.long_term || [];

  function fold(label, items, renderFn, openByDefault = false) {
    if (!items.length) return '';
    return `<details class="sched-fold"${openByDefault ? ' open' : ''}>
      <summary>${label}  <span style="color:var(--text-dim);font-weight:400">${items.length}</span></summary>
      <div class="sched-fold-body">${items.map(renderFn).join('')}</div>
    </details>`;
  }
  return `
    <div class="sub-header">${lbl.thisWeek}</div>${(s.this_week || []).map(row).join('')}
    ${fold(lbl.habits, habits, habitRow)}
    ${fold(lbl.thisMonth, thisMonth, row, true)}
    ${fold(lbl.longTerm, longTerm, row)}
  `;
}

function renderInspirations() {
  const list = data.inspirations || [];
  const EXPAND = new Set(['战技', '探索', 'Ash of War', 'Exploration']);

  function catBlock(cat, items, dotFn) {
    const done = items.filter(i => i.status === 'done').length;
    const isOpen = EXPAND.has(cat);
    const header = `${cat}  <span style="color:var(--text-dim);font-weight:400">${done}/${items.length}</span>`;
    const rows = items.map(item =>
      `<div class="data-row">
        ${dotFn(item)}
        <span class="dr-main ${item.status === 'done' ? 'insp-done' : ''}">${item.content}</span>
      </div>`
    ).join('');
    return `<details class="insp-fold"${isOpen ? ' open' : ''}>
      <summary>${header}</summary>
      <div class="insp-fold-body">${rows}</div>
    </details>`;
  }

  if (Array.isArray(list)) {
    const grouped = {};
    list.forEach(item => {
      const cat = item.category || '其他';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });
    return Object.entries(grouped).map(([cat, items]) =>
      catBlock(cat, items, i => `<span>${i.status === 'done' ? '✅' : '💡'}</span>`)
    ).join('');
  }
  return Object.entries(list).map(([cat, items]) =>
    catBlock(cat, items, i => `<span style="color:${i.status === 'done' ? 'var(--text-dim)' : 'var(--gold-dim)'}">${i.status === 'done' ? '✓' : '◆'}</span>`)
  ).join('');
}

function renderHealth() {
  const lbl = L[currentLang];
  const h = data.health;
  if (!h) return '<div style="color:var(--text-dim)">暂无数据</div>';

  // CN new format
  if (h.diet) {
    const d = h.diet || {};
    const sl = h.sleep || {};
    const w = h.weight || {};
    const ba = h.bath || {};
    const ex = h.exercise || {};
    const st = h.steps || {};

    const dietMain = `🍳 ${d.home_cooked ?? '—'} · 🛵 ${d.delivery ?? 0} · 🥡 ${d.takeout ?? 0}`;
    const dietMeta = d.home_ratio ? `${lbl.homeCooked} ${d.home_ratio}` : '';
    const weightMeta = `${w.change ?? ''}${w.body_fat ? `　${lbl.bodyFat} ${w.body_fat} ${w.fat_change ?? ''}` : ''}`;
    return `
      <div class="data-row health-row">
        <span class="dr-label-big">${lbl.diet}</span>
        <span class="dr-main">${dietMain}</span>
        <span class="dr-meta">${dietMeta}</span>
      </div>
      <div class="data-row health-row">
        <span class="dr-label-big">${lbl.sleep}</span>
        <span class="dr-main"><strong>${sl.average ?? '—'}</strong></span>
        <span class="dr-meta">${sl.trend ?? ''}</span>
      </div>
      <div class="data-row health-row">
        <span class="dr-label-big">${lbl.weight}</span>
        <span class="dr-main"><strong>${w.current ?? '—'}</strong></span>
        <span class="dr-meta">${weightMeta}</span>
      </div>
      <div class="data-row health-row">
        <span class="dr-label-big">${lbl.bath}</span>
        <span class="dr-main">🛁 ${ba.bath ?? 0} · 🚿 ${ba.shower ?? 0}</span>
      </div>
      <div class="data-row health-row">
        <span class="dr-label-big">${lbl.exercise}</span>
        <span class="dr-main"><strong>${ex.count ?? 0}</strong> ${lbl.timesUnit}</span>
        <span class="dr-meta">${ex.trend ?? ''}</span>
      </div>
      <div class="data-row health-row">
        <span class="dr-label-big">${lbl.steps}</span>
        <span class="dr-main"><strong>${(st.average ?? 0).toLocaleString()}</strong> ${lbl.stepsUnit}</span>
        <span class="dr-meta">${st.trend ?? ''}</span>
      </div>
      ${h.notes ? `<div style="margin-top:10px;font-size:0.75rem;color:var(--text-dim);font-style:italic;text-align:center">${h.notes}</div>` : ''}
    `;
  }

  // EN old format — mini bar charts
  function miniSvg(vals, max, color) {
    const BW = 7, GAP = 2, SH = 20;
    const w = vals.length * (BW + GAP) - GAP;
    const bars = vals.map((v, j) => {
      const h = v > 0 ? Math.max(Math.round((v / max) * SH), 1) : 0;
      const op = j === vals.length - 1 ? 1 : 0.6;
      return `<rect x="${j*(BW+GAP)}" y="${SH-h}" width="${BW}" height="${h}" fill="${color}" opacity="${op}" rx="1"/>`;
    }).join('');
    return `<svg width="${w}" height="${SH}" style="vertical-align:middle">${bars}</svg>`;
  }
  const slMax = Math.max(...(h.sleep?.recent_7d || [1]));
  const stMax = Math.max(...(h.steps?.recent_7d || [1]));
  return `
    <div class="sub-header">${lbl.sleep}</div>
    <div class="data-row">
      <span class="dr-main"><strong>${h.sleep?.avg_hours ?? '—'}h</strong></span>
      <span>${miniSvg(h.sleep?.recent_7d || [], slMax, '#60a5fa')}</span>
    </div>
    <div class="sub-header">${lbl.steps}</div>
    <div class="data-row">
      <span class="dr-main"><strong>${(h.steps?.avg_daily ?? 0).toLocaleString()}</strong></span>
      <span>${miniSvg(h.steps?.recent_7d || [], stMax, '#4ade80')}</span>
    </div>
    <div class="sub-header">${lbl.weight}</div>
    <div class="data-row">
      <span class="dr-main"><strong>${h.weight?.current ?? '—'} ${h.weight?.unit ?? ''}</strong></span>
    </div>
  `;
}

function renderTrades() {
  const lbl = L[currentLang];
  const t = data.trades;
  if (!t) return '';

  // CN new format: asset/type/direction/price/status, closed_positions with pnl as string
  const isNewFmt = t.open_positions?.[0]?.asset !== undefined;

  const openRows = (t.open_positions || []).map(p => {
    if (isNewFmt) {
      // status 在 data 里按西方惯例（🟢=profit / 🔴=loss / 其他=neutral）
      // CN 视图翻转：profit→🔴+红 / loss→🟢+绿；EN 视图按原值
      const isProfit = p.status === '🟢';
      const isLoss = p.status === '🔴';
      const priceColor = (!isProfit && !isLoss) ? 'var(--text-dim)'
        : isProfit ? (currentLang === 'cn' ? '#f87171' : '#4ade80')
        : (currentLang === 'cn' ? '#4ade80' : '#f87171');
      const dot = (!isProfit && !isLoss) ? (p.status || '🟡')
        : isProfit ? (currentLang === 'cn' ? '🔴' : '🟢')
        : (currentLang === 'cn' ? '🟢' : '🔴');
      const cpStr = p.current_price != null ? `<span style="color:${priceColor};font-size:0.76rem;font-weight:600">${p.current_price.toLocaleString()}</span>` : '';
      return `<div class="data-row">
        <span class="data-dot">${dot}</span>
        <span class="dr-main">${p.asset}</span>
        <span class="dr-meta">${p.type} · ${p.direction}</span>
        <span style="color:var(--text-secondary);font-size:0.76rem">${p.price || '—'}</span>
        ${cpStr}
      </div>`;
    }
    const pnl = Math.round((p.current - p.open_price) * 100);
    const cls = pnl >= 0 ? 'c-green' : 'c-red';
    return `<div class="data-row">
      <span class="data-dot">🟡</span>
      <span class="dr-main">${p.symbol}</span>
      <span class="dr-meta">${p.direction} · ${p.strategy}</span>
      <span class="${cls}">${pnl >= 0 ? '+' : ''}$${pnl}</span>
    </div>`;
  }).join('');

  const closedList = t.closed_positions || t.recent_closed || [];
  const closedRows = closedList.map(p => {
    if (isNewFmt) {
      // CN: 红涨绿跌（profit=🔴+红 / loss=🟢+绿）；EN: 反过来（profit=🟢+绿 / loss=🔴+红）
      const profitColor = currentLang === 'cn' ? '#f87171' : '#4ade80';
      const lossColor   = currentLang === 'cn' ? '#4ade80' : '#f87171';
      const pnlColor = p.profit === true ? profitColor : lossColor;
      const dot = p.profit === true ? (currentLang === 'cn' ? '🔴' : '🟢') : (currentLang === 'cn' ? '🟢' : '🔴');
      const breakdownStr = p.breakdown
        ? `<span style="font-size:0.76rem">${p.breakdown}</span>` : '';
      const pnlStr = p.pnl_display
        ? `<span style="color:${pnlColor};font-size:0.76rem;font-weight:600">${p.pnl_display}</span>` : '';
      return `<div class="data-row">
        <span class="data-dot">${dot}</span>
        <span class="dr-main">${p.asset}</span>
        <span class="dr-meta">${p.type} · ${p.date}</span>
        ${breakdownStr}${pnlStr}
      </div>`;
    }
    return `<div class="data-row">
      <span class="data-dot">${p.pnl >= 0 ? '🟢' : '🔴'}</span>
      <span class="dr-main">${p.symbol}</span>
      <span class="dr-meta">${p.direction} · ${p.closed_date}</span>
      <span class="${p.pnl >= 0 ? 'c-green' : 'c-red'}">${p.pnl >= 0 ? '+' : ''}$${p.pnl}</span>
    </div>`;
  }).join('');

  return `
    <div class="sub-header">${lbl.openPos}  <span style="color:var(--text-dim);font-weight:400">${(t.open_positions||[]).length}${lbl.tradeUnit ? ' ' + lbl.tradeUnit : ''}</span></div>
    ${openRows || '<div style="color:var(--text-dim);font-size:0.8rem;padding:4px 0">暂无</div>'}
    <div class="sub-header">${lbl.closedPos}</div>
    ${closedRows || '<div style="color:var(--text-dim);font-size:0.8rem;padding:4px 0">暂无</div>'}
  `;
}

function renderFinance() {
  const lbl = L[currentLang];
  const f = data.finance;
  if (!f) return '';

  // CN new format: monthly_income / monthly_expense / net / currency as top-level
  const isNewFmt = f.monthly_income !== undefined;
  const income  = isNewFmt ? f.monthly_income  : f.monthly_summary?.income;
  const expense = isNewFmt ? f.monthly_expense : f.monthly_summary?.expense;
  const net     = isNewFmt ? f.net             : f.monthly_summary?.net;
  const currency = isNewFmt ? (f.currency || lbl.currency) : (f.monthly_summary?.currency || 'CAD');

  // CN: 红涨绿跌（income=红, expense=绿）；EN: 反过来（income=绿, expense=红），与 trades 同套规则
  const incomeCls  = currentLang === 'cn' ? 'c-red'   : 'c-green';
  const expenseCls = currentLang === 'cn' ? 'c-green' : 'c-red';
  const netCls = (net||0) >= 0 ? incomeCls : expenseCls;

  const txRows = (f.recent_transactions || []).map(tx => {
    const icon = tx.type === 'income' ? '💰' : '💸';
    const sign = tx.type === 'income' ? '+' : '-';
    const cls  = tx.type === 'income' ? incomeCls : expenseCls;
    const label = tx.description || tx.note || '';
    return `<div class="data-row">
      <span class="data-dot">${icon}</span>
      <span class="dr-main">${label}</span>
      <span class="dr-meta">${tx.date}</span>
      <span class="${cls}">${sign}${tx.amount.toLocaleString()}</span>
    </div>`;
  }).join('');

  return `
    <div class="summary-line">
      💰 ${lbl.income} <span class="${incomeCls}">${(income||0).toLocaleString()}</span> ${currency}　·
      💸 ${lbl.expense} <span class="${expenseCls}">${(expense||0).toLocaleString()}</span> ${currency}　·
      📊 ${lbl.net} <strong class="${netCls}">${(net||0) >= 0 ? '' : '-'}${Math.abs(net||0).toLocaleString()} ${currency}</strong>
    </div>
    ${txRows ? `<div class="sub-header">${lbl.recentTx}</div>${txRows}` : ''}
    ${isNewFmt && f.fixed_assets ? `<div class="sub-header">${lbl.fixedAssets}</div>
      <div class="data-row"><span class="dr-main">${lbl.totalValuation}</span><span class="c-gold"><strong>${f.fixed_assets.toLocaleString()} ${currency}</strong></span></div>
      ${f.fixed_assets_note ? `<div style="margin-top:6px;font-size:0.75rem;color:var(--text-dim);font-style:italic">${f.fixed_assets_note}</div>` : ''}` : ''}
  `;
}

function renderArchive() {
  const lbl = L[currentLang];
  const a = data.archive;
  if (!a) return '';
  function rows(items) {
    return (items || []).map(i =>
      `<div class="data-row"><span class="dr-label">${i.key}</span><span class="dr-main">${i.value}</span></div>`
    ).join('');
  }
  function group(title, items) {
    return `<div class="sub-header">${title}</div>` + rows(items);
  }
  function foldGroup(title, items) {
    if (!items || !items.length) return '';
    return `<details class="arch-fold">
      <summary>${title}  <span style="color:var(--text-dim);font-weight:400">${items.length}</span></summary>
      <div class="arch-fold-body">${rows(items)}</div>
    </details>`;
  }
  return group(lbl.confirmed, a.confirmed) + foldGroup(lbl.inferred, a.inferred) + foldGroup(lbl.external, a.external);
}

function renderTeahouse() {
  const t = data.teahouse;
  if (!t || !t.contacts || !t.contacts.length) return '<div style="color:var(--text-dim)">火山官邸尚无登记</div>';

  const ORDER_CN = ['至交', '战友', '伙伴', '熟人', '路人'];
  const ORDER_EN = ['Soul-Bound', 'Comrade', 'Companion', 'Acquaintance', 'Passerby'];
  const ORDER = currentLang === 'cn' ? ORDER_CN : ORDER_EN;
  const TIER_ICON = {
    '至交':'♛','战友':'♜','伙伴':'♝','熟人':'♞','路人':'♟',
    'Soul-Bound':'♛','Comrade':'♜','Companion':'♝','Acquaintance':'♞','Passerby':'♟'
  };
  const CAT_ICON = {
    '特质':'🔍','时间事件':'📅','社交关系':'💬',
    'Trait':'🔍','Event':'📅','Relation':'💬'
  };
  const LBL = currentLang === 'cn'
    ? { likes:'喜欢', dislikes:'不喜欢', goals:'目标' }
    : { likes:'Likes', dislikes:'Dislikes', goals:'Goals' };

  const byTier = {};
  for (const c of t.contacts) {
    const key = c.closeness || 'other';
    if (!byTier[key]) byTier[key] = [];
    byTier[key].push(c);
  }
  const orderedKeys = [
    ...ORDER.filter(k => byTier[k]),
    ...Object.keys(byTier).filter(k => !ORDER.includes(k))
  ];

  function tagRow(label, items, cls) {
    if (!items || !items.length) return '';
    const tags = items.map(i =>
      `<span class="contact-field tag-${cls}">${i}</span>`).join('');
    return `<div class="contact-tags"><span class="tag-label">${label}</span>${tags}</div>`;
  }

  // 剥掉 content 开头的重复日期（"04-01 夜，..." → "夜，..."）
  function stripLeadingDate(s) {
    return (s || '').replace(/^\d{2}-\d{2}[，,\s]*/, '');
  }

  function renderContact(c, isOpen) {
    const meta = [
      c.base_city ? `📍 ${c.base_city}` : '',
      c.company ? `· ${c.company}` : ''
    ].filter(Boolean).join(' ');
    const metaHtml = meta ? `<div style="color:var(--text-dim);font-size:0.82rem;margin-bottom:4px">${meta}</div>` : '';

    const likesHtml = tagRow(LBL.likes, c.likes, 'like');
    const dislikesHtml = tagRow(LBL.dislikes, c.dislikes, 'dislike');
    const goalsHtml = tagRow(LBL.goals, c.goals, 'goal');

    let obsHtml = '';
    if (c.observations && c.observations.length) {
      const byCat = {};
      for (const o of c.observations) {
        const k = o.category;
        if (!byCat[k]) byCat[k] = [];
        byCat[k].push(o);
      }
      obsHtml = Object.entries(byCat).map(([cat, list]) => {
        const icon = CAT_ICON[cat] || '•';
        return `<div style="margin-top:6px">
          <div style="color:var(--text-dim);font-size:0.8rem;font-weight:600;margin-bottom:2px">${icon} ${cat} · ${list.length}</div>
          ${list.map(o =>
            `<div class="data-row"><span class="log-time">${o.occurred_at || ''}</span><span class="log-summary">${stripLeadingDate(o.content)}</span></div>`
          ).join('')}
        </div>`;
      }).join('');
    }

    return `<details class="contact-item"${isOpen ? ' open' : ''}>
      <summary class="contact-name">${c.display_name}</summary>
      <div class="contact-body">
        ${metaHtml}
        ${likesHtml}${dislikesHtml}${goalsHtml}
        ${obsHtml}
      </div>
    </details>`;
  }

  let globalIdx = 0;
  return orderedKeys.map(key => {
    const group = byTier[key];
    const icon = TIER_ICON[key] || '·';
    const rendered = group.map(c => {
      const isOpen = globalIdx === 0; // 只展开第一个（至交：菈妮）
      globalIdx++;
      return renderContact(c, isOpen);
    }).join('');
    return `<div class="sub-header">${icon} ${key}  <span style="color:var(--text-dim);font-weight:400">${group.length}</span></div>` + rendered;
  }).join('');
}

function renderPatrol() {
  const p = data.patrol;
  if (!p) return '';

  // CN new format: buildings array + weekly_tasks
  if (p.buildings) {
    const EXPAND = new Set(['圆桌厅堂', 'Roundtable Hold']);
    const buildingRows = p.buildings.map(b => {
      const isOpen = EXPAND.has(b.name);
      return `<details class="patrol-fold"${isOpen ? ' open' : ''}>
        <summary>${b.name}  <span style="color:var(--text-dim);font-weight:400">${b.calls_3day}次 · 3日</span></summary>
        <div class="patrol-fold-body">
          ${b.logs.map(l =>
            `<div class="data-row"><span class="log-time">${l.date}</span><span class="log-summary">${l.summary}</span></div>`
          ).join('')}
        </div>
      </details>`;
    }).join('');

    const taskRows = (p.weekly_tasks || []).map(t =>
      `<div class="data-row">
        <span style="color:${t.status === 'done' ? 'var(--green)' : 'var(--text-dim)'}">${t.status === 'done' ? '🟢' : '🟡'}</span>
        <span class="dr-main ${t.status === 'done' ? 'done-task' : ''}">${t.task}</span>
        ${t.completed_date ? `<span class="dr-meta">${t.completed_date}</span>` : ''}
      </div>`
    ).join('');
    const tasksLabel = currentLang === 'cn' ? '习惯任务' : 'Weekly Habits';
    const doneCount = (p.weekly_tasks || []).filter(t => t.status === 'done').length;
    const totalCount = (p.weekly_tasks || []).length;

    return `
      <div style="color:var(--gold);font-weight:600;font-size:0.8rem;margin-bottom:10px">${p.timestamp}</div>
      ${buildingRows}
      ${taskRows ? `<details class="patrol-fold">
        <summary>${tasksLabel}  <span style="color:var(--text-dim);font-weight:400">${doneCount}/${totalCount}</span></summary>
        <div class="patrol-fold-body">${taskRows}</div>
      </details>` : ''}
      ${p.notes ? `<div style="margin-top:12px;font-size:0.75rem;color:var(--text-dim);font-style:italic;text-align:center">${p.notes}</div>` : ''}
    `;
  }

  // Old format: plain content string
  return `<div style="color:var(--gold);font-weight:600;font-size:0.8rem;margin-bottom:8px">${p.timestamp}</div>
          <div style="font-size:0.92rem;line-height:1.6;white-space:pre-line">${p.content}</div>`;
}

// ── Conversations ──
function renderConvAccordion() {
  const lbl = L[currentLang];
  document.getElementById('conv-accordion').innerHTML = `
    <div class="accordion-item" id="conv-outer-item">
      <div class="accordion-header ${openConvs.has(-1) ? 'open' : ''}" onclick="toggleConvOuter()">
        <span class="accordion-title">${lbl.conversations}${infoIcon(lbl.conversationsTooltip)}</span>
        <span class="accordion-chevron">▾</span>
      </div>
      <div class="accordion-body ${openConvs.has(-1) ? 'open' : ''}" id="conv-outer-body">
        ${openConvs.has(-1) ? renderConvBody() : ''}
      </div>
    </div>`;
}

function toggleConvOuter() {
  const header = document.querySelector('#conv-outer-item .accordion-header');
  const body   = document.getElementById('conv-outer-body');
  if (openConvs.has(-1)) {
    openConvs.delete(-1);
    header.classList.remove('open');
    body.classList.remove('open');
  } else {
    openConvs.add(-1);
    header.classList.add('open');
    body.innerHTML = renderConvBody();
    body.classList.add('open');
  }
  saveMobileUiState();
}

function renderConvBody() {
  const hint = currentLang === 'cn'
    ? '⬆️ 以上为系统示范对话。实际使用中褪色者可随时切换建筑与梅琳娜对话。'
    : '⬆️ The above are sample conversations. In practice, the Tarnished may switch between buildings and speak with Melina at any time.';
  return `<div class="chat-window" style="max-height:none">` +
    (data.conversations || []).map((conv, i) => {
      const isOpen = openConvs.has(i);
      return `
        <div class="conv-group" id="conv-group-${i}">
          <div class="conv-group-header ${isOpen ? 'open' : ''}" onclick="toggleConv(${i})">
            <span>${conv.title}</span>
            <span class="conv-chevron">▾</span>
          </div>
          <div class="conv-group-body ${isOpen ? 'open' : ''}" id="conv-body-${i}">
            ${isOpen ? renderMessages(conv.messages) : ''}
          </div>
        </div>`;
    }).join('') +
  `<div style="margin-top:12px;padding-top:10px;border-top:1px dashed var(--border);text-align:center;font-size:0.72rem;color:var(--text-dim)">${hint}</div>` +
  `</div>`;
}

function toggleConv(i) {
  const header = document.querySelector(`#conv-group-${i} .conv-group-header`);
  const body   = document.getElementById(`conv-body-${i}`);
  if (openConvs.has(i)) {
    openConvs.delete(i);
    header.classList.remove('open');
    body.classList.remove('open');
    body.innerHTML = '';
  } else {
    openConvs.add(i);
    header.classList.add('open');
    body.innerHTML = renderMessages(data.conversations[i].messages);
    body.classList.add('open');
  }
  saveMobileUiState();
}

// Sender name map（双语）
const SENDER_MAP = {
  tarnished: { role: 'user' },
  system:    { role: 'system' },
  melina:    { role: 'assistant', name: { cn: '梅琳娜',       en: 'Melina' } },
  gideon:    { role: 'assistant', name: { cn: '百智爵士基甸', en: 'Sir Gideon Ofnir' } },
  varre:     { role: 'assistant', name: { cn: '白面具梵雷',   en: 'White Mask Varré' } },
  sellen:    { role: 'assistant', name: { cn: '魔法师瑟濂',   en: 'Sorceress Sellen' } },
  enia:      { role: 'assistant', name: { cn: '解指恩雅',     en: 'Enia the Finger Reader' } },
};
function senderName(sender) {
  const entry = SENDER_MAP[sender];
  if (!entry || !entry.name) return sender || '';
  if (typeof entry.name === 'string') return entry.name;
  return entry.name[currentLang] || entry.name.cn || sender;
}

function renderMessages(messages) {
  return messages.map(msg => {
    // New CN format uses `sender` field
    const sender = msg.sender;
    const role = msg.role || (sender ? (SENDER_MAP[sender]?.role || 'assistant') : 'user');

    if (role === 'system') {
      return `<div class="chat-msg system"><div class="chat-bubble">${msg.content}</div></div>`;
    }
    if (role === 'user') {
      return `<div class="chat-msg user"><div class="chat-bubble">${msg.content}</div></div>`;
    }

    // assistant
    const npcName = msg.npc || senderName(sender);
    const prefix  = msg.prefix || '';
    const toolTag = msg.tool_call
      ? `<span style="font-size:0.68rem;color:var(--text-dim);background:rgba(200,170,110,0.08);padding:1px 5px;border-radius:3px;margin-left:6px">🔧 ${msg.tool_call}</span>`
      : '';
    const prefixHtml = prefix
      ? `<div style="font-size:0.68rem;color:var(--text-dim);margin-bottom:2px">${prefix}</div>`
      : '';

    return `<div class="chat-msg assistant"><div class="chat-bubble">${prefixHtml}<div class="chat-npc-label">${npcName}${toolTag}</div>${msg.content}</div></div>`;
  }).join('');
}

init();
