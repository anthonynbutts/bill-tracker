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

let currentTab = 1; // 0: Goals, 1: Home, 2: Settings
let isTabTransitioning = false;

function getDockTabSpacing() {
  const dockGoals = document.getElementById('dockBtnGoals');
  const dockHome = document.getElementById('dockBtnHome');
  if (dockGoals && dockHome) {
    const spacing = dockHome.offsetLeft - dockGoals.offsetLeft;
    if (spacing > 0) return spacing;
  }
  return 70;
}

window.switchTab = function(tabIndex) {
  const newTab = Math.max(0, Math.min(2, tabIndex));
  if (newTab !== currentTab) {
    triggerHaptic();
  }
  currentTab = newTab;
  isTabTransitioning = true;

  const track = document.getElementById('pagesTrack');
  if (track) {
    track.style.transition = 'transform 0.34s cubic-bezier(0.32, 0.72, 0, 1)';
    track.style.transform = `translateX(-${currentTab * (100 / 3)}%)`;
  }

  // Animate the frosted glass bubble to active tab with liquid spring animation
  const dockBubble = document.getElementById('dockBubble');
  if (dockBubble) {
    const spacing = getDockTabSpacing();
    dockBubble.style.transition = 'transform 0.38s cubic-bezier(0.34, 1.35, 0.64, 1)';
    dockBubble.style.transform = `translateX(${currentTab * spacing}px) scale(1, 1)`;
  }

  // Clear transition lock after animation completes to enforce 1 tab at a time
  setTimeout(() => {
    isTabTransitioning = false;
  }, 360);

  // Update floating dock active indicators (0: Goals, 1: Home, 2: Settings)
  const dockGoals = document.getElementById('dockBtnGoals');
  const dockHome = document.getElementById('dockBtnHome');
  const dockSettings = document.getElementById('dockBtnSettings');

  [dockGoals, dockHome, dockSettings].forEach((btn, idx) => {
    if (!btn) return;
    const isActive = idx === currentTab;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  // Floating circular plus button only appears when on the Home screen (currentTab === 1)
  const dockAddRow = document.getElementById('dockAddRow');
  if (dockAddRow) {
    if (currentTab === 1) {
      dockAddRow.classList.remove('dock-add-hidden');
    } else {
      dockAddRow.classList.add('dock-add-hidden');
    }
  }

  updateNavHeaderForTab(currentTab);
};

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return 'Good morning, Anthony';
  } else if (hour >= 12 && hour < 17) {
    return 'Good afternoon, Anthony';
  } else if (hour >= 17 && hour < 21) {
    return 'Good evening, Anthony';
  } else {
    return 'Good night, Anthony';
  }
}

