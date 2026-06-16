/* ==========================================================================
   ECOPULSE CARBON DASHBOARD - CONTROLLER
   ========================================================================== */
"use strict";

// 1. CONSTANTS & EMISSION FACTORS (kg CO2e per unit)
const FACTORS = Object.freeze({
  CAR_FUEL: Object.freeze({
    1: 0.40, // Petrol / Diesel (average)
    2: 0.22, // Hybrid
    3: 0.10, // Electric (average grid charging)
    4: 0.00  // No Car / Public transit only
  }),
  PUBLIC_TRANSIT: 0.08, // per mile
  FLIGHT: 900.0,       // per round-trip flight (average short/long haul mix)

  ELECTRICITY_RATE: 0.15, // Cost per kWh ($)
  ELECTRICITY_CO2: 0.40,  // kg CO2 per kWh
  GAS_RATE: 1.00,         // Cost per therm ($)
  GAS_CO2: 5.30,          // kg CO2 per therm

  TRASH_BAG: 150.0, // kg CO2 per bag per year
  RECYCLE_MULT: Object.freeze({
    1: 1.20, // Recycle nothing
    2: 1.00, // Average recycling
    3: 0.60  // Advanced recycling + composting
  })
});

const DIET_FACTORS = Object.freeze({
  1: 3.3, // Heavy Meat
  2: 2.5, // Average Meat
  3: 1.7, // Low Meat/Fish
  4: 1.4, // Vegetarian
  5: 0.9  // Vegan
});

const FOOD_WASTE_FACTORS = Object.freeze({
  1: 0.9, // Very Low
  2: 1.0, // Average
  3: 1.2  // High
});

// DEFAULT CHALLENGES LIST
const DEFAULT_CHALLENGES = Object.freeze([
  Object.freeze({
    id: "meatless_monday",
    title: "Meatless Mondays",
    description: "Eat entirely plant-based meals every Monday for a month.",
    category: "diet",
    impact: 120,
    xp: 150,
    completed: false
  }),
  Object.freeze({
    id: "cycle_commute",
    title: "Bike or Walk to Work",
    description: "Replace 15 miles of driving with cycling or walking this week.",
    category: "transport",
    impact: 310,
    xp: 250,
    completed: false
  }),
  Object.freeze({
    id: "led_upgrade",
    title: "Upgrade to LEDs",
    description: "Replace at least 5 old incandescent bulbs in your home with LEDs.",
    category: "energy",
    impact: 180,
    xp: 200,
    completed: false
  }),
  Object.freeze({
    id: "compost_hero",
    title: "Start Composting",
    description: "Set up a compost bin for kitchen scraps to reduce landfill waste.",
    category: "waste",
    impact: 150,
    xp: 180,
    completed: false
  }),
  Object.freeze({
    id: "cold_wash",
    title: "Cold Water Laundry",
    description: "Wash all your clothes in cold water instead of hot for 2 weeks.",
    category: "energy",
    impact: 75,
    xp: 100,
    completed: false
  }),
  Object.freeze({
    id: "no_single_use",
    title: "Ban Single-Use Plastics",
    description: "Use reusable shopping bags, water bottles, and metal straws.",
    category: "waste",
    impact: 60,
    xp: 120,
    completed: false
  })
]);

// DEFINE BADGES
const BADGES = Object.freeze([
  Object.freeze({
    id: "first_log",
    name: "Green Recruit",
    desc: "Complete your first habits log.",
    req: "Log your baseline habits",
    icon: "fa-seedling"
  }),
  Object.freeze({
    id: "low_carbon",
    name: "Carbon Cutter",
    desc: "Achieve annual emissions under 5.0 Tons.",
    req: "Footprint < 5.0 Tons CO2e",
    icon: "fa-leaf"
  }),
  Object.freeze({
    id: "xp_milestone_1",
    name: "Eco Guardian",
    desc: "Reach 500 Eco Points (XP).",
    req: "Accumulate 500 XP",
    icon: "fa-shield-halved"
  }),
  Object.freeze({
    id: "xp_milestone_2",
    name: "Climate Warrior",
    desc: "Reach 1200 Eco Points (XP).",
    req: "Accumulate 1200 XP",
    icon: "fa-award"
  }),
  Object.freeze({
    id: "streak_3",
    name: "Consistency King",
    desc: "Maintain a 3-day logging streak.",
    req: "3-Day habits streak",
    icon: "fa-fire"
  }),
  Object.freeze({
    id: "zero_waste_hero",
    name: "Zero Waste Hero",
    desc: "Achieve high recycling rate and low trash output.",
    req: "Trash <= 1 bag & Advanced Recycle",
    icon: "fa-recycle"
  })
]);

// APPLICATION STATE
let state = {
  inputs: {
    personal_target: 2.0,
    car_distance: 50,
    vehicle_type: 1,
    public_transit: 10,
    flights: 2,
    electricity: 60,
    clean_energy: 0,
    gas_heating: 40,
    diet_type: 2,
    food_waste: 2,
    trash_bags: 2,
    recycle_rate: 2
  },
  emissions: {
    transport: 0,
    energy: 0,
    food: 0,
    waste: 0,
    total: 0
  },
  xp: 0,
  streak: 0,
  lastLogDate: null,
  co2Prevented: 0,
  challenges: [],
  history: [],
  unlockedBadges: []
};

// ==========================================================================
// DOM HELPER & SECURITY SANITIZATION FUNCTIONS
// ==========================================================================

function clearContainer(container) {
  if (!container) return;
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

function createElement(tag, className = "", text = "") {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

function createIcon(iconClass) {
  const icon = document.createElement("i");
  icon.className = `fa-solid ${iconClass}`;
  icon.setAttribute("aria-hidden", "true");
  return icon;
}

function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ==========================================================================
// INITIALIZATION & EVENT LISTENERS
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  loadState();
  initNavigation();
  initSliders();
  initChallengeFilters();
  initCustomChallengeForm();
  
  const goToActionsBtn = document.getElementById("go-to-actions");
  if (goToActionsBtn) {
    goToActionsBtn.addEventListener("click", () => switchTab("actions-panel"));
    goToActionsBtn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        switchTab("actions-panel");
      }
    });
  }

  const saveLogBtn = document.getElementById("btn-save-log");
  if (saveLogBtn) saveLogBtn.addEventListener("click", saveHabitsLog);

  const exportReportBtn = document.getElementById("btn-export-report");
  if (exportReportBtn) exportReportBtn.addEventListener("click", exportCarbonReport);

  calculateEmissions(true);
  renderDashboard();
});

