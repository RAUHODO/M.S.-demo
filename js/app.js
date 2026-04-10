/* ═══════════════════════════════════════════
   Project M.S. Demo — Main Application
   ═══════════════════════════════════════════ */

let data = null;
let currentLang = 'cn';
let activeBuilding = -1;
const openSections = new Set();
const openConvs = new Set();

// Fixed color palette for buildings (by index)
const BUILDING_COLORS = ['#4ade80','#60a5fa','#fbbf24','#fb923c','#f87171','#d97706','#818cf8','#c084fc'];

const SECTIONS = {
  cn: [
    { icon: '📔', label: '梅梅日记' },
    { icon: '🌊', label: '凝月之地' },
    { icon: '🏛️', label: '大书库' },
    { icon: '⏰', label: '大赐福·密室' },
    { icon: '💡', label: '魔法学院' },
    { icon: '💊', label: '蔷薇教堂' },
    { icon: '📊', label: '圆桌厅堂' },
    { icon: '💰', label: '埃雷教堂' },
    { icon: '📚', label: '黄金树大教堂' },
    { icon: '📋', label: '巡逻报告' },
  ],
  en: [
    { icon: '📔', label: "Melina's Journal" },
    { icon: '🌊', label: 'Moongazing Grounds' },
    { icon: '🏛️', label: 'Grand Library' },
    { icon: '⏰', label: 'Inner Sanctum' },
    { icon: '💡', label: 'Academy' },
    { icon: '💊', label: 'Rose Church' },
    { icon: '📊', label: 'Roundtable Hold' },
    { icon: '💰', label: "Church of Elleh" },
    { icon: '📚', label: 'Erdtree Sanctuary' },
    { icon: '📋', label: 'Patrol Report' },
  ]
};

const L = {
  cn: {
    buildings: '⚡ 建筑活跃度',
    conversations: '💬 示范对话',
    statusRunning: '运行中',
    uptime: '运行', backup: '备份',
    today: '今日', sevenD: '7日共',
    thisWeek: '本周', thisMonth: '本月', longTerm: '远期', habits: '循环习惯',
    done: '已完成', pending: '未完成',
    openPos: '持仓中', closedPos: '近期平仓',
    income: '收入', expense: '支出', net: '净额', currency: '卢恩',
    recentTx: '最近收支',
    confirmed: '✅ 已确认', inferred: '🔍 推断', external: '🌐 外部',
    diet: '饮食', sleep: '睡眠', weight: '体重', bath: '洗澡',
    exercise: '运动', steps: '步数',
    toggleTo: 'EN',
  },
  en: {
    buildings: '⚡ Building Activity',
    conversations: '💬 Demo Conversations',
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
    toggleTo: '中',
  }
};

// ── Init ──
async function init() {
  await loadData();
  render();
}

async function loadData() {
  const resp = await fetch(`data/demo_${currentLang}.json`);
  data = await resp.json();
}

function toggleLang() {
  currentLang = currentLang === 'cn' ? 'en' : 'cn';
  activeBuilding = -1;
  openSections.clear();
  openConvs.clear();
  loadData().then(render);
}

// ── Data helpers (normalize CN new format vs EN old format) ──
function getMeta() {
  if (data.meta) return {
    title: data.meta.title,
    subtitle: data.meta.subtitle,
    status: data.meta.status,
    uptime: data.meta.uptime,
    backup: data.meta.backup_date,
  };
  const ss = data.system_status;
  return { title: null, subtitle: null, status: ss.status, uptime: ss.uptime, backup: ss.last_backup };
}

