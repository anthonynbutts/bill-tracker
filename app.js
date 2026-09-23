// School Bill Tracker - Real-time Goal vs Actual Engine

const STORAGE_KEY = 'school_bill_tracker_state_v1';
const THEME_KEY = 'school_bill_tracker_theme';

const DEFAULT_DAYS = [
  { id: 'mon', name: 'Monday', goal: 26.88, actual: 0, note: '' },
  { id: 'tue', name: 'Tuesday', goal: 26.88, actual: 0, note: '' },
  { id: 'wed', name: 'Wednesday', goal: 26.88, actual: 0, note: '' },
  { id: 'thu', name: 'Thursday', goal: 26.87, actual: 0, note: '' },
  { id: 'fri', name: 'Friday', goal: 26.87, actual: 0, note: '' },
  { id: 'sat', name: 'Saturday', goal: 26.87, actual: 0, note: '' }
];

const DEFAULT_STATE = {
  totalBillGoal: 215.00,
  dashGoal: 161.25,
  days: DEFAULT_DAYS
};

let state = loadState();

// Load state from localStorage or fallback
function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return JSON.parse(JSON.stringify(DEFAULT_STATE));
    const parsed = JSON.parse(saved);
    // Ensure all days exist
    const days = DEFAULT_DAYS.map(defDay => {
      const match = (parsed.days || []).find(d => d.id === defDay.id);
      return {
        id: defDay.id,
        name: defDay.name,
        goal: match && typeof match.goal === 'number' ? match.goal : defDay.goal,
        actual: match && typeof match.actual === 'number' ? match.actual : 0,
        note: match && match.note ? match.note : ''
      };
    });
    return {
      totalBillGoal: typeof parsed.totalBillGoal === 'number' ? parsed.totalBillGoal : 215.00,
      dashGoal: typeof parsed.dashGoal === 'number' ? parsed.dashGoal : 161.25,
      days
    };
  } catch (e) {
    console.error('Failed to parse localStorage', e);
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
}

