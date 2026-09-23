// School Bill Tracker - YNAB-style Protected Calculator Engine

const STORAGE_KEY = 'school_bill_tracker_state_v2';
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

// YNAB Calculator State
let calcDayId = getTodayId();
let calcBase = 0;
let calcExpr = '0';

function triggerHaptic() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate(10); } catch (e) {}
  }
}

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
        planned: match && typeof match.planned === 'number' ? match.planned : (match && typeof match.goal === 'number' ? match.goal : defDay.planned),
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

    card.innerHTML = `
      <!-- Card Top: Day & Status -->
      <div class="flex items-center justify-between mb-2.5">
        <div class="flex items-center gap-1.5 cursor-pointer" onclick="selectDay('${day.id}')">
          <span class="w-2 h-2 rounded-full ${isToday ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}"></span>
          <span class="font-bold text-white text-sm">${day.name}</span>
          ${isToday ? '<span class="text-[9px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 rounded-full">TODAY</span>' : ''}
        </div>
        <span id="diff-${day.id}" class="text-xs font-mono font-medium text-zinc-400 cursor-pointer" onclick="selectDay('${day.id}')">
          -$${day.planned.toFixed(2)}
        </span>
      </div>

      <!-- Card Middle: Actual (Protected YNAB Tap) vs Planned (Editable Goal) -->
      <div class="grid grid-cols-2 gap-2 mb-2.5">
        <!-- Actual Earned: Taps to open YNAB math sheet -->
        <div class="bg-black/60 rounded-xl px-3 py-2 border border-zinc-800 hover:border-emerald-500/60 cursor-pointer tap-btn transition-colors group" onclick="openCalcModal('${day.id}')" title="Tap to add or subtract earnings">
          <div class="flex items-center justify-between mb-0.5">
            <span class="text-[9px] font-bold uppercase tracking-wider text-emerald-400">Actual</span>
            <span class="text-[9px] text-zinc-500 font-mono group-hover:text-emerald-400 transition-colors">Tap +/−</span>
          </div>
          <div class="flex items-center font-mono">
            <span class="text-sm font-bold text-emerald-400 mr-0.5">$</span>
            <span class="text-base font-extrabold text-white" id="actual-display-${day.id}">
              ${day.actual > 0 ? day.actual.toFixed(2) : '0.00'}
            </span>
          </div>
        </div>

        <!-- Planned Input -->
        <div class="bg-black/60 rounded-xl px-3 py-2 border border-zinc-800 focus-within:border-orange-500 transition-colors">
          <div class="text-[9px] font-bold uppercase tracking-wider text-orange-400 mb-0.5">
            Planned Goal
          </div>
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
    if (plannedInput) {
      plannedInput.addEventListener('input', (e) => {
        day.planned = parseVal(e.target.value);
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

  // Current Paycheck Needed: based on actual earnings so far
  const paycheckNeeded = Math.max(0, totalBill - actualEarnings);

  // Goal Paycheck Needed: based on current planned goal
  const paycheckGoal = Math.max(0, totalBill - estimatedEarnings);

  // Dynamic Island
  const islandPaycheck = document.getElementById('islandPaycheck');
  if (islandPaycheck) islandPaycheck.textContent = formatCurrency(paycheckNeeded);

  // Current Paycheck Needed Display
  const paycheckNeededDisplay = document.getElementById('paycheckNeededDisplay');
  if (paycheckNeededDisplay) paycheckNeededDisplay.textContent = formatCurrency(paycheckNeeded);

  // Goal Paycheck Needed Display
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
    const actualDisplay = document.getElementById(`actual-display-${day.id}`);

    if (actualDisplay) {
      actualDisplay.textContent = day.actual > 0 ? day.actual.toFixed(2) : '0.00';
    }

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
// YNAB-STYLE PROTECTED CALCULATOR MODAL ENGINE
// -------------------------------------------------------------

function evalCalcExpression(expr) {
  if (!expr) return 0;
  const tokens = expr.trim().split(/\s+/);
  if (tokens.length === 0 || tokens[0] === '') return 0;
  
  let total = parseFloat(tokens[0]) || 0;
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i];
    const val = parseFloat(tokens[i + 1]);
    if (isNaN(val)) continue; // ignore trailing operator
    if (op === '+' || op === '+') {
      total += val;
    } else if (op === '−' || op === '-') {
      total -= val;
    }
  }
  return Math.max(0, Math.round(total * 100) / 100);
}

window.openCalcModal = function(dayId) {
  triggerHaptic();
  calcDayId = dayId;
  selectDay(dayId);

  const day = state.days.find(d => d.id === dayId);
  if (!day) return;

  calcBase = day.actual;
  calcExpr = calcBase > 0 ? calcBase.toFixed(2) : '0';

  const modal = document.getElementById('calcModal');
  const sheet = modal ? modal.querySelector('.ynab-modal-sheet') : null;
  const dayTitle = document.getElementById('calcDayTitle');
  const currentAmount = document.getElementById('calcCurrentAmount');

  if (dayTitle) dayTitle.textContent = day.name;
  if (currentAmount) currentAmount.textContent = formatCurrency(calcBase);

  updateCalcDisplay();

  if (modal && sheet) {
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
      modal.classList.remove('opacity-0', 'pointer-events-none');
      modal.classList.add('opacity-100');
      sheet.classList.remove('translate-y-full');
      sheet.classList.add('translate-y-0');
    });
  }
};

window.closeCalcModal = function() {
  triggerHaptic();
  const modal = document.getElementById('calcModal');
  const sheet = modal ? modal.querySelector('.ynab-modal-sheet') : null;

  if (modal && sheet) {
    sheet.classList.remove('translate-y-0');
    sheet.classList.add('translate-y-full');
    modal.classList.remove('opacity-100');
    modal.classList.add('opacity-0', 'pointer-events-none');
    setTimeout(() => {
      modal.classList.add('hidden');
    }, 220);
  }
};

window.calcInputKey = function(key) {
  triggerHaptic();

  if (key === 'C') {
    calcExpr = calcBase > 0 ? calcBase.toFixed(2) : '0';
    updateCalcDisplay();
    return;
  }

  if (key === 'BACKSPACE') {
    // Cannot backspace into the locked base
    if (calcBase > 0 && calcExpr === calcBase.toFixed(2)) {
      updateCalcDisplay();
      return;
    }
    if (calcExpr.endsWith(' ')) {
      calcExpr = calcExpr.slice(0, -3).trim();
    } else {
      calcExpr = calcExpr.slice(0, -1);
      if (!calcExpr || calcExpr === '') {
        calcExpr = calcBase > 0 ? calcBase.toFixed(2) : '0';
      }
    }
    updateCalcDisplay();
    return;
  }

  if (key === '+' || key === '−' || key === '-') {
    const op = key === '-' ? '−' : key;
    if (calcExpr.endsWith(' + ') || calcExpr.endsWith(' − ')) {
      calcExpr = calcExpr.slice(0, -3) + ' ' + op + ' ';
    } else {
      calcExpr += ' ' + op + ' ';
    }
    updateCalcDisplay();
    return;
  }

  if (key === '.') {
    const parts = calcExpr.trim().split(/\s+/);
    const last = parts[parts.length - 1];
    if (last === '+' || last === '−' || last === '-') {
      calcExpr += '0.';
    } else if (!last.includes('.')) {
      calcExpr += '.';
    }
    updateCalcDisplay();
    return;
  }

  if (key === '00') {
    if (calcExpr === '0') return;
    if (calcBase > 0 && calcExpr === calcBase.toFixed(2)) {
      calcExpr += ' + 0';
    } else {
      const parts = calcExpr.trim().split(/\s+/);
      const last = parts[parts.length - 1];
      if (last === '+' || last === '−' || last === '-') {
        calcExpr += '0';
      } else {
        calcExpr += '00';
      }
    }
    updateCalcDisplay();
    return;
  }

  // Digits 0-9
  if (calcExpr === '0') {
    calcExpr = key;
  } else if (calcBase > 0 && calcExpr === calcBase.toFixed(2)) {
    calcExpr += ' + ' + key;
  } else {
    calcExpr += key;
  }

  updateCalcDisplay();
};

window.calcAppendPreset = function(amount) {
  triggerHaptic();
  if (calcExpr.endsWith(' + ') || calcExpr.endsWith(' − ')) {
    calcExpr += amount.toString();
  } else if (calcExpr === '0') {
    calcExpr = amount.toString();
  } else {
    calcExpr += ' + ' + amount.toString();
  }
  updateCalcDisplay();
};

function updateCalcDisplay() {
  const formulaDisplay = document.getElementById('calcFormulaDisplay');
  const resultPreview = document.getElementById('calcResultPreview');
  const applyBtnText = document.getElementById('calcApplyBtnText');

  const evaluated = evalCalcExpression(calcExpr);

  if (formulaDisplay) {
    formulaDisplay.textContent = calcExpr;
    formulaDisplay.scrollLeft = formulaDisplay.scrollWidth;
  }

  if (resultPreview) {
    resultPreview.textContent = formatCurrency(evaluated);
    if (evaluated > calcBase) {
      resultPreview.className = 'text-2xl font-black font-mono text-emerald-400 tracking-tight';
    } else if (evaluated < calcBase) {
      resultPreview.className = 'text-2xl font-black font-mono text-amber-400 tracking-tight';
    } else {
      resultPreview.className = 'text-2xl font-black font-mono text-zinc-100 tracking-tight';
    }
  }

  if (applyBtnText) {
    const diff = Math.round((evaluated - calcBase) * 100) / 100;
    if (diff === 0) {
      applyBtnText.textContent = `Keep ${formatCurrency(calcBase)}`;
    } else if (diff > 0) {
      applyBtnText.textContent = `Save ${formatCurrency(evaluated)} (+${formatCurrency(diff)})`;
    } else {
      applyBtnText.textContent = `Save ${formatCurrency(evaluated)} (-${formatCurrency(Math.abs(diff))})`;
    }
  }
}

window.applyCalcResult = function() {
  triggerHaptic();
  const day = state.days.find(d => d.id === calcDayId);
  if (!day) return;

  const newTotal = evalCalcExpression(calcExpr);
  const diff = Math.round((newTotal - calcBase) * 100) / 100;

  day.actual = newTotal;
  saveState();
  updateCalculations();
  closeCalcModal();

  if (diff !== 0) {
    const sign = diff > 0 ? '+' : '−';
    showToast(`${day.short}: ${sign}${formatCurrency(Math.abs(diff))} (Total ${formatCurrency(newTotal)})`);
  }
};

window.resetCurrentDayEarnings = function() {
  triggerHaptic();
  const day = state.days.find(d => d.id === calcDayId);
  if (!day) return;

  if (confirm(`Reset ${day.name}'s actual earnings to $0.00?`)) {
    day.actual = 0;
    saveState();
    updateCalculations();
    closeCalcModal();
    showToast(`${day.short} reset to $0.00`);
  }
};

