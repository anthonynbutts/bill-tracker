// School Bill Tracker - Super Minimal Engine

const STORAGE_KEY = 'school_bill_tracker_state_v1';
const THEME_KEY = 'school_bill_tracker_theme';
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

function getCurrentDayIndex() {
  return new Date().getDay();
}

// Render super-clean minimal day rows
function renderDayCards() {
  const container = document.getElementById('daysContainer');
  if (!container) return;
  container.innerHTML = '';

  const todayIndex = getCurrentDayIndex();

  state.days.forEach(day => {
    const isToday = day.dayIndex === todayIndex;
    const card = document.createElement('div');
    card.id = `card-${day.id}`;
    card.className = `rounded-2xl p-3 bg-zinc-900 border ${isToday ? 'border-emerald-500/50' : 'border-zinc-800'} transition-all`;

    card.innerHTML = `
      <!-- Top Row: Day & Difference -->
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full ${isToday ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}"></span>
          <span class="font-bold text-white text-xs">${day.name}</span>
          ${isToday ? '<span class="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1 rounded">TODAY</span>' : ''}
        </div>
        <span id="diff-${day.id}" class="text-[11px] font-mono text-zinc-400">
          -$${day.goal.toFixed(2)}
        </span>
      </div>

      <!-- Inputs: Actual & Goal -->
      <div class="grid grid-cols-2 gap-2 mb-2">
        <!-- Actual -->
        <div class="bg-zinc-950/70 rounded-xl px-2.5 py-1.5 border border-zinc-800 focus-within:border-emerald-500 flex items-center justify-between">
          <span class="text-[10px] uppercase font-bold text-zinc-400">Actual</span>
          <div class="flex items-center font-mono">
            <span class="text-xs text-emerald-400 mr-0.5">$</span>
            <input 
              type="number" 
              inputmode="decimal"
              id="actual-${day.id}" 
              step="0.01" 
              min="0"
              value="${day.actual > 0 ? day.actual.toFixed(2) : ''}"
              class="w-16 bg-transparent text-right text-xs font-bold text-white focus:outline-none placeholder-zinc-700"
              placeholder="0.00"
            />
          </div>
        </div>

        <!-- Goal -->
        <div class="bg-zinc-950/70 rounded-xl px-2.5 py-1.5 border border-zinc-800 focus-within:border-zinc-600 flex items-center justify-between">
          <span class="text-[10px] uppercase font-bold text-zinc-400">Goal</span>
          <div class="flex items-center font-mono">
            <span class="text-xs text-zinc-500 mr-0.5">$</span>
            <input 
              type="number" 
              inputmode="decimal"
              id="goal-${day.id}" 
              step="0.01" 
              min="0"
              value="${day.goal.toFixed(2)}"
              class="w-16 bg-transparent text-right text-xs font-bold text-zinc-300 focus:outline-none"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      <!-- Quick Steppers -->
      <div class="flex items-center justify-between gap-1 pt-1 border-t border-zinc-800/50">
        <div class="flex items-center gap-1 font-mono text-[10px]">
          <button type="button" class="px-2 py-0.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 active:scale-95 transition-transform" onclick="quickAdd('${day.id}', 5)">+5</button>
          <button type="button" class="px-2 py-0.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 active:scale-95 transition-transform" onclick="quickAdd('${day.id}', 10)">+10</button>
          <button type="button" class="px-2 py-0.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 active:scale-95 transition-transform" onclick="quickAdd('${day.id}', 20)">+20</button>
        </div>
        <div class="flex items-center gap-1 font-mono text-[10px]">
          <button type="button" class="px-2 py-0.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 active:scale-95 transition-transform" onclick="fillGoal('${day.id}')">Hit</button>
          <button type="button" class="px-1.5 py-0.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-red-400 active:scale-95 transition-colors" onclick="clearDay('${day.id}')">✕</button>
        </div>
      </div>
    `;

    container.appendChild(card);
  });

  attachInputListeners();
}