// Helpers
function formatCurrency(num) {
  const n = isNaN(num) ? 0 : num;
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseVal(val) {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

// Render Day Cards once into DOM
function renderDayCards() {
  const container = document.getElementById('daysContainer');
  container.innerHTML = '';

  state.days.forEach((day, index) => {
    const card = document.createElement('div');
    card.className = `day-card bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all`;
    card.id = `card-${day.id}`;

    card.innerHTML = `
      <div>
        <!-- Day Header -->
        <div class="flex items-center justify-between gap-2 mb-3">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <h3 class="font-bold text-white text-base tracking-tight">${day.name}</h3>
          </div>
          <span id="badge-${day.id}" class="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/50">
            Pending
          </span>
        </div>

        <!-- Inputs: Goal and Actual -->
        <div class="grid grid-cols-2 gap-3 mb-3">
          <!-- Daily Goal Input -->
          <div class="bg-zinc-950/60 rounded-xl p-2.5 border border-zinc-800/70 focus-within:border-emerald-500/60 transition-colors">
            <label class="block text-[10px] uppercase font-semibold text-zinc-400 mb-1" for="goal-${day.id}">
              Goal
            </label>
            <div class="flex items-center">
              <span class="text-zinc-500 text-sm font-mono mr-1">$</span>
              <input 
                type="number" 
                id="goal-${day.id}" 
                step="0.01" 
                min="0"
                value="${day.goal.toFixed(2)}"
                data-day="${day.id}"
                data-field="goal"
                class="w-full bg-transparent text-sm sm:text-base font-bold font-mono text-zinc-200 focus:outline-none focus:text-white"
                placeholder="0.00"
              />
            </div>
          </div>

          <!-- Daily Actual Input -->
          <div class="bg-zinc-950/60 rounded-xl p-2.5 border border-zinc-800/70 focus-within:border-orange-500/60 transition-colors">
            <label class="block text-[10px] uppercase font-semibold text-orange-400 mb-1" for="actual-${day.id}">
              Actual Earned
            </label>
            <div class="flex items-center">
              <span class="text-orange-500 text-sm font-mono mr-1">$</span>
              <input 
                type="number" 
                id="actual-${day.id}" 
                step="0.01" 
                min="0"
                value="${day.actual > 0 ? day.actual.toFixed(2) : ''}"
                data-day="${day.id}"
                data-field="actual"
                class="w-full bg-transparent text-sm sm:text-base font-bold font-mono text-white focus:outline-none placeholder-zinc-600"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <!-- Quick Addition Presets -->
        <div class="flex items-center gap-1.5 mb-3 flex-wrap">
          <span class="text-[10px] text-zinc-500 mr-0.5">Add:</span>
          <button type="button" class="quick-btn text-[11px] font-mono px-2 py-0.5 rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/40" onclick="quickAdd('${day.id}', 5)">+$5</button>
          <button type="button" class="quick-btn text-[11px] font-mono px-2 py-0.5 rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/40" onclick="quickAdd('${day.id}', 10)">+$10</button>
          <button type="button" class="quick-btn text-[11px] font-mono px-2 py-0.5 rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/40" onclick="quickAdd('${day.id}', 20)">+$20</button>
          <button type="button" class="quick-btn text-[11px] font-mono px-2 py-0.5 rounded-md bg-orange-950/40 hover:bg-orange-900/40 text-orange-300 border border-orange-800/40 ml-auto" onclick="fillGoal('${day.id}')" title="Fill with exact daily goal">Hit Goal</button>
          <button type="button" class="quick-btn text-[11px] font-mono px-1.5 py-0.5 rounded-md hover:bg-red-950/40 text-zinc-500 hover:text-red-400 transition-colors" onclick="clearDay('${day.id}')" title="Clear this day">✕</button>
        </div>
      </div>

      <!-- Day Footer / Progress & Variance -->
      <div class="pt-3 border-t border-zinc-800/60">
        <div class="flex items-center justify-between text-xs mb-1.5 font-mono">
          <span class="text-zinc-500">Progress</span>
          <span id="diff-${day.id}" class="font-medium text-zinc-400">-$26.88</span>
        </div>
        <div class="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
          <div id="bar-${day.id}" class="bg-emerald-500 h-1.5 rounded-full transition-all duration-200" style="width: 0%"></div>
        </div>
      </div>
    `;

    container.appendChild(card);
  });

  // Attach event listeners to newly rendered inputs
  attachInputListeners();
}

// Global quick actions attached to window
window.quickAdd = function(dayId, amount) {
  const day = state.days.find(d => d.id === dayId);
  if (!day) return;
  day.actual = Math.round((day.actual + amount) * 100) / 100;
  const input = document.getElementById(`actual-${dayId}`);
  if (input) input.value = day.actual.toFixed(2);
  saveState();
  updateCalculations();
  showToast(`Added +$${amount} to ${day.name}`);
};

window.fillGoal = function(dayId) {
  const day = state.days.find(d => d.id === dayId);
  if (!day) return;
  day.actual = day.goal;
  const input = document.getElementById(`actual-${dayId}`);
  if (input) input.value = day.actual.toFixed(2);
  saveState();
  updateCalculations();
  showToast(`${day.name} set to goal ($${day.goal.toFixed(2)})`);
};

window.clearDay = function(dayId) {
  const day = state.days.find(d => d.id === dayId);
  if (!day) return;
  day.actual = 0;
  const input = document.getElementById(`actual-${dayId}`);
  if (input) input.value = '';
  saveState();
  updateCalculations();
};

function attachInputListeners() {
  // Listen to daily goal and actual inputs
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

  // Total bill goal input
  const totalBillGoalInput = document.getElementById('totalBillGoalInput');
  if (totalBillGoalInput) {
    totalBillGoalInput.value = state.totalBillGoal.toFixed(2);
    totalBillGoalInput.addEventListener('input', (e) => {
      state.totalBillGoal = parseVal(e.target.value);
      saveState();
      updateCalculations();
    });
  }

  // Dash overall goal input
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

  // 1. Calculate Dash Total Actual
  const dashActual = state.days.reduce((sum, d) => sum + d.actual, 0);
  const dashRemaining = Math.max(0, dashGoal - dashActual);
  const dashDiff = dashActual - dashGoal;
  const dashPercent = dashGoal > 0 ? Math.min(100, Math.round((dashActual / dashGoal) * 100)) : 100;
  const rawDashPercent = dashGoal > 0 ? (dashActual / dashGoal) * 100 : 100;

  // 2. Paycheck Calculations
  // Baseline planned paycheck: total bill - dash goal
  const plannedPaycheck = Math.max(0, totalBill - dashGoal);
  
  // Real-time needed paycheck: total bill - actual dash earned
  const paycheckNeeded = Math.max(0, totalBill - dashActual);
  
  // Paycheck savings/burden difference: planned paycheck - current paycheck needed
  // (If positive, you saved this much of your paycheck; if negative, you need this much more)
  const paycheckSaved = plannedPaycheck - paycheckNeeded;

  // 3. Total Bill Progress
  // Total actual income towards the bill = Dash actual + (planned paycheck or actual funds)
  // Let's display dash actual progress towards the total $215 bill
  const billRemaining = Math.max(0, totalBill - dashActual);
  const billFundedByDashPct = totalBill > 0 ? Math.min(100, Math.round((dashActual / totalBill) * 100)) : 100;

  // --- UPDATE TOP CARD 1: TOTAL SCHOOL BILL ---
  const billProgressPctEl = document.getElementById('billProgressPct');
  const totalActualDisplay = document.getElementById('totalActualDisplay');
  const billRemainingText = document.getElementById('billRemainingText');
  const billProgressBar = document.getElementById('billProgressBar');

  if (billProgressPctEl) billProgressPctEl.textContent = `${billFundedByDashPct}%`;
  if (totalActualDisplay) totalActualDisplay.textContent = formatCurrency(dashActual);
  
  if (billRemainingText) {
    if (dashActual >= totalBill) {
      const extra = dashActual - totalBill;
      billRemainingText.textContent = extra > 0 ? `+${formatCurrency(extra)} fully covered!` : '100% Bill Covered!';
      billRemainingText.className = 'font-mono text-emerald-400 font-bold';
    } else {
      billRemainingText.textContent = `${formatCurrency(billRemaining)} remaining`;
      billRemainingText.className = 'font-mono text-zinc-400';
    }
  }

  if (billProgressBar) {
    const fill = totalBill > 0 ? Math.min(100, (dashActual / totalBill) * 100) : 0;
    billProgressBar.style.width = `${fill}%`;
    if (fill >= 100) {
      billProgressBar.className = 'bg-gradient-to-r from-emerald-400 to-teal-300 h-2 rounded-full transition-all duration-300';
    } else {
      billProgressBar.className = 'bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full transition-all duration-300';
    }
  }

  // --- UPDATE TOP CARD 2: DOORDASH ---
  const dashActualDisplay = document.getElementById('dashActualDisplay');
  const dashStatusBadge = document.getElementById('dashStatusBadge');
  const dashDiffLabel = document.getElementById('dashDiffLabel');
  const dashRemainingText = document.getElementById('dashRemainingText');
  const dashProgressBar = document.getElementById('dashProgressBar');

  if (dashActualDisplay) dashActualDisplay.textContent = formatCurrency(dashActual);

  if (dashStatusBadge) {
    if (dashActual >= dashGoal && dashGoal > 0) {
      dashStatusBadge.textContent = `${Math.round(rawDashPercent)}% · Goal Reached!`;
      dashStatusBadge.className = 'text-xs font-mono font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20';
    } else {
      dashStatusBadge.textContent = `${dashPercent}% of goal`;
      dashStatusBadge.className = 'text-xs font-mono font-medium text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20';
    }
  }

  if (dashRemainingText && dashDiffLabel) {
    if (dashActual >= dashGoal) {
      const surplus = dashActual - dashGoal;
      dashDiffLabel.textContent = 'Surplus over Dash Goal';
      dashRemainingText.textContent = `+${formatCurrency(surplus)}`;
      dashRemainingText.className = 'font-mono font-bold text-emerald-400';
    } else {
      dashDiffLabel.textContent = 'Remaining to Dash Goal';
      dashRemainingText.textContent = formatCurrency(dashRemaining);
      dashRemainingText.className = 'font-mono font-medium text-zinc-300';
    }
  }

  if (dashProgressBar) {
    const dashFill = Math.min(100, rawDashPercent);
    dashProgressBar.style.width = `${dashFill}%`;
    if (rawDashPercent >= 100) {
      dashProgressBar.className = 'bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full transition-all duration-300';
    } else {
      dashProgressBar.className = 'bg-gradient-to-r from-orange-500 to-amber-400 h-2 rounded-full transition-all duration-300';
    }
  }

  // --- UPDATE TOP CARD 3: PAYCHECK DYNAMIC CALCULATOR ---
  const paycheckNeededDisplay = document.getElementById('paycheckNeededDisplay');
  const plannedPaycheckDisplay = document.getElementById('plannedPaycheckDisplay');
  const paycheckImpactBadge = document.getElementById('paycheckImpactBadge');
  const paycheckSavingsDisplay = document.getElementById('paycheckSavingsDisplay');
  const paycheckStatusMessage = document.getElementById('paycheckStatusMessage');

  if (paycheckNeededDisplay) paycheckNeededDisplay.textContent = formatCurrency(paycheckNeeded);
  if (plannedPaycheckDisplay) plannedPaycheckDisplay.textContent = formatCurrency(plannedPaycheck);

  if (paycheckSavingsDisplay && paycheckStatusMessage && paycheckImpactBadge) {
    if (dashActual === 0) {
      paycheckImpactBadge.textContent = 'Awaiting Dashes';
      paycheckImpactBadge.className = 'text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/50';
      paycheckSavingsDisplay.textContent = '$0.00 saved yet';
      paycheckSavingsDisplay.className = 'font-mono font-medium text-zinc-400';
      paycheckStatusMessage.innerHTML = `If you hit your <strong>${formatCurrency(dashGoal)}</strong> DoorDash target, paycheck deduction will be only <strong>${formatCurrency(plannedPaycheck)}</strong>.`;
    } else if (dashActual < dashGoal) {
      const neededForPlanned = dashGoal - dashActual;
      paycheckImpactBadge.textContent = 'Reducing';
      paycheckImpactBadge.className = 'text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30';
      
      const savedFromFull = totalBill - paycheckNeeded;
      paycheckSavingsDisplay.textContent = `${formatCurrency(savedFromFull)} reduced so far`;
      paycheckSavingsDisplay.className = 'font-mono font-medium text-indigo-300';
      paycheckStatusMessage.innerHTML = `DoorDash has paid <strong>${formatCurrency(dashActual)}</strong> of your bill. Need <strong>${formatCurrency(neededForPlanned)}</strong> more from Dash to reach your planned <strong>${formatCurrency(plannedPaycheck)}</strong> paycheck deduction.`;
    } else if (dashActual >= dashGoal && dashActual < totalBill) {
      paycheckImpactBadge.textContent = 'Goal Beaten! 🚀';
      paycheckImpactBadge.className = 'text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
      
      paycheckSavingsDisplay.textContent = `+${formatCurrency(paycheckSaved)} extra saved!`;
      paycheckSavingsDisplay.className = 'font-mono font-bold text-emerald-400';
      paycheckStatusMessage.innerHTML = `🎉 DoorDash goal surpassed! You only need <strong>${formatCurrency(paycheckNeeded)}</strong> from your paycheck instead of <strong>${formatCurrency(plannedPaycheck)}</strong>!`;
    } else {
      // Dash Actual >= total bill ($215+)
      paycheckImpactBadge.textContent = '100% Free! 🎉';
      paycheckImpactBadge.className = 'text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500 text-zinc-950 font-bold';
      
      const extraProfit = dashActual - totalBill;
      paycheckSavingsDisplay.textContent = `$0 needed! (+$${extraProfit.toFixed(2)})`;
      paycheckSavingsDisplay.className = 'font-mono font-bold text-emerald-400';
      paycheckStatusMessage.innerHTML = `🔥 <strong>Bill completely paid by DoorDash!</strong> You keep 100% of your paycheck${extraProfit > 0 ? ` plus <strong>${formatCurrency(extraProfit)}</strong> extra profit!` : '!'}`;
    }
  }

  // --- UPDATE EACH DAY CARD ---
  state.days.forEach(day => {
    const diffEl = document.getElementById(`diff-${day.id}`);
    const badgeEl = document.getElementById(`badge-${day.id}`);
    const barEl = document.getElementById(`bar-${day.id}`);
    const cardEl = document.getElementById(`card-${day.id}`);

    const dayDiff = day.actual - day.goal;
    const dayPct = day.goal > 0 ? (day.actual / day.goal) * 100 : 100;

    if (diffEl) {
      if (day.actual === 0) {
        diffEl.textContent = `-${formatCurrency(day.goal)} remaining`;
        diffEl.className = 'font-medium text-zinc-500 font-mono';
      } else if (dayDiff >= 0) {
        diffEl.textContent = dayDiff === 0 ? 'Goal Met (100%)' : `+${formatCurrency(dayDiff)} ahead`;
        diffEl.className = 'font-medium text-emerald-400 font-mono';
      } else {
        diffEl.textContent = `-${formatCurrency(Math.abs(dayDiff))} to go`;
        diffEl.className = 'font-medium text-amber-400 font-mono';
      }
    }

    if (badgeEl) {
      if (day.actual === 0) {
        badgeEl.textContent = 'Pending';
        badgeEl.className = 'text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/50';
      } else if (day.actual >= day.goal) {
        badgeEl.textContent = day.actual > day.goal ? `+${formatCurrency(dayDiff)}` : 'Hit Goal';
        badgeEl.className = 'text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
      } else {
        badgeEl.textContent = `${Math.round(dayPct)}%`;
        badgeEl.className = 'text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30';
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

    if (cardEl) {
      if (day.actual >= day.goal && day.goal > 0) {
        cardEl.classList.add('border-emerald-500/30');
      } else {
        cardEl.classList.remove('border-emerald-500/30');
      }
    }
  });

  // --- UPDATE SUMMARY TABLE & FOOTER ---
  updateSummaryTable(totalBill);

  const footerDashGoal = document.getElementById('footerDashGoal');
  const footerBillGoal = document.getElementById('footerBillGoal');
  if (footerDashGoal) footerDashGoal.textContent = formatCurrency(dashGoal);
  if (footerBillGoal) footerBillGoal.textContent = formatCurrency(totalBill);
}

// Render dynamic breakdown table
function updateSummaryTable(totalBill) {
  const tbody = document.getElementById('summaryTableBody');
  if (!tbody) return;

  let runningDashTotal = 0;
  let rowsHtml = '';

  state.days.forEach(day => {
    runningDashTotal += day.actual;
    const dayDiff = day.actual - day.goal;
    const paycheckAtStep = Math.max(0, totalBill - runningDashTotal);

    let statusPill = '';
    if (day.actual === 0) {
      statusPill = `<span class="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 text-[10px]">Unlogged</span>`;
    } else if (day.actual >= day.goal) {
      statusPill = `<span class="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px]">Passed</span>`;
    } else {
      statusPill = `<span class="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px]">In Progress</span>`;
    }

    const diffClass = dayDiff >= 0 ? 'text-emerald-400 font-semibold' : 'text-zinc-400';
    const diffSign = dayDiff > 0 ? '+' : '';

    rowsHtml += `
      <tr class="hover:bg-zinc-800/30 transition-colors">
        <td class="py-2.5 px-3 font-sans font-medium text-zinc-200">${day.name}</td>
        <td class="py-2.5 px-3 text-right text-zinc-400">${formatCurrency(day.goal)}</td>
        <td class="py-2.5 px-3 text-right font-bold ${day.actual > 0 ? 'text-white' : 'text-zinc-600'}">${formatCurrency(day.actual)}</td>
        <td class="py-2.5 px-3 text-right ${diffClass}">${diffSign}${formatCurrency(dayDiff)}</td>
        <td class="py-2.5 px-3 text-right text-zinc-300 font-semibold">${formatCurrency(runningDashTotal)}</td>
        <td class="py-2.5 px-3 text-right text-indigo-300 font-bold">${formatCurrency(paycheckAtStep)}</td>
        <td class="py-2.5 px-3 text-center">${statusPill}</td>
      </tr>
    `;
  });

  tbody.innerHTML = rowsHtml;
}

// Helpers for toolbar actions
function setupToolbarActions() {
  // 1. Distribute DoorDash Goal evenly across Monday-Saturday (6 days)
  const distributeEvenlyBtn = document.getElementById('distributeEvenlyBtn');
  if (distributeEvenlyBtn) {
    distributeEvenlyBtn.addEventListener('click', () => {
      const perDay = Math.floor((state.dashGoal / 6) * 100) / 100;
      const remainder = Math.round((state.dashGoal - perDay * 6) * 100) / 100;
      
      state.days.forEach((day, i) => {
        // distribute cents evenly
        const extraCent = i < Math.round(remainder * 100) ? 0.01 : 0;
        day.goal = Math.round((perDay + extraCent) * 100) / 100;
        const input = document.getElementById(`goal-${day.id}`);
        if (input) input.value = day.goal.toFixed(2);
      });

      saveState();
      updateCalculations();
      showToast(`Split ${formatCurrency(state.dashGoal)} evenly across 6 days (~${formatCurrency(perDay)}/day)`);
    });
  }

  // 2. Sum Daily Goals to DoorDash Target
  const syncTotalGoalBtn = document.getElementById('syncTotalGoalBtn');
  if (syncTotalGoalBtn) {
    syncTotalGoalBtn.addEventListener('click', () => {
      const sum = state.days.reduce((acc, d) => acc + d.goal, 0);
      state.dashGoal = Math.round(sum * 100) / 100;
      const dashGoalInput = document.getElementById('dashGoalInput');
      if (dashGoalInput) dashGoalInput.value = state.dashGoal.toFixed(2);
      saveState();
      updateCalculations();
      showToast(`Updated Dash target to sum of days: ${formatCurrency(state.dashGoal)}`);
    });
  }

  // 3. Reset Actuals for a New Week
  const resetWeekBtn = document.getElementById('resetWeekBtn');
  if (resetWeekBtn) {
    resetWeekBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear your actual earnings for the week? Your goals will be preserved.')) {
        state.days.forEach(day => {
          day.actual = 0;
          const input = document.getElementById(`actual-${day.id}`);
          if (input) input.value = '';
        });
        saveState();
        updateCalculations();
        showToast('Week actuals reset to $0.00');
      }
    });
  }

  // 4. Copy Summary Report
  const copySummaryBtn = document.getElementById('copySummaryBtn');
  if (copySummaryBtn) {
    copySummaryBtn.addEventListener('click', () => {
      const dashActual = state.days.reduce((sum, d) => sum + d.actual, 0);
      const paycheckNeeded = Math.max(0, state.totalBillGoal - dashActual);
      const plannedPaycheck = Math.max(0, state.totalBillGoal - state.dashGoal);

      let text = `📋 SCHOOL BILL TRACKER BREAKDOWN\n`;
      text += `Total Bill Goal: ${formatCurrency(state.totalBillGoal)}\n`;
      text += `------------------------------------\n`;
      text += `DoorDash Target: ${formatCurrency(state.dashGoal)} | Actual: ${formatCurrency(dashActual)}\n`;
      text += `Paycheck Planned: ${formatCurrency(plannedPaycheck)} | Currently Needed: ${formatCurrency(paycheckNeeded)}\n`;
      if (dashActual >= state.totalBillGoal) {
        text += `Status: 100% FUNDED BY DOORDASH! (Paycheck untouched!)\n`;
      } else {
        text += `Status: ${dashActual >= state.dashGoal ? 'DoorDash goal beaten!' : `${formatCurrency(state.dashGoal - dashActual)} remaining to Dash goal`}\n`;
      }
      text += `------------------------------------\n`;
      text += `DAILY BREAKDOWN (Mon-Sat):\n`;
      state.days.forEach(d => {
        const diff = d.actual - d.goal;
        const diffStr = diff >= 0 ? `(+${formatCurrency(diff)})` : `(-${formatCurrency(Math.abs(diff))})`;
        text += `• ${d.name}: Goal ${formatCurrency(d.goal)} | Actual ${formatCurrency(d.actual)} ${diffStr}\n`;
      });

      navigator.clipboard.writeText(text).then(() => {
        showToast('Summary copied to clipboard!');
      }).catch(() => {
        // Fallback prompt
        window.prompt('Copy summary:', text);
      });
    });
  }

  // 5. Theme Toggle
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
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = storedTheme ? storedTheme === 'dark' : prefersDark;
  applyTheme(isDark);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const willBeDark = !document.documentElement.classList.contains('dark');
      applyTheme(willBeDark);
      localStorage.setItem(THEME_KEY, willBeDark ? 'dark' : 'light');
    });
  }
}

// Toast notification helper
let toastTimeout;
function showToast(msg) {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  if (!toast || !toastMessage) return;

  toastMessage.textContent = msg;
  toast.classList.remove('translate-y-12', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.add('translate-y-12', 'opacity-0');
    toast.classList.remove('translate-y-0', 'opacity-100');
  }, 2400);
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  renderDayCards();
  setupToolbarActions();
  updateCalculations();
});
