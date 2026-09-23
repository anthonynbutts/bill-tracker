// School Bill Tracker - iPhone 15 Real-Time Engine

const STORAGE_KEY = 'school_bill_tracker_state_v1';
const THEME_KEY = 'school_bill_tracker_theme';
const FRAME_KEY = 'school_bill_tracker_frame';

const DEFAULT_DAYS = [
  { id: 'mon', name: 'Monday', dayIndex: 1, goal: 26.88, actual: 0 },
  { id: 'tue', name: 'Tuesday', dayIndex: 2, goal: 26.88, actual: 0 },
  { id: 'wed', name: 'Wednesday', dayIndex: 3, goal: 26.88, actual: 0 },
  { id: 'thu', name: 'Thursday', dayIndex: 4, goal: 26.87, actual: 0 },
  { id: 'fri', name: 'Friday', dayIndex: 5, goal: 26.87, actual: 0 },
  { id: 'sat', name: 'Saturday', dayIndex: 6, goal: 26.87, actual: 0 }
];

const DEFAULT_STATE = {
  totalBillGoal: 215.00,
  dashGoal: 161.25,
  days: DEFAULT_DAYS
};

let state = loadState();

// Trigger tactile haptics on iOS / mobile
function triggerHaptic() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(12);
    } catch (e) {}
  }
}

// Load state from localStorage
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
    console.error('Failed to parse localStorage', e);
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state', e);
  }
}

