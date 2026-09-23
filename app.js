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

/**
 * Sets up a "ghost placeholder" focus/blur UX pattern for editable goals:
 * 1. On click/focus: current value disappears and becomes a greyed-out placeholder so original goal is visible.
 * 2. If user types a new number: starts clean with only the new number.
 * 3. If user clicks in and clicks out (blur) without typing: reverts to original goal.
 */
function setupSmartGoalInput(input, onCommit, onLiveChange) {
  let originalVal = '';

  input.addEventListener('focus', () => {
    const current = input.value.trim() !== '' ? input.value.trim() : (input.placeholder || '');
    originalVal = current;
    input.placeholder = current;
    input.value = '';
  });

  if (onLiveChange) {
    input.addEventListener('input', () => {
      onLiveChange(input.value, originalVal);
    });
  }

  input.addEventListener('blur', () => {
    const trimmed = input.value.trim();
    if (trimmed === '' || isNaN(parseFloat(trimmed))) {
      // Revert to original goal if empty or invalid
      input.value = originalVal;
      if (onCommit) {
        onCommit(parseFloat(originalVal) || 0, false);
      }
    } else {
      // User typed a new valid number
      const num = Math.max(0, parseFloat(trimmed));
      const formatted = num.toFixed(2);
      input.value = formatted;
      input.placeholder = formatted;
      if (onCommit) {
        onCommit(num, true);
      }
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      input.blur();
    } else if (e.key === 'Escape') {
      input.value = originalVal;
      input.blur();
    }
  });
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
  const isSunday = todayIndex === 0;
  // On Sunday, spotlight Monday (the start of the upcoming tracking week)
  const activeSpotlightId = isSunday ? 'mon' : getTodayId();

  state.days.forEach(day => {
    const isToday = day.id === activeSpotlightId;
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
      // TODAY / SPOTLIGHT: Smart Prominent Card (Always Visible on Launch)
      const badgeText = isSunday ? 'Sunday • Next: Mon' : 'Today';
      const badgeClass = isSunday
        ? 'text-amber-300 bg-amber-500/20 border border-amber-500/40'
        : 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/40';
      const actionLabel = isSunday ? "Monday's Target Goal" : "Today's Earnings";

      card.className = 'today-card rounded-2xl p-3 transition-all select-none';
      card.innerHTML = `
        <!-- Top: Day Name + Today Badge -->
        <div class="flex items-center justify-between mb-1.5">
          <div class="flex items-center gap-1.5">
            <span class="font-bold text-white text-sm">${day.name}</span>
            <span class="text-[8.5px] font-bold ${badgeClass} px-1.5 py-0.5 rounded-full uppercase tracking-wider">${badgeText}</span>
          </div>
          <span class="text-[11px] font-mono ${diffClass}">
            ${diffText}
          </span>
        </div>

        <!-- Middle: Action Banner -->
        <div class="flex items-center justify-between bg-black/60 rounded-xl p-2 border border-emerald-500/30 mb-2 cursor-pointer hover:border-emerald-500/50 transition-colors" onclick="openCalcModal('${day.id}')" title="Tap to enter earnings">
          <div>
            <span class="text-[8.5px] uppercase font-bold text-zinc-400 block mb-0.5">${actionLabel}</span>
            <div class="flex items-baseline gap-1 font-mono">
              <span class="text-xl font-bold text-emerald-400">$${day.actual.toFixed(2)}</span>
              <span class="text-[11px] text-zinc-500">/ $${day.planned.toFixed(2)} goal</span>
            </div>
          </div>
          
          <button type="button" class="tap-btn px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs flex items-center gap-1 shadow-md shadow-emerald-950/40" onclick="event.stopPropagation(); openCalcModal('${day.id}')">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            <span>Log Dash</span>
          </button>
        </div>

        <!-- Mini Progress Bar -->
        <div class="w-full bg-zinc-800/90 rounded-full h-1 overflow-hidden">
          <div class="${barColor} h-1 rounded-full transition-all duration-300" style="width: ${dayPct}%"></div>
        </div>
      `;
      todayContainer.appendChild(card);
    } else {
      // OTHER DAYS: Sleek Minimal Row (Hidden until user clicks toggle button)
      card.className = 'glass-card rounded-xl px-3 py-2 flex items-center justify-between cursor-pointer hover:border-zinc-700 transition-colors select-none';
      card.setAttribute('onclick', `openCalcModal('${day.id}')`);
      card.setAttribute('title', 'Tap to enter earnings');

      card.innerHTML = `
        <!-- Left: Day badge, title, and goal -->
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-black/60 border border-zinc-800 flex flex-col items-center justify-center font-mono">
            <span class="text-[8.5px] text-zinc-500 uppercase font-bold">${day.short}</span>
            <span class="text-[11px] font-bold ${day.actual >= day.planned && day.planned > 0 ? 'text-emerald-400' : (day.actual > 0 ? 'text-amber-400' : 'text-zinc-600')}">
              ${day.actual >= day.planned && day.planned > 0 ? '✓' : (day.actual > 0 ? '•' : '—')}
            </span>
          </div>

          <div>
            <div class="flex items-center gap-1.5">
              <span class="font-semibold text-white text-xs">${day.name}</span>
              <span class="text-[9.5px] font-mono ${diffClass}">${diffText}</span>
            </div>
            <div class="text-[10px] font-mono text-zinc-400 mt-0.5 flex items-center gap-1.5">
              <span>Goal: $${day.planned.toFixed(2)}</span>
              <div class="w-12 bg-zinc-800 rounded-full h-1 overflow-hidden inline-block align-middle">
                <div class="${barColor} h-1 rounded-full transition-all duration-300" style="width: ${dayPct}%"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Actual Amount + Tap Icon -->
        <div class="flex items-center gap-1.5">
          <div class="text-right font-mono">
            <div class="text-sm font-bold ${day.actual > 0 ? 'text-white' : 'text-zinc-500'}">
              $${day.actual.toFixed(2)}
            </div>
            <span class="text-[8.5px] text-zinc-500 block">Tap +/−</span>
          </div>
          <div class="w-6 h-6 rounded-md bg-black/60 border border-zinc-800 flex items-center justify-center text-zinc-400">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
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

  // Milestone Celebratory State Check
  const isCovered = totalBill > 0 && actualEarnings >= totalBill;
  const surplus = actualEarnings - totalBill;

  // Dynamic Island
  const islandPaycheck = document.getElementById('islandPaycheck');
  if (islandPaycheck) islandPaycheck.textContent = isCovered ? 'Covered!' : formatCurrency(paycheckNeeded);

  // Current Paycheck Needed Display
  const paycheckNeededDisplay = document.getElementById('paycheckNeededDisplay');
  if (paycheckNeededDisplay) {
    paycheckNeededDisplay.textContent = formatCurrency(paycheckNeeded);
    if (isCovered) {
      paycheckNeededDisplay.className = 'text-2xl font-black font-mono text-emerald-400 tracking-tight drop-shadow-[0_0_12px_rgba(16,185,129,0.45)]';
    } else {
      paycheckNeededDisplay.className = 'text-2xl font-black font-mono text-white tracking-tight';
    }
  }

  // Goal Paycheck Needed Badge (Milestone celebratory styling)
  const paycheckGoalBadge = document.getElementById('paycheckGoalBadge');
  const paycheckGoalDisplay = document.getElementById('paycheckGoalDisplay');
  const paycheckGoalSuffix = document.getElementById('paycheckGoalSuffix');

  if (paycheckGoalBadge && paycheckGoalDisplay) {
    if (isCovered) {
      paycheckGoalBadge.className = 'inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-mono text-emerald-300 transition-all';
      if (surplus > 0) {
        paycheckGoalDisplay.textContent = `✓ Covered! +$${surplus.toFixed(2)} Surplus`;
      } else {
        paycheckGoalDisplay.textContent = '✓ Bill Fully Covered!';
      }
      if (paycheckGoalSuffix) paycheckGoalSuffix.style.display = 'none';
    } else {
      paycheckGoalBadge.className = 'inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400 transition-all';
      paycheckGoalDisplay.textContent = formatCurrency(paycheckGoal);
      if (paycheckGoalSuffix) {
        paycheckGoalSuffix.style.display = 'inline';
        paycheckGoalSuffix.textContent = 'goal';
      }
    }
  }

  // Clean Progress Bar (Green fill on deep slate gray track)
  const segDashBar = document.getElementById('segDashBar');
  const dashPct = totalBill > 0 ? Math.min(100, (actualEarnings / totalBill) * 100) : 0;

  if (segDashBar) {
    segDashBar.style.width = `${dashPct}%`;
    segDashBar.style.opacity = dashPct > 0 ? '1' : '0';
  }

  // Summary Tiles
  const actualEarningsDisplay = document.getElementById('actualEarningsDisplay');
  if (actualEarningsDisplay) actualEarningsDisplay.textContent = formatCurrency(actualEarnings);

  const estimatedEarningsDisplay = document.getElementById('estimatedEarningsDisplay');
  if (estimatedEarningsDisplay) estimatedEarningsDisplay.textContent = formatCurrency(estimatedEarnings);

  // Update total bill goal display on main screen
  const totalBillGoalDisplay = document.getElementById('totalBillGoalDisplay');
  if (totalBillGoalDisplay) {
    totalBillGoalDisplay.textContent = totalBill.toFixed(2);
  }

  // Update total bill goal input in modal if not focused
  const goalsModalTotalBillInput = document.getElementById('goalsModalTotalBillInput');
  if (goalsModalTotalBillInput && document.activeElement !== goalsModalTotalBillInput) {
    goalsModalTotalBillInput.value = totalBill.toFixed(2);
    goalsModalTotalBillInput.placeholder = totalBill.toFixed(2);
  }

  // Update day cards
  renderDays();
}

// -------------------------------------------------------------
// GOALS CUSTOMIZATION MODAL ENGINE
// -------------------------------------------------------------

let goalsInitialSnapshot = null;

window.openGoalsModal = function(focusDayId) {
  triggerHaptic();

  // Snapshot initial values to detect if user actually makes changes
  goalsInitialSnapshot = {
    totalBillGoal: state.totalBillGoal,
    days: state.days.map(d => ({ id: d.id, planned: d.planned }))
  };

  const modal = document.getElementById('goalsModal');
  const sheet = modal ? modal.querySelector('.ynab-modal-sheet') : null;
  const list = document.getElementById('goalsModalList');

  renderGoalsModalList();

  if (modal && sheet) {
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
      modal.classList.remove('opacity-0', 'pointer-events-none');
      modal.classList.add('opacity-100');
      sheet.classList.remove('translate-y-full');
      sheet.classList.add('translate-y-0');

      if (focusDayId === 'total-bill') {
        setTimeout(() => {
          if (totalBillInput) totalBillInput.focus();
        }, 220);
      } else if (focusDayId) {
        setTimeout(() => {
          const targetInput = document.getElementById(`goal-input-${focusDayId}`);
          if (targetInput) {
            targetInput.focus();
          }
        }, 220);
      }
    });
  }
};

window.closeGoalsModal = function() {
  triggerHaptic();

  let hasChanged = false;

  // Read total bill input from modal
  const totalBillInput = document.getElementById('goalsModalTotalBillInput');
  let newTotalBill = state.totalBillGoal;
  if (totalBillInput) {
    const valStr = totalBillInput.value.trim() !== '' ? totalBillInput.value : totalBillInput.placeholder;
    newTotalBill = Math.max(0, parseVal(valStr));
    if (goalsInitialSnapshot && Math.abs(newTotalBill - goalsInitialSnapshot.totalBillGoal) > 0.001) {
      hasChanged = true;
    }
  }
  state.totalBillGoal = newTotalBill;

  // Read day inputs from modal
  state.days.forEach(day => {
    const input = document.getElementById(`goal-input-${day.id}`);
    if (input) {
      const valStr = input.value.trim() !== '' ? input.value : input.placeholder;
      const newPlanned = Math.max(0, parseVal(valStr));
      const prev = goalsInitialSnapshot ? goalsInitialSnapshot.days.find(d => d.id === day.id) : null;
      if (prev && Math.abs(newPlanned - prev.planned) > 0.001) {
        hasChanged = true;
      }
      day.planned = newPlanned;
    }
  });

  if (hasChanged) {
    saveState();
    updateCalculations();
  }

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

  // Only display "Goals updated" when the user actually made a change
  if (hasChanged) {
    showToast('Goals updated');
  }
};

window.updateGoalsModalTotal = function() {
  const totalDisplay = document.getElementById('goalsModalTotal');
  if (!totalDisplay) return;

  let sum = 0;
  state.days.forEach(day => {
    const input = document.getElementById(`goal-input-${day.id}`);
    if (input) {
      const trimmed = input.value.trim();
      if (trimmed !== '' && !isNaN(parseFloat(trimmed))) {
        sum += Math.max(0, parseFloat(trimmed));
      } else if (input.placeholder && !isNaN(parseFloat(input.placeholder))) {
        sum += Math.max(0, parseFloat(input.placeholder));
      } else {
        sum += day.planned;
      }
    } else {
      sum += day.planned;
    }
  });
  totalDisplay.textContent = formatCurrency(sum);
};

window.splitGoalsEvenlyModal = function() {
  triggerHaptic();
  const totalBillInput = document.getElementById('goalsModalTotalBillInput');
  const currentTotalBill = totalBillInput
    ? parseVal(totalBillInput.value || totalBillInput.placeholder || state.totalBillGoal)
    : state.totalBillGoal;
  const targetBase = currentTotalBill > 0 ? Math.round(currentTotalBill * 0.75 * 100) / 100 : 161.25;
  const perDay = Math.floor((targetBase / 6) * 100) / 100;
  const remainder = Math.round((targetBase - perDay * 6) * 100) / 100;
  
  state.days.forEach((day, i) => {
    const extraCent = i < Math.round(remainder * 100) ? 0.01 : 0;
    const val = Math.round((perDay + extraCent) * 100) / 100;
    const input = document.getElementById(`goal-input-${day.id}`);
    if (input) {
      input.value = val.toFixed(2);
      input.placeholder = val.toFixed(2);
    }
    day.planned = val;
  });

  updateGoalsModalTotal();
};

function renderGoalsModalList() {
  const totalBillInput = document.getElementById('goalsModalTotalBillInput');
  if (totalBillInput) {
    totalBillInput.value = state.totalBillGoal.toFixed(2);
    totalBillInput.placeholder = state.totalBillGoal.toFixed(2);
    setupSmartGoalInput(totalBillInput);
  }

  const list = document.getElementById('goalsModalList');
  if (list) {
    list.innerHTML = '';
    state.days.forEach(day => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between bg-black/60 rounded-lg px-3 py-1.5 border border-zinc-800 font-mono';
      row.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="w-8 text-[9.5px] uppercase font-bold text-zinc-400">${day.short}</span>
          <span class="text-xs font-semibold text-white">${day.name}</span>
        </div>
        <div class="flex items-center bg-zinc-900 rounded-lg px-2 py-1 border border-zinc-700/60 focus-within:border-emerald-500">
          <span class="text-xs font-bold text-emerald-400 mr-1">$</span>
          <input 
            type="number" 
            inputmode="decimal" 
            id="goal-input-${day.id}" 
            step="0.01" 
            min="0" 
            value="${day.planned.toFixed(2)}"
            placeholder="${day.planned.toFixed(2)}"
            class="smart-goal-input w-16 bg-transparent text-right text-xs font-bold text-white focus:outline-none placeholder-zinc-500"
          />
        </div>
      `;
      list.appendChild(row);

      const input = row.querySelector(`#goal-input-${day.id}`);
      if (input) {
        setupSmartGoalInput(input, (newVal, changed) => {
          if (changed) {
            day.planned = newVal;
          }
          updateGoalsModalTotal();
        }, () => {
          updateGoalsModalTotal();
        });
      }
    });
  }

  updateGoalsModalTotal();
}