// Navigation Handling
function initNavigation() {
  const tabs = document.querySelectorAll(".nav-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.getAttribute("data-target");
      switchTab(target);
    });
  });

  const calcTabs = document.querySelectorAll(".calc-section-tab");
  calcTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      calcTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const target = tab.getAttribute("data-subtarget");
      document.querySelectorAll(".calc-sub-panel").forEach(panel => {
        panel.classList.remove("active");
      });
      const targetPanel = document.getElementById(target);
      if (targetPanel) targetPanel.classList.add("active");
    });
  });
}

function switchTab(targetId) {
  const tabs = document.querySelectorAll(".nav-tab");
  tabs.forEach(t => {
    const tabTarget = t.getAttribute("data-target");
    if (tabTarget === targetId) {
      t.classList.add("active");
      t.setAttribute("aria-selected", "true");
    } else {
      t.classList.remove("active");
      t.setAttribute("aria-selected", "false");
    }
  });

  const panels = document.querySelectorAll(".panel");
  panels.forEach(p => {
    if (p.id === targetId) {
      p.classList.add("active");
    } else {
      p.classList.remove("active");
    }
  });

  if (targetId === "overview-panel") {
    renderTrendChart();
  }
}

// Sliders Config & Sanitized Input Listeners
function initSliders() {
  const slidersConfig = [
    { id: "slider-personal-target", valId: "val-personal-target", suffix: " Tons", key: "personal_target", min: 1.0, max: 15.0, parse: parseFloat },
    { id: "slider-drive-distance", valId: "val-drive-distance", suffix: " miles", key: "car_distance", min: 0, max: 500 },
    { 
      id: "slider-vehicle-type", 
      valId: "val-vehicle-type", 
      key: "vehicle_type", 
      min: 1, 
      max: 4,
      format: (val) => {
        const labels = { 1: "Petrol / Diesel", 2: "Hybrid", 3: "Electric (EV)", 4: "No Car / Transit Only" };
        return labels[val] || "Petrol / Diesel";
      } 
    },
    { id: "slider-public-transit", valId: "val-public-transit", suffix: " miles", key: "public_transit", min: 0, max: 200 },
    { id: "slider-flights", valId: "val-flights", suffix: " flights/yr", key: "flights", min: 0, max: 20 },
    { id: "slider-electricity", valId: "val-electricity", prefix: "$", key: "electricity", min: 0, max: 300 },
    { id: "slider-clean-energy", valId: "val-clean-energy", suffix: "%", key: "clean_energy", min: 0, max: 100 },
    { id: "slider-gas-heating", valId: "val-gas-heating", prefix: "$", key: "gas_heating", min: 0, max: 250 },
    { 
      id: "slider-diet-type", 
      valId: "val-diet-type", 
      key: "diet_type", 
      min: 1, 
      max: 5,
      format: (val) => {
        const labels = { 1: "Heavy Meat", 2: "Average Meat", 3: "Low Meat/Fish", 4: "Vegetarian", 5: "Vegan" };
        return labels[val] || "Average Meat";
      } 
    },
    { 
      id: "slider-waste-food", 
      valId: "val-waste-food", 
      key: "food_waste", 
      min: 1, 
      max: 3,
      format: (val) => {
        const labels = { 1: "Very Low", 2: "Average", 3: "High" };
        return labels[val] || "Average";
      } 
    },
    { id: "slider-trash-bags", valId: "val-trash-bags", suffix: " bags/wk", key: "trash_bags", min: 0, max: 10 },
    { 
      id: "slider-recycle-rate", 
      valId: "val-recycle-rate", 
      key: "recycle_rate", 
      min: 1, 
      max: 3,
      format: (val) => {
        const labels = { 1: "Recycle Nothing", 2: "Average Recycling", 3: "Compost & Advanced" };
        return labels[val] || "Average Recycling";
      } 
    }
  ];

  slidersConfig.forEach(cfg => {
    const el = document.getElementById(cfg.id);
    const valDisplay = document.getElementById(cfg.valId);
    if (!el || !valDisplay) return;

    el.value = state.inputs[cfg.key];

    const updateDisplay = (val) => {
      if (cfg.format) {
        valDisplay.textContent = cfg.format(val);
      } else {
        const prefix = cfg.prefix || "";
        const suffix = cfg.suffix || "";
        valDisplay.textContent = `${prefix}${val}${suffix}`;
      }
    };

    updateDisplay(el.value);

    el.addEventListener("input", (e) => {
      let rawVal = cfg.parse ? cfg.parse(e.target.value) : parseInt(e.target.value, 10);
      if (isNaN(rawVal)) rawVal = cfg.min;
      
      const sanitizedVal = Math.max(cfg.min, Math.min(cfg.max, rawVal));
      state.inputs[cfg.key] = sanitizedVal;
      
      updateDisplay(sanitizedVal);
      calculateEmissions(false);
      renderLiveEstimator();
      
      if (cfg.key === "personal_target") {
        renderDashboard(); 
      }
    });
  });
}

function initChallengeFilters() {
  const buttons = document.querySelectorAll(".filter-btn");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      const category = btn.getAttribute("data-filter") || "all";
      renderChallenges(category);
    });
  });
}