// -------------------------------------------------------------
// TOOLBAR ACTIONS & SETUP
// -------------------------------------------------------------

function setupToolbarActions() {

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
      if (confirm('Clear actual earnings for the entire week? Planned goals will stay.')) {
        state.days.forEach(day => {
          day.actual = 0;
        });
        saveState();
        updateCalculations();
        showToast('All week actuals cleared');
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
  }, 1600);
}

document.addEventListener('DOMContentLoaded', () => {
  renderDays();
  setupToolbarActions();
  updateCalculations();

  // PC mousewheel forward
  const deviceFrame = document.getElementById('deviceFrame');
  const scrollContent = document.getElementById('scrollContent');
  if (deviceFrame && scrollContent) {
    deviceFrame.addEventListener('wheel', (e) => {
      const modal = document.getElementById('calcModal');
      if (modal && modal.classList.contains('hidden')) {
        scrollContent.scrollTop += e.deltaY;
      }
    }, { passive: true });
  }

  // PC / Hardware Keyboard Listener for Calculator
  window.addEventListener('keydown', (e) => {
    const modal = document.getElementById('calcModal');
    if (!modal || modal.classList.contains('hidden')) return;

    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      calcInputKey(e.key);
    } else if (e.key === '.') {
      e.preventDefault();
      calcInputKey('.');
    } else if (e.key === '+') {
      e.preventDefault();
      calcInputKey('+');
    } else if (e.key === '-') {
      e.preventDefault();
      calcInputKey('−');
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      calcInputKey('BACKSPACE');
    } else if (e.key === 'c' || e.key === 'C') {
      e.preventDefault();
      calcInputKey('C');
    } else if (e.key === 'Enter' || e.key === '=') {
      e.preventDefault();
      applyCalcResult();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeCalcModal();
    }
  });
});