window.exportBackupData = function() {
  triggerHaptic();
  try {
    const backup = {
      app: 'School Bill Tracker',
      version: 1,
      exportedAt: new Date().toISOString(),
      state: state
    };
    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `bill-tracker-backup-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Backup saved to downloads');
  } catch (err) {
    alert('Failed to export backup: ' + err.message);
  }
};

window.importBackupData = function() {
  triggerHaptic();
  const fileInput = document.getElementById('backupFileInput');
  if (fileInput) {
    fileInput.value = '';
    fileInput.click();
  }
};

window.handleBackupFileSelect = function(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      const importedState = data.state || data;
      if (importedState && Array.isArray(importedState.days)) {
        if (typeof importedState.totalBillGoal === 'number' && !isNaN(importedState.totalBillGoal)) {
          state.totalBillGoal = importedState.totalBillGoal;
        }
        importedState.days.forEach(impDay => {
          const target = state.days.find(d => d.id === impDay.id);
          if (target) {
            if (typeof impDay.planned === 'number' && !isNaN(impDay.planned)) target.planned = impDay.planned;
            if (typeof impDay.actual === 'number' && !isNaN(impDay.actual)) target.actual = impDay.actual;
          }
        });
        saveState();
        updateCalculations();
        renderGoalsModalList();
        showToast('Backup restored successfully!');
      } else {
        alert('Invalid backup file format.');
      }
    } catch (err) {
      alert('Error reading backup file: ' + err.message);
    }
  };
  reader.readAsText(file);
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

window.switchCalcDay = function(direction) {
  triggerHaptic();
  if (!calcDayId) return;
  const currentIndex = state.days.findIndex(d => d.id === calcDayId);
  if (currentIndex === -1) return;

  let newIndex = currentIndex + direction;
  if (newIndex < 0) newIndex = state.days.length - 1;
  else if (newIndex >= state.days.length) newIndex = 0;

  const newDay = state.days[newIndex];
  calcDayId = newDay.id;
  selectDay(newDay.id);

  calcBase = newDay.actual;
  calcExpr = calcBase > 0 ? calcBase.toFixed(2) : '0';

  const dayTitle = document.getElementById('calcDayTitle');
  const currentAmount = document.getElementById('calcCurrentAmount');

  if (dayTitle) dayTitle.textContent = newDay.name;
  if (currentAmount) currentAmount.textContent = formatCurrency(calcBase);

  updateCalcDisplay();
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

function initLaunchTransition() {
  const launchScreen = document.getElementById('launchScreen');
  const scrollContent = document.getElementById('scrollContent');
  if (!launchScreen || !scrollContent) return;

  let transitioned = false;
  const triggerTransition = () => {
    if (transitioned) return;
    transitioned = true;

    // Simultaneous cross-blur fade: splash blurs out as app blurs in
    launchScreen.classList.add('launch-fade-out');
    scrollContent.classList.add('app-blur-active');

    setTimeout(() => {
      launchScreen.style.display = 'none';
      scrollContent.style.willChange = 'auto';
      scrollContent.classList.remove('app-blur-in', 'app-blur-active');
    }, 700);
  };

  // Cinematic hold (800ms) or tap anywhere on splash to skip instantly
  const timer = setTimeout(triggerTransition, 800);
  launchScreen.addEventListener('click', () => {
    clearTimeout(timer);
    triggerTransition();
  }, { once: true });
}

document.addEventListener('DOMContentLoaded', () => {
  renderDays();
  setupToolbarActions();
  updateCalculations();
  initLaunchTransition();

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

  // iOS Standalone Web App: Stay within standalone frame on link navigation
  if ('standalone' in window.navigator && window.navigator.standalone) {
    document.addEventListener('click', (e) => {
      let node = e.target;
      while (node && node.nodeName !== 'A' && node.nodeName !== 'HTML') {
        node = node.parentNode;
      }
      if (node && node.nodeName === 'A' && node.getAttribute('href') && !node.getAttribute('target') && node.href.startsWith(window.location.origin)) {
        e.preventDefault();
        window.location.href = node.href;
      }
    }, false);
  }
});