function initCustomChallengeForm() {
  const form = document.getElementById("custom-challenge-form");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const titleEl = document.getElementById("custom-title");
    const categoryEl = document.getElementById("custom-category");
    const impactEl = document.getElementById("custom-impact");

    if (!titleEl || !categoryEl || !impactEl) return;

    const titleVal = escapeHTML(titleEl.value.trim());
    const categoryVal = categoryEl.value.trim();
    const impactVal = parseInt(impactEl.value, 10);

    if (!titleVal || isNaN(impactVal) || impactVal < 10 || impactVal > 2000) {
      showToast("Please enter valid challenge inputs.");
      return;
    }

    const newId = `custom_${Date.now()}`;
    const newChallenge = {
      id: newId,
      title: titleVal,
      description: `Personalized habit committed: offset estimated at ${impactVal} kg/year.`,
      category: categoryVal,
      impact: impactVal,
      xp: 150,
      completed: false
    };

    state.challenges.push(newChallenge);

    titleEl.value = "";
    impactEl.value = "";

    showToast(`Custom habit "${titleVal}" activated successfully!`);
    saveState();

    const activeFilter = document.querySelector(".filter-btn.active");
    const filterCat = activeFilter ? (activeFilter.getAttribute("data-filter") || "all") : "all";
    renderChallenges(filterCat);
    renderDailyQuests();
  });
}

// ==========================================================================
// CALCULATIONS & CORE ENGINE
// ==========================================================================

function calculateEmissions(saveToHistory = false) {
  const inputs = state.inputs;

  const carFactor = FACTORS.CAR_FUEL[inputs.vehicle_type] || 0.40;
  const annualCarEmissions = inputs.car_distance * 52 * carFactor;
  const annualTransitEmissions = inputs.public_transit * 52 * FACTORS.PUBLIC_TRANSIT;
  const annualFlightEmissions = inputs.flights * FACTORS.FLIGHT;
  const transportTons = (annualCarEmissions + annualTransitEmissions + annualFlightEmissions) / 1000;

  const annualElectricityKWh = (inputs.electricity / FACTORS.ELECTRICITY_RATE) * 12;
  const cleanEnergyDeduction = inputs.clean_energy / 100.0;
  const electricityTons = (annualElectricityKWh * (1 - cleanEnergyDeduction) * FACTORS.ELECTRICITY_CO2) / 1000;
  
  const annualGasTherms = (inputs.gas_heating / FACTORS.GAS_RATE) * 12;
  const gasTons = (annualGasTherms * FACTORS.GAS_CO2) / 1000;
  const energyTons = electricityTons + gasTons;

  const baseDietTons = DIET_FACTORS[inputs.diet_type] || 2.5;
  const wasteMult = FOOD_WASTE_FACTORS[inputs.food_waste] || 1.0;
  const foodTons = baseDietTons * wasteMult;

  const wasteBagsKg = inputs.trash_bags * FACTORS.TRASH_BAG;
  const recycleMult = FACTORS.RECYCLE_MULT[inputs.recycle_rate] || 1.0;
  const wasteTons = (wasteBagsKg * recycleMult) / 1000;

  state.emissions.transport = parseFloat(transportTons.toFixed(2));
  state.emissions.energy = parseFloat(energyTons.toFixed(2));
  state.emissions.food = parseFloat(foodTons.toFixed(2));
  state.emissions.waste = parseFloat(wasteTons.toFixed(2));
  state.emissions.total = parseFloat((transportTons + energyTons + foodTons + wasteTons).toFixed(2));
}

// ==========================================================================
// RENDER METHODS (REFACTORED WITH SAFE DOM CREATION APIS)
// ==========================================================================

function renderDashboard() {
  document.getElementById("streak-count").textContent = String(state.streak);
  document.getElementById("xp-count").textContent = String(state.xp);
  document.getElementById("footprint-value").textContent = state.emissions.total.toFixed(1);
  
  const circle = document.getElementById("footprint-circle-progress");
  if (circle) {
    const maxVal = state.inputs.personal_target || 2.0;
    const progressPercent = Math.min(state.emissions.total / maxVal, 1.0);
    const strokeDashoffset = 628 - (628 * progressPercent);
    circle.style.strokeDashoffset = String(strokeDashoffset);
  }

  const ratingBadge = document.getElementById("footprint-rating");
  if (ratingBadge) {
    ratingBadge.className = "metric-rating-badge";
    const targetVal = state.inputs.personal_target || 2.0;
    if (state.emissions.total <= targetVal) {
      ratingBadge.textContent = "On Target";
      ratingBadge.classList.add("rating-low");
    } else if (state.emissions.total <= targetVal * 1.5) {
      ratingBadge.textContent = "Moderate";
      ratingBadge.classList.add("rating-medium");
    } else {
      ratingBadge.textContent = "Over Limit";
      ratingBadge.classList.add("rating-high");
    }
  }

  document.getElementById("mini-val-transport").textContent = `${state.emissions.transport.toFixed(1)} t`;
  document.getElementById("mini-val-energy").textContent = `${state.emissions.energy.toFixed(1)} t`;
  document.getElementById("mini-val-food").textContent = `${state.emissions.food.toFixed(1)} t`;
  document.getElementById("mini-val-waste").textContent = `${state.emissions.waste.toFixed(1)} t`;

  renderLiveEstimator();
  renderChallenges("all");
  renderBadges();
  
  document.getElementById("stats-co2-prevented").textContent = `${state.co2Prevented.toFixed(1)} kg`;
  document.getElementById("stats-equivalent-trees").textContent = (state.co2Prevented / 22.0).toFixed(1);

  renderTrendChart();
  renderInsights();
  renderDailyQuests();
}

