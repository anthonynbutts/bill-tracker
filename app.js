// School Bill Tracker - Complete Engine with Live Dash Session & Auto-Transfer

const STORAGE_KEY = 'school_bill_tracker_state_v2';
const SESSION_KEY = 'school_bill_tracker_dash_session_v1';
const FRAME_KEY = 'school_bill_tracker_frame';

const DEFAULT_DAYS = [
  { id: 'mon', name: 'Monday', short: 'Mon', dayIndex: 1, planned: 26.88, actual: 0 },
  { id: 'tue', name: 'Tuesday', short: 'Tue', dayIndex: 2, planned: 26.88, actual: 0 },
  { id: 'wed', name: 'Wednesday', short: 'Wed', dayIndex: 3, planned: 26.88, actual: 0 },
  { id: 'thu', name: 'Thursday', short: 'Thu', dayIndex: 4, planned: 26.87, actual: 0 },
  { id: 'fri', name: 'Friday', short: 'Fri', dayIndex: 5, planned: 26.87, actual: 0 },
  { id: 'sat', name: 'Saturday', short: 'Sat', dayIndex: 6, planned: 26.87, actual: 0 }
];

const DEFAULT_STATE = {
  totalBillGoal: 215.00,
  days: DEFAULT_DAYS
};

let state = loadState();
let activeDayId = getTodayId();
let dashSession = loadDashSession();
let timerInterval = null;

function triggerHaptic() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate(10); } catch (e) {}
  }
}

// Load Tracker State
function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      const v1 = localStorage.getItem('school_bill_tracker_state_v1');
      if (v1) {
        const p1 = JSON.parse(v1);
        const days = DEFAULT_DAYS.map(defDay => {
          const match = (p1.days || []).find(d => d.id === defDay.id);
          return {
            id: defDay.id,
            name: defDay.name,
            short: defDay.short,
            dayIndex: defDay.dayIndex,
            planned: match && typeof match.goal === 'number' ? match.goal : defDay.planned,
            actual: match && typeof match.actual === 'number' ? match.actual : 0
          };
        });
        return {
          totalBillGoal: typeof p1.totalBillGoal === 'number' ? p1.totalBillGoal : 215.00,
          days
        };
      }
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
    const parsed = JSON.parse(saved);
    const days = DEFAULT_DAYS.map(defDay => {
      const match = (parsed.days || []).find(d => d.id === defDay.id);
      return {
        id: defDay.id,
        name: defDay.name,
        short: defDay.short,
        dayIndex: defDay.dayIndex,
        planned: match && typeof match.planned === 'number' ? match.planned : defDay.planned,
        actual: match && typeof match.actual === 'number' ? match.actual : 0
      };
    });
    return {
      totalBillGoal: typeof parsed.totalBillGoal === 'number' ? parsed.totalBillGoal : 215.00,
      days
    };
  } catch (e) {
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {}
}

// Load Active Dash Session (Persists across tab reloads)
function loadDashSession() {
  try {
    const saved = localStorage.getItem(SESSION_KEY);
    if (!saved) return { active: false, startTime: null, targetDayId: getTodayId(), orders: [] };
    const parsed = JSON.parse(saved);
    return {
      active: !!parsed.active,
      startTime: parsed.startTime || null,
      targetDayId: parsed.targetDayId || getTodayId(),
      orders: Array.isArray(parsed.orders) ? parsed.orders : []
    };
  } catch (e) {
    return { active: false, startTime: null, targetDayId: getTodayId(), orders: [] };
  }
}

function saveDashSession() {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(dashSession));
  } catch (e) {}
}

