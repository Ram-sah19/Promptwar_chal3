# EcoPulse: Carbon Footprint Tracker & Reducer
### Prompt War Challenge 3

This repository contains our entry for **Prompt War Challenge 3**. The goal is to design and build a functional web solution that helps individuals understand, track, and reduce their carbon footprint through simple daily actions and personalized insights.

---

## 📌 Problem Statement
**Challenge:** How can we help individuals understand, track, and reduce their carbon footprint through simple actions and personalized insights?

**Our Design Philosophy:**
Many carbon footprint tools are either overly complex (requiring detailed utilities billing numbers) or lack actionable paths to guide improvements. To solve this, **EcoPulse** was built as a clean, interactive, and premium Single Page Application (SPA). It uses real-time estimation sliders, interactive checklists, gamified milestones, and dynamic recommendation cards to motivate users to adopt sustainable behaviors.

---

## ⚡ The Solution: EcoPulse
EcoPulse is a high-fidelity client-side web application built with **HTML5, Vanilla CSS, and Vanilla JavaScript** featuring:
1. **Interactive Carbon Calculator:** Live sliders tracking daily commute distances, fuel types (Petrol, Hybrid, EV), air travel, monthly utility bills, diet preferences, food waste, and recycling practices.
2. **Dynamic Dashboard Visualizations:**
   - **Progress Ring:** Highlights annual tonnage relative to eco-friendly targets, changing color from Emerald Mint (optimal) to Coral Red (high footprint).
   - **Trend Graph:** A custom, interactive SVG bar chart showing the last 7 logs of carbon history.
3. **Action & Habit Center:** Categorized eco-challenges (e.g., Meatless Mondays, Bike to Work, Composting) where users log actions, save estimated CO₂e, and build active logging streaks.
4. **Gamification (XP & Badges):** Unlocking visual badges (e.g., "Carbon Cutter", "Zero Waste Hero", "Consistency King") via custom modal overlays as XP goals are reached.
5. **Personalized Category Insights:** A recommendation engine that analyzes user inputs, isolates the highest emission category, and presents target advice and Paris Agreement benchmark comparison bars.

---

## 📂 Project Structure
The project is built entirely from scratch with a lightweight, zero-dependency codebase:

```
chal3/
├── index.html   # Main web interface, structures, CDN scripts, and visual components
├── styles.css   # Dark-mode eco style sheet, custom sliders, SVG styles, and glassmorphic cards
├── app.js       # Carbon engine, state tracker, local storage system, and DOM renderer
└── README.md    # Project documentation and challenge summary
```

---

## 🚀 How to Run & Verify
Since this is a client-side Single Page Application, it requires no compilation, environment setup, or package installation. 

1. Clone or download this repository.
2. Open the directory in your explorer.
3. Double-click [index.html](index.html) (or right-click and open in Google Chrome, Microsoft Edge, or Firefox).
4. Save adjustments on the **Calculator** tab to see your profile update instantly! Data is securely saved in your browser's `localStorage` and will persist between reloads.
