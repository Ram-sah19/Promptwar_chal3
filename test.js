/* ==========================================================================
   ECOPULSE - CLI AUTOMATED TEST RUNNER (NODE.JS)
   ========================================================================== */
const fs = require('fs');
const vm = require('vm');

// Mock browser dependencies for Node.js context
const makeElement = (tag = "div") => ({
  tagName: tag.toUpperCase(),
  className: "",
  textContent: "",
  value: "",
  style: {},
  children: [],
  firstChild: null,
  addEventListener: () => {},
  setAttribute: () => {},
  appendChild: () => {},
  removeChild: () => {},
  classList: {
    add: () => {},
    remove: () => {}
  }
});

const elements = {};
global.window = {};
global.document = {
  addEventListener: () => {},
  querySelectorAll: () => [],
  getElementById: (id) => {
    if (!elements[id]) {
      elements[id] = makeElement();
    }
    return elements[id];
  },
  createElement: (tag) => makeElement(tag),
  createElementNS: (ns, tag) => makeElement(tag),
  createTextNode: (text) => ({ textContent: text, appendChild: () => {} }),
  head: {
    appendChild: () => {}
  },
  body: {
    appendChild: () => {},
    removeChild: () => {}
  }
};

global.localStorage = {
  getItem: () => null,
  setItem: () => {}
};

global.Blob = class {
  constructor(content, options) {
    this.content = content;
    this.options = options;
  }
};

global.URL = {
  createObjectURL: () => "blob:mock-url",
  revokeObjectURL: () => {}
};

// Read and execute controller code
const appCode = fs.readFileSync('app.js', 'utf8');
const context = vm.createContext(global);

try {
  vm.runInContext(appCode, context);
  
  if (typeof context.runCalculationsTests === 'function') {
    console.log("Starting test suite execution...");
    const results = context.runCalculationsTests();
    if (results && results.failed > 0) {
      console.error(`\nFail: ${results.failed} assertions failed in the test suite.`);
      process.exit(1);
    } else {
      console.log("\nAll calculation assertions finished successfully!");
      process.exit(0);
    }
  } else {
    console.error("Fail: runCalculationsTests function not found in app.js scope.");
    process.exit(1);
  }
} catch (error) {
  console.error("Test execution crashed with error:", error);
  process.exit(1);
}
