/* ═══════════════════════════════════════════
   desktop.js — 桌面版专属逻辑
   依赖 app.js 的全局变量/函数：data, currentLang, getBuildings,
   L, SECTIONS, renderDiary/..., renderConvAccordion, openConvs, etc.
   ═══════════════════════════════════════════ */

let desktopActiveBuilding = null; // index in sorted buildings

async function initDesktop() {
  // 等 app.js 的 init() 跑完 loadData
  // app.js init() 在底部自动调用，加载完 data 后 render()
  // 监听：简单轮询直到 data 就位
  let tries = 0;
  while (typeof data === 'undefined' || !data) {
    await new Promise(r => setTimeout(r, 50));
    if (++tries > 100) { console.error('desktop: data never loaded'); return; }
  }
  renderDesktop();
}

// 建筑 → tabs（每个 tab 一个 section render 函数）
// 单 tab = 直显无 tab bar；多 tab = 顶部 tab 切换
const BUILDING_TABS = {
  // 赐福点 / Site of Grace = 梅琳娜，吞 日记 + 凝月之地 + 巡逻
  '赐福点':         ['renderDiary', 'renderReflection', 'renderPatrol'],
  'Site of Grace':  ['renderDiary', 'renderReflection', 'renderPatrol'],
  // 大赐福·密室 吞 schedule + 大书库
  '大赐福·密室':    ['renderSchedule', 'renderChronicle'],
  'Inner Sanctum':  ['renderSchedule', 'renderChronicle'],
  // 其余建筑单 tab
  '圆桌厅堂':       ['renderTrades'],       'Roundtable Hold':   ['renderTrades'],
  '蔷薇教堂':       ['renderHealth'],       'Rose Church':       ['renderHealth'],
  '魔法学院':       ['renderInspirations'], 'Academy':           ['renderInspirations'],
  '黄金树大教堂':   ['renderArchive'],      'Erdtree Sanctuary': ['renderArchive'],
  '埃雷教堂':       ['renderFinance'],      'Church of Elleh':   ['renderFinance'],
  '火山官邸':       ['renderTeahouse'],     'Volcano Manor':     ['renderTeahouse'],
};

// 每个建筑当前 active tab 记忆
const _desktopTabState = {};

function renderDesktop() {
  renderDesktopBuildings();
  // conv 右列
  if (typeof renderConvAccordion === 'function') {
    renderConvAccordion();
    if (!openConvs.has(-1)) {
      openConvs.add(-1);
      const body = document.getElementById('conv-outer-body');
      const header = document.querySelector('#conv-outer-item .accordion-header');
      if (body && header && typeof renderConvBody === 'function') {
        body.innerHTML = renderConvBody();
        body.classList.add('open');
        header.classList.add('open');
      }
    }
  }
  renderDesktopMidBarAndLog();
  renderDesktopContent();
}

function renderDesktopContent() {
  const container = document.getElementById('accordion');
  if (!container) return;
  const sorted = getBuildings().sort((a, b) => b.today - a.today);
  const b = sorted[desktopActiveBuilding ?? 0];
  if (!b) { container.innerHTML = ''; return; }

  const tabs = BUILDING_TABS[b.name] || [];
  if (!tabs.length) {
    container.innerHTML = `<div style="color:var(--text-dim);font-size:0.85rem;padding:12px">该建筑暂无对应 section</div>`;
    return;
  }

  // 查找 section 标题（依赖 SECTIONS 数组顺序与 renderers[] 对齐）
  const sectionsList = (typeof SECTIONS !== 'undefined' && SECTIONS[currentLang]) || [];
  const rendererNames = ['renderDiary','renderReflection','renderSchedule','renderInspirations','renderHealth','renderTrades','renderFinance','renderArchive','renderTeahouse','renderChronicle','renderPatrol'];
  const tabMeta = tabs.map(fnName => {
    const idx = rendererNames.indexOf(fnName);
    const sec = idx >= 0 ? sectionsList[idx] : null;
    return { fnName, label: sec ? `${sec.icon} ${sec.label}` : fnName };
  });

  // 当前 tab
  let activeTab = _desktopTabState[b.name] ?? 0;
  if (activeTab >= tabs.length) activeTab = 0;
  _desktopTabState[b.name] = activeTab;

  const fnName = tabs[activeTab];
  const fn = typeof window[fnName] === 'function' ? window[fnName] : null;
  const body = fn ? fn() : '<div style="color:var(--text-dim)">—</div>';

  container.innerHTML = body;
}

function selectDesktopTab(buildingName, tabIdx) {
  _desktopTabState[buildingName] = tabIdx;
  renderDesktopContent();
  renderDesktopMidBarAndLog();
}

