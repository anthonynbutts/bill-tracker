// School Bill Tracker - Complete Redesign Engine

const STORAGE_KEY = 'school_bill_tracker_state_v1';
const FRAME_KEY = 'school_bill_tracker_frame';

const DEFAULT_DAYS = [
  { id: 'mon', name: 'Monday', short: 'Mon', dayIndex: 1, goal: 26.88, actual: 0 },
  { id: 'tue', name: 'Tuesday', short: 'Tue', dayIndex: 2, goal: 26.88, actual: 0 },
  { id: 'wed', name: 'Wednesday', short: 'Wed', dayIndex: 3, goal: 26.88, actual: 0 },
  { id: 'thu', name: 'Thursday', short: 'Thu', dayIndex: 4, goal: 26.87, actual: 0 },
  { id: 'fri', name: 'Friday', short: 'Fri', dayIndex: 5, goal: 26.87, actual: 0 },
  { id: 'sat', name: 'Saturday', short: 'Sat', dayIndex: 6, goal: 26.87, actual: 0 }
];

const DEFAULT_STATE = {
  totalBillGoal: 215.00,
  dashGoal: 161.25,
  days: DEFAULT_DAYS
};

let state = loadState();
let activeDayId = getTodayId();

function triggerHaptic() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate(10); } catch (e) {}
  }
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return JSON.parse(JSON.stringify(DEFAULT_STATE));
    const parsed = JSON.parse(saved);
    const days = DEFAULT_DAYS.map(defDay => {
      const match = (parsed.days || []).find(d => d.id === defDay.id);
      return {
        id: defDay.id,
        name: defDay.name,
        short: defDay.short,
        dayIndex: defDay.dayIndex,
        goal: match && typeof match.goal === 'number' ? match.goal : defDay.goal,
        actual: match && typeof match.actual === 'number' ? match.actual : 0
      };
    });
    return {
      totalBillGoal: typeof parsed.totalBillGoal === 'number' ? parsed.totalBillGoal : 215.00,
      dashGoal: typeof parsed.dashGoal === 'number' ? parsed.dashGoal : 161.25,
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

// Render 6 Clean, Spacious Daily Cards
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
      if (!e.target.closest('input') && !e.target.closest('button')) {
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
          -$${day.goal.toFixed(2)}
        </span>
      </div>

      <!-- Card Middle: Dual Inputs (Actual & Goal) -->
      <div class="grid grid-cols-2 gap-2 mb-2.5">
        <!-- Actual Earned Input -->
        <div class="bg-black/60 rounded-xl px-3 py-2 border border-zinc-800 focus-within:border-orange-500 transition-colors">
          <label class="block text-[9px] font-bold uppercase tracking-wider text-orange-400 mb-0.5" for="actual-${day.id}">
            Earned
          </label>
          <div class="flex items-center font-mono">
            <span class="text-sm font-bold text-orange-400 mr-0.5">$</span>
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

        <!-- Goal Input -->
        <div class="bg-black/60 rounded-xl px-3 py-2 border border-zinc-800 focus-within:border-zinc-500 transition-colors">
          <label class="block text-[9px] font-bold uppercase tracking-wider text-zinc-400 mb-0.5" for="goal-${day.id}">
            Daily Goal
          </label>
          <div class="flex items-center font-mono">
            <span class="text-sm font-bold text-zinc-500 mr-0.5">$</span>
            <input 
              type="number" 
              inputmode="decimal"
              id="goal-${day.id}" 
              step="0.01" 
              min="0"
              value="${day.goal.toFixed(2)}"
              onfocus="selectDay('${day.id}')"
              class="w-full bg-transparent text-base font-bold text-zinc-300 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <!-- Day Progress Bar -->
      <div class="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden mb-2.5">
        <div id="bar-${day.id}" class="bg-orange-500 h-1.5 rounded-full transition-all duration-200" style="width: 0%"></div>
      </div>

      <!-- Quick Steppers Strip (Comfortable Tap Targets) -->
      <div class="flex items-center justify-between gap-1 pt-2 border-t border-zinc-800/60 font-mono text-xs">
        <div class="flex items-center gap-1.5">
          <button type="button" class="tap-btn px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/50" onclick="quickAdd('${day.id}', 5)">+$5</button>
          <button type="button" class="tap-btn px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/50" onclick="quickAdd('${day.id}', 10)">+$10</button>
          <button type="button" class="tap-btn px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/50" onclick="quickAdd('${day.id}', 20)">+$20</button>
        </div>
        <div class="flex items-center gap-1.5">
          <button type="button" class="tap-btn px-2.5 py-1 rounded-lg bg-orange-950/40 hover:bg-orange-900/40 text-orange-300 border border-orange-800/50 font-medium" onclick="fillGoal('${day.id}')">Hit Goal</button>
          <button type="button" class="tap-btn px-2 py-1 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-red-400" onclick="clearDay('${day.id}')" title="Clear">✕</button>
        </div>
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

window.quickAdd = function(dayId, amount) {
  triggerHaptic();
  const day = state.days.find(d => d.id === dayId);
  if (!day) return;
  day.actual = Math.round((day.actual + amount) * 100) / 100;
  const input = document.getElementById(`actual-${dayId}`);
  if (input) input.value = day.actual.toFixed(2);
  saveState();
  updateCalculations();
  selectDay(dayId);
  showToast(`+$${amount} to ${day.short}`);
};

window.fillGoal = function(dayId) {
  triggerHaptic();
  const day = state.days.find(d => d.id === dayId);
  if (!day) return;
  day.actual = day.goal;
  const input = document.getElementById(`actual-${dayId}`);
  if (input) input.value = day.actual.toFixed(2);
  saveState();
  updateCalculations();
  selectDay(dayId);
  showToast(`${day.short} set to goal`);
};

window.clearDay = function(dayId) {
  triggerHaptic();
  const day = state.days.find(d => d.id === dayId);
  if (!day) return;
  day.actual = 0;
  const input = document.getElementById(`actual-${dayId}`);
  if (input) input.value = '';
  saveState();
  updateCalculations();
  selectDay(dayId);
};

function attachInputListeners() {
  state.days.forEach(day => {
    const goalInput = document.getElementById(`goal-${day.id}`);
    const actualInput = document.getElementById(`actual-${day.id}`);

    if (goalInput) {
      goalInput.addEventListener('input', (e) => {
        day.goal = parseVal(e.target.value);
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

  const dashGoalInput = document.getElementById('dashGoalInput');
  if (dashGoalInput) {
    dashGoalInput.value = state.dashGoal.toFixed(2);
    dashGoalInput.addEventListener('input', (e) => {
      state.dashGoal = parseVal(e.target.value);
      saveState();
      updateCalculations();
    });
  }
}

// Master calculation update
function updateCalculations() {
  const totalBill = state.totalBillGoal;
  const dashGoal = state.dashGoal;

  const dashActual = state.days.reduce((sum, d) => sum + d.actual, 0);
  const plannedPaycheck = Math.max(0, totalBill - dashGoal);
  const paycheckNeeded = Math.max(0, totalBill - dashActual);

  // Dynamic Island
  const islandPaycheck = document.getElementById('islandPaycheck');
  if (islandPaycheck) islandPaycheck.textContent = formatCurrency(paycheckNeeded);

  // Main Display
  const paycheckNeededDisplay = document.getElementById('paycheckNeededDisplay');
  if (paycheckNeededDisplay) paycheckNeededDisplay.textContent = formatCurrency(paycheckNeeded);

  // Status Badge
  const paycheckBadge = document.getElementById('paycheckBadge');
  if (paycheckBadge) {
    if (dashActual >= totalBill) {
      const extra = dashActual - totalBill;
      paycheckBadge.textContent = extra > 0 ? `+$${extra.toFixed(2)} extra!` : '$0 needed';
      paycheckBadge.className = 'text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-500 text-black mt-1';
    } else if (dashActual >= dashGoal) {
      const saved = plannedPaycheck - paycheckNeeded;
      paycheckBadge.textContent = `+$${saved.toFixed(2)} saved!`;
      paycheckBadge.className = 'text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mt-1';
    } else {
      paycheckBadge.textContent = `${formatCurrency(plannedPaycheck)} planned`;
      paycheckBadge.className = 'text-[11px] font-mono font-medium px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/60 mt-1';
    }
  }

  // Overall Bill Progress Bar
  const billProgressBar = document.getElementById('billProgressBar');
  if (billProgressBar) {
    const pct = totalBill > 0 ? Math.min(100, (dashActual / totalBill) * 100) : 0;
    billProgressBar.style.width = `${pct}%`;
  }

  // Top Dash Actual Metric
  const dashActualDisplay = document.getElementById('dashActualDisplay');
  if (dashActualDisplay) dashActualDisplay.textContent = formatCurrency(dashActual);

  // Per-Day Progress & Variances
  state.days.forEach(day => {
    const diffEl = document.getElementById(`diff-${day.id}`);
    const barEl = document.getElementById(`bar-${day.id}`);
    const dayDiff = day.actual - day.goal;
    const dayPct = day.goal > 0 ? (day.actual / day.goal) * 100 : 100;

    if (diffEl) {
      if (day.actual === 0) {
        diffEl.textContent = `-$${day.goal.toFixed(2)}`;
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
      if (day.actual >= day.goal && day.goal > 0) {
        barEl.className = 'bg-emerald-400 h-1.5 rounded-full transition-all duration-200';
      } else {
        barEl.className = 'bg-orange-500 h-1.5 rounded-full transition-all duration-200';
      }
    }
  });
}

function setupToolbarActions() {
  // Split Dash Goal Evenly
  const distributeEvenlyBtn = document.getElementById('distributeEvenlyBtn');
  if (distributeEvenlyBtn) {
    distributeEvenlyBtn.addEventListener('click', () => {
      triggerHaptic();
      const perDay = Math.floor((state.dashGoal / 6) * 100) / 100;
      const remainder = Math.round((state.dashGoal - perDay * 6) * 100) / 100;
      
      state.days.forEach((day, i) => {
        const extraCent = i < Math.round(remainder * 100) ? 0.01 : 0;
        day.goal = Math.round((perDay + extraCent) * 100) / 100;
        const input = document.getElementById(`goal-${day.id}`);
        if (input) input.value = day.goal.toFixed(2);
      });

      saveState();
      updateCalculations();
      showToast(`Split into ~$${perDay.toFixed(2)}/day`);
    });
  }

  // Reset Week
  const resetWeekBtn = document.getElementById('resetWeekBtn');
  if (resetWeekBtn) {
    resetWeekBtn.addEventListener('click', () => {
      triggerHaptic();
      if (confirm('Clear actual earnings for the week?')) {
        state.days.forEach(day => {
          day.actual = 0;
          const input = document.getElementById(`actual-${day.id}`);
          if (input) input.value = '';
        });
        saveState();
        updateCalculations();
        showToast('Week cleared');
      }
    });
  }

  // Copy Summary
  const copySummaryBtn = document.getElementById('copySummaryBtn');
  if (copySummaryBtn) {
    copySummaryBtn.addEventListener('click', () => {
      triggerHaptic();
      const dashActual = state.days.reduce((sum, d) => sum + d.actual, 0);
      const paycheckNeeded = Math.max(0, state.totalBillGoal - dashActual);

      let text = `Needed: ${formatCurrency(state.totalBillGoal)} | Dash: ${formatCurrency(dashActual)} | Paycheck: ${formatCurrency(paycheckNeeded)}\n`;
      state.days.forEach(d => {
        text += `${d.short}: ${formatCurrency(d.actual)} / ${formatCurrency(d.goal)}\n`;
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
  }, 1400);
}

document.addEventListener('DOMContentLoaded', () => {
  renderDays();
  setupToolbarActions();
  updateCalculations();
});
