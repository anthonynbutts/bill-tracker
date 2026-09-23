// School Bill Tracker - Calm & Minimalist Engine

const STORAGE_KEY = 'school_bill_tracker_state_v1';
const FRAME_KEY = 'school_bill_tracker_frame';

const DEFAULT_DAYS = [
  { id: 'mon', name: 'Mon', fullName: 'Monday', dayIndex: 1, goal: 26.88, actual: 0 },
  { id: 'tue', name: 'Tue', fullName: 'Tuesday', dayIndex: 2, goal: 26.88, actual: 0 },
  { id: 'wed', name: 'Wed', fullName: 'Wednesday', dayIndex: 3, goal: 26.88, actual: 0 },
  { id: 'thu', name: 'Thu', fullName: 'Thursday', dayIndex: 4, goal: 26.87, actual: 0 },
  { id: 'fri', name: 'Fri', fullName: 'Friday', dayIndex: 5, goal: 26.87, actual: 0 },
  { id: 'sat', name: 'Sat', fullName: 'Saturday', dayIndex: 6, goal: 26.87, actual: 0 }
];

const DEFAULT_STATE = {
  totalBillGoal: 215.00,
  dashGoal: 161.25,
  days: DEFAULT_DAYS
};

let state = loadState();
let activeDayId = getInitialActiveDay();

function triggerHaptic() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate(8); } catch (e) {}
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
        fullName: defDay.fullName,
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

function getInitialActiveDay() {
  const today = getTodayIndex();
  const found = DEFAULT_DAYS.find(d => d.dayIndex === today);
  return found ? found.id : 'mon';
}

// Render clean, calm grouped rows
function renderDaysList() {
  const container = document.getElementById('daysList');
  if (!container) return;
  container.innerHTML = '';

  const todayIndex = getTodayIndex();

  state.days.forEach(day => {
    const isToday = day.dayIndex === todayIndex;
    const isActive = day.id === activeDayId;

    const row = document.createElement('div');
    row.id = `row-${day.id}`;
    row.className = `day-row grid grid-cols-12 gap-1 items-center px-3 py-2.5 cursor-pointer select-none ${isActive ? 'is-active' : 'hover:bg-zinc-800/30'}`;

    row.innerHTML = `
      <!-- Day Column -->
      <div class="col-span-3 flex items-center gap-1.5 font-sans" onclick="setActiveDay('${day.id}')">
        <span class="w-1.5 h-1.5 rounded-full ${isToday ? 'bg-emerald-400' : 'bg-transparent'}"></span>
        <span class="font-semibold text-xs ${isActive ? 'text-white' : 'text-zinc-300'}">${day.name}</span>
      </div>

      <!-- Goal Column -->
      <div class="col-span-3 text-right">
        <div class="inline-flex items-center justify-end bg-zinc-950/60 rounded-md px-1.5 py-0.5 border border-zinc-800/70 focus-within:border-zinc-500">
          <span class="text-[10px] text-zinc-500 mr-0.5">$</span>
          <input 
            type="number" 
            inputmode="decimal"
            id="goal-${day.id}" 
            step="0.01" 
            min="0"
            value="${day.goal.toFixed(2)}"
            class="w-11 bg-transparent text-right text-xs text-zinc-400 font-mono focus:outline-none focus:text-white"
          />
        </div>
      </div>

      <!-- Actual Column -->
      <div class="col-span-3 text-right">
        <div class="inline-flex items-center justify-end bg-zinc-950 rounded-md px-1.5 py-0.5 border ${isActive ? 'border-emerald-500/60 ring-1 ring-emerald-500/30' : 'border-zinc-800'} focus-within:border-emerald-400">
          <span class="text-[10px] text-emerald-400 mr-0.5">$</span>
          <input 
            type="number" 
            inputmode="decimal"
            id="actual-${day.id}" 
            step="0.01" 
            min="0"
            value="${day.actual > 0 ? day.actual.toFixed(2) : ''}"
            placeholder="0.00"
            class="w-11 bg-transparent text-right text-xs font-bold text-white font-mono focus:outline-none placeholder-zinc-700"
            onfocus="setActiveDay('${day.id}')"
          />
        </div>
      </div>

      <!-- Diff Column -->
      <div class="col-span-3 text-right font-mono text-[11px]" onclick="setActiveDay('${day.id}')">
        <span id="diff-${day.id}" class="text-zinc-500 font-medium">-$${day.goal.toFixed(2)}</span>
      </div>
    `;

    container.appendChild(row);
  });

  updateActiveDayUI();
  attachInputListeners();
}

window.setActiveDay = function(dayId) {
  triggerHaptic();
  activeDayId = dayId;
  updateActiveDayUI();
};

