/* ==========================================================================
   ECOPULSE CARBON DASHBOARD - CONTROLLER
   ========================================================================== */

// 1. CONSTANTS & EMISSION FACTORS (kg CO2e per unit)
const FACTORS = {
  // Transport
  CAR_FUEL: {
    1: 0.40, // Petrol / Diesel (average)
    2: 0.22, // Hybrid
    3: 0.10, // Electric (average grid charging)
    4: 0.00  // No Car / Public transit only
  },
  PUBLIC_TRANSIT: 0.08, // per mile
  FLIGHT: 900.0,       // per round-trip flight (average short/long haul mix)

  // Energy
  ELECTRICITY_RATE: 0.15, // Cost per kWh ($)
  ELECTRICITY_CO2: 0.40,  // kg CO2 per kWh
  GAS_RATE: 1.00,         // Cost per therm ($)
  GAS_CO2: 5.30,          // kg CO2 per therm

  // Waste
  TRASH_BAG: 150.0, // kg CO2 per bag per year
  RECYCLE_MULT: {
    1: 1.20, // Recycle nothing
    2: 1.00, // Average recycling
    3: 0.60  // Advanced recycling + composting
  }
};

// Diet values (Tons CO2e per year directly)
const DIET_FACTORS = {
  1: 3.3, // Heavy Meat
  2: 2.5, // Average Meat
  3: 1.7, // Low Meat/Fish
  4: 1.4, // Vegetarian
  5: 0.9  // Vegan
};

const FOOD_WASTE_FACTORS = {
  1: 0.9, // Very Low
  2: 1.0, // Average
  3: 1.2  // High
};

// 2. DEFAULT CHALLENGES LIST
const DEFAULT_CHALLENGES = [
  {
    id: "meatless_monday",
    title: "Meatless Mondays",
    description: "Eat entirely plant-based meals every Monday for a month.",
    category: "diet",
    impact: 120, // kg CO2 saved per year
    xp: 150,
    completed: false
  },
  {
    id: "cycle_commute",
    title: "Bike or Walk to Work",
    description: "Replace 15 miles of driving with cycling or walking this week.",
    category: "transport",
    impact: 310,
    xp: 250,
    completed: false
  },
  {
    id: "led_upgrade",
    title: "Upgrade to LEDs",
    description: "Replace at least 5 old incandescent bulbs in your home with LEDs.",
    category: "energy",
    impact: 180,
    xp: 200,
    completed: false
  },
  {
    id: "compost_hero",
    title: "Start Composting",
    description: "Set up a compost bin for kitchen scraps to reduce landfill waste.",
    category: "waste",
    impact: 150,
    xp: 180,
    completed: false
  },
  {
    id: "cold_wash",
    title: "Cold Water Laundry",
    description: "Wash all your clothes in cold water instead of hot for 2 weeks.",
    category: "energy",
    impact: 75,
    xp: 100,
    completed: false
  },
  {
    id: "no_single_use",
    title: "Ban Single-Use Plastics",
    description: "Use reusable shopping bags, water bottles, and metal straws.",
    category: "waste",
    impact: 60,
    xp: 120,
    completed: false
  },
  {
    id: "transit_day",
    title: "Public Transit Day",
    description: "Leave the car at home and commute using bus, rail, or subway.",
    category: "transport",
    impact: 80,
    xp: 100,
    completed: false
  },
  {
    id: "unplug_vampires",
    title: "Unplug Standby Devices",
    description: "Unplug chargers, TVs, and appliances when not in use for a week.",
    category: "energy",
    impact: 50,
    xp: 80,
    completed: false
  }
];

