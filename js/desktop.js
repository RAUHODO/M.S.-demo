/* ═══════════════════════════════════════════
   desktop.js — 桌面版专属逻辑
   依赖 app.js 的全局变量/函数：data, currentLang, getBuildings,
   L, SECTIONS, renderDiary/..., renderConvAccordion, openConvs, etc.
   ═══════════════════════════════════════════ */

let desktopActiveBuilding = null; // index in sorted buildings
let _desktopFirstConvSeeded = false; // 首次进桌面版预展开第一段对话

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

// 每个建筑当前 active tab 记忆（按 id 索引，跨语言切换保留）
const _desktopTabState = {};

function renderDesktop() {
  renderDesktopBuildings();
  // conv 右列：桌面版强制展开 + 不可收起；首次也预展第一段
  if (typeof renderConvAccordion === 'function') {
    openConvs.add(-1);
    if (!_desktopFirstConvSeeded) { openConvs.add(0); _desktopFirstConvSeeded = true; }
    renderConvAccordion();
    const header = document.querySelector('#conv-outer-item .accordion-header');
    const body   = document.getElementById('conv-outer-body');
    if (header && body && typeof renderConvBody === 'function') {
      header.classList.add('open');
      body.classList.add('open');
      body.innerHTML = renderConvBody();
      // 拆掉点击 toggle，加 .static 标记给 CSS 隐藏 chevron
      header.removeAttribute('onclick');
      header.style.cursor = 'default';
      header.classList.add('static');
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

  // 当前 tab（按 building id 索引，跨语言切换保留）
  let activeTab = _desktopTabState[b.id] ?? 0;
  if (activeTab >= tabs.length) activeTab = 0;
  _desktopTabState[b.id] = activeTab;

  const fnName = tabs[activeTab];
  const fn = typeof window[fnName] === 'function' ? window[fnName] : null;
  const body = fn ? fn() : '<div style="color:var(--text-dim)">—</div>';

  container.innerHTML = body;
}

function selectDesktopTab(buildingId, tabIdx) {
  _desktopTabState[buildingId] = tabIdx;
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
    // tooltip 文字优先用 SECTIONS 里和建筑同名 section 的描述，没有就退到 b.description
    const sections = (typeof SECTIONS !== 'undefined' && SECTIONS[currentLang]) || [];
    const matchSec = sections.find(s => s.label === b.name);
    const tipText = (matchSec && matchSec.tooltip) || b.description || '';
    const descIcon = tipText
      ? `<span class="card-info" data-tip="${tipText.replace(/"/g, '&quot;')}" onclick="event.stopPropagation()"><span class="info-icon">ⓘ</span></span>`
      : '';
    const flipClass = demoCardFlipClass(b.id);
    return `<div class="building-card grade-${grade}${isActive ? ' active' : ''} ${flipClass}" data-idx="${i}" data-id="${b.id}" onclick="selectDesktopBuilding(${i}, '${b.id}')">
      <div class="card-flip-container">
        <div class="card-front">
          ${descIcon}
          <div class="card-name">${b.emoji} ${b.name}</div>
          <div class="card-npc">${b.npc_handle}</div>
          <div class="bf-logo-wrap">${demoPlaceholderLogoSvg()}</div>
          <div class="bf-spacer"></div>
          <div class="bf-est">${demoFunctionLabel(b.id)}</div>
        </div>
        <div class="card-back">
          <div class="card-name">${b.emoji} ${b.name}</div>
          <div class="card-npc">${b.npc_handle}</div>
          <div class="card-back-stats">
            <div class="card-count">${b.today}</div>
            <div class="card-sub">${lbl.today} · ${lbl.sevenD}${b.week}${b.history != null ? `<br>${lbl.historyTotal}${b.history}` : ''}</div>
            <svg width="${svgW}" height="${SH}">${bars}</svg>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
  grid.innerHTML = cards;

  // 默认选第一个（最活跃）
  if (desktopActiveBuilding === null) desktopActiveBuilding = 0;
}

function selectDesktopBuilding(i, id) {
  // 翻面状态机
  if (id) {
    demoHandleFlip(id);
    document.querySelectorAll('#buildings-grid .building-card').forEach(el => {
      const cardId = el.dataset.id;
      el.classList.toggle('flipped', demoGlobalFlipActive || demoFlippedBuildingId === cardId);
    });
  }
  desktopActiveBuilding = i;
  document.querySelectorAll('#buildings-grid .building-card').forEach(el => {
    el.classList.toggle('active', Number(el.dataset.idx) === i);
  });
  renderDesktopMidBarAndLog();
  renderDesktopContent();
}

function selectNextDesktopBuilding() {
  const sorted = getBuildings().sort((a, b) => b.today - a.today);
  const next = ((desktopActiveBuilding ?? 0) + 1) % sorted.length;
  selectDesktopBuilding(next, sorted[next]?.id);
}

function renderDesktopMidBarAndLog() {
  const sorted = getBuildings().sort((a, b) => b.today - a.today);
  const b = sorted[desktopActiveBuilding ?? 0];
  if (!b) return;
  const nextTxt = currentLang === 'cn' ? '➡️ 下一栋' : '➡️ Next';

  const midBar = document.getElementById('mid-bar');
  if (midBar) {
    const tabs = BUILDING_TABS[b.name] || [];
    if (tabs.length > 1) {
      // multi-tab：mid-bar 装 tab 按钮 + 进入按钮
      const sectionsList = (typeof SECTIONS !== 'undefined' && SECTIONS[currentLang]) || [];
      const rendererNames = ['renderDiary','renderReflection','renderSchedule','renderInspirations','renderHealth','renderTrades','renderFinance','renderArchive','renderTeahouse','renderChronicle','renderPatrol'];
      const activeTab = _desktopTabState[b.id] ?? 0;
      const tabBtns = tabs.map((fnName, i) => {
        const idx = rendererNames.indexOf(fnName);
        const sec = idx >= 0 ? sectionsList[idx] : null;
        const label = sec ? `${sec.icon} ${sec.label}` : fnName;
        const tip = sec && sec.tooltip ? (typeof infoIcon === 'function' ? infoIcon(sec.tooltip) : '') : '';
        return `<button type="button" class="mb-tab${i === activeTab ? ' active' : ''}" onclick="selectDesktopTab('${b.id}', ${i})">${label}${tip}</button>`;
      }).join('');
      midBar.innerHTML = `
        <div class="mb-tabs">${tabBtns}</div>
        <button type="button" class="mb-next" onclick="selectNextDesktopBuilding()">${nextTxt}</button>
      `;
    } else {
      midBar.innerHTML = `
        <div class="mb-name">${b.emoji} ${b.name}</div>
        <button type="button" class="mb-next" onclick="selectNextDesktopBuilding()">${nextTxt}</button>
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

// ── Card-info tooltip portal（绕开 overflow:hidden 祖先）──
(function wireCardInfoTooltip() {
  let portal = null;
  function getPortal() {
    if (!portal) {
      portal = document.createElement('div');
      portal.id = 'card-tip-portal';
      document.body.appendChild(portal);
    }
    return portal;
  }
  document.addEventListener('mouseover', e => {
    const ci = e.target.closest('.card-info[data-tip]');
    if (!ci) return;
    const p = getPortal();
    p.textContent = ci.dataset.tip;
    const rect = ci.getBoundingClientRect();
    p.style.display = 'block';
    // 右下角图标 → tooltip 朝上、右对齐图标右边
    const tipW = Math.min(240, window.innerWidth - 16);
    p.style.width = tipW + 'px';
    const tipH = p.offsetHeight;
    let top = rect.top - tipH - 6;
    let right = window.innerWidth - rect.right;
    // 上方放不下时改朝下
    if (top < 8) top = rect.bottom + 6;
    p.style.top  = top + 'px';
    p.style.right = right + 'px';
    p.style.left  = 'auto';
  });
  document.addEventListener('mouseout', e => {
    const ci = e.target.closest('.card-info[data-tip]');
    if (!ci) return;
    if (portal) portal.style.display = 'none';
  });
})();

// 启动
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { fitDashboardScale(); initDesktop(); });
} else {
  fitDashboardScale();
  initDesktop();
}
