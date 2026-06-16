# EcoPulse: Carbon Footprint Tracker & Reducer
### Prompt War Challenge 3 Submission

This repository contains the complete entry for **Prompt War Challenge 3**. The goal is to build an interactive solution that helps individuals understand, track, and reduce their carbon footprint through simple daily actions and personalized insights.

---

## 🏆 1. Chosen Vertical
* **Vertical:** Personal Carbon Footprint Tracking & Reduction (Challenge 3)
* **Goal:** Create a lightweight, high-fidelity Single Page Application (SPA) dashboard that motivates active lifestyle changes through real-time feedback, eco-quests, XP tracking, and custom habit adjustments.

---

## 💡 2. Approach & Logic
EcoPulse is built on a **State-Driven, React-free, Zero-dependency architecture** using pure HTML5, Vanilla CSS3, and ES6 JavaScript.

### Key Logic Principles:
1. **State-Driven Rendering:** Calculations, SVG charts, quests, and insights automatically react to mutations in a centralized `state` configuration object.
2. **Lightweight Native SVGs:** To keep the codebase under 100 KB (well within the 10 MB limit) and eliminate remote resource dependencies, all gauges and trend charts are drawn programmatically using native SVG templates.
3. **Behavioral Gamification:** To encourage actual habits reduction, calculations are paired with an Action Center where users commit to carbon-offsetting challenges (XP points + cumulative CO₂ prevented metrics).

---

## ⚙️ 3. How the Solution Works
1. **Calculator (Inputs):** Uses sliders categorized by **Transport**, **Energy**, **Diet**, and **Waste** to input daily habits. The dashboard calculates updates in real-time.
2. **Overview (Track):** Visualizes the user's annual carbon footprint tonnage using a colored status ring and dynamically updates a 7-day trend history chart.
3. **Action Center (Reduce):** Toggles category filters to log active challenges, unlock achievement badges (Welcome, Zero Waste Hero, Streak Master, etc.), or design **custom sustainable habits** via the custom form creator.
4. **Insights (Understand):** Evaluates category footprints and serves up specific savings estimations (e.g., reducing your specific commute mileage saves exactly X kg) and benchmark bars against US averages, global averages, and the Paris Climate Accord targets.
5. **Data Exporter:** Compiles habits and carbon savings details to a downloadable `.txt` report directly in the client browser.
6. **Diagnostic Suite:** Runs calculation tests inside a console runner (`runCalculationsTests()`) or visually on [test.html](test.html).

---

## 📋 4. Assumptions Made
To calculate carbon output without requiring detailed billing uploads, the calculation engine applies the following assumptions:

1. **Utility Calculations:** Monthly electric bills are mapped to consumption at a rate of **$0.15/kWh**. Standard grid electricity is assumed to emit **0.40 kg CO₂e/kWh**. Green energy share options deduct electricity emissions proportionally (up to 100% savings).
2. **Heating Calculations:** Gas heating is mapped to consumption at a rate of **$1.00/therm**, producing **5.30 kg CO₂e/therm**.
3. **Vehicle commutable rates:** Petrol vehicles emit **0.40 kg CO₂e/mile**, Hybrid models emit **0.22 kg CO₂e/mile**, and Electric vehicles (EV) emit **0.10 kg CO₂e/mile** (factoring average grid charging mix). Public transit emits **0.08 kg CO₂e/mile**.
4. **Flights weight:** Short and long-haul flights are averaged to an emission factor of **900 kg CO₂e** per round-trip flight.
5. **Dietary baselines:** Average annual diet footprint values are set to: Heavy Meat (**3.3 tons**), Average Meat (**2.5 tons**), Low Meat (**1.7 tons**), Vegetarian (**1.4 tons**), and Vegan (**0.9 tons**).
6. **Trash decomposition impact:** Waste emissions are set to **150 kg CO₂e** per bag annually, adjusted by recycling rate multipliers (Advanced Recycling + composting deducts waste footprint by 40%).
7. **Local Persistence:** The application assumes client-side execution, saving configuration history to the browser's `localStorage`.
8. **Paris Accord Goal:** The personal baseline target is set to **2.0 metric tons** of CO₂e annually.

---

## 🚀 How to Run & Verify
1. Double-click [index.html](index.html) (or open in Chrome, Edge, Firefox).
2. Go to the footer and click **Open Diagnostic Tests** to check calculation assertions.
