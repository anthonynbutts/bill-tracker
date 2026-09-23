# 💳 Bill Tracker
### *by Anthony*

A sleek, tactile mobile Progressive Web App (PWA) designed specifically for iPhone and iOS home screens to balance DoorDash gig earnings against paycheck contributions for your weekly tuition and school bills.

📱 **Live Web App**: [https://anthonynbutts.github.io/bill-tracker/](https://anthonynbutts.github.io/bill-tracker/)  
📦 **Repository**: [anthonynbutts/bill-tracker](https://github.com/anthonynbutts/bill-tracker)

---

## 📱 Install on iPhone (Add to Home Screen)

Install **Bill Tracker** as a standalone app on your iPhone with zero address bars, custom OLED icon, and native safe area padding:

1. Open **[https://anthonynbutts.github.io/bill-tracker/](https://anthonynbutts.github.io/bill-tracker/)** in **Safari** on your iPhone.
2. Tap the **Share** button (the square with an arrow pointing up).
3. Scroll down and tap **"Add to Home Screen"**.
4. Confirm the name **"Bill Tracker"** and tap **Add**.
5. Launch the app from your home screen for an edge-to-edge, native OLED experience!

---

## 💡 How It Works

- **Set Your Target**: Open the **Goals** menu to customize your weekly tuition bill (default: `$215.00`) and distribute your planned daily targets (e.g. `$161.25` total or tap **Split Evenly**).
- **Dynamic Paycheck Balancing**:
  - The hero card focal stat displays the **Current Paycheck Needed**.
  - As you log DoorDash earnings throughout the week, your required paycheck share decreases in real time.
  - If your DoorDash earnings cover the entire bill, your paycheck contribution drops to **$0.00**, leaving your paycheck 100% untouched!
- **Daily Focus**: Only today's active card is shown by default to eliminate visual clutter, with a one-tap collapsible toggle to view and edit other days of the week.

---

## ✨ Features

- 🖤 **True OLED Pitch-Black Canvas**: Pure `#000000` base background for deep contrast, battery preservation on OLED screens, and elevated dark-zinc frosted glass cards (`rgba(24, 24, 27, 0.75)`).
- 🎬 **Cinematic Launch Splash**: Pitch-black launch screen with cross-blur fade into the app interface.
- 💵 **Direct Smart Earnings Inputs**: Seamless inline smart inputs on the Today card and weekly rows with ghost-placeholder UX—tap to clear and enter earnings directly without modal clutter.
- 🎯 **Ghost Goal Inputs**: Tapping any goal clears the field to a muted placeholder so you can type a new amount cleanly; unfocusing without changes safely reverts to the original goal.
- 🔔 **Smart Change Detection**: "Goals updated" toast notifications only trigger when an actual value change is committed.
- 🍎 **Native Apple Typography**: Crafted with Apple's native San Francisco Pro & SF Mono font stacks with tabular numerals (`tnum`).
- ⚡ **Offline & Cache First**: Custom Service Worker pre-caches all shell assets and icons for instant offline launch without network latency.
- 🔄 **Continuous Deployment**: Automated GitHub Actions workflow immediately deploys commits on `main` straight to GitHub Pages.

---

## 🛠️ Tech Stack

- **HTML5 & CSS3**: Native viewport-fit, mobile safe-area insets (`env(safe-area-inset-top)` / `env(safe-area-inset-bottom)`), and responsive chassis simulator for desktop.
- **Tailwind CSS**: Utility-first responsive styling and typography.
- **Vanilla JavaScript (ES6+)**: Zero external JS dependencies or frameworks; lightning-fast state management with `localStorage` persistence.
- **Service Worker & Web App Manifest**: Full PWA compliance with maskable and Apple Touch icons.

---

## 💻 Local Development

Clone and run locally on macOS or Linux:

```bash
# Clone the repository
git clone https://github.com/anthonynbutts/bill-tracker.git
cd bill-tracker

# Start local server or open directly
npm start
# or
open index.html
```

---

## 📄 License

MIT © [Anthony Butts](https://github.com/anthonynbutts)
