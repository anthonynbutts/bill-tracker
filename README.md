# 🎓 School Bill Tracker

A clean, modern, and minimal web application for tracking your school bill income in real time.

## 💡 How It Works
- **Total School Bill**: Target **$215.00** (fully editable).
- **DoorDash Share**: Target **$161.25** (customizable or distributed evenly across days).
- **Paycheck Dynamic Calculation**:
  - Baseline planned paycheck share is **$53.75** ($215.00 − $161.25).
  - As you log your actual DoorDash earnings for **Monday through Saturday**, the app automatically calculates **exactly how much you need to contribute from your paycheck in real time**!
  - If you exceed your DoorDash goal, your paycheck requirement drops dollar-for-dollar.
  - If you hit $215 from DoorDash alone, the app shows that **$0.00** is required from your paycheck, keeping 100% of your paycheck in your pocket!

## ✨ Key Features
- **Goal vs. Actual Everywhere**:
  - Overall Bill (Goal vs. Dash Earned vs. Remaining)
  - DoorDash Overall (Goal vs. Actual vs. Status)
  - Paycheck Share (Baseline Planned vs. Current Real-time Needed)
  - Daily Dash Cards (Monday through Saturday) with customizable daily goals and live variance chips.
- **Fast Daily Entry**:
  - Direct keyboard inputs for goal and actual earnings.
  - Quick addition buttons (`+$5`, `+$10`, `+$20`).
  - "Hit Goal" autofill button for instant entry.
- **Even Goal Distribution**:
  - One-click "Split Dash Goal Evenly" distributes your DoorDash target evenly across all 6 days (~$26.88/day).
  - "Sum Daily Goals to Dash Target" recalculates your weekly DoorDash goal if you customize days.
- **Real-Time Running Breakdown**:
  - Summary table showing cumulative dash earnings day by day and how your paycheck requirement decreases step-by-step.
- **Auto-Saved to Browser**:
  - Uses `localStorage` so your numbers and daily goals are saved automatically as you type.
- **Copy Summary**:
  - Copy a formatted text breakdown to your clipboard with one click.
- **Dark & Light Theme**:
  - Built-in toggle supporting dark and light aesthetics.

## 🚀 How to Open and Run

### Option 1: Direct Double-Click (Zero Setup)
Simply double-click [`index.html`](file:///Users/anthony/Desktop/School%20Bill%20Tracker/index.html) or run:
```bash
open index.html
```

### Option 2: Local Web Server
```bash
npm start
# Opens local server at http://localhost:3000
```
