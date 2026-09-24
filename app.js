// School Bill Tracker - Template UI/UX & iPhone 15 Logic

const STORAGE_KEY = 'school_bill_tracker_state_v2';
const THEME_STORAGE_KEY = 'school_bill_tracker_theme';

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

function triggerHaptic() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate(12); } catch (e) {}
  }
}

// -------------------------------------------------------------
// TAB & SWIPE NAVIGATION (Home, Goals, Settings)
// -------------------------------------------------------------

let currentTab = 0; // 0: Home, 1: Goals, 2: Settings

window.switchTab = function(tabIndex) {
  triggerHaptic();
  currentTab = Math.max(0, Math.min(2, tabIndex));

  const track = document.getElementById('pagesTrack');
  if (track) {
    track.style.transform = `translateX(-${currentTab * (100 / 3)}%)`;
  }

  // Update floating dock active indicators (1:1 with Apple design template)
  const dockHome = document.getElementById('dockBtnHome');
  const dockGoals = document.getElementById('dockBtnGoals');
  const dockSettings = document.getElementById('dockBtnSettings');

  [dockHome, dockGoals, dockSettings].forEach((btn, idx) => {
    if (!btn) return;
    const label = btn.querySelector('.dock-label');
    if (idx === currentTab) {
      btn.className = 'dock-item-active tap-btn';
      if (label) label.classList.remove('hidden');
    } else {
      btn.className = 'dock-item-inactive tap-btn';
      if (label) label.classList.add('hidden');
    }
  });

  updateNavHeaderForTab(currentTab);
};

function updateNavHeaderForTab(tabIndex) {
  const headerTitle = document.getElementById('headerTitle');
  const headerIcon = document.getElementById('headerIcon');
  const headerDateText = document.getElementById('headerDateText');

  if (tabIndex === 0) {
    if (headerTitle) headerTitle.textContent = 'Hello, Anthony';
    if (headerIcon) headerIcon.textContent = '📍';
    if (headerDateText) {
      const now = new Date();
      headerDateText.textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
  } else if (tabIndex === 1) {
    if (headerTitle) headerTitle.textContent = 'Goals & Targets';
    if (headerIcon) headerIcon.textContent = '🎯';
    if (headerDateText) headerDateText.textContent = 'WEEKLY PLAN';
  } else if (tabIndex === 2) {
    if (headerTitle) headerTitle.textContent = 'Settings';
    if (headerIcon) headerIcon.textContent = '⚙️';
    if (headerDateText) headerDateText.textContent = 'PREFERENCES';
  }
}

// iOS Horizontal Touch Swipe Support between Tabs
let touchStartX = 0;
let touchStartY = 0;
let touchDeltaX = 0;
let isSwiping = false;

function initSwipeGestures() {
  const viewport = document.getElementById('pagesViewport');
  if (!viewport) return;

  viewport.addEventListener('touchstart', (e) => {
    if (e.target.closest('input, textarea, button, select, .apple-chip')) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchDeltaX = 0;
    isSwiping = false;
  }, { passive: true });

  viewport.addEventListener('touchmove', (e) => {
    if (!touchStartX) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartX;
    const diffY = currentY - touchStartY;

    if (!isSwiping && Math.abs(diffX) > 14 && Math.abs(diffX) > Math.abs(diffY)) {
      isSwiping = true;
    }

    if (isSwiping) {
      touchDeltaX = diffX;
    }
  }, { passive: true });

  viewport.addEventListener('touchend', () => {
    if (isSwiping) {
      const threshold = 45;
      if (touchDeltaX < -threshold && currentTab < 2) {
        switchTab(currentTab + 1);
      } else if (touchDeltaX > threshold && currentTab > 0) {
        switchTab(currentTab - 1);
      }
    }
    touchStartX = 0;
    touchStartY = 0;
    touchDeltaX = 0;
    isSwiping = false;
  }, { passive: true });
}

// -------------------------------------------------------------
// THEME MANAGEMENT (Light by default, Dark option)
// -------------------------------------------------------------

function getTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || 'light';
  } catch (e) {
    return 'light';
  }
}

window.setTheme = function(theme) {
  triggerHaptic();
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.remove('light');
    root.classList.add('dark');
  } else {
    theme = 'light';
    root.classList.remove('dark');
    root.classList.add('light');
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e) {}

  // Update theme-color and apple-mobile-web-app-status-bar-style for iOS
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme === 'dark' ? '#000000' : '#F8F9FA');
  }

  const metaStatusBarStyle = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (metaStatusBarStyle) {
    metaStatusBarStyle.setAttribute('content', 'black-translucent');
  }

  updateThemeControls(theme);
  updateCalculations();
  renderGoalsPage();
};