function formatCurrency(num) {
  const n = isNaN(num) ? 0 : num;
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseVal(val) {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function getTodayIndex() {
  return new Date().getDay();
}

function getTodayId() {
  const today = getTodayIndex();
  const match = DEFAULT_DAYS.find(d => d.dayIndex === today);
  return match ? match.id : 'mon';
}

function formatDuration(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Render Daily Cards
function renderDays() {
  const container = document.getElementById('daysList');
  if (!container) return;
  container.innerHTML = '';

  const todayIndex = getTodayIndex();

  state.days.forEach(day => {
    const isToday = day.dayIndex === todayIndex;
    const isActive = day.id === activeDayId;

    const card = document.createElement('div');
    card.id = `card-${day.id}`;
    card.className = `glass-card rounded-2xl p-3.5 transition-all ${isActive ? 'is-active ring-1 ring-emerald-500/40' : ''}`;
    card.onclick = (e) => {
      if (!e.target.closest('input')) {
        selectDay(day.id);
      }
    };

    card.innerHTML = `
      <!-- Card Top: Day & Status -->
      <div class="flex items-center justify-between mb-2.5">
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full ${isToday ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}"></span>
          <span class="font-bold text-white text-sm">${day.name}</span>
          ${isToday ? '<span class="text-[9px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 rounded-full">TODAY</span>' : ''}
        </div>
        <span id="diff-${day.id}" class="text-xs font-mono font-medium text-zinc-400">
          -$${day.planned.toFixed(2)}
        </span>
      </div>

      <!-- Card Middle: Dual Inputs (Actual vs Planned) -->
      <div class="grid grid-cols-2 gap-2 mb-2.5">
        <!-- Actual Earned Input -->
        <div class="bg-black/60 rounded-xl px-3 py-2 border border-zinc-800 focus-within:border-emerald-500 transition-colors">
          <label class="block text-[9px] font-bold uppercase tracking-wider text-emerald-400 mb-0.5" for="actual-${day.id}">
            Actual
          </label>
          <div class="flex items-center font-mono">
            <span class="text-sm font-bold text-emerald-400 mr-0.5">$</span>
            <input 
              type="number" 
              inputmode="decimal"
              id="actual-${day.id}" 
              step="0.01" 
              min="0"
              value="${day.actual > 0 ? day.actual.toFixed(2) : ''}"
              placeholder="0.00"
              onfocus="selectDay('${day.id}')"
              class="w-full bg-transparent text-base font-bold text-white focus:outline-none placeholder-zinc-700"
            />
          </div>
        </div>

        <!-- Planned Input -->
        <div class="bg-black/60 rounded-xl px-3 py-2 border border-zinc-800 focus-within:border-orange-500 transition-colors">
          <label class="block text-[9px] font-bold uppercase tracking-wider text-orange-400 mb-0.5" for="planned-${day.id}">
            Planned
          </label>
          <div class="flex items-center font-mono">
            <span class="text-sm font-bold text-orange-400 mr-0.5">$</span>
            <input 
              type="number" 
              inputmode="decimal"
              id="planned-${day.id}" 
              step="0.01" 
              min="0"
              value="${day.planned.toFixed(2)}"
              onfocus="selectDay('${day.id}')"
              class="w-full bg-transparent text-base font-bold text-zinc-200 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <!-- Day Progress Bar -->
      <div class="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
        <div id="bar-${day.id}" class="bg-emerald-500 h-1.5 rounded-full transition-all duration-200" style="width: 0%"></div>
      </div>
    `;

    container.appendChild(card);
  });

  attachInputListeners();
}

window.selectDay = function(dayId) {
  triggerHaptic();
  activeDayId = dayId;
  state.days.forEach(d => {
    const card = document.getElementById(`card-${d.id}`);
    if (card) {
      if (d.id === activeDayId) {
        card.classList.add('is-active', 'ring-1', 'ring-emerald-500/40');
      } else {
        card.classList.remove('is-active', 'ring-1', 'ring-emerald-500/40');
      }
    }
  });
};

function attachInputListeners() {
  state.days.forEach(day => {
    const plannedInput = document.getElementById(`planned-${day.id}`);
    const actualInput = document.getElementById(`actual-${day.id}`);

    if (plannedInput) {
      plannedInput.addEventListener('input', (e) => {
        day.planned = parseVal(e.target.value);
        saveState();
        updateCalculations();
      });
    }

    if (actualInput) {
      actualInput.addEventListener('input', (e) => {
        day.actual = parseVal(e.target.value);
        saveState();
        updateCalculations();
      });
    }
  });

  const totalBillGoalInput = document.getElementById('totalBillGoalInput');
  if (totalBillGoalInput) {
    totalBillGoalInput.value = state.totalBillGoal.toFixed(2);
    totalBillGoalInput.addEventListener('input', (e) => {
      state.totalBillGoal = parseVal(e.target.value);
      saveState();
      updateCalculations();
    });
  }
}

// Master calculation update
function updateCalculations() {
  const totalBill = state.totalBillGoal;

  const actualEarnings = state.days.reduce((sum, d) => sum + d.actual, 0);
  const estimatedEarnings = state.days.reduce((sum, d) => sum + d.planned, 0);
  
  // Current Paycheck Needed (based on actual earnings so far)
  const paycheckNeeded = Math.max(0, totalBill - actualEarnings);

  // Goal Paycheck Needed (based on current planned goal)
  const paycheckGoal = Math.max(0, totalBill - estimatedEarnings);

  // Dynamic Island
  const islandPaycheck = document.getElementById('islandPaycheck');
  if (islandPaycheck) islandPaycheck.textContent = formatCurrency(paycheckNeeded);

  // Current Paycheck Needed Display
  const paycheckNeededDisplay = document.getElementById('paycheckNeededDisplay');
  if (paycheckNeededDisplay) paycheckNeededDisplay.textContent = formatCurrency(paycheckNeeded);

  // Goal Paycheck Needed Display (updates dynamically with current goal!)
  const paycheckGoalDisplay = document.getElementById('paycheckGoalDisplay');
  if (paycheckGoalDisplay) paycheckGoalDisplay.textContent = formatCurrency(paycheckGoal);

  // Separate Top Tiles
  const actualEarningsDisplay = document.getElementById('actualEarningsDisplay');
  if (actualEarningsDisplay) actualEarningsDisplay.textContent = formatCurrency(actualEarnings);

  const estimatedEarningsDisplay = document.getElementById('estimatedEarningsDisplay');
  if (estimatedEarningsDisplay) estimatedEarningsDisplay.textContent = formatCurrency(estimatedEarnings);

  // Overall Bill Progress Bar
  const billProgressBar = document.getElementById('billProgressBar');
  if (billProgressBar) {
    const pct = totalBill > 0 ? Math.min(100, (actualEarnings / totalBill) * 100) : 0;
    billProgressBar.style.width = `${pct}%`;
  }

  // Per-Day Progress & Variances
  state.days.forEach(day => {
    const diffEl = document.getElementById(`diff-${day.id}`);
    const barEl = document.getElementById(`bar-${day.id}`);
    const dayDiff = day.actual - day.planned;
    const dayPct = day.planned > 0 ? (day.actual / day.planned) * 100 : 100;

    if (diffEl) {
      if (day.actual === 0) {
        diffEl.textContent = `-$${day.planned.toFixed(2)}`;
        diffEl.className = 'text-xs font-mono font-medium text-zinc-500';
      } else if (dayDiff >= 0) {
        diffEl.textContent = dayDiff === 0 ? '✓ Hit Goal' : `+$${dayDiff.toFixed(2)} ahead`;
        diffEl.className = 'text-xs font-mono font-bold text-emerald-400';
      } else {
        diffEl.textContent = `-$${Math.abs(dayDiff).toFixed(2)} to go`;
        diffEl.className = 'text-xs font-mono font-medium text-amber-400';
      }
    }

    if (barEl) {
      barEl.style.width = `${Math.min(100, dayPct)}%`;
      if (day.actual >= day.planned && day.planned > 0) {
        barEl.className = 'bg-emerald-400 h-1.5 rounded-full transition-all duration-200';
      } else {
        barEl.className = 'bg-orange-500 h-1.5 rounded-full transition-all duration-200';
      }
    }
  });
}

// -------------------------------------------------------------
// LIVE DASH SESSION & ORDER TRACKING SYSTEM
// -------------------------------------------------------------

function startDash() {
  triggerHaptic();
  dashSession.active = true;
  dashSession.startTime = Date.now();
  dashSession.targetDayId = getTodayId();
  dashSession.orders = [];
  saveDashSession();

  updateDashSessionUI();
  startTimerLoop();
  openDashSheet();
  showToast('🚗 Dash session started!');
}

window.openDashSheet = function() {
  triggerHaptic();
  const modal = document.getElementById('dashModal');
  const sheet = modal ? modal.querySelector('.dash-modal-sheet') : null;
  const targetDaySelect = document.getElementById('sheetTargetDay');

  if (targetDaySelect) {
    targetDaySelect.value = dashSession.targetDayId || getTodayId();
  }

  if (modal && sheet) {
    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.classList.add('opacity-100');
    sheet.classList.remove('translate-y-full');
    sheet.classList.add('translate-y-0');
  }

  // Focus order input if on desktop/ready
  const input = document.getElementById('orderAmountInput');
  if (input) setTimeout(() => input.focus(), 300);
};

window.closeDashSheet = function() {
  triggerHaptic();
  const modal = document.getElementById('dashModal');
  const sheet = modal ? modal.querySelector('.dash-modal-sheet') : null;

  if (modal && sheet) {
    sheet.classList.remove('translate-y-0');
    sheet.classList.add('translate-y-full');
    modal.classList.remove('opacity-100');
    modal.classList.add('opacity-0', 'pointer-events-none');
  }
};

function startTimerLoop() {
  if (timerInterval) clearInterval(timerInterval);

  function tick() {
    if (!dashSession.active || !dashSession.startTime) return;
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - dashSession.startTime) / 1000));
    const timeStr = formatDuration(elapsedSeconds);

    const hudTimer = document.getElementById('hudTimer');
    const sheetTimer = document.getElementById('sheetTimer');
    if (hudTimer) hudTimer.textContent = timeStr;
    if (sheetTimer) sheetTimer.textContent = timeStr;

    // Calculate hourly rate
    const totalEarnings = dashSession.orders.reduce((sum, o) => sum + o.amount, 0);
    const hourlyRate = elapsedSeconds > 60 ? (totalEarnings / (elapsedSeconds / 3600)) : 0;
    const sheetHourlyRate = document.getElementById('sheetHourlyRate');
    if (sheetHourlyRate) sheetHourlyRate.textContent = `${formatCurrency(hourlyRate)}/hr`;
  }

  tick();
  timerInterval = setInterval(tick, 1000);
}

