const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "game.js"), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createContext(savedState = null) {
  const elements = new Map();
  const listeners = {};
  const storage = new Map();
  if (savedState !== null) {
    storage.set("lilium-wizardry-save-v1", JSON.stringify(savedState));
  }

  function makeClassList() {
    const classes = new Set();
    return {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
      toggle: (name, force) => {
        const shouldAdd = force ?? !classes.has(name);
        if (shouldAdd) classes.add(name);
        else classes.delete(name);
      },
      toString: () => [...classes].join(" "),
    };
  }

  function makeContext2d() {
    const noop = () => {};
    return {
      addColorStop: noop,
      arc: noop,
      beginPath: noop,
      clearRect: noop,
      clip: noop,
      closePath: noop,
      createRadialGradient: () => ({ addColorStop: noop }),
      createLinearGradient: () => ({ addColorStop: noop }),
      drawImage: noop,
      ellipse: noop,
      fill: noop,
      fillRect: noop,
      fillText: noop,
      lineTo: noop,
      moveTo: noop,
      quadraticCurveTo: noop,
      rect: noop,
      restore: noop,
      rotate: noop,
      roundRect: noop,
      save: noop,
      scale: noop,
      stroke: noop,
      strokeRect: noop,
      translate: noop,
    };
  }

  function makeElement(selector) {
    const element = {
      selector,
      tagName: selector.includes("Btn") || selector.startsWith("#") ? "DIV" : "DIV",
      style: {},
      classList: makeClassList(),
      children: [],
      disabled: false,
      textContent: "",
      innerHTML: "",
      width: selector === "#miniMap" ? 192 : 720,
      height: selector === "#miniMap" ? 192 : 460,
      append: (...children) => element.children.push(...children),
      addEventListener: (type, handler) => {
        element[`on${type}`] = handler;
      },
      click: () => element.onclick?.({ preventDefault() {} }),
      focus: () => {},
      blur: () => {
        if (document.activeElement === element) document.activeElement = null;
      },
      getContext: () => makeContext2d(),
    };
    Object.defineProperty(element, "offsetWidth", { get: () => 720 });
    return element;
  }

  const document = {
    activeElement: null,
    querySelector: (selector) => {
      if (!elements.has(selector)) elements.set(selector, makeElement(selector));
      return elements.get(selector);
    },
    createElement: (tagName) => {
      const element = makeElement(tagName);
      element.tagName = tagName.toUpperCase();
      return element;
    },
    addEventListener: (type, handler) => {
      listeners[type] = handler;
    },
  };

  class MockImage {
    constructor() {
      this.complete = true;
      this.naturalWidth = 320;
      this.naturalHeight = 480;
    }
    addEventListener() {}
  }

  const context = {
    console,
    document,
    Image: MockImage,
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
    },
    setTimeout: (handler) => {
      if (typeof handler === "function") handler();
      return 1;
    },
    clearTimeout: () => {},
    window: {},
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(
    `${source}\nObject.assign(globalThis, { __getState: () => state, __tryMove: tryMove, __inspect: inspect, __keyHandler: () => document.__keydown || null });`,
    context,
    { filename: "game.js" },
  );
  document.__keydown = listeners.keydown;
  return { context, document, elements, storage };
}

function run(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

run("old saves are sanitized and do not crash", () => {
  const { context } = createContext({ x: 1, y: 1, keys: 0 });
  const state = context.__getState();
  assert(Array.isArray(state.visited), "visited should be an array");
  assert(Array.isArray(state.opened), "opened should be an array");
  assert(state.keys >= 1, "keys should be migrated to the current baseline");
});

run("old party saves are deeply sanitized", () => {
  const { context } = createContext({
    keys: 99,
    party: [{ name: "Old", hp: "bad" }],
  });
  const state = context.__getState();
  assert(state.keys === 3, "keys should be clamped to 3");
  assert(state.party.length === 4, "party should be restored to four members");
  assert(Number.isFinite(state.party[0].hp), "member hp should be numeric");
  assert(Number.isFinite(state.party[0].maxHp), "member maxHp should be numeric");
  assert(Number.isFinite(state.party[1].atk), "missing members should be filled from base state");
});

run("locked boss gate blocks movement before enough keys", () => {
  const { context } = createContext();
  const state = context.__getState();
  state.x = 9;
  state.y = 9;
  state.dir = 1;
  state.keys = 1;
  context.__tryMove(1, 0);
  assert(state.x === 9 && state.y === 9, "party should not enter the boss gate");
  assert(!state.ended, "game should not end");
});

run("boss gate requires confirmation after enough keys", () => {
  const { context } = createContext();
  const state = context.__getState();
  state.x = 9;
  state.y = 9;
  state.dir = 1;
  state.keys = 3;
  state.bossGateReady = false;
  context.__tryMove(1, 0);
  assert(state.x === 9 && state.y === 9, "first entry should open the gate without moving");
  assert(state.bossGateReady === true, "gate should be armed");
  context.__tryMove(1, 0);
  assert(state.x === 10 && state.y === 9, "second entry should move into the gate");
});

run("revisiting opened treasure is safe and gives no duplicate reward", () => {
  const { context } = createContext();
  const state = context.__getState();
  state.x = 8;
  state.y = 1;
  state.gold = 0;
  state.herbs = 0;
  state.opened.push("8,1");
  context.resolveCell();
  assert(state.gold === 0, "opened treasure should not award more gold");
  assert(state.herbs === 0, "opened treasure should not award more herbs");
});

run("focused button keeps native Space behavior instead of inspect", () => {
  const { context, document, elements } = createContext();
  const message = elements.get("#message").textContent;
  document.activeElement = { tagName: "BUTTON" };
  let prevented = false;
  document.__keydown({ key: " ", preventDefault: () => { prevented = true; } });
  assert(!prevented, "Space on a focused button should not be prevented");
  assert(elements.get("#message").textContent === message, "inspect should not run");
  context;
});

run("safe event resets encounter buildup", () => {
  const { context } = createContext();
  const state = context.__getState();
  state.stepsSinceEncounter = 10;
  state.encounterGrace = 0;
  state.x = 8;
  state.y = 1;
  context.resolveCell();
  context.maybeRandomEncounter();
  assert(state.stepsSinceEncounter === 0, "safe event should reset danger buildup");
  assert(state.encounterGrace >= 2, "safe event should grant grace");
});