function renderLiveEstimator() {
  document.getElementById("calc-live-total").textContent = state.emissions.total.toFixed(2);
  document.getElementById("calc-breakdown-transport").textContent = `${state.emissions.transport.toFixed(2)} t`;
  document.getElementById("calc-breakdown-energy").textContent = `${state.emissions.energy.toFixed(2)} t`;
  document.getElementById("calc-breakdown-food").textContent = `${state.emissions.food.toFixed(2)} t`;
  document.getElementById("calc-breakdown-waste").textContent = `${state.emissions.waste.toFixed(2)} t`;
  document.getElementById("calc-breakdown-total").textContent = `${state.emissions.total.toFixed(2)} t`;

  const emojiWrap = document.getElementById("estimator-emoji");
  if (emojiWrap) {
    clearContainer(emojiWrap);
    if (state.emissions.total <= state.inputs.personal_target) {
      const icon = createIcon("fa-tree");
      icon.style.color = "hsl(152, 69%, 43%)";
      emojiWrap.appendChild(icon);
    } else if (state.emissions.total <= state.inputs.personal_target * 1.5) {
      const icon = createIcon("fa-cloud-sun");
      icon.style.color = "hsl(42, 100%, 53%)";
      emojiWrap.appendChild(icon);
    } else {
      const icon = createIcon("fa-cloud-showers-water");
      icon.style.color = "hsl(350, 80%, 55%)";
      emojiWrap.appendChild(icon);
    }
  }
}

function renderChallenges(categoryFilter = "all") {
  const container = document.getElementById("challenges-grid-container");
  if (!container) return;
  clearContainer(container);

  const filtered = state.challenges.filter(c => {
    return categoryFilter === "all" || c.category === categoryFilter;
  });

  if (filtered.length === 0) {
    const fallbackMsg = createElement("p", "", "No habits found for this category.");
    fallbackMsg.style.gridColumn = "1/-1";
    fallbackMsg.style.textAlign = "center";
    fallbackMsg.style.color = "hsl(var(--text-muted))";
    fallbackMsg.style.padding = "var(--space-lg) 0";
    container.appendChild(fallbackMsg);
    return;
  }

  filtered.forEach(c => {
    const card = createElement("div", "card challenge-card");
    const header = createElement("div", "challenge-header");
    
    const categoryBadge = createElement("span", "challenge-badge-eco");
    const icons = { transport: "fa-car", energy: "fa-bolt", diet: "fa-utensils", waste: "fa-trash-can" };
    const iconClass = icons[c.category] || "fa-leaf";
    const badgeIcon = createIcon(iconClass);
    categoryBadge.appendChild(badgeIcon);
    categoryBadge.appendChild(document.createTextNode(` ${c.category}`));
    
    const impactBadge = createElement("span", "challenge-impact-badge");
    impactBadge.title = "Carbon savings per year";
    const cloudIcon = createIcon("fa-cloud-arrow-down");
    impactBadge.appendChild(cloudIcon);
    impactBadge.appendChild(document.createTextNode(` -${c.impact} kg CO₂/yr`));
    
    header.appendChild(categoryBadge);
    header.appendChild(impactBadge);

    const heading = createElement("h3", "", c.title);
    heading.style.marginBottom = "var(--space-xs)";
    heading.style.fontSize = "1.1rem";

    const desc = createElement("p", "challenge-description", c.description);
    const footer = createElement("div", "challenge-footer");
    
    const reward = createElement("span", "challenge-reward");
    const starIcon = createIcon("fa-star");
    reward.appendChild(starIcon);
    reward.appendChild(document.createTextNode(` +${c.xp} XP`));

    const btn = createElement("button", `btn-action ${c.completed ? 'completed' : ''}`);
    btn.type = "button";
    
    const checkIcon = createIcon("fa-circle-check");
    btn.appendChild(checkIcon);
    btn.appendChild(document.createTextNode(c.completed ? " Completed" : " Log Action"));
    if (c.completed) {
      btn.disabled = true;
    } else {
      btn.addEventListener("click", () => completeChallenge(c.id));
    }

    footer.appendChild(reward);
    footer.appendChild(btn);

    card.appendChild(header);
    card.appendChild(heading);
    card.appendChild(desc);
    card.appendChild(footer);

    container.appendChild(card);
  });
}

function renderBadges() {
  const container = document.getElementById("badges-grid-container");
  if (!container) return;
  clearContainer(container);

  BADGES.forEach(badge => {
    const isUnlocked = state.unlockedBadges.includes(badge.id);
    const item = createElement("div", `badge-item ${isUnlocked ? 'unlocked' : ''}`);
    item.title = `${badge.desc} (${badge.req})`;

    const iconWrap = createElement("div", "badge-icon-wrap");
    const badgeIcon = createIcon(badge.icon);
    iconWrap.appendChild(badgeIcon);

    const name = createElement("div", "badge-name", badge.name);
    const req = createElement("div", "badge-requirement", isUnlocked ? 'Unlocked!' : badge.req);

    item.appendChild(iconWrap);
    item.appendChild(name);
    item.appendChild(req);

    container.appendChild(item);
  });
}

