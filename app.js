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

let showOtherDays = false;

// Render Daily Cards: Shows only the current day by default, other days revealed on toggle
function renderDays() {
  const todayContainer = document.getElementById('todayContainer');
  const otherDaysList = document.getElementById('otherDaysList');
  if (!todayContainer || !otherDaysList) return;

  todayContainer.innerHTML = '';
  otherDaysList.innerHTML = '';

  const todayIndex = getTodayIndex();

  state.days.forEach(day => {
    const isToday = day.dayIndex === todayIndex;
    const dayDiff = day.actual - day.planned;
    const dayPct = day.planned > 0 ? Math.min(100, (day.actual / day.planned) * 100) : (day.actual > 0 ? 100 : 0);

    let diffText = '';
    let diffClass = '';
    let barColor = 'bg-emerald-500';

    if (day.actual === 0) {
      diffText = '';
      diffClass = '';
      barColor = 'bg-zinc-700';
    } else if (dayDiff >= 0) {
      diffText = dayDiff === 0 ? '✓ Hit Goal' : `+$${dayDiff.toFixed(2)} ahead`;
      diffClass = 'text-emerald-400 font-bold';
      barColor = 'bg-emerald-400';
    } else {
      diffText = '';
      diffClass = '';
      barColor = 'bg-amber-400';
    }

    const card = document.createElement('div');
    card.id = `card-${day.id}`;

    if (isToday) {
      // TODAY: Smart Prominent Card (Always Visible on Launch)
      card.className = 'today-card rounded-2xl p-3.5 transition-all select-none';
      card.innerHTML = `
        <!-- Top: Live Pulse + Today Badge -->
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="relative flex h-2.5 w-2.5">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span class="font-bold text-white text-base">${day.name}</span>
            <span class="text-[9px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded-full uppercase tracking-wider">Today</span>
          </div>
          <span class="text-xs font-mono ${diffClass}">
            ${diffText}
          </span>
        </div>

        <!-- Middle: Action Banner -->
        <div class="flex items-center justify-between bg-black/60 rounded-xl p-2.5 border border-emerald-500/30 mb-2.5 cursor-pointer hover:border-emerald-500/50 transition-colors" onclick="openCalcModal('${day.id}')" title="Tap to enter earnings">
          <div>
            <span class="text-[9px] uppercase font-bold text-zinc-400 block mb-0.5">Today's Earnings</span>
            <div class="flex items-baseline gap-1 font-mono">
              <span class="text-2xl font-black text-emerald-400">$${day.actual.toFixed(2)}</span>
              <span class="text-xs text-zinc-500">/ $${day.planned.toFixed(2)} goal</span>
            </div>
          </div>
          
          <button type="button" class="tap-btn px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40" onclick="event.stopPropagation(); openCalcModal('${day.id}')">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            <span>Log Dash</span>
          </button>
        </div>

        <!-- Mini Progress Bar -->
        <div class="w-full bg-zinc-800/90 rounded-full h-1.5 overflow-hidden">
          <div class="${barColor} h-1.5 rounded-full transition-all duration-300" style="width: ${dayPct}%"></div>
        </div>
      `;
      todayContainer.appendChild(card);
    } else {
      // OTHER DAYS: Sleek Minimal Row (Hidden until user clicks toggle button)
      card.className = 'glass-card rounded-2xl p-3 flex items-center justify-between cursor-pointer hover:border-zinc-700 transition-colors select-none';
      card.setAttribute('onclick', `openCalcModal('${day.id}')`);
      card.setAttribute('title', 'Tap to enter earnings');

      card.innerHTML = `
        <!-- Left: Day badge, title, and goal -->
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-black/60 border border-zinc-800 flex flex-col items-center justify-center font-mono">
            <span class="text-[9px] text-zinc-500 uppercase font-bold">${day.short}</span>
            <span class="text-xs font-bold ${day.actual >= day.planned && day.planned > 0 ? 'text-emerald-400' : (day.actual > 0 ? 'text-amber-400' : 'text-zinc-600')}">
              ${day.actual >= day.planned && day.planned > 0 ? '✓' : (day.actual > 0 ? '•' : '—')}
            </span>
          </div>

          <div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-white text-sm">${day.name}</span>
              <span class="text-[10px] font-mono ${diffClass}">${diffText}</span>
            </div>
            <div class="text-[11px] font-mono text-zinc-400 mt-0.5 flex items-center gap-1.5">
              <span>Goal: $${day.planned.toFixed(2)}</span>
              <div class="w-14 bg-zinc-800 rounded-full h-1 overflow-hidden inline-block align-middle">
                <div class="${barColor} h-1 rounded-full transition-all duration-300" style="width: ${dayPct}%"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Actual Amount + Tap Icon -->
        <div class="flex items-center gap-2">
          <div class="text-right font-mono">
            <div class="text-base font-black ${day.actual > 0 ? 'text-white' : 'text-zinc-500'}">
              $${day.actual.toFixed(2)}
            </div>
            <span class="text-[9px] text-zinc-500 block">Tap +/−</span>
          </div>
          <div class="w-7 h-7 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-zinc-400">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
          </div>
        </div>
      `;
      otherDaysList.appendChild(card);
    }
  });

  updateOtherDaysVisibility();
}

window.toggleOtherDays = function() {
  triggerHaptic();
  showOtherDays = !showOtherDays;
  updateOtherDaysVisibility();
};