function updateDashSessionUI() {
  const idleBar = document.getElementById('dashIdleBar');
  const activeBar = document.getElementById('dashActiveBar');
  const islandDot = document.getElementById('islandDot');

  if (dashSession.active) {
    if (idleBar) idleBar.classList.add('hidden');
    if (activeBar) {
      activeBar.classList.remove('hidden');
      activeBar.classList.add('flex');
    }
    if (islandDot) {
      islandDot.className = 'w-2 h-2 rounded-full bg-red-500 animate-pulse';
    }
  } else {
    if (activeBar) {
      activeBar.classList.add('hidden');
      activeBar.classList.remove('flex');
    }
    if (idleBar) idleBar.classList.remove('hidden');
    if (islandDot) {
      islandDot.className = 'w-2 h-2 rounded-full bg-blue-500/80';
    }
    if (timerInterval) clearInterval(timerInterval);
  }

  // Calculate session totals
  const totalEarnings = dashSession.orders.reduce((sum, o) => sum + o.amount, 0);
  const count = dashSession.orders.length;

  const hudEarnings = document.getElementById('hudEarnings');
  const hudOrderCount = document.getElementById('hudOrderCount');
  const sheetSessionTotal = document.getElementById('sheetSessionTotal');
  const sheetOrderCount = document.getElementById('sheetOrderCount');
  const endDashBtnLabel = document.getElementById('endDashBtnLabel');

  if (hudEarnings) hudEarnings.textContent = formatCurrency(totalEarnings);
  if (hudOrderCount) hudOrderCount.textContent = count;
  if (sheetSessionTotal) sheetSessionTotal.textContent = formatCurrency(totalEarnings);
  if (sheetOrderCount) sheetOrderCount.textContent = `${count} order${count === 1 ? '' : 's'}`;
  if (endDashBtnLabel) endDashBtnLabel.textContent = `End Dash & Transfer ${formatCurrency(totalEarnings)}`;

  renderSessionOrdersList();
}