function updateActiveDayUI() {
  state.days.forEach(day => {
    const row = document.getElementById(`row-${day.id}`);
    if (row) {
      if (day.id === activeDayId) {
        row.classList.add('is-active');
      } else {
        row.classList.remove('is-active');
      }
    }
  });

  const activeDay = state.days.find(d => d.id === activeDayId);
  const activeDayLabel = document.getElementById('activeDayLabel');
  if (activeDayLabel && activeDay) {
    activeDayLabel.textContent = `${activeDay.name}:`;
  }
}

// Quick Steppers for Active Day
window.activeQuickAdd = function(amount) {
  triggerHaptic();
  const day = state.days.find(d => d.id === activeDayId);
  if (!day) return;
  day.actual = Math.round((day.actual + amount) * 100) / 100;
  const input = document.getElementById(`actual-${day.id}`);
  if (input) input.value = day.actual.toFixed(2);
  saveState();
  updateCalculations();
};

window.activeFillGoal = function() {
  triggerHaptic();
  const day = state.days.find(d => d.id === activeDayId);
  if (!day) return;
  day.actual = day.goal;
  const input = document.getElementById(`actual-${day.id}`);
  if (input) input.value = day.actual.toFixed(2);
  saveState();
  updateCalculations();
};

window.activeClear = function() {
  triggerHaptic();
  const day = state.days.find(d => d.id === activeDayId);
  if (!day) return;
  day.actual = 0;
  const input = document.getElementById(`actual-${day.id}`);
  if (input) input.value = '';
  saveState();
  updateCalculations();
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

  // Main Paycheck Needed Display
  const paycheckNeededDisplay = document.getElementById('paycheckNeededDisplay');
  if (paycheckNeededDisplay) paycheckNeededDisplay.textContent = formatCurrency(paycheckNeeded);

  // Status Badge
  const paycheckBadge = document.getElementById('paycheckBadge');
  if (paycheckBadge) {
    if (dashActual >= totalBill) {
      const extra = dashActual - totalBill;
      paycheckBadge.textContent = extra > 0 ? `+$${extra.toFixed(2)} surplus` : '$0 needed';
      paycheckBadge.className = 'text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    } else if (dashActual >= dashGoal) {
      const saved = plannedPaycheck - paycheckNeeded;
      paycheckBadge.textContent = `+$${saved.toFixed(2)} saved`;
      paycheckBadge.className = 'text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    } else {
      paycheckBadge.textContent = `${formatCurrency(plannedPaycheck)} planned`;
      paycheckBadge.className = 'text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/60';
    }
  }

  // Progress Bar
  const dashProgressBar = document.getElementById('dashProgressBar');
  if (dashProgressBar) {
    const pct = totalBill > 0 ? Math.min(100, (dashActual / totalBill) * 100) : 0;
    dashProgressBar.style.width = `${pct}%`;
  }

  // Secondary Metric: Dash Actual
  const dashActualDisplay = document.getElementById('dashActualDisplay');
  if (dashActualDisplay) dashActualDisplay.textContent = formatCurrency(dashActual);

  // Row Differences
  state.days.forEach(day => {
    const diffEl = document.getElementById(`diff-${day.id}`);
    const dayDiff = day.actual - day.goal;

    if (diffEl) {
      if (day.actual === 0) {
        diffEl.textContent = `-$${day.goal.toFixed(2)}`;
        diffEl.className = 'text-zinc-500 font-mono';
      } else if (dayDiff >= 0) {
        diffEl.textContent = dayDiff === 0 ? '✓ Goal' : `+$${dayDiff.toFixed(2)}`;
        diffEl.className = 'font-bold text-emerald-400 font-mono';
      } else {
        diffEl.textContent = `-$${Math.abs(dayDiff).toFixed(2)}`;
        diffEl.className = 'text-zinc-400 font-mono';
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
      showToast(`Split: $${perDay.toFixed(2)}/day`);
    });
  }

  // Reset Week
  const resetWeekBtn = document.getElementById('resetWeekBtn');
  if (resetWeekBtn) {
    resetWeekBtn.addEventListener('click', () => {
      triggerHaptic();
      if (confirm('Clear actual earnings?')) {
        state.days.forEach(day => {
          day.actual = 0;
          const input = document.getElementById(`actual-${day.id}`);
          if (input) input.value = '';
        });
        saveState();
        updateCalculations();
        showToast('Reset');
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
        text += `${d.name}: ${formatCurrency(d.actual)} / ${formatCurrency(d.goal)}\n`;
      });

      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => showToast('Copied'));
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
      toggleFrameBtn.textContent = 'iPhone 15';
    }

    toggleFrameBtn.addEventListener('click', () => {
      const isExpanded = deviceFrame.classList.toggle('expanded-frame');
      toggleFrameBtn.textContent = isExpanded ? 'iPhone 15' : 'Full Width';
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
  renderDaysList();
  setupToolbarActions();
  updateCalculations();
});