function formatCurrency(num) {
  const n = isNaN(num) ? 0 : num;
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseVal(val) {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

// Determine current day of week (0=Sun, 1=Mon, ..., 6=Sat)
function getCurrentDayIndex() {
  return new Date().getDay();
}

// Render iOS-optimized daily cards
function renderDayCards() {
  const container = document.getElementById('daysContainer');
  if (!container) return;
  container.innerHTML = '';

  const todayIndex = getCurrentDayIndex();

  state.days.forEach(day => {
    const isToday = day.dayIndex === todayIndex;
    const card = document.createElement('div');
    card.id = `card-${day.id}`;
    card.className = `ios-card rounded-2xl p-3.5 bg-zinc-900 border ${isToday ? 'border-emerald-500/50 ring-1 ring-emerald-500/30' : 'border-zinc-800/80'} shadow-sm transition-all`;

    card.innerHTML = `
      <!-- Card Header -->
      <div class="flex items-center justify-between gap-2 mb-2.5">
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full ${isToday ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}"></span>
          <span class="font-bold text-white text-sm tracking-tight">${day.name}</span>
          ${isToday ? '<span class="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">TODAY</span>' : ''}
        </div>
        <span id="badge-${day.id}" class="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/50">
          Pending
        </span>
      </div>

      <!-- Dual Touch Inputs: Goal & Actual -->
      <div class="grid grid-cols-2 gap-2 mb-2.5">
        <!-- Goal Input -->
        <div class="bg-zinc-950/70 rounded-xl p-2 border border-zinc-800 focus-within:border-emerald-500 transition-colors">
          <label class="block text-[9px] uppercase font-bold text-zinc-400 mb-0.5" for="goal-${day.id}">
            Daily Goal
          </label>
          <div class="flex items-center">
            <span class="text-zinc-500 text-xs font-mono mr-1">$</span>
            <input 
              type="number" 
              inputmode="decimal"
              id="goal-${day.id}" 
              step="0.01" 
              min="0"
              value="${day.goal.toFixed(2)}"
              class="w-full bg-transparent text-sm font-bold font-mono text-zinc-200 focus:outline-none focus:text-white"
              placeholder="0.00"
            />
          </div>
        </div>

        <!-- Actual Input -->
        <div class="bg-zinc-950/70 rounded-xl p-2 border border-zinc-800 focus-within:border-orange-500 transition-colors">
          <label class="block text-[9px] uppercase font-bold text-orange-400 mb-0.5" for="actual-${day.id}">
            Actual Earned
          </label>
          <div class="flex items-center">
            <span class="text-orange-500 text-xs font-mono mr-1">$</span>
            <input 
              type="number" 
              inputmode="decimal"
              id="actual-${day.id}" 
              step="0.01" 
              min="0"
              value="${day.actual > 0 ? day.actual.toFixed(2) : ''}"
              class="w-full bg-transparent text-sm font-bold font-mono text-white focus:outline-none placeholder-zinc-600"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      <!-- iPhone Thumb-Friendly Quick Add Buttons -->
      <div class="flex items-center gap-1.5 mb-2.5">
        <button type="button" class="ios-tap-target text-[10px] font-mono font-medium px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/50" onclick="quickAdd('${day.id}', 5)">+$5</button>
        <button type="button" class="ios-tap-target text-[10px] font-mono font-medium px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/50" onclick="quickAdd('${day.id}', 10)">+$10</button>
        <button type="button" class="ios-tap-target text-[10px] font-mono font-medium px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/50" onclick="quickAdd('${day.id}', 20)">+$20</button>
        <button type="button" class="ios-tap-target text-[10px] font-mono font-medium px-2 py-1 rounded-lg bg-orange-950/40 text-orange-300 border border-orange-800/40 ml-auto" onclick="fillGoal('${day.id}')">Hit Goal</button>
        <button type="button" class="ios-tap-target text-[10px] font-mono px-2 py-1 rounded-lg text-zinc-500 hover:text-red-400" onclick="clearDay('${day.id}')" title="Clear">✕</button>
      </div>

      <!-- Mini Progress & Variance -->
      <div class="pt-2 border-t border-zinc-800/60">
        <div class="flex items-center justify-between text-[10px] mb-1 font-mono">
          <span class="text-zinc-500">Day Variance</span>
          <span id="diff-${day.id}" class="font-medium text-zinc-400">-$26.88</span>
        </div>
        <div class="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
          <div id="bar-${day.id}" class="bg-emerald-500 h-1.5 rounded-full transition-all duration-200" style="width: 0%"></div>
        </div>
      </div>
    `;

    container.appendChild(card);
  });

  attachInputListeners();
}

// Global actions
window.quickAdd = function(dayId, amount) {
  triggerHaptic();
  const day = state.days.find(d => d.id === dayId);
  if (!day) return;
  day.actual = Math.round((day.actual + amount) * 100) / 100;
  const input = document.getElementById(`actual-${dayId}`);
  if (input) input.value = day.actual.toFixed(2);
  saveState();
  updateCalculations();
  showToast(`+$${amount} on ${day.name}`);
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
  showToast(`${day.name} set to goal`);
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

// Master calculation update
function updateCalculations() {
  const totalBill = state.totalBillGoal;
  const dashGoal = state.dashGoal;

  // 1. Dash totals
  const dashActual = state.days.reduce((sum, d) => sum + d.actual, 0);
  const dashRemaining = Math.max(0, dashGoal - dashActual);
  const rawDashPercent = dashGoal > 0 ? (dashActual / dashGoal) * 100 : 100;
  const dashPercent = Math.min(100, Math.round(rawDashPercent));

  // 2. Paycheck calculations
  const plannedPaycheck = Math.max(0, totalBill - dashGoal);
  const paycheckNeeded = Math.max(0, totalBill - dashActual);
  const paycheckSaved = plannedPaycheck - paycheckNeeded;

  // 3. Bill progress
  const billFundedByDashPct = totalBill > 0 ? Math.min(100, Math.round((dashActual / totalBill) * 100)) : 100;

  // Update Dynamic Island on iPhone
  const islandPaycheckNeeded = document.getElementById('islandPaycheckNeeded');
  const dynamicIsland = document.getElementById('dynamicIsland');
  if (islandPaycheckNeeded) {
    islandPaycheckNeeded.textContent = formatCurrency(paycheckNeeded);
  }
  if (dynamicIsland) {
    dynamicIsland.classList.remove('island-updated');
    void dynamicIsland.offsetWidth; // trigger reflow
    dynamicIsland.classList.add('island-updated');
  }

  // Update Top Hero Cards
  const paycheckNeededDisplay = document.getElementById('paycheckNeededDisplay');
  const plannedPaycheckDisplay = document.getElementById('plannedPaycheckDisplay');
  const paycheckImpactBadge = document.getElementById('paycheckImpactBadge');
  const paycheckSavingsDisplay = document.getElementById('paycheckSavingsDisplay');
  const paycheckStatusMessage = document.getElementById('paycheckStatusMessage');

  if (paycheckNeededDisplay) paycheckNeededDisplay.textContent = formatCurrency(paycheckNeeded);
  if (plannedPaycheckDisplay) plannedPaycheckDisplay.textContent = formatCurrency(plannedPaycheck);

  if (paycheckSavingsDisplay && paycheckStatusMessage && paycheckImpactBadge) {
    if (dashActual === 0) {
      paycheckImpactBadge.textContent = 'Unlogged';
      paycheckImpactBadge.className = 'text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/50';
      paycheckSavingsDisplay.textContent = '$0.00 saved';
      paycheckSavingsDisplay.className = 'font-bold text-zinc-400';
      paycheckStatusMessage.innerHTML = `Hit your <strong>${formatCurrency(dashGoal)}</strong> Dash goal to lower your paycheck share to <strong>${formatCurrency(plannedPaycheck)}</strong>.`;
    } else if (dashActual < dashGoal) {
      const neededForPlanned = dashGoal - dashActual;
      paycheckImpactBadge.textContent = 'Lowering 📉';
      paycheckImpactBadge.className = 'text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30';
      
      const savedFromFull = totalBill - paycheckNeeded;
      paycheckSavingsDisplay.textContent = `${formatCurrency(savedFromFull)} reduced`;
      paycheckSavingsDisplay.className = 'font-bold text-indigo-300';
      paycheckStatusMessage.innerHTML = `DoorDash covered <strong>${formatCurrency(dashActual)}</strong>. Need <strong>${formatCurrency(neededForPlanned)}</strong> more to reach your planned <strong>${formatCurrency(plannedPaycheck)}</strong> paycheck share.`;
    } else if (dashActual >= dashGoal && dashActual < totalBill) {
      paycheckImpactBadge.textContent = 'Goal Hit! 🚀';
      paycheckImpactBadge.className = 'text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      
      paycheckSavingsDisplay.textContent = `+${formatCurrency(paycheckSaved)} extra saved!`;
      paycheckSavingsDisplay.className = 'font-bold text-emerald-400';
      paycheckStatusMessage.innerHTML = `🎉 Dash goal beaten! You only owe <strong>${formatCurrency(paycheckNeeded)}</strong> from your paycheck instead of <strong>${formatCurrency(plannedPaycheck)}</strong>!`;
    } else {
      paycheckImpactBadge.textContent = '100% Free! 🎉';
      paycheckImpactBadge.className = 'text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-zinc-950';
      
      const extraProfit = dashActual - totalBill;
      paycheckSavingsDisplay.textContent = `$0 needed! (+$${extraProfit.toFixed(2)})`;
      paycheckSavingsDisplay.className = 'font-bold text-emerald-400';
      paycheckStatusMessage.innerHTML = `🔥 <strong>100% covered by DoorDash!</strong> Paycheck untouched${extraProfit > 0 ? ` with <strong>${formatCurrency(extraProfit)}</strong> profit!` : '!'}`;
    }
  }

  // Update Bill & Dash Cards
  const billProgressPct = document.getElementById('billProgressPct');
  const totalActualDisplay = document.getElementById('totalActualDisplay');
  const billProgressBar = document.getElementById('billProgressBar');

  if (billProgressPct) billProgressPct.textContent = `${billFundedByDashPct}%`;
  if (totalActualDisplay) totalActualDisplay.textContent = formatCurrency(dashActual);
  if (billProgressBar) billProgressBar.style.width = `${Math.min(100, (dashActual / totalBill) * 100)}%`;

  const dashActualDisplay = document.getElementById('dashActualDisplay');
  const dashStatusBadge = document.getElementById('dashStatusBadge');
  const dashProgressBar = document.getElementById('dashProgressBar');

  if (dashActualDisplay) dashActualDisplay.textContent = formatCurrency(dashActual);
  if (dashStatusBadge) dashStatusBadge.textContent = `${dashPercent}%`;
  if (dashProgressBar) dashProgressBar.style.width = `${Math.min(100, rawDashPercent)}%`;

  // Update Floating Bottom Bar
  const bottomPaycheckDisplay = document.getElementById('bottomPaycheckDisplay');
  const bottomDashDisplay = document.getElementById('bottomDashDisplay');

  if (bottomPaycheckDisplay) bottomPaycheckDisplay.textContent = formatCurrency(paycheckNeeded);
  if (bottomDashDisplay) bottomDashDisplay.textContent = `${formatCurrency(dashActual)} / ${formatCurrency(dashGoal)}`;

  // Update Daily Cards
  state.days.forEach(day => {
    const diffEl = document.getElementById(`diff-${day.id}`);
    const badgeEl = document.getElementById(`badge-${day.id}`);
    const barEl = document.getElementById(`bar-${day.id}`);

    const dayDiff = day.actual - day.goal;
    const dayPct = day.goal > 0 ? (day.actual / day.goal) * 100 : 100;

    if (diffEl) {
      if (day.actual === 0) {
        diffEl.textContent = `-${formatCurrency(day.goal)}`;
        diffEl.className = 'font-medium text-zinc-500 font-mono';
      } else if (dayDiff >= 0) {
        diffEl.textContent = dayDiff === 0 ? 'Goal Met' : `+${formatCurrency(dayDiff)}`;
        diffEl.className = 'font-bold text-emerald-400 font-mono';
      } else {
        diffEl.textContent = `-${formatCurrency(Math.abs(dayDiff))}`;
        diffEl.className = 'font-medium text-amber-400 font-mono';
      }
    }

    if (badgeEl) {
      if (day.actual === 0) {
        badgeEl.textContent = 'Pending';
        badgeEl.className = 'text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/50';
      } else if (day.actual >= day.goal) {
        badgeEl.textContent = day.actual > day.goal ? `+${formatCurrency(dayDiff)}` : 'Hit Goal';
        badgeEl.className = 'text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      } else {
        badgeEl.textContent = `${Math.round(dayPct)}%`;
        badgeEl.className = 'text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30';
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

  // Update Compact Running Log Table
  updateSummaryTable(totalBill);
}

function updateSummaryTable(totalBill) {
  const tbody = document.getElementById('summaryTableBody');
  if (!tbody) return;

  let runningDashTotal = 0;
  let rowsHtml = '';

  state.days.forEach(day => {
    runningDashTotal += day.actual;
    const paycheckAtStep = Math.max(0, totalBill - runningDashTotal);

    rowsHtml += `
      <tr class="hover:bg-zinc-800/30 transition-colors">
        <td class="py-1 px-1 font-sans text-zinc-300 font-medium">${day.name.substring(0, 3)}</td>
        <td class="py-1 px-1 text-right text-zinc-400">${formatCurrency(day.goal)}</td>
        <td class="py-1 px-1 text-right font-bold ${day.actual > 0 ? 'text-white' : 'text-zinc-600'}">${formatCurrency(day.actual)}</td>
        <td class="py-1 px-1 text-right text-orange-400">${formatCurrency(runningDashTotal)}</td>
        <td class="py-1 px-1 text-right text-indigo-300 font-bold">${formatCurrency(paycheckAtStep)}</td>
      </tr>
    `;
  });

  tbody.innerHTML = rowsHtml;
}

// iPhone toolbar & controls setup
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
      showToast(`Split into ~${formatCurrency(perDay)}/day`);
    });
  }

  // Sum Daily Goals
  const syncTotalGoalBtn = document.getElementById('syncTotalGoalBtn');
  if (syncTotalGoalBtn) {
    syncTotalGoalBtn.addEventListener('click', () => {
      triggerHaptic();
      const sum = state.days.reduce((acc, d) => acc + d.goal, 0);
      state.dashGoal = Math.round(sum * 100) / 100;
      const dashGoalInput = document.getElementById('dashGoalInput');
      if (dashGoalInput) dashGoalInput.value = state.dashGoal.toFixed(2);
      saveState();
      updateCalculations();
      showToast(`Goal updated: ${formatCurrency(state.dashGoal)}`);
    });
  }

  // Reset Week
  const resetWeekBtn = document.getElementById('resetWeekBtn');
  if (resetWeekBtn) {
    resetWeekBtn.addEventListener('click', () => {
      triggerHaptic();
      if (confirm('Clear actual earnings for the week? Daily goals will stay.')) {
        state.days.forEach(day => {
          day.actual = 0;
          const input = document.getElementById(`actual-${day.id}`);
          if (input) input.value = '';
        });
        saveState();
        updateCalculations();
        showToast('Week earnings reset');
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
      const plannedPaycheck = Math.max(0, state.totalBillGoal - state.dashGoal);

      let text = `📱 School Bill Tracker (iPhone)\n`;
      text += `Total Bill: ${formatCurrency(state.totalBillGoal)}\n`;
      text += `Dash Actual: ${formatCurrency(dashActual)} / Goal: ${formatCurrency(state.dashGoal)}\n`;
      text += `Paycheck Needed: ${formatCurrency(paycheckNeeded)} (Planned: ${formatCurrency(plannedPaycheck)})\n\n`;
      state.days.forEach(d => {
        text += `• ${d.name}: Goal ${formatCurrency(d.goal)} | Actual ${formatCurrency(d.actual)}\n`;
      });

      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          showToast('Copied summary!');
        }).catch(() => {
          window.prompt('Copy summary:', text);
        });
      } else {
        window.prompt('Copy summary:', text);
      }
    });
  }

  // Scroll to Top helper for floating bar
  const scrollToTopBtn = document.getElementById('scrollToTopBtn');
  const scrollContainer = document.getElementById('scrollContainer');
  if (scrollToTopBtn && scrollContainer) {
    scrollToTopBtn.addEventListener('click', () => {
      triggerHaptic();
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Desktop Frame Toggle (iPhone 15 Frame vs Full Width)
  const toggleFrameBtn = document.getElementById('toggleFrameBtn');
  const deviceFrame = document.getElementById('deviceFrame');
  if (toggleFrameBtn && deviceFrame) {
    const savedFrame = localStorage.getItem(FRAME_KEY);
    if (savedFrame === 'expanded') {
      deviceFrame.classList.add('expanded-frame');
      toggleFrameBtn.textContent = 'Switch to iPhone 15 Frame';
    }

    toggleFrameBtn.addEventListener('click', () => {
      const isExpanded = deviceFrame.classList.toggle('expanded-frame');
      toggleFrameBtn.textContent = isExpanded ? 'Switch to iPhone 15 Frame' : 'Switch to Full Width';
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
  const isDark = storedTheme ? storedTheme === 'dark' : true;
  applyTheme(isDark);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      triggerHaptic();
      const willBeDark = !document.documentElement.classList.contains('dark');
      applyTheme(willBeDark);
      localStorage.setItem(THEME_KEY, willBeDark ? 'dark' : 'light');
    });
  }
}

// Toast helper
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
  }, 2000);
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  renderDayCards();
  setupToolbarActions();
  updateCalculations();
});