function renderSessionOrdersList() {
  const container = document.getElementById('sessionOrdersList');
  if (!container) return;

  if (dashSession.orders.length === 0) {
    container.innerHTML = `<p class="text-zinc-600 text-[11px] py-1">No orders logged yet in this session.</p>`;
    return;
  }

  let html = '';
  dashSession.orders.slice().reverse().forEach((order, revIdx) => {
    const orderNum = dashSession.orders.length - revIdx;
    html += `
      <div class="flex items-center justify-between bg-black/50 px-3 py-1.5 rounded-xl border border-zinc-800/80">
        <div class="flex items-center gap-2">
          <span class="text-[10px] text-zinc-500 font-bold">#${orderNum}</span>
          <span class="text-white font-bold text-xs">${formatCurrency(order.amount)}</span>
          <span class="text-[10px] text-zinc-500">${order.timeStr || ''}</span>
        </div>
        <button onclick="removeOrder('${order.id}')" class="text-zinc-500 hover:text-red-400 px-1 text-xs" title="Delete">✕</button>
      </div>
    `;
  });

  container.innerHTML = html;
}

function addOrder(amount) {
  if (isNaN(amount) || amount <= 0) return;
  triggerHaptic();

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  dashSession.orders.push({
    id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
    amount: Math.round(amount * 100) / 100,
    timeStr
  });

  saveDashSession();
  updateDashSessionUI();

  const input = document.getElementById('orderAmountInput');
  if (input) {
    input.value = '';
    input.focus();
  }

  showToast(`Added +${formatCurrency(amount)}`);
}