function renderInsights() {
  const userValEl = document.getElementById("compare-user-val");
  if (userValEl) userValEl.textContent = `${state.emissions.total.toFixed(1)} Tons`;
  
  const userBarEl = document.getElementById("compare-user-bar");
  if (userBarEl) {
    const maxBenchmarkVal = 20.0;
    const userWidth = Math.min((state.emissions.total / maxBenchmarkVal) * 100, 100);
    userBarEl.style.width = `${userWidth}%`;
  }

  // Target Goal Bar comparison
  const targetValEl = document.getElementById("compare-target-val");
  if (targetValEl) targetValEl.textContent = `${state.inputs.personal_target.toFixed(1)} Tons`;

  const targetBarEl = document.getElementById("compare-target-bar");
  if (targetBarEl) {
    const maxBenchmarkVal = 20.0;
    const targetWidth = Math.min((state.inputs.personal_target / maxBenchmarkVal) * 100, 100);
    targetBarEl.style.width = `${targetWidth}%`;
  }

  const container = document.getElementById("insights-container");
  if (!container) return;
  clearContainer(container);

  const ems = state.emissions;
  const categories = [
    { name: "transport", val: ems.transport },
    { name: "energy", val: ems.energy },
    { name: "food", val: ems.food },
    { name: "waste", val: ems.waste }
  ];

  categories.sort((a, b) => b.val - a.val);
  const highest = categories[0];

  let recommendations = [];

  if (highest.name === "transport") {
    const commMiles = state.inputs.car_distance;
    const offset = Math.round(commMiles * 0.2 * 52 * FACTORS.CAR_FUEL[1]);
    recommendations = [
      {
        type: "warning",
        headline: `High Transportation Footprint (${highest.val} t)`,
        desc: "Transport constitutes your largest emission source. Commuting and flights are heavy carbon contributors."
      },
      {
        type: "reduction",
        headline: `Swap 20% of your weekly commute`,
        desc: `Reducing your weekly commute of ${commMiles} miles by 20% will save exactly ${offset} kg of CO₂e annually.`
      },
      {
        type: "reduction",
        headline: "Switch to Electric or Hybrid",
        desc: "Upgrading from standard petrol to a hybrid or electric vehicle cuts transit-related emissions by 45% to 75% immediately."
      }
    ];
  } else if (highest.name === "energy") {
    const currentClean = state.inputs.clean_energy;
    const electricityCost = state.inputs.electricity;
    const totalPotentialSavings = (((electricityCost / FACTORS.ELECTRICITY_RATE) * 12 * FACTORS.ELECTRICITY_CO2) * (currentClean / 100.0)).toFixed(1);
    recommendations = [
      {
        type: "warning",
        headline: `High Home Energy Footprint (${highest.val} t)`,
        desc: "Electricity consumption and heating fuel represent your top environmental impact areas."
      },
      {
        type: "reduction",
        headline: "Opt in for Clean Energy",
        desc: `Switching your current clean energy mix from ${currentClean}% to 100% will reduce your carbon footprint by up to ${totalPotentialSavings} kg of CO₂ annually.`
      },
      {
        type: "reduction",
        headline: "Insulate and Optimize",
        desc: "Heating is incredibly energy intensive. Reducing thermostat temperatures by 2°F in winter can cut heating emissions by 10%."
      }
    ];
  } else if (highest.name === "food") {
    recommendations = [
      {
        type: "warning",
        headline: `High Food & Diet Footprint (${highest.val} t)`,
        desc: "Methane and land use emissions from meat (beef/lamb) and dairy dominate your dietary impact."
      },
      {
        type: "reduction",
        headline: "Transition to Plant-Forward Meals",
        desc: "Going vegetarian or vegan, even part-time, saves 1.1 to 1.6 Tons of CO2e per year compared to average meat consumption."
      },
      {
        type: "reduction",
        headline: "Commit to Zero Food Waste",
        desc: "Food decomposing in landfills produces methane. Lower waste levels from high to low to save 20% on diet-related footprint."
      }
    ];
  } else {
    recommendations = [
      {
        type: "warning",
        headline: `High Waste Footprint (${highest.val} t)`,
        desc: "Household trash disposal contributes heavily to localized emissions due to lack of organic diversion or recycling."
      },
      {
        type: "reduction",
        headline: "Embrace Backyard Composting",
        desc: "Diverting kitchen scraps and yard waste into composting cuts waste decomposition emissions by up to 40%."
      },
      {
        type: "reduction",
        headline: "Source Reduction and Refusal",
        desc: "Avoid excessive packaging by buying bulk and carrying reusable containers, reducing overall bag generation."
      }
    ];
  }

  const userTarget = state.inputs.personal_target || 2.0;
  recommendations.push({
    type: "achievement",
    headline: `Personal Annual Target: ${userTarget.toFixed(1)} Tons`,
    desc: `Your personal annual target limit is set to ${userTarget.toFixed(1)} Tons CO₂e. Keep tracking inputs to stay under this limit!`
  });

  recommendations.forEach(rec => {
    const wrap = createElement("div", `insight-card insight-type-${rec.type}`);
    
    const iconWrap = createElement("div", "insight-icon-wrap");
    const iconClass = rec.type === 'warning' ? 'fa-triangle-exclamation' : (rec.type === 'reduction' ? 'fa-leaf' : 'fa-circle-check');
    iconWrap.appendChild(createIcon(iconClass));

    const content = createElement("div", "insight-content");
    content.appendChild(createElement("div", "insight-headline", rec.headline));
    content.appendChild(createElement("div", "insight-desc", rec.desc));

    wrap.appendChild(iconWrap);
    wrap.appendChild(content);
    container.appendChild(wrap);
  });
}

function renderDailyQuests() {
  const list = document.getElementById("quick-challenges-list");
  if (!list) return;
  clearContainer(list);

  const incomplete = state.challenges.filter(c => !c.completed).slice(0, 3);

  if (incomplete.length === 0) {
    const wrapper = createElement("div", "activity-item");
    wrapper.style.border = "1px dashed hsla(var(--accent-mint), 0.3)";
    wrapper.style.background = "hsla(var(--accent-mint), 0.03)";

    const iconWrap = createElement("div", "activity-icon-wrap");
    const cupIcon = createIcon("fa-trophy");
    cupIcon.style.color = "hsl(var(--accent-yellow))";
    iconWrap.appendChild(cupIcon);

    const details = createElement("div", "activity-details");
    details.appendChild(createElement("div", "activity-name", "All Quests Complete!"));
    details.appendChild(createElement("div", "activity-sub", "Amazing job today. Keep living sustainably!"));

    wrapper.appendChild(iconWrap);
    wrapper.appendChild(details);
    list.appendChild(wrapper);
    return;
  }

  incomplete.forEach(c => {
    const item = createElement("div", "activity-item");
    item.tabIndex = 0;
    item.title = "Click to log action immediately";
    
    const performLog = () => completeChallenge(c.id);
    item.addEventListener("click", performLog);
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        performLog();
      }
    });

    const icons = { transport: "fa-car", energy: "fa-bolt", diet: "fa-utensils", waste: "fa-trash-can" };
    const iconClass = icons[c.category] || "fa-leaf";
    const iconWrap = createElement("div", "activity-icon-wrap");
    iconWrap.appendChild(createIcon(iconClass));

    const details = createElement("div", "activity-details");
    details.appendChild(createElement("div", "activity-name", c.title));
    details.appendChild(createElement("div", "activity-sub", `${c.description.substring(0, 48)}...`));

    const xp = createElement("div", "activity-xp", `+${c.xp} XP`);

    item.appendChild(iconWrap);
    item.appendChild(details);
    item.appendChild(xp);

    list.appendChild(item);
  });
}