window.toggleTheme = function() {
  const current = getTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
  showToast(next === 'dark' ? 'Dark theme enabled' : 'Light theme enabled');
};

function updateThemeControls(theme) {
  if (!theme) theme = getTheme();

  // Header quick toggle icon
  const themeToggleIcon = document.getElementById('themeToggleIcon');
  if (themeToggleIcon) {
    themeToggleIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  // Settings Page Theme Cards
  const cardLight = document.getElementById('themeCardLight');
  const cardDark = document.getElementById('themeCardDark');
  const checkLight = document.getElementById('themeCheckLight');
  const checkDark = document.getElementById('themeCheckDark');

  if (cardLight && cardDark) {
    if (theme === 'light') {
      cardLight.className = 'apple-card p-3 text-left relative transition-all tap-btn cursor-pointer ring-2 ring-teal-500 shadow-md';
      cardDark.className = 'apple-card p-3 text-left relative transition-all tap-btn cursor-pointer opacity-75';
      if (checkLight) checkLight.classList.remove('hidden');
      if (checkDark) checkDark.classList.add('hidden');
    } else {
      cardDark.className = 'apple-card p-3 text-left relative transition-all tap-btn cursor-pointer ring-2 ring-[#30D158] shadow-md';
      cardLight.className = 'apple-card p-3 text-left relative transition-all tap-btn cursor-pointer opacity-75';
      if (checkLight) checkLight.classList.add('hidden');
      if (checkDark) checkDark.classList.remove('hidden');
    }
  }
}

window.openAddModalForToday = function() {
  const todayIndex = getTodayIndex();
  const isSunday = todayIndex === 0;
  const activeSpotlightId = isSunday ? 'mon' : getTodayId();
  openAddModal(activeSpotlightId);
};

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
 * Apple Smart Goal Input Focus/Blur pattern:
 * 1. On focus: current value turns into a ghost placeholder so the user can easily overwrite it.
 * 2. On type: user enters clean digits.
 * 3. On blur: if empty, reverts to the previous value.
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
      input.value = originalVal;
      if (onCommit) {
        onCommit(parseFloat(originalVal) || 0, false);
      }
    } else {
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

/**
 * Dynamic Progress Bar Gradient:
 * In Light Mode (Template Style): Red/Rose (#F43F5E) -> Amber (#F59E0B) -> Teal/Emerald (#0D9488)
 * In Dark Mode (Apple OLED Style): Apple Red (#FF453A) -> Apple Amber (#FF9F0A) -> Apple Green (#30D158)
 */
function getProgressGradient(pct) {
  const p = Math.min(100, Math.max(0, pct)) / 100;
  const isDark = document.documentElement.classList.contains('dark');

  let r1, g1, b1;
  let r2, g2, b2;
  let glowR, glowG, glowB;

  if (isDark) {
    if (p <= 0.5) {
      const t = p / 0.5;
      r1 = 255;
      g1 = Math.round(69 + (159 - 69) * t);
      b1 = Math.round(58 + (10 - 58) * t);

      r2 = 255;
      g2 = Math.round(100 + (190 - 100) * t);
      b2 = Math.round(80 + (25 - 80) * t);

      glowR = 255;
      glowG = Math.round(69 + (159 - 69) * t);
      glowB = Math.round(58 + (10 - 58) * t);
    } else {
      const t = (p - 0.5) / 0.5;
      r1 = Math.round(255 + (48 - 255) * t);
      g1 = Math.round(159 + (209 - 159) * t);
      b1 = Math.round(10 + (88 - 10) * t);

      r2 = Math.round(255 + (52 - 255) * t);
      g2 = Math.round(190 + (225 - 190) * t);
      b2 = Math.round(25 + (110 - 25) * t);

      glowR = Math.round(255 + (48 - 255) * t);
      glowG = Math.round(159 + (209 - 159) * t);
      glowB = Math.round(10 + (88 - 10) * t);
    }
  } else {
    if (p <= 0.5) {
      const t = p / 0.5;
      r1 = Math.round(244 + (245 - 244) * t);
      g1 = Math.round(63 + (158 - 63) * t);
      b1 = Math.round(94 + (11 - 94) * t);

      r2 = 245;
      g2 = Math.round(100 + (170 - 100) * t);
      b2 = Math.round(80 + (20 - 80) * t);

      glowR = 245;
      glowG = Math.round(158 * t);
      glowB = Math.round(11 * t);
    } else {
      const t = (p - 0.5) / 0.5;
      r1 = Math.round(245 + (13 - 245) * t);
      g1 = Math.round(158 + (148 - 158) * t);
      b1 = Math.round(11 + (136 - 11) * t);

      r2 = Math.round(245 + (16 - 245) * t);
      g2 = Math.round(170 + (185 - 170) * t);
      b2 = Math.round(20 + (129 - 20) * t);

      glowR = Math.round(245 + (13 - 245) * t);
      glowG = Math.round(158 + (148 - 158) * t);
      glowB = Math.round(11 + (136 - 11) * t);
    }
  }

  const fromColor = `rgb(${r1}, ${g1}, ${b1})`;
  const toColor = `rgb(${r2}, ${g2}, ${b2})`;
  const glowAlpha = isDark ? (0.2 + 0.25 * p).toFixed(2) : (0.10 + 0.16 * p).toFixed(2);

  return {
    background: `linear-gradient(90deg, ${fromColor} 0%, ${toColor} 100%)`,
    boxShadow: `0 0 10px rgba(${glowR}, ${glowG}, ${glowB}, ${glowAlpha})`,
    fromColor,
    toColor
  };
}

let showOtherDays = false;

// Render Daily Cards: Active day highlighted card + Other days in an Inset Grouped Table
function renderDays() {
  const todayContainer = document.getElementById('todayContainer');
  const otherDaysList = document.getElementById('otherDaysList');
  if (!todayContainer || !otherDaysList) return;

  todayContainer.innerHTML = '';
  otherDaysList.innerHTML = '';

  const todayIndex = getTodayIndex();
  const isSunday = todayIndex === 0;
  const activeSpotlightId = isSunday ? 'mon' : getTodayId();

  state.days.forEach(day => {
    const isToday = day.id === activeSpotlightId;
    const dayDiff = day.actual - day.planned;
    const dayPct = day.planned > 0 ? Math.min(100, (day.actual / day.planned) * 100) : (day.actual > 0 ? 100 : 0);
    const dayProgressStyle = getProgressGradient(dayPct);

    let diffText = '';
    let diffClass = '';

    if (day.actual === 0) {
      diffText = '';
      diffClass = '';
    } else if (dayDiff >= 0) {
      diffText = dayDiff === 0 ? '✓ Hit Goal' : `+$${dayDiff.toFixed(2)} ahead`;
      diffClass = 'text-teal-700 dark:text-[#30D158] font-bold';
    } else {
      diffText = `$${(day.planned - day.actual).toFixed(2)} left`;
      diffClass = dayPct < 40 ? 'text-rose-600 dark:text-[#FF453A] font-semibold' : 'text-amber-600 dark:text-[#FF9F0A] font-semibold';
    }

    if (isToday) {
      // TODAY / SPOTLIGHT: Template Highlighted Inset Card
      const badgeText = isSunday ? 'Sunday • Next: Mon' : 'Today';
      const badgeClass = isSunday
        ? 'text-amber-700 dark:text-[#FF9F0A] bg-amber-50 dark:bg-[#FF9F0A]/15 border border-amber-200 dark:border-[#FF9F0A]/30'
        : 'text-teal-700 dark:text-[#30D158] bg-teal-50 dark:bg-[#30D158]/15 border border-teal-200 dark:border-[#30D158]/30';
      const actionLabel = isSunday ? "Monday's Target Goal" : "Today's Shift Earnings";

      const card = document.createElement('div');
      card.id = `card-${day.id}`;
      card.className = 'apple-today-card p-3.5 mb-2.5 transition-all select-none';
      card.innerHTML = `
        <!-- Top: Day Name + Today Capsule Badge -->
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-1.5">
            <span class="font-bold text-gray-900 dark:text-white text-[15px]">${day.name}</span>
            <span class="text-[9.5px] font-bold ${badgeClass} px-2 py-0.5 rounded-full uppercase tracking-wider">${badgeText}</span>
          </div>
          <span class="text-xs font-mono ${diffClass}">
            ${diffText}
          </span>
        </div>

        <!-- Middle: Action Row with Smart Input -->
        <div class="flex items-center justify-between bg-gray-50/90 dark:bg-black/60 rounded-[14px] p-2.5 px-3 border border-gray-200/70 dark:border-white/[0.08] mb-2.5">
          <span class="text-[10px] uppercase font-semibold text-gray-500 dark:text-[#8E8E93] tracking-wider">${actionLabel}</span>
          <div class="flex items-center gap-1.5 font-mono">
            <div class="flex items-center bg-white dark:bg-[#1C1C1E] rounded-lg px-2.5 py-1 border border-gray-200 dark:border-white/[0.1] focus-within:border-teal-500 dark:focus-within:border-[#30D158] focus-within:ring-1 focus-within:ring-teal-500/30 dark:focus-within:ring-[#30D158]/30">
              <span class="text-xs font-bold text-teal-600 dark:text-[#30D158] mr-0.5">$</span>
              <input 
                type="text" 
                inputmode="decimal" 
                id="actual-input-${day.id}" 
                value="${day.actual.toFixed(2)}" 
                placeholder="${day.actual.toFixed(2)}" 
                class="smart-goal-input w-20 bg-transparent text-right text-xs font-bold text-gray-900 dark:text-[#30D158] focus:outline-none placeholder-gray-400 dark:placeholder-[#636366] font-mono" 
                title="Click to edit current dash"
              />
            </div>
            <span class="text-[11px] text-gray-500 dark:text-[#8E8E93] whitespace-nowrap">/ $${day.planned.toFixed(2)} goal</span>
          </div>
        </div>

        <!-- Activity Capsule Progress Bar (Slim 6px track) -->
        <div class="progress-track w-full rounded-full h-1.5 overflow-hidden relative">
          <div class="h-full rounded-full transition-all duration-300" style="width: ${dayPct}%; opacity: ${dayPct > 0 ? '1' : '0'}; background: ${dayProgressStyle.background}; box-shadow: ${dayProgressStyle.boxShadow};"></div>
        </div>
      `;
      todayContainer.appendChild(card);

      const actualInputToday = card.querySelector(`#actual-input-${day.id}`);
      if (actualInputToday) {
        setupSmartGoalInput(actualInputToday, (newVal, changed) => {
          if (changed) {
            day.actual = newVal;
            saveState();
            updateCalculations();
          }
        });
      }
    } else {
      // OTHER DAYS: Grouped Table Row (Slim 36px)
      const row = document.createElement('div');
      row.id = `card-${day.id}`;
      row.className = 'apple-row-separator px-3 py-2 flex items-center justify-between select-none hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors';

      row.innerHTML = `
        <!-- Left: Day badge, title, and goal -->
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-6 h-6 rounded-full bg-gray-100 dark:bg-[#2C2C2E] border border-gray-200 dark:border-white/[0.08] flex items-center justify-center font-mono flex-shrink-0">
            <span class="text-[9px] font-bold ${day.actual >= day.planned && day.planned > 0 ? 'text-teal-600 dark:text-[#30D158]' : (day.actual > 0 ? 'text-amber-600 dark:text-[#FF9F0A]' : 'text-gray-400 dark:text-[#8E8E93]')}">
              ${day.actual >= day.planned && day.planned > 0 ? '✓' : day.short}
            </span>
          </div>

          <div class="min-w-0">
            <div class="flex items-center gap-1.5 truncate">
              <span class="font-semibold text-gray-900 dark:text-white text-xs">${day.name}</span>
              <span class="text-[9.5px] font-mono ${diffClass} truncate">${diffText}</span>
            </div>
            <div class="text-[10px] font-mono text-gray-500 dark:text-[#8E8E93] mt-0.5 flex items-center gap-1.5">
              <span>Goal: $${day.planned.toFixed(2)}</span>
              <div class="progress-track w-10 rounded-full h-1 overflow-hidden inline-block align-middle relative">
                <div class="h-full rounded-full transition-all duration-300" style="width: ${dayPct}%; opacity: ${dayPct > 0 ? '1' : '0'}; background: ${dayProgressStyle.background}; box-shadow: ${dayProgressStyle.boxShadow};"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Current Dash Input -->
        <div class="flex items-center flex-shrink-0">
          <div class="flex items-center bg-gray-100 dark:bg-[#2C2C2E] rounded-lg px-2 py-1 border border-gray-200 dark:border-white/[0.08] focus-within:border-teal-500 dark:focus-within:border-[#30D158]">
            <span class="text-xs font-bold text-teal-600 dark:text-[#30D158] mr-0.5 font-mono">$</span>
            <input 
              type="text" 
              inputmode="decimal" 
              id="actual-input-${day.id}" 
              value="${day.actual.toFixed(2)}" 
              placeholder="${day.actual.toFixed(2)}" 
              class="smart-goal-input w-16 bg-transparent text-right font-mono text-xs font-bold text-gray-900 dark:text-white focus:outline-none placeholder-gray-400 dark:placeholder-[#636366]" 
              title="Click to edit earnings"
            />
          </div>
        </div>
      `;
      otherDaysList.appendChild(row);

      const actualInputOther = row.querySelector(`#actual-input-${day.id}`);
      if (actualInputOther) {
        setupSmartGoalInput(actualInputOther, (newVal, changed) => {
          if (changed) {
            day.actual = newVal;
            saveState();
            updateCalculations();
          }
        });
      }
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
    text.textContent = showOtherDays ? 'Hide Full Week' : 'View Full Week (5 Other Days)';
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
      paycheckNeededDisplay.className = 'text-[28px] sm:text-[30px] font-extrabold font-mono text-teal-600 dark:text-[#30D158] tracking-tight leading-tight drop-shadow-[0_0_12px_rgba(13,148,136,0.35)] dark:drop-shadow-[0_0_12px_rgba(48,209,88,0.45)]';
    } else {
      paycheckNeededDisplay.className = 'text-[28px] sm:text-[30px] font-extrabold font-mono text-gray-900 dark:text-white tracking-tight leading-tight';
    }
  }

  // Goal Paycheck Needed Badge (Milestone celebratory styling)
  const paycheckGoalBadge = document.getElementById('paycheckGoalBadge');
  const paycheckGoalDisplay = document.getElementById('paycheckGoalDisplay');
  const paycheckGoalSuffix = document.getElementById('paycheckGoalSuffix');

  if (paycheckGoalBadge && paycheckGoalDisplay) {
    if (isCovered) {
      paycheckGoalBadge.className = 'inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-[#30D158]/15 border border-teal-200/80 dark:border-[#30D158]/30 text-[10.5px] font-mono text-teal-700 dark:text-[#30D158] transition-all';
      if (surplus > 0) {
        paycheckGoalDisplay.textContent = `✓ Covered! +$${surplus.toFixed(2)} Surplus`;
      } else {
        paycheckGoalDisplay.textContent = '✓ Bill Fully Covered!';
      }
      if (paycheckGoalSuffix) paycheckGoalSuffix.style.display = 'none';
    } else {
      paycheckGoalBadge.className = 'inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-[#2C2C2E] border border-gray-200 dark:border-white/[0.08] text-[10.5px] font-mono text-gray-500 dark:text-[#8E8E93] transition-all';
      paycheckGoalDisplay.textContent = formatCurrency(paycheckGoal);
      if (paycheckGoalSuffix) {
        paycheckGoalSuffix.style.display = 'inline';
        paycheckGoalSuffix.textContent = 'goal';
      }
    }
  }

  // Dynamic Weekly Progress Bar
  const segDashBar = document.getElementById('segDashBar');
  const dashPct = totalBill > 0 ? Math.min(100, (actualEarnings / totalBill) * 100) : 0;

  if (segDashBar) {
    segDashBar.style.width = `${dashPct}%`;
    segDashBar.style.opacity = dashPct > 0 ? '1' : '0';
    const weeklyStyle = getProgressGradient(dashPct);
    segDashBar.style.background = weeklyStyle.background;
    segDashBar.style.boxShadow = weeklyStyle.boxShadow;
  }

  // Summary Tiles
  const actualEarningsDisplay = document.getElementById('actualEarningsDisplay');
  if (actualEarningsDisplay) actualEarningsDisplay.textContent = formatCurrency(actualEarnings);

  const estimatedEarningsDisplay = document.getElementById('estimatedEarningsDisplay');
  if (estimatedEarningsDisplay) estimatedEarningsDisplay.textContent = formatCurrency(estimatedEarnings);

  // Update total bill goal input on Goals page if not focused
  const goalsPageTotalBillInput = document.getElementById('goalsPageTotalBillInput');
  if (goalsPageTotalBillInput && document.activeElement !== goalsPageTotalBillInput) {
    goalsPageTotalBillInput.value = totalBill.toFixed(2);
    goalsPageTotalBillInput.placeholder = totalBill.toFixed(2);
  }

  updateGoalsPageSummary();

  // Update day cards on Home
  renderDays();
}

// -------------------------------------------------------------
// GOALS PAGE (Full-Fledged Dedicated Page)
// -------------------------------------------------------------

function renderGoalsPage() {
  const totalBillInput = document.getElementById('goalsPageTotalBillInput');
  if (totalBillInput) {
    totalBillInput.value = state.totalBillGoal.toFixed(2);
    totalBillInput.placeholder = state.totalBillGoal.toFixed(2);
    setupSmartGoalInput(totalBillInput, (newVal, changed) => {
      if (changed) {
        state.totalBillGoal = newVal;
        saveState();
        updateCalculations();
      }
    }, (liveVal) => {
      const val = parseFloat(liveVal);
      if (!isNaN(val) && val >= 0) {
        state.totalBillGoal = val;
        updateGoalsPageSummary();
      }
    });
  }

  const list = document.getElementById('goalsPageDailyList');
  if (list) {
    list.innerHTML = '';
    const totalBill = state.totalBillGoal;

    state.days.forEach(day => {
      const row = document.createElement('div');
      row.className = 'apple-row-separator px-3.5 py-2.5 flex items-center justify-between font-mono';
      const pctOfBill = totalBill > 0 ? ((day.planned / totalBill) * 100).toFixed(1) : '0.0';

      row.innerHTML = `
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-7 h-7 rounded-full bg-gray-100 dark:bg-[#2C2C2E] border border-gray-200 dark:border-white/[0.08] flex items-center justify-center text-[10px] uppercase font-bold text-gray-500 dark:text-[#8E8E93] flex-shrink-0">
            ${day.short}
          </div>
          <div class="min-w-0">
            <span class="text-xs font-semibold text-gray-900 dark:text-white block">${day.name}</span>
            <span class="text-[10px] text-gray-400 dark:text-[#8E8E93] font-mono">${pctOfBill}% of bill</span>
          </div>
        </div>
        <div class="flex items-center bg-gray-100 dark:bg-[#2C2C2E] rounded-xl px-2.5 py-1.5 border border-gray-200 dark:border-white/[0.08] focus-within:border-teal-500 dark:focus-within:border-[#30D158]">
          <span class="text-xs font-bold text-teal-600 dark:text-[#30D158] mr-1 font-mono">$</span>
          <input 
            type="text" 
            inputmode="decimal" 
            id="goal-input-${day.id}" 
            value="${day.planned.toFixed(2)}"
            placeholder="${day.planned.toFixed(2)}"
            class="smart-goal-input w-20 bg-transparent text-right font-mono text-sm font-bold text-gray-900 dark:text-white focus:outline-none placeholder-gray-400 dark:placeholder-[#636366]"
            title="Edit planned target for ${day.name}"
          />
        </div>
      `;
      list.appendChild(row);

      const input = row.querySelector(`#goal-input-${day.id}`);
      if (input) {
        setupSmartGoalInput(input, (newVal, changed) => {
          if (changed) {
            day.planned = newVal;
            saveState();
            updateCalculations();
            updateGoalsPageSummary();
          }
        }, () => {
          updateGoalsPageSummary();
        });
      }
    });
  }

  updateGoalsPageSummary();
}

function updateGoalsPageSummary() {
  const totalBill = state.totalBillGoal;
  const dashTarget = Math.round(totalBill * 0.75 * 100) / 100;
  const paycheckTarget = Math.max(0, Math.round((totalBill - dashTarget) * 100) / 100);

  let plannedSum = 0;
  state.days.forEach(d => {
    const input = document.getElementById(`goal-input-${d.id}`);
    if (input && document.activeElement === input) {
      const val = parseFloat(input.value.trim() !== '' ? input.value : input.placeholder);
      plannedSum += isNaN(val) ? d.planned : val;
    } else {
      plannedSum += d.planned;
    }
  });

  const dashTargetEl = document.getElementById('goalsPageDashTarget');
  if (dashTargetEl) dashTargetEl.textContent = formatCurrency(dashTarget);

  const paycheckTargetEl = document.getElementById('goalsPagePaycheckTarget');
  if (paycheckTargetEl) paycheckTargetEl.textContent = formatCurrency(paycheckTarget);

  const plannedTotalEl = document.getElementById('goalsPagePlannedTotal');
  if (plannedTotalEl) plannedTotalEl.textContent = formatCurrency(plannedSum);
}

window.splitGoalsEvenly = function() {
  triggerHaptic();
  const targetBase = state.totalBillGoal > 0 ? Math.round(state.totalBillGoal * 0.75 * 100) / 100 : 161.25;
  const perDay = Math.floor((targetBase / 6) * 100) / 100;
  const remainder = Math.round((targetBase - perDay * 6) * 100) / 100;

  state.days.forEach((day, i) => {
    const extraCent = i < Math.round(remainder * 100) ? 0.01 : 0;
    const val = Math.round((perDay + extraCent) * 100) / 100;
    day.planned = val;
  });

  saveState();
  renderGoalsPage();
  updateCalculations();
  showToast('Split evenly: $' + perDay.toFixed(2) + '/day');
};

window.applyGoalPreset = function(preset) {
  triggerHaptic();
  const targetBase = state.totalBillGoal > 0 ? Math.round(state.totalBillGoal * 0.75 * 100) / 100 : 161.25;

  if (preset === 'even') {
    splitGoalsEvenly();
    return;
  } else if (preset === 'weekend') {
    const weekdayGoal = 20.00;
    const remaining = Math.max(0, targetBase - (weekdayGoal * 4));
    const fri = Math.round((remaining / 2 + 0.005) * 100) / 100;
    const sat = Math.round((remaining - fri) * 100) / 100;

    state.days.forEach(d => {
      if (['mon', 'tue', 'wed', 'thu'].includes(d.id)) {
        d.planned = weekdayGoal;
      } else if (d.id === 'fri') {
        d.planned = fri;
      } else if (d.id === 'sat') {
        d.planned = sat;
      }
    });
    showToast('Preset: Weekend Heavy');
  } else if (preset === 'weekday') {
    const weekdayGoal = 28.00;
    const remaining = Math.max(0, Math.round((targetBase - (weekdayGoal * 5)) * 100) / 100);

    state.days.forEach(d => {
      if (['mon', 'tue', 'wed', 'thu', 'fri'].includes(d.id)) {
        d.planned = weekdayGoal;
      } else if (d.id === 'sat') {
        d.planned = remaining;
      }
    });
    showToast('Preset: Weekday Heavy');
  }

  saveState();
  renderGoalsPage();
  updateCalculations();
};

window.openGoalsModal = function() {
  switchTab(1);
};

window.closeGoalsModal = function() {
  switchTab(0);
};

// -------------------------------------------------------------
// SETTINGS PAGE (Full-Fledged Dedicated Page)
// -------------------------------------------------------------

function renderSettingsPage() {
  updateThemeControls();
}

window.resetWeekActuals = function() {
  triggerHaptic();
  if (confirm('Clear actual DoorDash earnings for this week back to $0.00? Planned target goals will stay.')) {
    state.days.forEach(day => {
      day.actual = 0;
    });
    saveState();
    updateCalculations();
    showToast('All week actuals reset to $0.00');
  }
};

window.resetGoalsToDefault = function() {
  triggerHaptic();
  if (confirm('Restore default tuition bill ($215.00) and even 6-day split ($26.88/day)?')) {
    state.totalBillGoal = 215.00;
    const targetBase = 161.25;
    const perDay = Math.floor((targetBase / 6) * 100) / 100;
    const remainder = Math.round((targetBase - perDay * 6) * 100) / 100;

    state.days.forEach((day, i) => {
      const extraCent = i < Math.round(remainder * 100) ? 0.01 : 0;
      day.planned = Math.round((perDay + extraCent) * 100) / 100;
    });

    saveState();
    renderGoalsPage();
    updateCalculations();
    showToast('Defaults restored');
  }
};

window.exportBackupData = function() {
  triggerHaptic();
  try {
    const backup = {
      app: 'School Bill Tracker',
      version: 2,
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
    showToast('Backup saved');
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
        renderGoalsPage();
        showToast('Backup restored');
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
// + ADD EARNINGS MODAL (Apple Sheet Presentation)
// -------------------------------------------------------------

let addTargetDayId = null;

window.openAddModal = function(dayId) {
  triggerHaptic();
  addTargetDayId = dayId;
  const day = state.days.find(d => d.id === dayId);
  if (!day) return;

  const modal = document.getElementById('addModal');
  const sheet = modal ? modal.querySelector('.apple-sheet') : null;
  const dayBadge = document.getElementById('addModalDayBadge');
  const currentDisplay = document.getElementById('addModalCurrentAmount');
  const input = document.getElementById('addModalAmountInput');
  const formulaPreview = document.getElementById('addModalFormulaPreview');
  const newTotalDisplay = document.getElementById('addModalNewTotalDisplay');
  const confirmBtnText = document.getElementById('addModalConfirmBtnText');

  if (dayBadge) dayBadge.textContent = day.name;
  if (currentDisplay) currentDisplay.textContent = formatCurrency(day.actual);
  if (input) {
    input.value = '';
    input.placeholder = '0.00';
  }
  if (formulaPreview) {
    formulaPreview.textContent = '';
    formulaPreview.classList.add('hidden');
  }
  if (newTotalDisplay) newTotalDisplay.textContent = formatCurrency(day.actual);
  if (confirmBtnText) confirmBtnText.textContent = 'Add to Earnings';

  if (modal && sheet) {
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
      modal.classList.remove('opacity-0', 'pointer-events-none');
      modal.classList.add('opacity-100');
      sheet.classList.remove('translate-y-full');
      sheet.classList.add('translate-y-0');
      setTimeout(() => {
        if (input) input.focus();
      }, 100);
    });
  }
};

window.closeAddModal = function() {
  triggerHaptic();
  const modal = document.getElementById('addModal');
  const sheet = modal ? modal.querySelector('.apple-sheet') : null;

  if (modal && sheet) {
    sheet.classList.remove('translate-y-0');
    sheet.classList.add('translate-y-full');
    modal.classList.remove('opacity-100');
    modal.classList.add('opacity-0', 'pointer-events-none');
    setTimeout(() => {
      modal.classList.add('hidden');
    }, 280);
  }
};

// Quick Amount Shortcut Chips: adds specified dollar amount immediately
window.addQuickAmount = function(amount) {
  triggerHaptic();
  const input = document.getElementById('addModalAmountInput');
  if (!input) return;
  const raw = input.value.replace(/[^0-9.]/g, '');
  const current = parseFloat(raw) || 0;
  const nextVal = (current + amount).toFixed(2);
  input.value = nextVal;
  updateAddModalPreview();
};

function updateAddModalPreview() {
  const day = state.days.find(d => d.id === addTargetDayId);
  if (!day) return;
  const input = document.getElementById('addModalAmountInput');
  const formulaPreview = document.getElementById('addModalFormulaPreview');
  const newTotalDisplay = document.getElementById('addModalNewTotalDisplay');
  const confirmBtnText = document.getElementById('addModalConfirmBtnText');
  const raw = input ? input.value.replace(/[^0-9.]/g, '') : '';
  const val = parseFloat(raw) || 0;
  const newTotal = Math.max(0, Math.round((day.actual + val) * 100) / 100);

  if (newTotalDisplay) {
    newTotalDisplay.textContent = formatCurrency(newTotal);
  }
  if (formulaPreview) {
    if (val > 0) {
      formulaPreview.textContent = `($${day.actual.toFixed(2)} + $${val.toFixed(2)})`;
      formulaPreview.classList.remove('hidden');
    } else {
      formulaPreview.classList.add('hidden');
    }
  }
  if (confirmBtnText) {
    confirmBtnText.textContent = val > 0 ? `Add $${val.toFixed(2)}` : 'Add to Earnings';
  }
}

window.confirmAddEarnings = function() {
  triggerHaptic();
  const day = state.days.find(d => d.id === addTargetDayId);
  if (!day) return;
  const input = document.getElementById('addModalAmountInput');
  const raw = input ? input.value.replace(/[^0-9.]/g, '') : '';
  const val = parseFloat(raw) || 0;
  if (val > 0) {
    day.actual = Math.round((day.actual + val) * 100) / 100;
    saveState();
    updateCalculations();
  }
  closeAddModal();
};

// -------------------------------------------------------------
// TOOLBAR ACTIONS & SETUP
// -------------------------------------------------------------

function setupToolbarActions() {
  // Header Date - Uppercase format preserving pin icon
  const headerDateText = document.getElementById('headerDateText');
  if (headerDateText) {
    const now = new Date();
    headerDateText.textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  // Sticky Header scroll styling (subtle shadow when any page content scrolls underneath)
  const navHeader = document.getElementById('navHeader');
  const scrollContainers = document.querySelectorAll('.page-scroll-container');
  if (navHeader && scrollContainers.length > 0) {
    scrollContainers.forEach(container => {
      container.addEventListener('scroll', () => {
        const anyScrolled = Array.from(scrollContainers).some(c => c.scrollTop > 10);
        if (anyScrolled) {
          navHeader.classList.add('shadow-md');
        } else {
          navHeader.classList.remove('shadow-md');
        }
      }, { passive: true });
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
  }, 1800);
}

function initLaunchTransition() {
  const launchScreen = document.getElementById('launchScreen');
  const viewport = document.getElementById('pagesViewport');
  if (!launchScreen) return;

  let transitioned = false;
  const triggerTransition = () => {
    if (transitioned) return;
    transitioned = true;

    launchScreen.classList.add('launch-fade-out');
    if (viewport) {
      viewport.classList.add('app-blur-active');
    }

    setTimeout(() => {
      launchScreen.style.display = 'none';
      if (viewport) {
        viewport.style.willChange = 'auto';
        viewport.classList.remove('app-blur-in', 'app-blur-active');
      }
    }, 700);
  };

  const timer = setTimeout(triggerTransition, 750);
  launchScreen.addEventListener('click', () => {
    clearTimeout(timer);
    triggerTransition();
  }, { once: true });
}

document.addEventListener('DOMContentLoaded', () => {
  initSwipeGestures();
  updateThemeControls();
  renderDays();
  renderGoalsPage();
  renderSettingsPage();
  setupToolbarActions();
  updateCalculations();
  switchTab(0);
  initLaunchTransition();

  // Desktop mousewheel forward to active tab container
  const deviceFrame = document.getElementById('deviceFrame');
  if (deviceFrame) {
    deviceFrame.addEventListener('wheel', (e) => {
      const activeContainer = [
        document.getElementById('pageHome'),
        document.getElementById('pageGoals'),
        document.getElementById('pageSettings')
      ][currentTab];
      if (activeContainer) {
        activeContainer.scrollTop += e.deltaY;
      }
    }, { passive: true });
  }

  // Add Earnings Modal live input & keyboard submit
  const addInput = document.getElementById('addModalAmountInput');
  if (addInput) {
    addInput.addEventListener('input', updateAddModalPreview);
    addInput.addEventListener('focus', () => {
      addInput.select();
    });
    addInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        confirmAddEarnings();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeAddModal();
      }
    });
  }

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