window.quickAddOrder = function(amount) {
  addOrder(amount);
};

window.removeOrder = function(orderId) {
  triggerHaptic();
  dashSession.orders = dashSession.orders.filter(o => o.id !== orderId);
  saveDashSession();
  updateDashSessionUI();
};

function endDashAndTransfer() {
  triggerHaptic();
  const sessionTotal = dashSession.orders.reduce((sum, o) => sum + o.amount, 0);
  const targetSelect = document.getElementById('sheetTargetDay');
  const targetDayId = targetSelect ? targetSelect.value : (dashSession.targetDayId || getTodayId());

  const targetDay = state.days.find(d => d.id === targetDayId);
  if (!targetDay) return;

  const confirmMsg = sessionTotal > 0 
    ? `End Dash and transfer ${formatCurrency(sessionTotal)} to ${targetDay.name}'s actual earnings?`
    : `End Dash session with $0.00?`;

  if (confirm(confirmMsg)) {
    // Transfer session earnings to the day's actual
    targetDay.actual = Math.round((targetDay.actual + sessionTotal) * 100) / 100;
    
    // Update day input in DOM if rendered
    const dayActualInput = document.getElementById(`actual-${targetDay.id}`);
    if (dayActualInput) dayActualInput.value = targetDay.actual.toFixed(2);

    saveState();
    updateCalculations();

    // Reset session
    dashSession.active = false;
    dashSession.startTime = null;
    dashSession.orders = [];
    saveDashSession();

    closeDashSheet();
    updateDashSessionUI();

    showToast(`🎉 Transferred ${formatCurrency(sessionTotal)} to ${targetDay.short}!`);
  }
}

function discardDash() {
  triggerHaptic();
  if (confirm('Discard this dash session without saving to earnings?')) {
    dashSession.active = false;
    dashSession.startTime = null;
    dashSession.orders = [];
    saveDashSession();

    closeDashSheet();
    updateDashSessionUI();
    showToast('Session discarded');
  }
}

// -------------------------------------------------------------
// TOOLBAR ACTIONS & SETUP
// -------------------------------------------------------------