// ==========================================================================
// DYNAMIC SVG CHART RENDERING (Bar Chart)
// ==========================================================================

function renderTrendChart() {
  const svg = document.getElementById("trend-chart-svg");
  if (!svg) return;

  const children = Array.from(svg.children);
  children.forEach(child => {
    if (child.tagName !== 'defs') {
      svg.removeChild(child);
    }
  });

  const history = state.history;
  if (!history || history.length === 0) {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", "200");
    text.setAttribute("y", "120");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("fill", "hsl(var(--text-muted))");
    text.setAttribute("font-size", "0.9rem");
    text.textContent = "Log daily habits on the Calculator tab to see trends!";
    svg.appendChild(text);
    return;
  }

  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;
  const width = 400;
  const height = 240;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxVal = Math.max(...history.map(d => d.total), 10.0);
  const minVal = 0;

  const gridLinesCount = 4;
  for (let i = 0; i <= gridLinesCount; i++) {
    const yVal = minVal + ((maxVal - minVal) / gridLinesCount) * i;
    const yPos = height - paddingBottom - (yVal / maxVal) * chartHeight;

    if (i > 0 && i < gridLinesCount) {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(paddingLeft));
      line.setAttribute("y1", String(yPos));
      line.setAttribute("x2", String(width - paddingRight));
      line.setAttribute("y2", String(yPos));
      line.setAttribute("class", "chart-grid-line");
      svg.appendChild(line);
    }

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", String(paddingLeft - 8));
    text.setAttribute("y", String(yPos + 4));
    text.setAttribute("text-anchor", "end");
    text.setAttribute("class", "chart-label");
    text.textContent = `${yVal.toFixed(1)}`;
    svg.appendChild(text);
  }

  const xAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
  xAxis.setAttribute("x1", String(paddingLeft));
  xAxis.setAttribute("y1", String(height - paddingBottom));
  xAxis.setAttribute("x2", String(width - paddingRight));
  xAxis.setAttribute("y2", String(height - paddingBottom));
  xAxis.setAttribute("class", "chart-axis-line");
  svg.appendChild(xAxis);

  const barWidth = Math.max(chartWidth / history.length - 12, 10);
  const space = (chartWidth - barWidth * history.length) / (history.length - 1);

  history.forEach((data, index) => {
    const xPos = paddingLeft + index * (barWidth + space);
    const yVal = data.total;
    const barHeight = (yVal / maxVal) * chartHeight;
    const yPos = height - paddingBottom - barHeight;

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", String(xPos));
    rect.setAttribute("y", String(yPos));
    rect.setAttribute("width", String(barWidth));
    rect.setAttribute("height", String(Math.max(barHeight, 2)));
    rect.setAttribute("class", "bar-rect");
    
    rect.style.transformOrigin = `0px ${height - paddingBottom}px`;
    svg.appendChild(rect);

    const titleText = document.createElementNS("http://www.w3.org/2000/svg", "title");
    titleText.textContent = `${data.date}: ${yVal.toFixed(2)} Tons CO2e`;
    rect.appendChild(titleText);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", String(xPos + barWidth / 2));
    label.setAttribute("y", String(height - paddingBottom + 18));
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("class", "chart-label");
    
    const parts = data.date.split('-');
    const labelStr = parts.length === 3 ? `${getMonthAbbrev(parseInt(parts[1], 10))} ${parts[2]}` : data.date;
    label.textContent = labelStr;
    svg.appendChild(label);
  });
}

function getMonthAbbrev(monthNum) {
  const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months[monthNum] || "";
}

// ==========================================================================
// BUSINESS LOGIC & INTERACTION METHODS
// ==========================================================================

function saveHabitsLog() {
  calculateEmissions(true);

  const todayStr = new Date().toISOString().split('T')[0];
  
  const existingIndex = state.history.findIndex(h => h.date === todayStr);
  if (existingIndex !== -1) {
    state.history[existingIndex].total = state.emissions.total;
  } else {
    if (state.history.length >= 7) {
      state.history.shift();
    }
    state.history.push({
      date: todayStr,
      total: state.emissions.total
    });
  }

  updateLogStreak(todayStr);

  if (state.history.length === 1 && !state.unlockedBadges.includes("first_log")) {
    state.xp += 100;
    showToast("Habits logged successfully! Welcome Badge Unlocked +100 XP!");
  } else {
    showToast("Habits saved & emission profile updated! +15 XP");
    state.xp += 15;
  }

  checkBadges();
  saveState();
  renderDashboard();
  
  setTimeout(() => {
    switchTab("overview-panel");
  }, 800);
}

function updateLogStreak(todayStr) {
  if (!state.lastLogDate) {
    state.streak = 1;
  } else {
    const lastDate = new Date(state.lastLogDate);
    const today = new Date(todayStr);
    const diffTime = Math.abs(today - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      state.streak += 1;
    } else if (diffDays > 1) {
      state.streak = 1;
    }
  }
  state.lastLogDate = todayStr;
}

function completeChallenge(challengeId) {
  const challenge = state.challenges.find(c => c.id === challengeId);
  if (!challenge || challenge.completed) return;

  challenge.completed = true;
  state.xp += challenge.xp;
  state.co2Prevented += challenge.impact;

  showToast(`Action Completed: "${challenge.title}"! Earned +${challenge.xp} XP & saved ${challenge.impact} kg CO₂!`);
  
  checkBadges();
  saveState();
  renderDashboard();
}