function getBuildings() {
  return data.buildings.map((b, i) => ({
    name: b.name,
    npc_name: b.npc_name,
    npc_handle: b.npc_title || b.npc_handle,
    emoji: b.emoji,
    color: b.color || BUILDING_COLORS[i % BUILDING_COLORS.length],
    today: b.today_calls ?? b.activity_today ?? 0,
    week:  b.week_calls  ?? b.activity_7d   ?? 0,
    sparkline: b.sparkline || b.daily_counts || [],
    description: b.description,
    recent_logs: (b.recent_logs || []).map(l => ({
      time: l.date || l.time,
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
  titleEl.textContent = meta.title || (currentLang === 'cn' ? 'Project M.S. · 赐福点控制面板' : 'Project M.S. · Site of Grace Control Panel');

  document.getElementById('lang-toggle').textContent = lbl.toggleTo;
  document.getElementById('status-bar').innerHTML =
    `<span class="status-item"><span class="status-dot"></span>${lbl.statusRunning}</span>` +
    `<span class="status-item">${lbl.uptime}: ${meta.uptime}</span>` +
    `<span class="status-item">${lbl.backup}: ${meta.backup}</span>` +
    (meta.subtitle ? `<span class="status-item" style="color:var(--text-dim)">${meta.subtitle}</span>` : '');

  document.getElementById('buildings-title').textContent = lbl.buildings;
  const footerEl = document.getElementById('footer-text');
  if (footerEl) {
    footerEl.textContent = currentLang === 'cn'
      ? '本页面为 Project M.S. 项目演示，所有数据均为虚构，采用《艾尔登法环》世界观包装。Project M.S. 是一个个人 AI 操作系统项目。'
      : 'Demo with fictional data. Project M.S. is a personal AI OS project.';
  }
  renderConvAccordion();
  renderBuildings();
  renderAccordion();
}

// ── Buildings ──
function renderBuildings() {
  const lbl = L[currentLang];
  const sorted = getBuildings().sort((a, b) => b.week - a.week);
  const grid = document.getElementById('buildings-grid');

  grid.innerHTML = sorted.map((b, i) => {
    const isActive = i === activeBuilding;
    const hasToday = b.today > 0;
    const color = b.color;
    const bg = hasToday ? `${color}18` : '#2e2e2e';
    const border = isActive ? color : (hasToday ? color : '#444');

    const BW = 7, GAP = 2, SH = 24;
    const max = Math.max(...b.sparkline, 1);
    const svgW = b.sparkline.length * (BW + GAP) - GAP;
    const bars = b.sparkline.map((v, j) => {
      const h = v > 0 ? Math.max(Math.round((v / max) * SH), 1) : 0;
      const op = j === b.sparkline.length - 1 ? '1' : '0.65';
      return `<rect x="${j*(BW+GAP)}" y="${SH-h}" width="${BW}" height="${h}" fill="${color}" opacity="${op}" rx="1"/>`;
    }).join('');

    return `
      <div class="building-card ${isActive ? 'active' : ''}"
           style="border-color:${border};background:${bg}"
           onclick="toggleBuilding(${i})">
        <div class="card-emoji">${b.emoji}</div>
        <div class="card-name" style="color:${hasToday ? color : '#aaa'}">${b.name}</div>
        <div class="card-npc">${b.npc_handle}</div>
        <div class="card-count" style="color:${hasToday ? color : '#666'}">${b.today}</div>
        <div class="card-sub">${lbl.today} · ${lbl.sevenD}${b.week}</div>
        <svg width="${svgW}" height="${SH}">${bars}</svg>
      </div>`;
  }).join('');

  renderBuildingDetail(sorted);
}

function toggleBuilding(idx) {
  activeBuilding = activeBuilding === idx ? -1 : idx;
  renderBuildings();
}

function renderBuildingDetail(sorted) {
  const el = document.getElementById('building-detail');
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
      `<div class="log-row"><span class="log-time">${l.time}</span><span class="log-summary">${l.summary}</span></div>`
    ).join('')}
    ${b.recent_logs.length < 5 ? `<div style="text-align:center;color:var(--text-dim);font-size:0.72rem;font-style:italic;margin-top:8px;padding-top:6px;border-top:1px solid var(--border)">—— 近三日无更多记录 ——</div>` : ''}
  `;
}

// ── Accordion ──
function renderAccordion() {
  const sections = SECTIONS[currentLang];
  const renderers = [
    renderDiary, renderReflection, renderChronicle,
    renderSchedule, renderInspirations, renderHealth,
    renderTrades, renderFinance, renderArchive, renderPatrol
  ];
  const container = document.getElementById('accordion');
  container.innerHTML = sections.map((s, i) => {
    const isOpen = openSections.has(i);
    return `
      <div class="accordion-item" id="acc-item-${i}">
        <div class="accordion-header ${isOpen ? 'open' : ''}" onclick="toggleAccordion(${i})">
          <span class="accordion-title">${s.icon} ${s.label}</span>
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
    renderDiary, renderReflection, renderChronicle,
    renderSchedule, renderInspirations, renderHealth,
    renderTrades, renderFinance, renderArchive, renderPatrol
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
}

// ── Section Renderers ──

function renderDiary() {
  return (data.diary || []).map(d => {
    const meta = [d.weekday, d.weather].filter(Boolean).join('　');
    return `<div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #2a2a2a">
      <div style="color:var(--gold);font-weight:600;margin-bottom:2px">
        ${d.date}
        ${meta ? `<span style="color:var(--text-dim);font-weight:400;font-size:0.75rem">　${meta}</span>` : ''}
        ${d.mood ? `<span style="color:var(--text-dim);font-weight:400;font-size:0.75rem">　${d.mood}</span>` : ''}
      </div>
      <div style="font-size:0.84rem;line-height:1.8;color:var(--text-primary)">${d.content}</div>
    </div>`;
  }).join('');
}

function renderReflection() {
  const list = data.reflections || data.reflection || [];
  return list.map(r => `
    <div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #2a2a2a">
      <div style="color:var(--gold);font-weight:600">${r.week}
        ${r.date_range ? `<span style="color:var(--text-dim);font-weight:400;font-size:0.75rem">　${r.date_range}</span>` : ''}
      </div>
      <div style="color:var(--text-dim);font-size:0.72rem;margin-bottom:8px">${r.written_at || r.created_at || ''}</div>
      <div style="font-size:0.84rem;line-height:1.8;white-space:pre-line">${r.content}</div>
    </div>`
  ).join('');
}

function renderChronicle() {
  return (data.chronicle || []).map(c => {
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
      `<div style="font-size:0.82rem;line-height:1.7">${s}</div>`
    ).join('');

    return `<div style="margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #2a2a2a">
      <div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;margin-bottom:4px">
        <span style="color:var(--gold);font-weight:600">${c.date}</span>
        ${meta ? `<span style="color:var(--text-secondary);font-size:0.75rem">　${meta}</span>` : ''}
        ${tagsHtml}
      </div>
      ${completed ? `<div style="margin-bottom:4px">${completed}</div>` : ''}
      ${summaries}
    </div>`;
  }).join('');
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

  return `
    <div class="sub-header">${lbl.thisWeek}</div>${(s.this_week || []).map(row).join('')}
    <div class="sub-header">${lbl.habits}</div>${(s.habits || s.recurring || []).map(habitRow).join('')}
    <div class="sub-header">${lbl.thisMonth}</div>${(s.this_month || []).map(row).join('')}
    <div class="sub-header">${lbl.longTerm}</div>${(s.long_term || []).map(row).join('')}
  `;
}

function renderInspirations() {
  const list = data.inspirations || [];
  // flat array with category field — group by category
  if (Array.isArray(list)) {
    const grouped = {};
    list.forEach(item => {
      const cat = item.category || '其他';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });
    return Object.entries(grouped).map(([cat, items]) => {
      const done = items.filter(i => i.status === 'done').length;
      return `<div class="sub-header">${cat}  <span style="color:var(--text-dim);font-weight:400">${done}/${items.length}</span></div>` +
        items.map(item =>
          `<div class="data-row">
            <span>${item.status === 'done' ? '✅' : '💡'}</span>
            <span class="dr-main ${item.status === 'done' ? 'insp-done' : ''}">${item.content}</span>
          </div>`
        ).join('');
    }).join('');
  }
  // object format (old)
  return Object.entries(list).map(([cat, items]) => {
    const done = items.filter(i => i.status === 'done').length;
    return `<div class="sub-header">${cat}  <span style="color:var(--text-dim);font-weight:400">${done}/${items.length}</span></div>` +
      items.map(item =>
        `<div class="data-row">
          <span style="color:${item.status === 'done' ? 'var(--text-dim)' : 'var(--gold-dim)'}">${item.status === 'done' ? '✓' : '◆'}</span>
          <span class="dr-main ${item.status === 'done' ? 'insp-done' : ''}">${item.content}</span>
        </div>`
      ).join('');
  }).join('');
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

    return `
      <div class="sub-header">${lbl.diet}</div>
      <div class="data-row">
        <span class="dr-label">🍳 在家</span><span class="dr-main">${d.home_cooked ?? '—'} 次</span>
        <span class="dr-meta">🛵 外卖 ${d.delivery ?? 0}　🥡 自取 ${d.takeout ?? 0}</span>
      </div>
      <div class="data-row">
        <span class="dr-label">早餐</span><span class="dr-main">${d.breakfast ?? '—'} 天</span>
        ${d.home_ratio ? `<span class="dr-meta">在家率 ${d.home_ratio}</span>` : ''}
      </div>

      <div class="sub-header">${lbl.sleep}</div>
      <div class="data-row">
        <span class="dr-main"><strong>${sl.average ?? '—'}</strong></span>
        <span class="dr-meta">${sl.trend ?? ''}</span>
      </div>

      <div class="sub-header">${lbl.weight}</div>
      <div class="data-row">
        <span class="dr-main"><strong>${w.current ?? '—'}</strong></span>
        <span class="dr-meta">${w.change ?? ''}　体脂 ${w.body_fat ?? '—'} ${w.fat_change ?? ''}</span>
      </div>

      <div class="sub-header">${lbl.bath}</div>
      <div class="data-row">
        <span class="dr-main">🛁 ${ba.bath ?? 0}次　🚿 ${ba.shower ?? 0}次</span>
      </div>

      <div class="sub-header">${lbl.exercise}</div>
      <div class="data-row">
        <span class="dr-main"><strong>${ex.count ?? 0}</strong> 次</span>
        <span class="dr-meta">${ex.trend ?? ''}</span>
      </div>

      <div class="sub-header">${lbl.steps}</div>
      <div class="data-row">
        <span class="dr-main"><strong>${(st.average ?? 0).toLocaleString()}</strong> 步/日均</span>
        <span class="dr-meta">${st.trend ?? ''}</span>
      </div>
      ${h.notes ? `<div style="margin-top:10px;padding:8px 10px;background:rgba(58,53,32,0.3);border-left:2px solid var(--gold-dim);border-radius:4px;font-size:0.78rem;color:var(--text-secondary);font-style:italic">${h.notes}</div>` : ''}
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
      const priceStr = (p.cost && p.value)
        ? `成本 ${p.cost.toLocaleString()} · 估值 ${p.value.toLocaleString()}`
        : (p.price || '—');
      return `<div class="data-row">
        <span class="data-dot">${p.status || '🟡'}</span>
        <span class="dr-main">${p.asset}</span>
        <span class="dr-meta">${p.type} · ${p.direction}</span>
        <span style="color:var(--text-secondary);font-size:0.76rem">${priceStr}</span>
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
      const positive = typeof p.pnl === 'string' ? p.pnl.startsWith('+') : p.pnl >= 0;
      const costStr = (p.cost && p.sell)
        ? `<span class="dr-meta" style="font-size:0.72rem">${p.cost.toLocaleString()} → ${p.sell.toLocaleString()}</span>`
        : '';
      return `<div class="data-row">
        <span class="data-dot">${positive ? '🟢' : '🔴'}</span>
        <span class="dr-main">${p.asset}</span>
        <span class="dr-meta">${p.type} · ${p.date}</span>
        ${costStr}
        <span class="${positive ? 'c-green' : 'c-red'}">${p.pnl}</span>
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
    <div class="sub-header">${lbl.openPos}  <span style="color:var(--text-dim);font-weight:400">${(t.open_positions||[]).length} 笔</span></div>
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

  const txRows = (f.recent_transactions || []).map(tx => {
    const icon = tx.type === 'income' ? '💰' : '💸';
    const sign = tx.type === 'income' ? '+' : '-';
    const cls  = tx.type === 'income' ? 'c-green' : 'c-red';
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
      💰 ${lbl.income} ${(income||0).toLocaleString()} ${currency}　·
      💸 ${lbl.expense} ${(expense||0).toLocaleString()} ${currency}　·
      📊 ${lbl.net} <strong class="c-green">${(net||0).toLocaleString()} ${currency}</strong>
    </div>
    ${txRows ? `<div class="sub-header">${lbl.recentTx}</div>${txRows}` : ''}
    ${isNewFmt && f.fixed_assets ? `<div class="sub-header">固定资产</div>
      <div class="data-row"><span class="dr-main">总估值</span><span class="c-gold"><strong>${f.fixed_assets.toLocaleString()} ${currency}</strong></span></div>
      ${f.fixed_assets_note ? `<div style="margin-top:6px;font-size:0.75rem;color:var(--text-dim);font-style:italic">${f.fixed_assets_note}</div>` : ''}` : ''}
  `;
}

function renderArchive() {
  const lbl = L[currentLang];
  const a = data.archive;
  if (!a) return '';
  function group(title, items) {
    return `<div class="sub-header">${title}</div>` +
      (items || []).map(i =>
        `<div class="data-row"><span class="dr-label">${i.key}</span><span class="dr-main">${i.value}</span></div>`
      ).join('');
  }
  return group(lbl.confirmed, a.confirmed) + group(lbl.inferred, a.inferred) + group(lbl.external, a.external);
}

function renderPatrol() {
  const p = data.patrol;
  if (!p) return '';

  // CN new format: buildings array + weekly_tasks
  if (p.buildings) {
    const buildingRows = p.buildings.map(b =>
      `<div style="margin-bottom:10px">
        <div style="color:var(--gold);font-size:0.8rem;font-weight:600;margin-bottom:3px">${b.name}  <span style="color:var(--text-dim);font-weight:400">${b.calls_3day}次/3日</span></div>
        ${b.logs.map(l =>
          `<div class="data-row"><span class="log-time">${l.date}</span><span class="log-summary">${l.summary}</span></div>`
        ).join('')}
      </div>`
    ).join('');

    const taskRows = (p.weekly_tasks || []).map(t =>
      `<div class="data-row">
        <span style="color:${t.status === 'done' ? 'var(--green)' : 'var(--text-dim)'}">${t.status === 'done' ? '🟢' : '🟡'}</span>
        <span class="dr-main ${t.status === 'done' ? 'done-task' : ''}">${t.task}</span>
        ${t.completed_date ? `<span class="dr-meta">${t.completed_date}</span>` : ''}
      </div>`
    ).join('');

    return `
      <div style="color:var(--gold);font-weight:600;font-size:0.8rem;margin-bottom:10px">${p.timestamp}</div>
      ${buildingRows}
      ${taskRows ? `<div class="sub-header">习惯任务</div>${taskRows}` : ''}
      ${p.notes ? `<div style="margin-top:12px;font-size:0.75rem;color:var(--text-dim);font-style:italic;text-align:center">${p.notes}</div>` : ''}
    `;
  }

  // Old format: plain content string
  return `<div style="color:var(--gold);font-weight:600;font-size:0.8rem;margin-bottom:8px">${p.timestamp}</div>
          <div style="font-size:0.82rem;line-height:1.8;white-space:pre-line">${p.content}</div>`;
}

// ── Conversations ──
function renderConvAccordion() {
  const lbl = L[currentLang];
  document.getElementById('conv-accordion').innerHTML = `
    <div class="accordion-item" id="conv-outer-item">
      <div class="accordion-header ${openConvs.has(-1) ? 'open' : ''}" onclick="toggleConvOuter()">
        <span class="accordion-title">💬 ${lbl.conversations}</span>
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
}

// Map CN sender names to display
const SENDER_MAP = {
  tarnished: { role: 'user' },
  system:    { role: 'system' },
  melina:    { role: 'assistant', name: '梅琳娜' },
  gideon:    { role: 'assistant', name: '百智爵士基甸' },
  varre:     { role: 'assistant', name: '白面具梵雷' },
  sellen:    { role: 'assistant', name: '魔法师瑟濂' },
};

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
    const npcName = msg.npc || SENDER_MAP[sender]?.name || sender || '';
    const prefix  = msg.prefix || '';
    const toolTag = msg.tool_call
      ? `<span style="font-size:0.68rem;color:var(--text-dim);background:rgba(200,170,110,0.08);padding:1px 5px;border-radius:3px;margin-left:6px">🔧 ${msg.tool_call}</span>`
      : '';
    const prefixHtml = prefix
      ? `<div style="font-size:0.68rem;color:var(--text-dim);margin-bottom:2px">${prefix}</div>`
      : '';

    return `<div class="chat-msg assistant"><div class="chat-bubble">
      ${prefixHtml}
      <div class="chat-npc-label">${npcName}${toolTag}</div>
      ${msg.content}
    </div></div>`;
  }).join('');
}

init();