// 3. DEFINE BADGES / ACHIEVEMENTS
const BADGES = [
  {
    id: "first_log",
    name: "Green Recruit",
    desc: "Complete your first habits log.",
    req: "Log your baseline habits",
    icon: "fa-seedling"
  },
  {
    id: "low_carbon",
    name: "Carbon Cutter",
    desc: "Achieve annual emissions under 5.0 Tons.",
    req: "Footprint < 5.0 Tons CO2e",
    icon: "fa-leaf"
  },
  {
    id: "xp_milestone_1",
    name: "Eco Guardian",
    desc: "Reach 500 Eco Points (XP).",
    req: "Accumulate 500 XP",
    icon: "fa-shield-halved"
  },
  {
    id: "xp_milestone_2",
    name: "Climate Warrior",
    desc: "Reach 1200 Eco Points (XP).",
    req: "Accumulate 1200 XP",
    icon: "fa-award"
  },
  {
    id: "streak_3",
    name: "Consistency King",
    desc: "Maintain a 3-day logging streak.",
    req: "3-Day habits streak",
    icon: "fa-fire"
  },
  {
    id: "zero_waste_hero",
    name: "Zero Waste Hero",
    desc: "Achieve high recycling rate and low trash output.",
    req: "Trash <= 1 bag & Advanced Recycle",
    icon: "fa-recycle"
  }
];

// 4. APPLICATION STATE
let state = {
  // Current logged inputs
  inputs: {
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
  // Totals calculated (in Metric Tons)
  emissions: {
    transport: 0,
    energy: 0,
    food: 0,
    waste: 0,
    total: 0
  },
  // Gamification & history
  xp: 0,
  streak: 0,
  lastLogDate: null,
  co2Prevented: 0, // kg CO2 saved
  challenges: [...DEFAULT_CHALLENGES],
  history: [], // [{date: 'YYYY-MM-DD', total: X}]
  unlockedBadges: [] // List of badge IDs
};

// ==========================================================================
// INITIALIZATION & EVENT LISTENERS
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  loadState();
  initNavigation();
  initSliders();
  initChallengeFilters();
  
  // Connect Go to Actions link on overview
  document.getElementById("go-to-actions").addEventListener("click", () => {
    switchTab("actions-panel");
  });

  // Connect Save log button
  document.getElementById("btn-save-log").addEventListener("click", saveHabitsLog);

  // Initial Calculation & Render
  calculateEmissions(true); // silent initial load
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

  // Slider Category Tabs
  const calcTabs = document.querySelectorAll(".calc-section-tab");
  calcTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      // Toggle tabs
      calcTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      // Toggle content panels
      const target = tab.getAttribute("data-subtarget");
      document.querySelectorAll(".calc-sub-panel").forEach(panel => {
        panel.classList.remove("active");
      });
      document.getElementById(target).classList.add("active");
    });
  });
}

function switchTab(targetId) {
  // Update header nav buttons
  const tabs = document.querySelectorAll(".nav-tab");
  tabs.forEach(t => {
    if (t.getAttribute("data-target") === targetId) {
      t.classList.add("active");
    } else {
      t.classList.remove("active");
    }
  });

  // Update visible panels
  const panels = document.querySelectorAll(".panel");
  panels.forEach(p => {
    if (p.id === targetId) {
      p.classList.add("active");
    } else {
      p.classList.remove("active");
    }
  });

  // Redraw SVG graphs if switching to dashboard/insights to ensure sizes are correct
  if (targetId === "overview-panel") {
    renderTrendChart();
  }
}

