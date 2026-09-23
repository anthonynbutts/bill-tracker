# 🎓 School Bill Tracker

A sleek, tactile financial tracking web app designed specifically for iPhone and mobile home screens to balance DoorDash gig earnings against paycheck contributions for your weekly school tuition bill.

📱 **Live Web App**: [https://anthonynbutts.github.io/bill-tracker/](https://anthonynbutts.github.io/bill-tracker/)

---

## 📱 iPhone Add to Home Screen (PWA)

This app is configured as a standalone Progressive Web App (PWA) with native iOS safe area support:

1. Open **[https://anthonynbutts.github.io/bill-tracker/](https://anthonynbutts.github.io/bill-tracker/)** in **Safari** on your iPhone.
2. Tap the **Share** button (box with upward arrow).
3. Select **"Add to Home Screen"**.
4. Confirm **"Bill Tracker"** and tap **Add**.
5. Launch the app from your Home Screen for a fullscreen, native app experience with zero browser address bars!

---

## 💡 How It Works

- **Total School Bill Target**: $215.00 (customizable inside the Goals modal).
- **DoorDash Target**: $161.25 (75% default, customizable or split evenly).
- **Paycheck Dynamic Calculation**:
  - Baseline planned paycheck share is **$53.75** ($215.00 − $161.25).
  - As you log DoorDash earnings, the **Current Paycheck Needed** updates in real time.
  - If you hit $215.00 from DoorDash, your paycheck needed drops to **$0.00**, keeping your paycheck intact!

---

## ✨ Features

- **Tactile Calculator Modal**: YNAB-style protected input calculator with quick preset buttons (`+5`, `+10`, `+15`, `+20`, `+25`) and tactile keypad.
- **Smart Goal Inputs**: Click on any goal to clear the input with a greyed-out placeholder of the original value. Type a fresh amount or click out without typing to revert cleanly.
- **Change Detection**: "Goals updated" toast only fires when you actually modify a goal.
- **Apple Typography**: Native Apple SF Pro & SF Mono typography stack with tabular figures (`tnum`).
- **Offline Capable**: Service worker pre-caches assets for instant launch without cellular lag.
- **Auto-Saved**: All entries and custom targets persist locally in `localStorage`.

---

## 🚀 Local Development

To run locally on your Mac:
```bash
npm start
# or open directly
open index.html
```