function updateOtherDaysVisibility() {
  const container = document.getElementById('otherDaysContainer');
  const icon = document.getElementById('toggleOtherDaysIcon');
  const text = document.getElementById('toggleOtherDaysText');

  if (container) {
    if (showOtherDays) {
      container.classList.remove('hidden');
    } else {
      container.classList.add('hidden');
    }
  }

  if (icon) {
    icon.textContent = showOtherDays ? '▴' : '▾';
  }

  if (text) {
    text.textContent = showOtherDays ? 'Hide Other Days' : 'View Full Week (5 Other Days)';
  }
}

window.selectDay = function(dayId) {
  triggerHaptic();
  activeDayId = dayId;
};

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

  // Goal Paycheck Needed Badge
  const paycheckGoalDisplay = document.getElementById('paycheckGoalDisplay');
  if (paycheckGoalDisplay) paycheckGoalDisplay.textContent = formatCurrency(paycheckGoal);

  // 2-Tone Segmented Progress Bar
  const segDashBar = document.getElementById('segDashBar');
  const segPaycheckBar = document.getElementById('segPaycheckBar');
  const dashPctLabel = document.getElementById('dashPctLabel');
  const paycheckPctLabel = document.getElementById('paycheckPctLabel');

  const dashPct = totalBill > 0 ? Math.min(100, (actualEarnings / totalBill) * 100) : 0;
  const paycheckPct = Math.max(0, 100 - dashPct);

  if (segDashBar) segDashBar.style.width = `${dashPct}%`;
  if (segPaycheckBar) segPaycheckBar.style.width = `${paycheckPct}%`;
  if (dashPctLabel) dashPctLabel.textContent = `${Math.round(dashPct)}%`;
  if (paycheckPctLabel) paycheckPctLabel.textContent = `${Math.round(paycheckPct)}%`;

  // Summary Tiles
  const actualEarningsDisplay = document.getElementById('actualEarningsDisplay');
  if (actualEarningsDisplay) actualEarningsDisplay.textContent = formatCurrency(actualEarnings);

  const estimatedEarningsDisplay = document.getElementById('estimatedEarningsDisplay');
  if (estimatedEarningsDisplay) estimatedEarningsDisplay.textContent = formatCurrency(estimatedEarnings);

  // Update total bill goal input if not focused
  const totalBillGoalInput = document.getElementById('totalBillGoalInput');
  if (totalBillGoalInput && document.activeElement !== totalBillGoalInput) {
    totalBillGoalInput.value = totalBill.toFixed(2);
  }

  // Update day cards
  renderDays();
}

// -------------------------------------------------------------
// GOALS CUSTOMIZATION MODAL ENGINE
// -------------------------------------------------------------

window.openGoalsModal = function() {
  triggerHaptic();
  const modal = document.getElementById('goalsModal');
  const sheet = modal ? modal.querySelector('.ynab-modal-sheet') : null;
  const list = document.getElementById('goalsModalList');

  if (list) {
    list.innerHTML = '';
    state.days.forEach(day => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between bg-black/60 rounded-xl px-3.5 py-2.5 border border-zinc-800 font-mono';
      row.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="w-8 text-[10px] uppercase font-bold text-zinc-400">${day.short}</span>
          <span class="text-xs font-semibold text-white">${day.name}</span>
        </div>
        <div class="flex items-center bg-zinc-900 rounded-lg px-2.5 py-1 border border-zinc-700/60 focus-within:border-emerald-500">
          <span class="text-xs font-bold text-emerald-400 mr-1">$</span>
          <input 
            type="number" 
            inputmode="decimal" 
            id="goal-input-${day.id}" 
            step="0.01" 
            min="0" 
            value="${day.planned.toFixed(2)}"
            oninput="updateGoalsModalTotal()"
            class="w-16 bg-transparent text-right text-xs font-bold text-white focus:outline-none"
          />
        </div>
      `;
      list.appendChild(row);
    });
  }

  updateGoalsModalTotal();

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

window.closeGoalsModal = function() {
  triggerHaptic();
  // Read values from modal inputs
  state.days.forEach(day => {
    const input = document.getElementById(`goal-input-${day.id}`);
    if (input) {
      day.planned = parseVal(input.value);
    }
  });

  saveState();
  updateCalculations();

  const modal = document.getElementById('goalsModal');
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

  showToast('Goals updated');
};

window.updateGoalsModalTotal = function() {
  const totalDisplay = document.getElementById('goalsModalTotal');
  if (!totalDisplay) return;

  let sum = 0;
  state.days.forEach(day => {
    const input = document.getElementById(`goal-input-${day.id}`);
    if (input) {
      sum += parseVal(input.value);
    } else {
      sum += day.planned;
    }
  });
  totalDisplay.textContent = formatCurrency(sum);
};

window.splitGoalsEvenlyModal = function() {
  triggerHaptic();
  const targetBase = 161.25;
  const perDay = Math.floor((targetBase / 6) * 100) / 100;
  const remainder = Math.round((targetBase - perDay * 6) * 100) / 100;
  
  state.days.forEach((day, i) => {
    const extraCent = i < Math.round(remainder * 100) ? 0.01 : 0;
    const val = Math.round((perDay + extraCent) * 100) / 100;
    const input = document.getElementById(`goal-input-${day.id}`);
    if (input) input.value = val.toFixed(2);
  });

  updateGoalsModalTotal();
};

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
  // Total Bill Goal Input listener
  const totalBillGoalInput = document.getElementById('totalBillGoalInput');
  if (totalBillGoalInput) {
    totalBillGoalInput.value = state.totalBillGoal.toFixed(2);
    totalBillGoalInput.addEventListener('input', (e) => {
      state.totalBillGoal = parseVal(e.target.value);
      saveState();
      updateCalculations();
    });
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