function setupToolbarActions() {
  // Start Dash Button
  const startDashBtn = document.getElementById('startDashBtn');
  if (startDashBtn) {
    startDashBtn.addEventListener('click', startDash);
  }

  // Add Order Button & Enter Key
  const addOrderBtn = document.getElementById('addOrderBtn');
  const orderAmountInput = document.getElementById('orderAmountInput');

  if (addOrderBtn && orderAmountInput) {
    addOrderBtn.addEventListener('click', () => {
      const val = parseVal(orderAmountInput.value);
      addOrder(val);
    });

    orderAmountInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = parseVal(orderAmountInput.value);
        addOrder(val);
      }
    });
  }

  // End Dash Button
  const endDashBtn = document.getElementById('endDashBtn');
  if (endDashBtn) {
    endDashBtn.addEventListener('click', endDashAndTransfer);
  }

  // Discard Dash Button
  const discardDashBtn = document.getElementById('discardDashBtn');
  if (discardDashBtn) {
    discardDashBtn.addEventListener('click', discardDash);
  }

  // Split Goal Evenly
  const distributeEvenlyBtn = document.getElementById('distributeEvenlyBtn');
  if (distributeEvenlyBtn) {
    distributeEvenlyBtn.addEventListener('click', () => {
      triggerHaptic();
      const targetBase = 161.25;
      const perDay = Math.floor((targetBase / 6) * 100) / 100;
      const remainder = Math.round((targetBase - perDay * 6) * 100) / 100;
      
      state.days.forEach((day, i) => {
        const extraCent = i < Math.round(remainder * 100) ? 0.01 : 0;
        day.planned = Math.round((perDay + extraCent) * 100) / 100;
        const input = document.getElementById(`planned-${day.id}`);
        if (input) input.value = day.planned.toFixed(2);
      });

      saveState();
      updateCalculations();
      showToast(`Split $161.25 into ~$${perDay.toFixed(2)}/day`);
    });
  }

  // Reset Week Actuals
  const resetWeekBtn = document.getElementById('resetWeekBtn');
  if (resetWeekBtn) {
    resetWeekBtn.addEventListener('click', () => {
      triggerHaptic();
      if (confirm('Clear actual earnings for the week? Planned goals will stay.')) {
        state.days.forEach(day => {
          day.actual = 0;
          const input = document.getElementById(`actual-${day.id}`);
          if (input) input.value = '';
        });
        saveState();
        updateCalculations();
        showToast('Actuals cleared');
      }
    });
  }

  // Copy Summary
  const copySummaryBtn = document.getElementById('copySummaryBtn');
  if (copySummaryBtn) {
    copySummaryBtn.addEventListener('click', () => {
      triggerHaptic();
      const actualEarnings = state.days.reduce((sum, d) => sum + d.actual, 0);
      const estimatedEarnings = state.days.reduce((sum, d) => sum + d.planned, 0);
      const paycheckNeeded = Math.max(0, state.totalBillGoal - actualEarnings);
      const paycheckGoal = Math.max(0, state.totalBillGoal - estimatedEarnings);

      let text = `Total Bill: ${formatCurrency(state.totalBillGoal)}\n`;
      text += `Paycheck Current: ${formatCurrency(paycheckNeeded)} | Goal: ${formatCurrency(paycheckGoal)}\n`;
      text += `Actual Earnings: ${formatCurrency(actualEarnings)} | Estimated: ${formatCurrency(estimatedEarnings)}\n\n`;
      state.days.forEach(d => {
        text += `${d.short}: Actual ${formatCurrency(d.actual)} / Planned ${formatCurrency(d.planned)}\n`;
      });

      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => showToast('Copied summary'));
      }
    });
  }

  // Desktop Frame Toggle
  const toggleFrameBtn = document.getElementById('toggleFrameBtn');
  const deviceFrame = document.getElementById('deviceFrame');
  if (toggleFrameBtn && deviceFrame) {
    const savedFrame = localStorage.getItem(FRAME_KEY);
    if (savedFrame === 'expanded') {
      deviceFrame.classList.add('expanded-frame');
      toggleFrameBtn.textContent = 'iPhone 15 View';
    }

    toggleFrameBtn.addEventListener('click', () => {
      const isExpanded = deviceFrame.classList.toggle('expanded-frame');
      toggleFrameBtn.textContent = isExpanded ? 'iPhone 15 View' : 'Full Width';
      localStorage.setItem(FRAME_KEY, isExpanded ? 'expanded' : 'iphone');
    });
  }

  // Header Date
  const headerDate = document.getElementById('headerDate');
  if (headerDate) {
    const now = new Date();
    headerDate.textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  // Target Day change listener
  const sheetTargetDay = document.getElementById('sheetTargetDay');
  if (sheetTargetDay) {
    sheetTargetDay.addEventListener('change', (e) => {
      dashSession.targetDayId = e.target.value;
      saveDashSession();
    });
  }
}

let toastTimeout;
function showToast(msg) {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  if (!toast || !toastMessage) return;

  toastMessage.textContent = msg;
  toast.classList.remove('-translate-y-16', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.add('-translate-y-16', 'opacity-0');
    toast.classList.remove('translate-y-0', 'opacity-100');
  }, 1600);
}

document.addEventListener('DOMContentLoaded', () => {
  renderDays();
  setupToolbarActions();
  updateCalculations();

  // Resume active dash session if page was reloaded during a dash
  if (dashSession.active) {
    updateDashSessionUI();
    startTimerLoop();
  }
});