// Sliders Event Handlers
function initSliders() {
  const slidersConfig = [
    { id: "slider-drive-distance", valId: "val-drive-distance", suffix: " miles", key: "car_distance", parse: parseInt },
    { 
      id: "slider-vehicle-type", 
      valId: "val-vehicle-type", 
      key: "vehicle_type", 
      parse: parseInt, 
      format: (val) => {
        const labels = { 1: "Petrol / Diesel", 2: "Hybrid", 3: "Electric (EV)", 4: "No Car / Transit Only" };
        return labels[val];
      } 
    },
    { id: "slider-public-transit", valId: "val-public-transit", suffix: " miles", key: "public_transit", parse: parseInt },
    { id: "slider-flights", valId: "val-flights", suffix: " flights/yr", key: "flights", parse: parseInt },
    
    { id: "slider-electricity", valId: "val-electricity", prefix: "$", key: "electricity", parse: parseInt },
    { id: "slider-clean-energy", valId: "val-clean-energy", suffix: "%", key: "clean_energy", parse: parseInt },
    { id: "slider-gas-heating", valId: "val-gas-heating", prefix: "$", key: "gas_heating", parse: parseInt },
    
    { 
      id: "slider-diet-type", 
      valId: "val-diet-type", 
      key: "diet_type", 
      parse: parseInt, 
      format: (val) => {
        const labels = { 1: "Heavy Meat", 2: "Average Meat", 3: "Low Meat/Fish", 4: "Vegetarian", 5: "Vegan" };
        return labels[val];
      } 
    },
    { 
      id: "slider-waste-food", 
      valId: "val-waste-food", 
      key: "food_waste", 
      parse: parseInt, 
      format: (val) => {
        const labels = { 1: "Very Low", 2: "Average", 3: "High" };
        return labels[val];
      } 
    },
    
    { id: "slider-trash-bags", valId: "val-trash-bags", suffix: " bags/wk", key: "trash_bags", parse: parseInt },
    { 
      id: "slider-recycle-rate", 
      valId: "val-recycle-rate", 
      key: "recycle_rate", 
      parse: parseInt, 
      format: (val) => {
        const labels = { 1: "Recycle Nothing", 2: "Average Recycling", 3: "Compost & Advanced" };
        return labels[val];
      } 
    }
  ];

  // Map state to slider values first
  slidersConfig.forEach(cfg => {
    const el = document.getElementById(cfg.id);
    const valDisplay = document.getElementById(cfg.valId);
    if (!el || !valDisplay) return;

    // Set slider value from state
    el.value = state.inputs[cfg.key];

    // Helper to format values
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

    // Live update listeners
    el.addEventListener("input", (e) => {
      const parsedVal = cfg.parse(e.target.value);
      state.inputs[cfg.key] = parsedVal;
      updateDisplay(parsedVal);
      
      // Calculate emissions in real-time for live preview panel
      calculateEmissions(false); // don't save to database history on every drag
      renderLiveEstimator();
    });
  });
}

function initChallengeFilters() {
  const buttons = document.querySelectorAll(".filter-btn");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      const category = btn.getAttribute("data-filter");
      renderChallenges(category);
    });
  });
}

// ==========================================================================
// CALCULATIONS & CORE ENGINE
// ==========================================================================

function calculateEmissions(saveToHistory = false) {
  const inputs = state.inputs;

  // 1. TRANSPORT CALCULATION
  const carFactor = FACTORS.CAR_FUEL[inputs.vehicle_type];
  const annualCarEmissions = inputs.car_distance * 52 * carFactor; // kg
  const annualTransitEmissions = inputs.public_transit * 52 * FACTORS.PUBLIC_TRANSIT; // kg
  const annualFlightEmissions = inputs.flights * FACTORS.FLIGHT; // kg
  const transportTons = (annualCarEmissions + annualTransitEmissions + annualFlightEmissions) / 1000;

  // 2. HOME ENERGY CALCULATION
  // Electricity
  const annualElectricityKWh = (inputs.electricity / FACTORS.ELECTRICITY_RATE) * 12;
  const cleanEnergyDeduction = inputs.clean_energy / 100.0;
  const electricityTons = (annualElectricityKWh * (1 - cleanEnergyDeduction) * FACTORS.ELECTRICITY_CO2) / 1000;
  
  // Gas
  const annualGasTherms = (inputs.gas_heating / FACTORS.GAS_RATE) * 12;
  const gasTons = (annualGasTherms * FACTORS.GAS_CO2) / 1000;

  const energyTons = electricityTons + gasTons;

  // 3. DIET CALCULATION
  const baseDietTons = DIET_FACTORS[inputs.diet_type];
  const wasteMult = FOOD_WASTE_FACTORS[inputs.food_waste];
  const foodTons = baseDietTons * wasteMult;

  // 4. WASTE CALCULATION
  const wasteBagsKg = inputs.trash_bags * FACTORS.TRASH_BAG; // kg/year
  const recycleMult = FACTORS.RECYCLE_MULT[inputs.recycle_rate];
  const wasteTons = (wasteBagsKg * recycleMult) / 1000;

  // Set State Emissions
  state.emissions.transport = parseFloat(transportTons.toFixed(2));
  state.emissions.energy = parseFloat(energyTons.toFixed(2));
  state.emissions.food = parseFloat(foodTons.toFixed(2));
  state.emissions.waste = parseFloat(wasteTons.toFixed(2));
  state.emissions.total = parseFloat((transportTons + energyTons + foodTons + wasteTons).toFixed(2));
}