function updateNavHeaderForTab(tabIndex) {
  const headerTitle = document.getElementById('headerTitle');
  const headerIcon = document.getElementById('headerIcon');
  const headerDateText = document.getElementById('headerDateText');

  if (tabIndex === 1) { // Home
    if (headerTitle) headerTitle.textContent = getTimeGreeting();
    if (headerIcon) headerIcon.textContent = '📍';
    if (headerDateText) {
      const now = new Date();
      headerDateText.textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
  } else if (tabIndex === 0) { // Goals
    if (headerTitle) headerTitle.textContent = 'Goals & Targets';
    if (headerIcon) headerIcon.textContent = '🎯';
    if (headerDateText) headerDateText.textContent = 'WEEKLY PLAN';
  } else if (tabIndex === 2) { // Settings
    if (headerTitle) headerTitle.textContent = 'Settings';
    if (headerIcon) headerIcon.textContent = '⚙️';
    if (headerDateText) headerDateText.textContent = 'PREFERENCES';
  }
}

// iOS Horizontal Touch Swipe Support between Tabs (Goals, Home, Settings)
function initSwipeGestures() {
  const viewport = document.getElementById('pagesViewport');
  const navHeader = document.getElementById('navHeader');
  const track = document.getElementById('pagesTrack');
  if (!viewport || !track) return;

  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let currentDeltaX = 0;
  let isDragging = false;
  let isHorizontalDrag = false;
  let isVerticalDrag = false;
  let lastTouchTime = 0;
  let suppressClick = false;

  // Window-level capture listener to block click event after swipe drag
  window.addEventListener('click', (e) => {
    if (suppressClick) {
      e.preventDefault();
      e.stopPropagation();
      suppressClick = false;
    }
  }, true);

  function getClientCoords(e) {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if (e.changedTouches && e.changedTouches.length > 0) {
      return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  function handleStart(e) {
    // If a tab switch transition is in progress, do not allow starting a new swipe
    if (isTabTransitioning) return;

    // If modal is active, do not allow page swiping
    const addModal = document.getElementById('addModal');
    if (addModal && !addModal.classList.contains('hidden')) return;

    // Do not intercept interactive form elements or horizontally scrolling sub-rows or dock
    if (e.target.closest('input, textarea, select, .overflow-x-auto, #bottomNavWrapper, #addModal')) {
      return;
    }

    if (e.type.startsWith('touch')) {
      lastTouchTime = Date.now();
    } else if (e.type.startsWith('mouse')) {
      // Ignore simulated mouse events from touch
      if (Date.now() - lastTouchTime < 600) return;
      if (e.button !== 0) return; // Only left click
    }

    const coords = getClientCoords(e);
    startX = coords.x;
    startY = coords.y;
    startTime = Date.now();
    currentDeltaX = 0;
    isDragging = true;
    isHorizontalDrag = false;
    isVerticalDrag = false;
  }

  function handleMove(e) {
    if (!isDragging) return;
    if (isVerticalDrag) return; // Locked to vertical scrolling; ignore

    const coords = getClientCoords(e);
    const deltaX = coords.x - startX;
    const deltaY = coords.y - startY;

    // Detect direction if not locked yet
    if (!isHorizontalDrag) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absX < 8 && absY < 8) {
        return; // Movement below detection threshold
      }

      if (absX > absY) {
        // Horizontal gesture locked!
        isHorizontalDrag = true;
        suppressClick = true;
      } else {
        // Vertical gesture locked! Let native vertical scrolling take over
        isVerticalDrag = true;
        return;
      }
    }

    // Now actively horizontally dragging
    if (isHorizontalDrag) {
      if (e.cancelable) {
        e.preventDefault(); // Stop any browser scroll / gesture cancellation
      }

      currentDeltaX = deltaX;
      const viewportWidth = viewport.clientWidth || window.innerWidth;

      // Strictly limit drag travel to at most ONE adjacent tab with spring resistance beyond it
      let effectiveDelta = deltaX;

      if (deltaX > 0) {
        // Dragging RIGHT -> Revealing previous tab (currentTab - 1)
        if (currentTab === 0) {
          // Already on leftmost tab (Goals); apply rubber band resistance
          effectiveDelta = deltaX * 0.28;
        } else {
          // Can reveal at most 1 tab to the left (viewportWidth distance)
          if (deltaX > viewportWidth) {
            effectiveDelta = viewportWidth + (deltaX - viewportWidth) * 0.2;
          } else {
            effectiveDelta = deltaX;
          }
        }
      } else if (deltaX < 0) {
        // Dragging LEFT -> Revealing next tab (currentTab + 1)
        if (currentTab === 2) {
          // Already on rightmost tab (Settings); apply rubber band resistance
          effectiveDelta = deltaX * 0.28;
        } else {
          // Can reveal at most 1 tab to the right (-viewportWidth distance)
          if (deltaX < -viewportWidth) {
            effectiveDelta = -viewportWidth + (deltaX + viewportWidth) * 0.2;
          } else {
            effectiveDelta = deltaX;
          }
        }
      }

      const currentPx = (-currentTab * viewportWidth) + effectiveDelta;
      track.style.transition = 'none';
      track.style.transform = `translateX(${currentPx}px)`;

      // Live fluid tracking of the frosted glass bubble during swipe
      const dockBubble = document.getElementById('dockBubble');
      if (dockBubble) {
        const progress = -currentPx / viewportWidth;
        const spacing = getDockTabSpacing();
        const bubbleX = progress * spacing;

        // Subtle liquid stretch along X axis proportional to swipe distance
        const dragFraction = effectiveDelta / viewportWidth;
        const stretchX = 1 + Math.min(0.12, Math.abs(dragFraction) * 0.28);
        const squashY = 1 - (stretchX - 1) * 0.45; // volume preservation

        dockBubble.style.transition = 'none';
        dockBubble.style.transform = `translateX(${bubbleX}px) scale(${stretchX}, ${squashY})`;
      }
    }
  }

  function handleEnd(e) {
    if (!isDragging) return;
    isDragging = false;

    if (isHorizontalDrag) {
      const viewportWidth = viewport.clientWidth || window.innerWidth;
      const deltaTime = Math.max(1, Date.now() - startTime);
      const velocity = Math.abs(currentDeltaX) / deltaTime; // px / ms

      let targetTab = currentTab;
      const distanceThreshold = Math.min(120, viewportWidth * 0.22);
      const velocityThreshold = 0.28;

      // No matter the speed or flick velocity, strictly advance by at most ONE tab
      if (currentDeltaX < -35 && (velocity > velocityThreshold || currentDeltaX < -distanceThreshold)) {
        // Swipe Left -> Exactly 1 tab forward (right)
        targetTab = Math.min(2, currentTab + 1);
      } else if (currentDeltaX > 35 && (velocity > velocityThreshold || currentDeltaX > distanceThreshold)) {
        // Swipe Right -> Exactly 1 tab backward (left)
        targetTab = Math.max(0, currentTab - 1);
      }

      // Smoothly animate to target tab
      track.style.transition = 'transform 0.34s cubic-bezier(0.32, 0.72, 0, 1)';
      switchTab(targetTab);

      // Keep suppressClick active momentarily to prevent ghost click on underlying card/button
      setTimeout(() => {
        suppressClick = false;
      }, 250);
    }

    isHorizontalDrag = false;
    isVerticalDrag = false;
    currentDeltaX = 0;
  }

  function handleCancel() {
    if (!isDragging) return;
    isDragging = false;
    isHorizontalDrag = false;
    isVerticalDrag = false;
    currentDeltaX = 0;

    track.style.transition = 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)';
    track.style.transform = `translateX(-${currentTab * (100 / 3)}%)`;

    const dockBubble = document.getElementById('dockBubble');
    if (dockBubble) {
      const spacing = getDockTabSpacing();
      dockBubble.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
      dockBubble.style.transform = `translateX(${currentTab * spacing}px) scale(1, 1)`;
    }
  }

  // Attach touch events to viewport and header
  [viewport, navHeader].forEach((el) => {
    if (!el) return;
    el.addEventListener('touchstart', handleStart, { passive: true });
    el.addEventListener('touchmove', handleMove, { passive: false });
    el.addEventListener('touchend', handleEnd, { passive: true });
    el.addEventListener('touchcancel', handleCancel, { passive: true });
  });

  // Attach mouse events on desktop for dragging
  viewport.addEventListener('mousedown', handleStart);
  if (navHeader) navHeader.addEventListener('mousedown', handleStart);
  window.addEventListener('mousemove', handleMove);
  window.addEventListener('mouseup', handleEnd);
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

window.adjustDayGoal = function(dayId, delta) {
  triggerHaptic();
  const day = state.days.find(d => d.id === dayId);
  if (!day) return;

  const current = typeof day.planned === 'number' ? day.planned : 0;
  const next = Math.max(0, Math.round((current + delta) * 100) / 100);
  day.planned = next;

  saveState();
  updateCalculations();

  // Targeted DOM update for instant responsiveness without full re-render
  const input = document.getElementById(`goal-input-${dayId}`);
  if (input) {
    input.value = next.toFixed(2);
    input.placeholder = next.toFixed(2);
  }

  const bar = document.getElementById(`goal-bar-${dayId}`);
  const pctEl = document.getElementById(`goal-pct-${dayId}`);
  const restEl = document.getElementById(`goal-rest-${dayId}`);

  const dashTarget = Math.round(state.totalBillGoal * 0.75 * 100) / 100;
  const pctOfDash = dashTarget > 0 ? ((next / dashTarget) * 100).toFixed(1) : '0.0';

  if (bar) {
    const barPct = Math.min(100, Math.max(0, (next / (dashTarget / 3 || 1)) * 100));
    bar.style.width = `${barPct}%`;
  }
  if (pctEl) pctEl.textContent = `${pctOfDash}% of goal`;
  if (restEl) {
    if (next === 0) restEl.classList.remove('hidden');
    else restEl.classList.add('hidden');
  }

  updateGoalsPageSummary();
};

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
        renderGoalsPage();
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
    const dashTarget = Math.round(totalBill * 0.75 * 100) / 100;
    const todayId = getTodayId();

    state.days.forEach(day => {
      const row = document.createElement('div');
      row.className = 'apple-row-separator px-3.5 py-3 flex items-center justify-between transition-colors';

      const isToday = day.id === todayId;
      const isWeekend = day.id === 'fri' || day.id === 'sat';
      const pctOfDash = dashTarget > 0 ? ((day.planned / dashTarget) * 100).toFixed(1) : '0.0';
      const barPct = Math.min(100, Math.max(0, (day.planned / (dashTarget / 3 || 1)) * 100));
      const isOff = day.planned === 0;

      row.innerHTML = `
        <div class="flex items-center gap-3 min-w-0 flex-1 mr-3">
          <!-- Day Avatar Badge -->
          <div class="w-9 h-9 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 font-sans transition-all relative ${
            isToday 
              ? 'bg-teal-50 dark:bg-[#30D158]/15 border-1.5 border-teal-500 dark:border-[#30D158] text-teal-700 dark:text-[#30D158] font-bold shadow-sm' 
              : isWeekend
                ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-700/30 text-amber-700 dark:text-amber-400 font-semibold'
                : 'bg-gray-100 dark:bg-[#2C2C2E] border border-gray-200/70 dark:border-white/[0.07] text-gray-700 dark:text-gray-300 font-semibold'
          }">
            <span class="text-[10px] uppercase tracking-tight leading-none">${day.short}</span>
            ${isToday ? '<span class="w-1.5 h-1.5 rounded-full bg-teal-500 dark:bg-[#30D158] mt-0.5"></span>' : ''}
          </div>

          <!-- Day Name & Metrics -->
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <span class="text-[13px] font-semibold text-gray-900 dark:text-white leading-tight">${day.name}</span>
              ${isToday ? '<span class="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-teal-500 text-white dark:bg-[#30D158] dark:text-black uppercase tracking-wider">Today</span>' : ''}
              <span id="goal-rest-${day.id}" class="text-[9.5px] font-medium text-gray-400 dark:text-[#8E8E93] italic ${isOff ? '' : 'hidden'}">Rest Day</span>
            </div>
            <div class="text-[11px] text-gray-500 dark:text-[#8E8E93] font-mono flex items-center gap-1.5 mt-0.5">
              <span id="goal-pct-${day.id}">${pctOfDash}% of goal</span>
            </div>
            <!-- Micro Contribution Bar -->
            <div class="goal-day-bar">
              <div id="goal-bar-${day.id}" class="goal-day-bar-fill" style="width: ${barPct}%;"></div>
            </div>
          </div>
        </div>

        <!-- Apple Stepper Pill Capsule -->
        <div class="goal-stepper-pill flex-shrink-0">
          <button type="button" onclick="adjustDayGoal('${day.id}', -5)" class="goal-stepper-btn tap-btn" title="Decrease target by $5" aria-label="Decrease target">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>

          <div class="flex items-center px-1">
            <span class="text-xs font-bold text-teal-600 dark:text-[#30D158] font-mono mr-0.5">$</span>
            <input 
              type="text" 
              inputmode="decimal" 
              id="goal-input-${day.id}" 
              value="${day.planned.toFixed(2)}"
              placeholder="${day.planned.toFixed(2)}"
              class="smart-goal-input w-14 bg-transparent text-center font-mono text-[13px] font-bold text-gray-900 dark:text-white focus:outline-none"
              title="Edit planned target for ${day.name}"
            />
          </div>

          <button type="button" onclick="adjustDayGoal('${day.id}', 5)" class="goal-stepper-btn tap-btn" title="Increase target by $5" aria-label="Increase target">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
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
            renderGoalsPage();
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
  plannedSum = Math.round(plannedSum * 100) / 100;

  const dashTargetEl = document.getElementById('goalsPageDashTarget');
  if (dashTargetEl) dashTargetEl.textContent = formatCurrency(dashTarget);

  const paycheckTargetEl = document.getElementById('goalsPagePaycheckTarget');
  if (paycheckTargetEl) paycheckTargetEl.textContent = formatCurrency(paycheckTarget);

  const plannedTotalEl = document.getElementById('goalsPagePlannedTotal');
  if (plannedTotalEl) plannedTotalEl.textContent = formatCurrency(plannedSum);

  // Dynamic balance badge
  const balanceBadge = document.getElementById('goalsPageBalanceBadge');
  if (balanceBadge) {
    const diff = Math.round((plannedSum - dashTarget) * 100) / 100;
    if (Math.abs(diff) < 0.05) {
      balanceBadge.className = 'text-[10px] font-medium font-sans px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-700/30';
      balanceBadge.textContent = '✓ Balanced';
    } else if (diff < 0) {
      balanceBadge.className = 'text-[10px] font-medium font-sans px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-700/30';
      balanceBadge.textContent = `⚠️ Under by ${formatCurrency(Math.abs(diff))}`;
    } else {
      balanceBadge.className = 'text-[10px] font-medium font-sans px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200/80 dark:border-blue-700/30';
      balanceBadge.textContent = `+ ${formatCurrency(diff)} Over`;
    }
  }
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
  switchTab(0);
};

window.closeGoalsModal = function() {
  switchTab(1);
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
  switchTab(1);
  initLaunchTransition();

  // Refresh dynamic time greeting when returning to the app
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      updateNavHeaderForTab(currentTab);
    }
  });

  // Desktop / Mac trackpad swipe & mousewheel forwarding
  const deviceFrame = document.getElementById('deviceFrame');
  if (deviceFrame) {
    let wheelSwipeTimer = null;
    let wheelDeltaXAccumulator = 0;
    let wheelLock = false;

    deviceFrame.addEventListener('wheel', (e) => {
      // If modal is active, allow modal to handle scrolling
      const addModal = document.getElementById('addModal');
      if (addModal && !addModal.classList.contains('hidden')) return;

      // Handle Mac trackpad two-finger horizontal swipe between tabs (strictly 1 tab at a time)
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 12) {
        clearTimeout(wheelSwipeTimer);
        wheelSwipeTimer = setTimeout(() => {
          wheelDeltaXAccumulator = 0;
          wheelLock = false;
        }, 320);

        if (wheelLock || isTabTransitioning) return;

        wheelDeltaXAccumulator += e.deltaX;

        if (wheelDeltaXAccumulator > 45 && currentTab < 2) {
          wheelLock = true;
          wheelDeltaXAccumulator = 0;
          switchTab(currentTab + 1);
        } else if (wheelDeltaXAccumulator < -45 && currentTab > 0) {
          wheelLock = true;
          wheelDeltaXAccumulator = 0;
          switchTab(currentTab - 1);
        }
        return;
      }

      // Vertical mousewheel forward to active tab container
      const activeContainer = [
        document.getElementById('pageGoals'),
        document.getElementById('pageHome'),
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