function renderDesktopBuildings() {
  const grid = document.getElementById('buildings-grid');
  if (!grid) return;
  const sorted = getBuildings().sort((a, b) => b.today - a.today);
  const lbl = L[currentLang];

  const cards = sorted.map((b, i) => {
    const grade = i < 2 ? 1 : i < 4 ? 2 : i < 6 ? 3 : 4;
    const BW = 6, GAP = 2, SH = 20;
    const max = Math.max(...b.sparkline, 1);
    const svgW = b.sparkline.length * (BW + GAP) - GAP;
    const bars = b.sparkline.map((v, j) => {
      const h = v > 0 ? Math.max(Math.round((v / max) * SH), 1) : 0;
      const op = j === b.sparkline.length - 1 ? '1' : '0.65';
      return `<rect x="${j*(BW+GAP)}" y="${SH-h}" width="${BW}" height="${h}" fill="currentColor" opacity="${op}" rx="1"/>`;
    }).join('');
    const isActive = desktopActiveBuilding === i;
    return `<div class="building-card grade-${grade}${isActive ? ' active' : ''}" data-idx="${i}" onclick="selectDesktopBuilding(${i})">
      <div class="card-name">${b.emoji} ${b.name}</div>
      <div class="card-npc">${b.npc_handle}</div>
      <div class="card-count">${b.today}</div>
      <div class="card-sub">${lbl.today} · ${lbl.sevenD}${b.week}${b.history != null ? `<br>${lbl.historyTotal}${b.history}` : ''}</div>
      <svg width="${svgW}" height="${SH}">${bars}</svg>
    </div>`;
  }).join('');
  grid.innerHTML = cards;

  // 默认选第一个（最活跃）
  if (desktopActiveBuilding === null) desktopActiveBuilding = 0;
}

function selectDesktopBuilding(i) {
  desktopActiveBuilding = i;
  document.querySelectorAll('#buildings-grid .building-card').forEach(el => {
    el.classList.toggle('active', Number(el.dataset.idx) === i);
  });
  renderDesktopMidBarAndLog();
  renderDesktopContent();
}

function renderDesktopMidBarAndLog() {
  const sorted = getBuildings().sort((a, b) => b.today - a.today);
  const b = sorted[desktopActiveBuilding ?? 0];
  if (!b) return;
  const enterTxt = currentLang === 'cn' ? `🚪 进入${b.name}` : `🚪 Enter ${b.name}`;

  const midBar = document.getElementById('mid-bar');
  if (midBar) {
    const tabs = BUILDING_TABS[b.name] || [];
    if (tabs.length > 1) {
      // multi-tab：mid-bar 装 tab 按钮 + 进入按钮
      const sectionsList = (typeof SECTIONS !== 'undefined' && SECTIONS[currentLang]) || [];
      const rendererNames = ['renderDiary','renderReflection','renderSchedule','renderInspirations','renderHealth','renderTrades','renderFinance','renderArchive','renderTeahouse','renderChronicle','renderPatrol'];
      const activeTab = _desktopTabState[b.name] ?? 0;
      const tabBtns = tabs.map((fnName, i) => {
        const idx = rendererNames.indexOf(fnName);
        const sec = idx >= 0 ? sectionsList[idx] : null;
        const label = sec ? `${sec.icon} ${sec.label}` : fnName;
        const safeName = b.name.replace(/'/g, "\\'");
        return `<button type="button" class="mb-tab${i === activeTab ? ' active' : ''}" onclick="selectDesktopTab('${safeName}', ${i})">${label}</button>`;
      }).join('');
      midBar.innerHTML = `
        <div class="mb-tabs">${tabBtns}</div>
        <div class="mb-enter" title="demo 不支持进入建筑">${enterTxt}</div>
      `;
    } else {
      midBar.innerHTML = `
        <div class="mb-name">${b.emoji} ${b.name}</div>
        <div class="mb-enter" title="demo 不支持进入建筑">${enterTxt}</div>
      `;
    }
  }

  const logArea = document.getElementById('log-area');
  if (logArea) {
    const rows = (b.recent_logs || []).map(l =>
      `<div class="log-row">
        <span class="log-time">${l.date || ''}${l.time ? ' ' + l.time : ''}</span>
        <span class="log-summary">${l.summary}</span>
      </div>`
    ).join('');
    logArea.innerHTML = rows || '<div style="color:var(--text-dim);font-size:0.78rem">—— 暂无记录 ——</div>';
  }
}

// 监听 app.js 的 loadData + render 完成（lang 切换时）
const _origRender = typeof render === 'function' ? render : null;
if (_origRender) {
  window.render = function(...args) {
    const r = _origRender.apply(this, args);
    // 切语言后重新布置桌面元素
    renderDesktop();
    return r;
  };
}

// 全局等比缩放：设计基准 1536×864（= 1920×1080 @ 125% DPI 的 CSS viewport）
function fitDashboardScale() {
  if (!document.body.classList.contains('view-desktop')) {
    document.documentElement.style.setProperty('--app-scale', 1);
    return;
  }
  const DESIGN_W = 1536, DESIGN_H = 864;
  const scale = Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H);
  document.documentElement.style.setProperty('--app-scale', scale);
}
window.addEventListener('resize', fitDashboardScale);
fitDashboardScale();

// 启动
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { fitDashboardScale(); initDesktop(); });
} else {
  fitDashboardScale();
  initDesktop();
}