function checkBadges() {
  const newlyUnlocked = [];

  if (state.history.length >= 1 && !state.unlockedBadges.includes("first_log")) {
    newlyUnlocked.push("first_log");
  }
  
  if (state.emissions.total > 0 && state.emissions.total < 5.0 && !state.unlockedBadges.includes("low_carbon")) {
    newlyUnlocked.push("low_carbon");
  }

  if (state.xp >= 500 && !state.unlockedBadges.includes("xp_milestone_1")) {
    newlyUnlocked.push("xp_milestone_1");
  }
  if (state.xp >= 1200 && !state.unlockedBadges.includes("xp_milestone_2")) {
    newlyUnlocked.push("xp_milestone_2");
  }

  if (state.streak >= 3 && !state.unlockedBadges.includes("streak_3")) {
    newlyUnlocked.push("streak_3");
  }

  if (state.inputs.trash_bags <= 1 && state.inputs.recycle_rate === 3 && !state.unlockedBadges.includes("zero_waste_hero")) {
    newlyUnlocked.push("zero_waste_hero");
  }

  if (newlyUnlocked.length > 0) {
    state.unlockedBadges.push(...newlyUnlocked);
    newlyUnlocked.forEach(id => {
      const badge = BADGES.find(b => b.id === id);
      if (badge) {
        showAchievementModal(badge);
      }
    });
  }
}

function exportCarbonReport() {
  const inputs = state.inputs;
  const ems = state.emissions;
  const today = new Date().toLocaleString();

  const reportText = `================================================
ECOPULSE PERSONAL CARBON REPORT
Generated on: ${today}
================================================

1. CARBON EMISSIONS PROFILE (Tons CO2e/year)
------------------------------------------------
Transportation:  ${ems.transport.toFixed(2)} Tons
Home Energy:     ${ems.energy.toFixed(2)} Tons
Diet & Food:     ${ems.food.toFixed(2)} Tons
Waste & Recycle: ${ems.waste.toFixed(2)} Tons
------------------------------------------------
TOTAL FOOTPRINT: ${ems.total.toFixed(2)} Tons CO2e/year
TARGET LIMIT:    ${inputs.personal_target.toFixed(2)} Tons CO2e/year

2. HOUSEHOLD HABITS METRICS
------------------------------------------------
- Weekly Car Commute:   ${inputs.car_distance} miles
- Vehicle Type:         ${inputs.vehicle_type === 1 ? 'Petrol/Diesel' : inputs.vehicle_type === 2 ? 'Hybrid' : inputs.vehicle_type === 3 ? 'Electric' : 'None/Transit'}
- Weekly Public Transit: ${inputs.public_transit} miles
- Annual Flights:       ${inputs.flights} flights
- Monthly Power Bill:   $${inputs.electricity} (${inputs.clean_energy}% Clean Sourced)
- Monthly Heating Bill: $${inputs.gas_heating}
- Diet Category:        ${inputs.diet_type === 1 ? 'Heavy Meat' : inputs.diet_type === 2 ? 'Average Meat' : inputs.diet_type === 3 ? 'Low Meat' : inputs.diet_type === 4 ? 'Vegetarian' : 'Vegan'}
- Weekly Garbage Output: ${inputs.trash_bags} bags
- Recycling Standard:   ${inputs.recycle_rate === 1 ? 'None' : inputs.recycle_rate === 2 ? 'Average' : 'Advanced & Compost'}

3. SAVINGS & REDUCTIONS ACHIEVEMENT
------------------------------------------------
- Cumulative CO2 Prevented: ${state.co2Prevented.toFixed(1)} kg
- Equivalent Trees Planted:  ${(state.co2Prevented / 22.0).toFixed(1)} trees
- Current Eco Points:       ${state.xp} XP
- Daily Logging Streak:     ${state.streak} Days
- Unlocked Badges:          ${state.unlockedBadges.length > 0 ? state.unlockedBadges.join(", ") : 'None'}

================================================
Thank you for making sustainable daily choices!
================================================`;

  try {
    const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = createElement("a");
    link.href = url;
    link.download = "ecopulse-carbon-report.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Carbon Report exported successfully!");
  } catch (error) {
    console.error("Export report failed:", error);
    showToast("Export failed. Please try again.");
  }
}

// ==========================================================================
// STATE DATA MANAGEMENT (LOCAL STORAGE)
// ==========================================================================

function saveState() {
  try {
    localStorage.setItem("ecopulse_state", JSON.stringify(state));
  } catch (e) {
    console.error("Failed to write to localStorage:", e);
  }
}

function loadState() {
  try {
    state.challenges = JSON.parse(JSON.stringify(DEFAULT_CHALLENGES));

    const raw = localStorage.getItem("ecopulse_state");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed) {
        state.inputs = { ...state.inputs, ...parsed.inputs };
        state.emissions = { ...state.emissions, ...parsed.emissions };
        state.xp = parsed.xp || 0;
        state.streak = parsed.streak || 0;
        state.lastLogDate = parsed.lastLogDate || null;
        state.co2Prevented = parsed.co2Prevented || 0;
        state.unlockedBadges = parsed.unlockedBadges || [];
        state.history = parsed.history || [];
        
        if (parsed.challenges) {
          parsed.challenges.forEach(pc => {
            const matching = state.challenges.find(c => c.id === pc.id);
            if (matching) {
              matching.completed = pc.completed;
            } else if (pc.id && pc.id.startsWith("custom_")) {
              state.challenges.push(pc);
            }
          });
        }
      }
    } else {
      generateDummyHistory();
    }
  } catch (e) {
    console.error("Error loading EcoPulse state from localStorage", e);
    generateDummyHistory();
  }
}

function generateDummyHistory() {
  const today = new Date();
  const dummy = [];
  const initialEmissions = [12.4, 12.1, 11.5, 11.5, 10.8, 10.3];
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i - 1);
    const dateStr = date.toISOString().split('T')[0];
    dummy.push({
      date: dateStr,
      total: initialEmissions[5 - i]
    });
  }
  state.history = dummy;
}

// ==========================================================================
// CUSTOM UI COMPONENTS (TOASTS & MODALS via safe DOM methods)
// ==========================================================================