// ==========================================================================
// RENDER METHODS
// ==========================================================================

function renderDashboard() {
  // 1. Update Header Badges
  document.getElementById("streak-count").textContent = state.streak;
  document.getElementById("xp-count").textContent = state.xp;

  // 2. Update Main Overview Values
  document.getElementById("footprint-value").textContent = state.emissions.total.toFixed(1);
  
  // Circular Progress offset calculation
  const circle = document.getElementById("footprint-circle-progress");
  const maxVal = 16.0; // typical high emission average
  const progressPercent = Math.min(state.emissions.total / maxVal, 1.0);
  const strokeDashoffset = 628 - (628 * progressPercent);
  circle.style.strokeDashoffset = strokeDashoffset;

  // Adjust Progress color based on emission ranges
  const ratingBadge = document.getElementById("footprint-rating");
  ratingBadge.className = "metric-rating-badge";
  if (state.emissions.total <= 4.0) {
    ratingBadge.textContent = "Eco Friendly";
    ratingBadge.classList.add("rating-low");
  } else if (state.emissions.total <= 10.0) {
    ratingBadge.textContent = "Moderate";
    ratingBadge.classList.add("rating-medium");
  } else {
    ratingBadge.textContent = "High Footprint";
    ratingBadge.classList.add("rating-high");
  }

  // Mini summary values
  document.getElementById("mini-val-transport").textContent = `${state.emissions.transport.toFixed(1)} t`;
  document.getElementById("mini-val-energy").textContent = `${state.emissions.energy.toFixed(1)} t`;
  document.getElementById("mini-val-food").textContent = `${state.emissions.food.toFixed(1)} t`;
  document.getElementById("mini-val-waste").textContent = `${state.emissions.waste.toFixed(1)} t`;

  // 3. Render Live Estimator in Calculator Tab
  renderLiveEstimator();

  // 4. Render Action Tab
  renderChallenges("all");
  renderBadges();
  document.getElementById("stats-co2-prevented").textContent = `${state.co2Prevented.toFixed(1)} kg`;
  document.getElementById("stats-equivalent-trees").textContent = (state.co2Prevented / 22.0).toFixed(1);

  // 5. Render Trends Graph
  renderTrendChart();

  // 6. Render Insights
  renderInsights();

  // 7. Render Daily Quests
  renderDailyQuests();
}

function renderLiveEstimator() {
  document.getElementById("calc-live-total").textContent = state.emissions.total.toFixed(2);
  document.getElementById("calc-breakdown-transport").textContent = `${state.emissions.transport.toFixed(2)} t`;
  document.getElementById("calc-breakdown-energy").textContent = `${state.emissions.energy.toFixed(2)} t`;
  document.getElementById("calc-breakdown-food").textContent = `${state.emissions.food.toFixed(2)} t`;
  document.getElementById("calc-breakdown-waste").textContent = `${state.emissions.waste.toFixed(2)} t`;
  document.getElementById("calc-breakdown-total").textContent = `${state.emissions.total.toFixed(2)} t`;

  // Emoji update in Live Estimator
  const emojiWrap = document.getElementById("estimator-emoji");
  if (state.emissions.total <= 4.0) {
    emojiWrap.innerHTML = '<i class="fa-solid fa-tree" style="color: hsl(152, 69%, 43%);"></i>';
  } else if (state.emissions.total <= 10.0) {
    emojiWrap.innerHTML = '<i class="fa-solid fa-cloud-sun" style="color: hsl(42, 100%, 53%);"></i>';
  } else {
    emojiWrap.innerHTML = '<i class="fa-solid fa-cloud-showers-water" style="color: hsl(350, 80%, 55%);"></i>';
  }
}