window.quickAdd = function(dayId, amount) {
  triggerHaptic();
  const day = state.days.find(d => d.id === dayId);
  if (!day) return;
  day.actual = Math.round((day.actual + amount) * 100) / 100;
  const input = document.getElementById(`actual-${dayId}`);
  if (input) input.value = day.actual.toFixed(2);
  saveState();
  updateCalculations();
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

// Minimal master calculation
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
      paycheckBadge.className = 'text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700';
    }
  }

  // Progress Bar
  const dashProgressBar = document.getElementById('dashProgressBar');
  if (dashProgressBar) {
    const pct = totalBill > 0 ? Math.min(100, (dashActual / totalBill) * 100) : 0;
    dashProgressBar.style.width = `${pct}%`;
  }

  // Top Card Secondary
  const dashActualDisplay = document.getElementById('dashActualDisplay');
  if (dashActualDisplay) dashActualDisplay.textContent = formatCurrency(dashActual);

  // Floating Bottom Bar
  const bottomPaycheckDisplay = document.getElementById('bottomPaycheckDisplay');
  const bottomDashDisplay = document.getElementById('bottomDashDisplay');
  if (bottomPaycheckDisplay) bottomPaycheckDisplay.textContent = formatCurrency(paycheckNeeded);
  if (bottomDashDisplay) bottomDashDisplay.textContent = `${formatCurrency(dashActual)} / ${formatCurrency(dashGoal)}`;

  // Daily rows variance
  state.days.forEach(day => {
    const diffEl = document.getElementById(`diff-${day.id}`);
    const cardEl = document.getElementById(`card-${day.id}`);
    const dayDiff = day.actual - day.goal;

    if (diffEl) {
      if (day.actual === 0) {
        diffEl.textContent = `-$${day.goal.toFixed(2)}`;
        diffEl.className = 'text-[11px] font-mono text-zinc-500';
      } else if (dayDiff >= 0) {
        diffEl.textContent = dayDiff === 0 ? '✓ Goal' : `+$${dayDiff.toFixed(2)}`;
        diffEl.className = 'text-[11px] font-mono font-bold text-emerald-400';
      } else {
        diffEl.textContent = `-$${Math.abs(dayDiff).toFixed(2)}`;
        diffEl.className = 'text-[11px] font-mono text-zinc-400';
      }
    }

    if (cardEl) {
      if (day.actual >= day.goal && day.goal > 0) {
        cardEl.classList.add('border-emerald-500/40');
      } else {
        cardEl.classList.remove('border-emerald-500/40');
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
      if (confirm('Clear actuals?')) {
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

      let text = `Bill: ${formatCurrency(state.totalBillGoal)} | Dash: ${formatCurrency(dashActual)} | Paycheck: ${formatCurrency(paycheckNeeded)}\n`;
      state.days.forEach(d => {
        text += `${d.name}: ${formatCurrency(d.actual)} / ${formatCurrency(d.goal)}\n`;
      });

      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => showToast('Copied'));
      }
    });
  }

  // Scroll to Top
  const scrollToTopBtn = document.getElementById('scrollToTopBtn');
  const scrollContainer = document.getElementById('scrollContainer');
  if (scrollToTopBtn && scrollContainer) {
    scrollToTopBtn.addEventListener('click', () => {
      triggerHaptic();
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Toggle Desktop Frame
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

  // Theme Toggle
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const sunIcon = document.getElementById('sunIcon');
  const moonIcon = document.getElementById('moonIcon');

  function applyTheme(isDark) {
    if (isDark) {
      document.documentElement.classList.add('dark');
      if (sunIcon) sunIcon.classList.remove('hidden');
      if (moonIcon) moonIcon.classList.add('hidden');
    } else {
      document.documentElement.classList.remove('dark');
      if (sunIcon) sunIcon.classList.add('hidden');
      if (moonIcon) moonIcon.classList.remove('hidden');
    }
  }

  const storedTheme = localStorage.getItem(THEME_KEY);
  applyTheme(storedTheme ? storedTheme === 'dark' : true);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      triggerHaptic();
      const willBeDark = !document.documentElement.classList.contains('dark');
      applyTheme(willBeDark);
      localStorage.setItem(THEME_KEY, willBeDark ? 'dark' : 'light');
    });
  }

  // Display today's date in header
  const headerDatePill = document.getElementById('headerDatePill');
  if (headerDatePill) {
    const now = new Date();
    headerDatePill.textContent = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
  renderDayCards();
  setupToolbarActions();
  updateCalculations();
});