function showToast(message) {
  const existing = document.querySelectorAll(".toast");
  existing.forEach(t => t.remove());

  const toast = createElement("div", "toast");
  toast.style.position = "fixed";
  toast.style.bottom = "24px";
  toast.style.right = "24px";
  toast.style.background = "hsla(var(--bg-card), 0.95)";
  toast.style.color = "hsl(var(--text-primary))";
  toast.style.padding = "var(--space-md) var(--space-lg)";
  toast.style.borderRadius = "var(--radius-sm)";
  toast.style.border = "1px solid hsl(var(--accent-mint))";
  toast.style.boxShadow = "var(--shadow-lg)";
  toast.style.zIndex = "10000";
  toast.style.fontSize = "0.9rem";
  toast.style.fontWeight = "600";
  toast.style.backdropFilter = "blur(10px)";
  toast.style.animation = "fadeIn 0.3s ease-out";
  
  const icon = createIcon("fa-bell");
  icon.className = "fa-solid fa-bell text-accent-mint";
  icon.style.marginRight = "8px";
  
  toast.appendChild(icon);
  toast.appendChild(document.createTextNode(message));
  
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "fadeOut 0.3s ease-out forwards";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function showAchievementModal(badge) {
  const overlay = createElement("div", "modal-overlay");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(11, 15, 20, 0.8)";
  overlay.style.backdropFilter = "blur(8px)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "11000";
  overlay.style.animation = "fadeIn 0.3s ease-out";

  const modal = createElement("div", "card");
  modal.style.maxWidth = "400px";
  modal.style.width = "90%";
  modal.style.padding = "var(--space-xl)";
  modal.style.textAlign = "center";
  modal.style.background = "linear-gradient(135deg, hsla(var(--bg-card), 0.95), hsla(var(--border-color), 0.3))";
  modal.style.border = "1px solid hsl(var(--accent-yellow))";
  modal.style.boxShadow = "0 0 30px hsla(var(--accent-yellow), 0.3)";

  const iconDiv = createElement("div");
  iconDiv.style.fontSize = "4rem";
  iconDiv.style.color = "hsl(var(--accent-yellow))";
  iconDiv.style.marginBottom = "var(--space-md)";
  iconDiv.style.animation = "pulse-badge 2s infinite";
  
  const badgeIcon = createIcon(badge.icon);
  iconDiv.appendChild(badgeIcon);

  const title = createElement("h2", "", "Achievement Unlocked!");
  title.style.fontFamily = "var(--font-heading)";
  title.style.fontSize = "1.75rem";
  title.style.color = "hsl(var(--text-primary))";
  title.style.marginBottom = "var(--space-xs)";

  const subtitle = createElement("h3", "", badge.name);
  subtitle.style.fontFamily = "var(--font-heading)";
  subtitle.style.color = "hsl(var(--accent-yellow))";
  subtitle.style.fontSize = "1.25rem";
  subtitle.style.marginBottom = "var(--space-md)";

  const desc = createElement("p", "", badge.desc);
  desc.style.fontSize = "0.9rem";
  desc.style.color = "hsl(var(--text-secondary))";
  desc.style.marginBottom = "var(--space-lg)";

  const btn = createElement("button", "btn-primary", "Awesome!");
  btn.type = "button";
  btn.style.margin = "0 auto";
  btn.style.maxWidth = "150px";
  btn.style.background = "hsl(var(--accent-yellow))";
  btn.style.boxShadow = "0 4px 15px hsla(var(--accent-yellow), 0.25)";
  
  btn.addEventListener("click", () => overlay.remove());

  modal.appendChild(iconDiv);
  modal.appendChild(title);
  modal.appendChild(subtitle);
  modal.appendChild(desc);
  modal.appendChild(btn);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes fadeOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(8px); }
  }
`;
document.head.appendChild(styleSheet);

// ==========================================================================
// TEST SUITE FOR CALCULATIONS & STATE (RUN IN CONSOLE VIA runCalculationsTests())
// ==========================================================================
window.runCalculationsTests = function() {
  console.log("%c=== STARTING ECOPULSE TEST SUITE ===", "font-weight: bold; font-size: 1.1rem; color: hsl(190, 90%, 50%);");
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`%c[PASS] ${message}`, "color: #10b981; font-weight: bold;");
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    const originalInputs = JSON.parse(JSON.stringify(state.inputs));

    // Test 1: Baseline Transport Calculation (Petrol, no public transit/flights)
    state.inputs.car_distance = 100;
    state.inputs.vehicle_type = 1;
    state.inputs.public_transit = 0;
    state.inputs.flights = 0;
    state.inputs.electricity = 0;
    state.inputs.gas_heating = 0;
    state.inputs.diet_type = 5;
    state.inputs.food_waste = 2;
    state.inputs.trash_bags = 0;

    calculateEmissions(false);
    assert(state.emissions.transport === 2.08, `Transport emission correct: expected 2.08t, got ${state.emissions.transport}t`);
    assert(state.emissions.food === 0.90, `Food emission correct (Vegan): expected 0.9t, got ${state.emissions.food}t`);
    assert(state.emissions.total === 2.98, `Total carbon footprint calculation correct: expected 2.98t, got ${state.emissions.total}t`);

    // Test 2: Clean Energy Deduction (100% clean should reduce electricity emissions to 0)
    state.inputs.electricity = 100;
    state.inputs.clean_energy = 100;
    calculateEmissions(false);
    assert(state.emissions.energy === 0.0, `100% clean energy sets electricity emissions to 0: got ${state.emissions.energy}t`);

    // Test 3: Log Streak Logic
    state.lastLogDate = null;
    state.streak = 0;
    updateLogStreak("2026-06-15");
    assert(state.streak === 1, `First log sets streak to 1: got ${state.streak}`);
    updateLogStreak("2026-06-16");
    assert(state.streak === 2, `Consecutive day increments streak: got ${state.streak}`);
    updateLogStreak("2026-06-18");
    assert(state.streak === 1, `Broken streak (skipped 17th) resets to 1: got ${state.streak}`);

    state.inputs = originalInputs;
    calculateEmissions(false);
    console.log(`%c=== ECOPULSE TEST SUITE COMPLETE: ${passed} passed, ${failed} failed ===`, "font-weight: bold; color: hsl(162, 84%, 40%);");
  } catch (error) {
    console.error("Test Suite execution crashed:", error);
  }
};