// Render dynamic challenges list
function renderChallenges(categoryFilter = "all") {
  const container = document.getElementById("challenges-grid-container");
  if (!container) return;
  container.innerHTML = "";

  const filtered = state.challenges.filter(c => {
    return categoryFilter === "all" || c.category === categoryFilter;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: hsl(var(--text-muted)); padding: var(--space-lg) 0;">No active challenges found for this category.</p>`;
    return;
  }

  filtered.forEach(c => {
    const card = document.createElement("div");
    card.className = "card challenge-card";
    
    // Category specific icons
    const icons = { transport: "fa-car", energy: "fa-bolt", diet: "fa-utensils", waste: "fa-trash-can" };
    const icon = icons[c.category] || "fa-leaf";

    card.innerHTML = `
      <div class="challenge-header">
        <span class="challenge-badge-eco"><i class="fa-solid ${icon}"></i> ${c.category}</span>
        <span class="challenge-impact-badge" title="Carbon savings per year"><i class="fa-solid fa-cloud-arrow-down"></i> -${c.impact} kg CO₂/yr</span>
      </div>
      <h3 style="margin-bottom: var(--space-xs); font-size: 1.1rem;">${c.title}</h3>
      <p class="challenge-description">${c.description}</p>
      <div class="challenge-footer">
        <span class="challenge-reward"><i class="fa-solid fa-star"></i> +${c.xp} XP</span>
        <button class="btn-action ${c.completed ? 'completed' : ''}" onclick="completeChallenge('${c.id}')" ${c.completed ? 'disabled' : ''}>
          ${c.completed ? '<i class="fa-solid fa-circle-check"></i> Completed' : '<i class="fa-solid fa-circle-check"></i> Log Action'}
        </button>
      </div>
    `;
    
    container.appendChild(card);
  });
}

// Render Badges panel
function renderBadges() {
  const container = document.getElementById("badges-grid-container");
  if (!container) return;
  container.innerHTML = "";

  BADGES.forEach(badge => {
    const isUnlocked = state.unlockedBadges.includes(badge.id);
    const badgeItem = document.createElement("div");
    badgeItem.className = `badge-item ${isUnlocked ? 'unlocked' : ''}`;
    badgeItem.title = `${badge.desc} (${badge.req})`;

    badgeItem.innerHTML = `
      <div class="badge-icon-wrap">
        <i class="fa-solid ${badge.icon}"></i>
      </div>
      <div class="badge-name">${badge.name}</div>
      <div class="badge-requirement">${isUnlocked ? 'Unlocked!' : badge.req}</div>
    `;

    container.appendChild(badgeItem);
  });
}

// Render personalized insights
function renderInsights() {
  // Update Benchmark Comparison Numbers
  document.getElementById("compare-user-val").textContent = `${state.emissions.total.toFixed(1)} Tons`;
  
  // Calculate relative bar widths
  const maxBenchmarkVal = 20.0;
  const userWidth = Math.min((state.emissions.total / maxBenchmarkVal) * 100, 100);
  document.getElementById("compare-user-bar").style.width = `${userWidth}%`;

  const container = document.getElementById("insights-container");
  if (!container) return;
  container.innerHTML = "";

  // Identify highest emission category
  const ems = state.emissions;
  const categories = [
    { name: "transport", val: ems.transport, icon: "fa-car", label: "Transportation" },
    { name: "energy", val: ems.energy, icon: "fa-bolt", label: "Home Energy" },
    { name: "food", val: ems.food, icon: "fa-utensils", label: "Diet & Food" },
    { name: "waste", val: ems.waste, icon: "fa-trash-can", label: "Trash & Recycling" }
  ];

  // Sort descending
  categories.sort((a, b) => b.val - a.val);
  const highest = categories[0];

  // Generate dynamic recommendation cards
  let recommendations = [];

  if (highest.name === "transport") {
    recommendations = [
      {
        type: "warning",
        headline: `High Transportation Footprint (${highest.val} t)`,
        desc: "Transport constitutes your largest emission source. Commuting and flights are heavy carbon contributors."
      },
      {
        type: "reduction",
        headline: "Swap 15 miles of driving weekly",
        desc: "Replacing 15 miles of solo driving with public transit, bicycling, or walking saves about 312 kg of CO2e annually."
      },
      {
        type: "reduction",
        headline: "Switch to Electric or Hybrid",
        desc: "Upgrading from standard petrol to a hybrid or electric vehicle cuts transit-related emissions by 45% to 75% immediately."
      }
    ];
  } else if (highest.name === "energy") {
    recommendations = [
      {
        type: "warning",
        headline: `High Home Energy Footprint (${highest.val} t)`,
        desc: "Electricity consumption and heating fuel represent your top environmental impact areas."
      },
      {
        type: "reduction",
        headline: "Opt in for Clean Energy",
        desc: "Increase your Clean Energy Share to 100% via solar panels or clean municipal utility tariffs to wipe out electricity emissions."
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

  // Add a generic achievement / helpful tip card as the 4th item
  recommendations.push({
    type: "achievement",
    headline: "Target: 2.0 Tons CO₂e Goal",
    desc: "To align with the Paris Agreement targets, aim for a personal baseline of 2.0 Tons. Focus on your top category first!"
  });

  // Render cards
  recommendations.forEach(rec => {
    const typeClass = `insight-type-${rec.type}`;
    const iconClass = rec.type === 'warning' ? 'fa-triangle-exclamation' : (rec.type === 'reduction' ? 'fa-leaf' : 'fa-circle-check');
    const wrap = document.createElement("div");
    wrap.className = `insight-card ${typeClass}`;
    wrap.innerHTML = `
      <div class="insight-icon-wrap">
        <i class="fa-solid ${iconClass}"></i>
      </div>
      <div class="insight-content">
        <div class="insight-headline">${rec.headline}</div>
        <div class="insight-desc">${rec.desc}</div>
      </div>
    `;
    container.appendChild(wrap);
  });
}

// Render dynamic daily quests sidebar
function renderDailyQuests() {
  const list = document.getElementById("quick-challenges-list");
  if (!list) return;
  list.innerHTML = "";

  // Show incomplete challenges (up to 3) as quick daily quests
  const incomplete = state.challenges.filter(c => !c.completed).slice(0, 3);

  if (incomplete.length === 0) {
    list.innerHTML = `
      <div class="activity-item" style="border: 1px dashed hsla(var(--accent-mint), 0.3); background: hsla(var(--accent-mint), 0.03);">
        <div class="activity-icon-wrap"><i class="fa-solid fa-trophy" style="color: hsl(var(--accent-yellow));"></i></div>
        <div class="activity-details">
          <div class="activity-name">All Quests Complete!</div>
          <div class="activity-sub">Amazing job today. Keep living sustainably!</div>
        </div>
      </div>
    `;
    return;
  }

  incomplete.forEach(c => {
    const item = document.createElement("div");
    item.className = "activity-item";
    item.style.cursor = "pointer";
    item.title = "Click to log action immediately";
    item.addEventListener("click", () => completeChallenge(c.id));

    // Category icon mapping
    const icons = { transport: "fa-car", energy: "fa-bolt", diet: "fa-utensils", waste: "fa-trash-can" };
    const icon = icons[c.category] || "fa-leaf";

    item.innerHTML = `
      <div class="activity-icon-wrap"><i class="fa-solid ${icon}"></i></div>
      <div class="activity-details">
        <div class="activity-name">${c.title}</div>
        <div class="activity-sub">${c.description.substring(0, 48)}...</div>
      </div>
      <div class="activity-xp">+${c.xp} XP</div>
    `;
    list.appendChild(item);
  });
}

// ==========================================================================
// DYNAMIC SVG CHART RENDERING (Bar Chart)
// ==========================================================================

function renderTrendChart() {
  const svg = document.getElementById("trend-chart-svg");
  if (!svg) return;

  // Clear previous elements (keep defs)
  const children = Array.from(svg.children);
  children.forEach(child => {
    if (child.tagName !== 'defs') {
      svg.removeChild(child);
    }
  });

  const history = state.history;
  if (!history || history.length === 0) {
    // If no history, let's render standard empty state message or a placeholder
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

  // Graph Layout Dimensions
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;
  const width = 400;
  const height = 240;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Calculate scales
  const maxVal = Math.max(...history.map(d => d.total), 10.0);
  const minVal = 0;

  // Render Horizontal Gridlines & Y-Axis Labels
  const gridLinesCount = 4;
  for (let i = 0; i <= gridLinesCount; i++) {
    const yVal = minVal + ((maxVal - minVal) / gridLinesCount) * i;
    const yPos = height - paddingBottom - (yVal / maxVal) * chartHeight;

    // Line
    if (i > 0 && i < gridLinesCount) {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", paddingLeft);
      line.setAttribute("y1", yPos);
      line.setAttribute("x2", width - paddingRight);
      line.setAttribute("y2", yPos);
      line.setAttribute("class", "chart-grid-line");
      svg.appendChild(line);
    }

    // Label
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", paddingLeft - 8);
    text.setAttribute("y", yPos + 4);
    text.setAttribute("text-anchor", "end");
    text.setAttribute("class", "chart-label");
    text.textContent = `${yVal.toFixed(1)}`;
    svg.appendChild(text);
  }

  // Draw Bottom X-Axis Line
  const xAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
  xAxis.setAttribute("x1", paddingLeft);
  xAxis.setAttribute("y1", height - paddingBottom);
  xAxis.setAttribute("x2", width - paddingRight);
  xAxis.setAttribute("y2", height - paddingBottom);
  xAxis.setAttribute("class", "chart-axis-line");
  svg.appendChild(xAxis);

  // Render Bars
  const barWidth = Math.max(chartWidth / history.length - 12, 10);
  const space = (chartWidth - barWidth * history.length) / (history.length - 1);

  history.forEach((data, index) => {
    const xPos = paddingLeft + index * (barWidth + space);
    const yVal = data.total;
    const barHeight = (yVal / maxVal) * chartHeight;
    const yPos = height - paddingBottom - barHeight;

    // Bar rectangle
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", xPos);
    rect.setAttribute("y", yPos);
    rect.setAttribute("width", barWidth);
    rect.setAttribute("height", Math.max(barHeight, 2)); // min 2px height
    rect.setAttribute("class", "bar-rect");
    
    // Smooth initial animation triggers via inline CSS
    rect.style.transformOrigin = `0px ${height - paddingBottom}px`;
    
    svg.appendChild(rect);

    // Hover tooltip/overlay label
    const titleText = document.createElementNS("http://www.w3.org/2000/svg", "title");
    titleText.textContent = `${data.date}: ${yVal.toFixed(2)} Tons CO2e`;
    rect.appendChild(titleText);

    // Date Label on X Axis
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", xPos + barWidth / 2);
    label.setAttribute("y", height - paddingBottom + 18);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("class", "chart-label");
    
    // Format Date (e.g. "Jun 16")
    const parts = data.date.split('-');
    const labelStr = parts.length === 3 ? `${getMonthAbbrev(parseInt(parts[1]))} ${parts[2]}` : data.date;
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

// Log carbon calculator values
function saveHabitsLog() {
  // Recalculate and push to history
  calculateEmissions(true);

  const todayStr = new Date().toISOString().split('T')[0];
  
  // Update History array
  const existingIndex = state.history.findIndex(h => h.date === todayStr);
  if (existingIndex !== -1) {
    state.history[existingIndex].total = state.emissions.total;
  } else {
    // Keep max 7 history points
    if (state.history.length >= 7) {
      state.history.shift();
    }
    state.history.push({
      date: todayStr,
      total: state.emissions.total
    });
  }

  // Calculate Streak
  updateLogStreak(todayStr);

  // Rewards: baseline first log reward
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
  
  // Transition back to overview panel to view progress
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
      state.streak = 1; // reset streak if gap > 1 day
    }
    // streak remains same if logged multiple times same day
  }
  state.lastLogDate = todayStr;
}

// Complete a carbon reduction challenge
function completeChallenge(challengeId) {
  const challenge = state.challenges.find(c => c.id === challengeId);
  if (!challenge || challenge.completed) return;

  challenge.completed = true;
  
  // Apply Gamification
  state.xp += challenge.xp;
  state.co2Prevented += challenge.impact;

  showToast(`Action Completed: "${challenge.title}"! Earned +${challenge.xp} XP & saved ${challenge.impact} kg CO₂!`);
  
  checkBadges();
  saveState();
  renderDashboard();
}

// Check and unlock badges
function checkBadges() {
  const newlyUnlocked = [];

  // 1. First Log
  if (state.history.length >= 1 && !state.unlockedBadges.includes("first_log")) {
    newlyUnlocked.push("first_log");
  }
  
  // 2. Carbon Cutter
  if (state.emissions.total > 0 && state.emissions.total < 5.0 && !state.unlockedBadges.includes("low_carbon")) {
    newlyUnlocked.push("low_carbon");
  }

  // 3. XP Milestones
  if (state.xp >= 500 && !state.unlockedBadges.includes("xp_milestone_1")) {
    newlyUnlocked.push("xp_milestone_1");
  }
  if (state.xp >= 1200 && !state.unlockedBadges.includes("xp_milestone_2")) {
    newlyUnlocked.push("xp_milestone_2");
  }

  // 4. Streak
  if (state.streak >= 3 && !state.unlockedBadges.includes("streak_3")) {
    newlyUnlocked.push("streak_3");
  }

  // 5. Zero Waste
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

// ==========================================================================
// STATE DATA MANAGEMENT (LOCAL STORAGE)
// ==========================================================================

function saveState() {
  localStorage.setItem("ecopulse_state", JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem("ecopulse_state");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      
      // Merge properties safely
      state.inputs = { ...state.inputs, ...parsed.inputs };
      state.emissions = { ...state.emissions, ...parsed.emissions };
      state.xp = parsed.xp || 0;
      state.streak = parsed.streak || 0;
      state.lastLogDate = parsed.lastLogDate || null;
      state.co2Prevented = parsed.co2Prevented || 0;
      state.unlockedBadges = parsed.unlockedBadges || [];
      state.history = parsed.history || [];
      
      // Merge challenges status
      if (parsed.challenges) {
        parsed.challenges.forEach(pc => {
          const matching = state.challenges.find(c => c.id === pc.id);
          if (matching) {
            matching.completed = pc.completed;
          }
        });
      }
    } catch (e) {
      console.error("Error parsing stored EcoPulse state", e);
    }
  } else {
    // Generate dummy weekly history so graph isn't blank on start
    generateDummyHistory();
  }
}

function generateDummyHistory() {
  const today = new Date();
  const dummy = [];
  
  // Standard footprints slightly descending as if user is improving
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
// CUSTOM UI COMPONENTS (TOASTS & MODALS)
// ==========================================================================

function showToast(message) {
  // Remove existing toasts
  const existing = document.querySelectorAll(".toast");
  existing.forEach(t => t.remove());

  const toast = document.createElement("div");
  toast.className = "toast";
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
  
  toast.innerHTML = `<i class="fa-solid fa-bell text-accent-mint" style="margin-right: 8px;"></i> ${message}`;
  
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "fadeOut 0.3s ease-out forwards";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function showAchievementModal(badge) {
  // Overlay
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
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

  // Modal Card
  const modal = document.createElement("div");
  modal.className = "card";
  modal.style.maxWidth = "400px";
  modal.style.width = "90%";
  modal.style.padding = "var(--space-xl)";
  modal.style.textAlign = "center";
  modal.style.background = "linear-gradient(135deg, hsla(var(--bg-card), 0.95), hsla(var(--border-color), 0.3))";
  modal.style.border = "1px solid hsl(var(--accent-yellow))";
  modal.style.boxShadow = "0 0 30px hsla(var(--accent-yellow), 0.3)";

  modal.innerHTML = `
    <div style="font-size: 4rem; color: hsl(var(--accent-yellow)); margin-bottom: var(--space-md); animation: pulse-badge 2s infinite;">
      <i class="fa-solid ${badge.icon}"></i>
    </div>
    <h2 style="font-family: var(--font-heading); font-size: 1.75rem; color: hsl(var(--text-primary)); margin-bottom: var(--space-xs);">Achievement Unlocked!</h2>
    <h3 style="font-family: var(--font-heading); color: hsl(var(--accent-yellow)); font-size: 1.25rem; margin-bottom: var(--space-md);">${badge.name}</h3>
    <p style="font-size: 0.9rem; color: hsl(var(--text-secondary)); margin-bottom: var(--space-lg);">${badge.desc}</p>
    <button class="btn-primary" style="margin: 0 auto; max-width: 150px; background: hsl(var(--accent-yellow)); box-shadow: 0 4px 15px hsla(var(--accent-yellow), 0.25);" onclick="this.closest('.modal-overlay').remove()">
      Awesome!
    </button>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

// Add simple CSS animation keyframe for fading out
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(8px); }
  }
`;
document.head.appendChild(style);
