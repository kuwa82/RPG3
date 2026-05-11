const viewport = document.querySelector("#viewport");
const view = viewport.getContext("2d");
const miniMap = document.querySelector("#miniMap");
const mini = miniMap.getContext("2d");
const enemyCanvas = document.querySelector("#enemySprite");
const enemyArt = enemyCanvas.getContext("2d");
const wallTexture = new Image();
wallTexture.src = "assets/stone-wall-texture.png";
const enemyImages = {};
const eventImages = {};

const ui = {
  place: document.querySelector("#place"),
  message: document.querySelector("#message"),
  livePortrait: document.querySelector("#livePortrait"),
  navigatorLine: document.querySelector("#navigatorLine"),
  partyList: document.querySelector("#partyList"),
  direction: document.querySelector("#direction"),
  gold: document.querySelector("#gold"),
  herbs: document.querySelector("#herbs"),
  keys: document.querySelector("#keys"),
  objective: document.querySelector("#objective"),
  saveBtn: document.querySelector("#saveBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  battle: document.querySelector("#battle"),
  battleTitle: document.querySelector("#battleTitle"),
  battleText: document.querySelector("#battleText"),
  battleStats: document.querySelector("#battleStats"),
  battleActions: document.querySelector("#battleActions"),
  rangeBadge: document.querySelector("#rangeBadge"),
  encounterFlash: document.querySelector("#encounterFlash"),
  moveButtons: {
    forward: document.querySelector("#forward"),
    back: document.querySelector("#back"),
    turnLeft: document.querySelector("#turnLeft"),
    turnRight: document.querySelector("#turnRight"),
    strafeLeft: document.querySelector("#strafeLeft"),
    strafeRight: document.querySelector("#strafeRight"),
    inspect: document.querySelector("#inspect"),
  },
};

const saveKey = "lilium-wizardry-save-v1";
const maxViewDepth = 4;
const directions = ["北", "東", "南", "西"];
const vectors = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

const dungeon = [
  "############",
  "#S..#...T..#",
  "#.#.#.###..#",
  "#.#...#K#..#",
  "#.#####.#.##",
  "#.....#.#..#",
  "###.#.#.##.#",
  "#T#.#...#..#",
  "#.#.###.#.##",
  "#...#H#...B#",
  "#..K#...T..#",
  "############",
];

const fixedEvents = {
  "8,1": { type: "treasure", gold: 34, herbs: 1, text: "古い箱から金貨と薬草を見つけた。" },
  "1,7": { type: "treasure", gold: 55, herbs: 0, text: "罠を避けながら重い小箱を開けた。金貨が鈍く光る。" },
  "9,10": { type: "treasure", gold: 28, herbs: 2, text: "布に包まれた薬草束と金貨が残されていた。" },
  "7,3": { type: "key", text: "星鍵のかけらが青白く震えている。" },
  "3,10": { type: "key", text: "壁の割れ目から星鍵のかけらを引き抜いた。" },
  "5,9": { type: "heal", text: "静かな泉に手を浸す。パーティの傷が癒えた。" },
  "10,9": { type: "boss", text: "三つの星鍵がそろう時、霧の主への扉が開く。" },
};

const enemies = [
  { name: "錆びた鎧", hp: 46, atk: 8, def: 2, exp: 7, gold: 12, sprite: "armor" },
  { name: "霧の僧兵", hp: 38, atk: 7, def: 0, exp: 6, gold: 13, sprite: "monk" },
  { name: "硝子の目", hp: 34, atk: 8, def: 0, exp: 7, gold: 10, sprite: "eye" },
  { name: "地下翼", hp: 30, atk: 6, def: 0, exp: 5, gold: 7, sprite: "wing" },
];

const boss = { name: "霧王アステル", hp: 170, atk: 15, def: 3, exp: 0, gold: 0, sprite: "boss" };

const enemyImageFiles = {
  armor: "assets/enemies/armor.png",
  monk: "assets/enemies/monk.png",
  eye: "assets/enemies/eye.png",
  wing: "assets/enemies/wing.png",
  boss: "assets/enemies/boss.png",
};

const partyPortraits = {
  リリウム: "assets/portraits/lilium.png",
  オルガ: "assets/portraits/olga.png",
  セイ: "assets/portraits/sei.png",
  ミナ: "assets/portraits/mina.png",
};

const eventImageFiles = {
  treasure: "assets/events/treasure.png",
  key: "assets/events/key.png",
  heal: "assets/events/fountain.png",
  boss: "assets/events/gate.png",
};

const baseState = {
  x: 1,
  y: 1,
  dir: 1,
  gold: 40,
  herbs: 2,
  keys: 1,
  visited: ["1,1"],
  opened: [],
  message:
    "星霧地下迷宮。リリウムの灯が壁を舐めるように揺れる。三つの星鍵を集め、最奥の霧王を討て。",
  navigator: "一歩ずつ行きましょう。迷宮は急ぐ人から飲み込みます。",
  ended: false,
  encounterGrace: 5,
  stepsSinceEncounter: 0,
  bossGateReady: false,
  usedFountains: [],
  party: [
    { name: "リリウム", cls: "灯守", level: 1, exp: 0, hp: 34, maxHp: 34, mp: 10, maxMp: 10, atk: 8, def: 2 },
    { name: "オルガ", cls: "戦士", level: 1, exp: 0, hp: 42, maxHp: 42, mp: 0, maxMp: 0, atk: 10, def: 4 },
    { name: "セイ", cls: "盗賊", level: 1, exp: 0, hp: 30, maxHp: 30, mp: 4, maxMp: 4, atk: 7, def: 2 },
    { name: "ミナ", cls: "僧侶", level: 1, exp: 0, hp: 28, maxHp: 28, mp: 14, maxMp: 14, atk: 5, def: 1 },
  ],
};

let state = load() || clone(baseState);
let battle = null;
let lastStepSafe = false;
let selectedBattleAction = 0;
let battleActionButtons = [];

Object.entries(enemyImageFiles).forEach(([key, src]) => {
  enemyImages[key] = new Image();
  enemyImages[key].src = src;
});

Object.entries(eventImageFiles).forEach(([key, src]) => {
  eventImages[key] = new Image();
  eventImages[key].src = src;
});

wallTexture.addEventListener("load", drawView);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function keyOf(x, y) {
  return `${x},${y}`;
}

function cellAt(x, y) {
  return dungeon[y]?.[x] || "#";
}

function isWall(x, y) {
  return cellAt(x, y) === "#";
}

function livingParty() {
  return state.party.filter((member) => member.hp > 0);
}

function setMessage(text, navigator = null, mood = "talking") {
  state.message = text;
  ui.message.textContent = text;
  if (navigator) state.navigator = navigator;
  ui.navigatorLine.textContent = state.navigator;
  setMood(mood);
}

function setMood(mood) {
  ui.livePortrait.className = `live-portrait ${mood}`;
  window.clearTimeout(setMood.timer);
  if (mood === "talking" || mood === "alert") {
    setMood.timer = window.setTimeout(() => {
      ui.livePortrait.className = "live-portrait calm";
    }, 1200);
  }
}

function updateUI() {
  normalizeState();
  revealAround();
  ui.place.textContent = state.ended ? "夜明けの灯台" : "星霧地下迷宮 B1";
  ui.message.textContent = state.message;
  ui.navigatorLine.textContent = state.navigator;
  ui.direction.textContent = directions[state.dir];
  ui.gold.textContent = state.gold;
  ui.herbs.textContent = state.herbs;
  ui.keys.textContent = `${state.keys}/3`;
  ui.objective.textContent = objectiveText();
  ui.rangeBadge.textContent = describeSurroundings();
  ui.partyList.innerHTML = state.party.map(renderMember).join("");
  drawMiniMap();
  drawView();
}

function normalizeState() {
  state.encounterGrace ??= 5;
  state.stepsSinceEncounter ??= 0;
  state.bossGateReady ??= false;
  state.usedFountains = Array.isArray(state.usedFountains) ? state.usedFountains : [];
}

function objectiveText() {
  if (state.ended) return "目的: 地上へ戻る";
  if (state.keys >= 3) return "目的: 霧王の扉へ向かう";
  return `目的: 星鍵をあと${3 - state.keys}つ探す`;
}

function renderMember(member) {
  const hpPct = Math.max(0, (member.hp / member.maxHp) * 100);
  const mpText = member.maxMp ? `MP ${member.mp}/${member.maxMp}` : "MP -";
  const status = member.hp <= 0 ? "戦闘不能" : `HP ${member.hp}/${member.maxHp}`;
  const portrait = partyPortraits[member.name] || partyPortraits.リリウム;
  return `
    <div class="member">
      <img class="member-portrait" src="${portrait}" alt="${member.name}" />
      <div class="member-body">
        <strong><span>${member.name}</span><span>Lv${member.level}</span></strong>
        <small>${member.cls} / ${status} / ${mpText}</small>
        <div class="meter"><span style="width:${hpPct}%"></span></div>
      </div>
    </div>
  `;
}

function drawView() {
  const w = viewport.width;
  const h = viewport.height;

  drawBackdrop(w, h);
  drawPerspectiveDungeon();
  drawHudCompass();
  drawVignette(w, h);
}

function drawBackdrop(w, h) {
  const ceiling = view.createLinearGradient(0, 0, 0, h / 2);
  ceiling.addColorStop(0, "#080d12");
  ceiling.addColorStop(1, "#14202a");
  view.fillStyle = ceiling;
  view.fillRect(0, 0, w, h / 2);

  const floor = view.createLinearGradient(0, h / 2, 0, h);
  floor.addColorStop(0, "#25231e");
  floor.addColorStop(1, "#08090b");
  view.fillStyle = floor;
  view.fillRect(0, h / 2, w, h / 2);

  const haze = view.createRadialGradient(w / 2, h * 0.52, 40, w / 2, h * 0.52, 310);
  haze.addColorStop(0, "rgba(160, 190, 180, 0.16)");
  haze.addColorStop(0.68, "rgba(70, 90, 88, 0.06)");
  haze.addColorStop(1, "rgba(7, 9, 13, 0)");
  view.fillStyle = haze;
  view.fillRect(0, 0, w, h);
}

function drawPerspectiveDungeon() {
  const rects = [
    { l: -90, t: -80, r: 810, b: 540 },
    { l: 92, t: 34, r: 628, b: 426 },
    { l: 184, t: 96, r: 536, b: 364 },
    { l: 260, t: 148, r: 460, b: 312 },
    { l: 314, t: 188, r: 406, b: 272 },
  ];

  const wallDepth = findForwardWallDepth();
  if (wallDepth) drawFrontWall(rects[wallDepth], wallDepth);

  const farthestOpenDepth = wallDepth ? wallDepth - 1 : maxViewDepth;
  for (let depth = farthestOpenDepth; depth >= 1; depth -= 1) {
    const current = cellInView(0, depth);
    drawFloorBand(rects[depth - 1], rects[depth], depth);

    const left = cellInView(-1, depth);
    const right = cellInView(1, depth);
    if (isWall(left.x, left.y)) drawSideWall("left", rects[depth - 1], rects[depth], depth);
    if (isWall(right.x, right.y)) drawSideWall("right", rects[depth - 1], rects[depth], depth);

    drawDistantEvent(current.x, current.y, rects[depth], depth);
  }
  drawDepthGuides(rects, wallDepth);
}

function findForwardWallDepth() {
  for (let depth = 1; depth <= maxViewDepth; depth += 1) {
    const current = cellInView(0, depth);
    if (isWall(current.x, current.y)) return depth;
  }
  return null;
}

function cellInView(offset, depth) {
  const forward = vectors[state.dir];
  const right = vectors[(state.dir + 1) % 4];
  return {
    x: state.x + forward.x * depth + right.x * offset,
    y: state.y + forward.y * depth + right.y * offset,
  };
}

function drawFloorBand(near, far, depth) {
  const floor = view.createLinearGradient(0, far.b, 0, near.b);
  floor.addColorStop(0, `rgba(88, 78, 56, ${0.16 - depth * 0.018})`);
  floor.addColorStop(1, `rgba(154, 132, 78, ${0.24 - depth * 0.02})`);
  view.fillStyle = floor;
  polygon([
    [near.l, near.b],
    [near.r, near.b],
    [far.r, far.b],
    [far.l, far.b],
  ]);
  view.fillStyle = `rgba(16, 25, 32, ${0.44 - depth * 0.055})`;
  polygon([
    [near.l, near.t],
    [far.l, far.t],
    [far.r, far.t],
    [near.r, near.t],
  ]);
  view.strokeStyle = `rgba(237, 199, 102, ${0.08 - depth * 0.01})`;
  view.lineWidth = 1;
  line(near.l, near.b, far.l, far.b);
  line(near.r, near.b, far.r, far.b);
}

function drawFrontWall(rect, depth) {
  const shade = 48 + depth * 18;
  if (wallTexture.complete && wallTexture.naturalWidth) {
    view.drawImage(wallTexture, rect.l, rect.t, rect.r - rect.l, rect.b - rect.t);
    view.fillStyle = `rgba(7, 9, 13, ${0.18 + depth * 0.06})`;
    view.fillRect(rect.l, rect.t, rect.r - rect.l, rect.b - rect.t);
  } else {
    const gradient = view.createLinearGradient(rect.l, rect.t, rect.r, rect.b);
    gradient.addColorStop(0, `rgb(${shade - 12}, ${shade - 2}, ${shade + 10})`);
    gradient.addColorStop(0.52, `rgb(${shade + 18}, ${shade + 28}, ${shade + 36})`);
    gradient.addColorStop(1, `rgb(${shade - 18}, ${shade - 8}, ${shade + 2})`);
    view.fillStyle = gradient;
    view.fillRect(rect.l, rect.t, rect.r - rect.l, rect.b - rect.t);
  }
  drawStoneLines(rect, depth);
  view.strokeStyle = "rgba(244, 241, 232, 0.22)";
  view.lineWidth = Math.max(1, 5 - depth);
  view.strokeRect(rect.l, rect.t, rect.r - rect.l, rect.b - rect.t);
}

function drawSideWall(side, near, far, depth) {
  const points =
    side === "left"
      ? [
          [near.l, near.t],
          [far.l, far.t],
          [far.l, far.b],
          [near.l, near.b],
        ]
      : [
          [near.r, near.t],
          [near.r, near.b],
          [far.r, far.b],
          [far.r, far.t],
        ];
  const shade = side === "left" ? 42 + depth * 14 : 34 + depth * 12;
  if (wallTexture.complete && wallTexture.naturalWidth) {
    fillTexturedPolygon(points, 0.35 + depth * 0.06);
  } else {
    view.fillStyle = `rgb(${shade}, ${shade + 10}, ${shade + 18})`;
    polygon(points);
  }
  view.strokeStyle = "rgba(244, 241, 232, 0.12)";
  view.lineWidth = 2;
  strokePolygon(points);
}

function fillTexturedPolygon(points, darkness) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  view.save();
  view.beginPath();
  view.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => view.lineTo(x, y));
  view.closePath();
  view.clip();
  view.drawImage(wallTexture, minX, minY, maxX - minX, maxY - minY);
  view.fillStyle = `rgba(4, 7, 10, ${darkness + 0.16})`;
  view.fillRect(minX, minY, maxX - minX, maxY - minY);
  view.restore();
}

function drawStoneLines(rect, depth) {
  view.save();
  view.beginPath();
  view.rect(rect.l, rect.t, rect.r - rect.l, rect.b - rect.t);
  view.clip();
  view.strokeStyle = "rgba(7, 9, 13, 0.32)";
  view.lineWidth = Math.max(1, 5 - depth);
  const block = Math.max(18, 62 - depth * 9);
  for (let y = rect.t + block; y < rect.b; y += block) {
    line(rect.l, y, rect.r, y);
  }
  for (let x = rect.l + block; x < rect.r; x += block) {
    line(x, rect.t, x, rect.b);
  }
  view.restore();
}

function drawDistantEvent(x, y, rect, depth) {
  const eventKey = keyOf(x, y);
  const event = fixedEvents[eventKey];
  if (!event || isEventResolved(eventKey, event)) return;
  const cx = (rect.l + rect.r) / 2;
  const base = rect.b - 8;
  const scale = Math.max(0.32, 1.02 - depth * 0.16);
  drawEventProp(event.type, cx, base, scale, depth);
}

function drawEventProp(type, cx, base, scale, depth) {
  const image = eventImages[type];
  if (!image?.complete || !image.naturalWidth) {
    if (type === "treasure") drawChest(cx, base, scale);
    if (type === "key") drawStarKey(cx, base - 36 * scale, scale);
    if (type === "heal") drawFountain(cx, base, scale);
    if (type === "boss") drawGate(cx, base, scale);
    return;
  }
  const targetHeights = {
    treasure: 76,
    key: 112,
    heal: 104,
    boss: 168,
  };
  const height = targetHeights[type] * scale;
  const width = height * (image.naturalWidth / image.naturalHeight);
  const y = type === "key" ? base - height - 18 * scale : base - height;
  view.save();
  view.globalAlpha = Math.max(0.52, 1 - depth * 0.08);
  view.drawImage(image, cx - width / 2, y, width, height);
  const fog = view.createLinearGradient(0, y, 0, base + 8);
  fog.addColorStop(0, "rgba(7, 9, 13, 0)");
  fog.addColorStop(1, `rgba(7, 9, 13, ${0.2 + depth * 0.08})`);
  view.fillStyle = fog;
  view.fillRect(cx - width / 2, y, width, height + 8);
  view.restore();
}

function drawChest(cx, base, scale) {
  view.save();
  view.translate(cx, base);
  view.scale(scale, scale);
  view.fillStyle = "#6a452e";
  view.fillRect(-42, -30, 84, 30);
  view.fillStyle = "#9b6a3f";
  view.beginPath();
  view.roundRect(-42, -54, 84, 34, 8);
  view.fill();
  view.fillStyle = "#edc766";
  view.fillRect(-5, -31, 10, 16);
  view.strokeStyle = "#2b1b14";
  view.lineWidth = 4;
  view.strokeRect(-42, -30, 84, 30);
  view.restore();
}

function drawStarKey(cx, cy, scale) {
  view.save();
  view.translate(cx, cy);
  view.scale(scale, scale);
  view.fillStyle = "rgba(85, 207, 194, 0.22)";
  view.beginPath();
  view.arc(0, 0, 48, 0, Math.PI * 2);
  view.fill();
  view.fillStyle = "#edc766";
  star(0, -8, 7, 32, 14);
  view.fillRect(-5, 18, 10, 44);
  view.fillRect(0, 52, 22, 8);
  view.fillRect(0, 38, 16, 7);
  view.restore();
}

function drawFountain(cx, base, scale) {
  view.save();
  view.translate(cx, base);
  view.scale(scale, scale);
  view.fillStyle = "#71899a";
  view.fillRect(-50, -18, 100, 18);
  view.beginPath();
  view.ellipse(0, -18, 54, 16, 0, 0, Math.PI * 2);
  view.fill();
  view.fillStyle = "rgba(85, 207, 194, 0.76)";
  view.beginPath();
  view.ellipse(0, -22, 42, 10, 0, 0, Math.PI * 2);
  view.fill();
  view.strokeStyle = "rgba(85, 207, 194, 0.8)";
  view.lineWidth = 4;
  line(0, -78, -15, -28);
  line(0, -78, 15, -28);
  view.restore();
}

function drawGate(cx, base, scale) {
  view.save();
  view.translate(cx, base);
  view.scale(scale, scale);
  view.fillStyle = "#251f2e";
  view.beginPath();
  view.roundRect(-58, -118, 116, 118, 10);
  view.fill();
  view.strokeStyle = "#ef6767";
  view.lineWidth = 6;
  view.strokeRect(-48, -104, 96, 104);
  view.fillStyle = "rgba(239, 103, 103, 0.22)";
  view.fillRect(-38, -94, 76, 94);
  view.restore();
}

function drawHudCompass() {
  view.fillStyle = "rgba(7, 9, 13, 0.58)";
  view.fillRect(20, 18, 130, 36);
  view.strokeStyle = "rgba(244, 241, 232, 0.18)";
  view.strokeRect(20, 18, 130, 36);
  view.fillStyle = "#f4f1e8";
  view.font = "700 18px system-ui";
  view.fillText(`向き ${directions[state.dir]}`, 36, 42);
}

function drawDepthGuides(rects, wallDepth) {
  view.save();
  for (let depth = 1; depth <= maxViewDepth; depth += 1) {
    const rect = rects[depth];
    if (!rect || (wallDepth && depth >= wallDepth)) break;
    const alpha = 0.12 - depth * 0.018;
    view.strokeStyle = `rgba(237, 199, 102, ${alpha})`;
    view.lineWidth = 2;
    line(rect.l + 24, rect.b - 4, rect.r - 24, rect.b - 4);
  }
  view.restore();
}

function drawVignette(w, h) {
  view.save();
  const vignette = view.createRadialGradient(w / 2, h / 2, 160, w / 2, h / 2, 470);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(0.72, "rgba(0,0,0,0.18)");
  vignette.addColorStop(1, "rgba(0,0,0,0.62)");
  view.fillStyle = vignette;
  view.fillRect(0, 0, w, h);
  view.restore();
}

function describeFrontDistance() {
  for (let depth = 1; depth <= maxViewDepth; depth += 1) {
    const cell = cellInView(0, depth);
    if (isWall(cell.x, cell.y)) {
      return depth === 1 ? "前方: 目の前に壁" : `前方: ${depth}マス先に壁`;
    }
  }
  return `前方: ${maxViewDepth}マス以上通路`;
}

function describeSurroundings() {
  const left = vectors[(state.dir + 3) % 4];
  const right = vectors[(state.dir + 1) % 4];
  const leftText = isWall(state.x + left.x, state.y + left.y) ? "左:壁" : "左:通路";
  const rightText = isWall(state.x + right.x, state.y + right.y) ? "右:壁" : "右:通路";
  return `${describeFrontDistance()} / ${leftText} / ${rightText} / ${dangerText()}`;
}

function dangerText() {
  normalizeState();
  if (state.encounterGrace > 0) return "霧:薄い";
  if (state.stepsSinceEncounter >= 7) return "霧:濃い";
  if (state.stepsSinceEncounter >= 3) return "霧:揺らぐ";
  return "霧:静か";
}

function polygon(points) {
  view.beginPath();
  view.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => view.lineTo(x, y));
  view.closePath();
  view.fill();
}

function strokePolygon(points) {
  view.beginPath();
  view.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => view.lineTo(x, y));
  view.closePath();
  view.stroke();
}

function line(x1, y1, x2, y2) {
  view.beginPath();
  view.moveTo(x1, y1);
  view.lineTo(x2, y2);
  view.stroke();
}

function star(cx, cy, points, outer, inner) {
  view.beginPath();
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (i * Math.PI) / points;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) view.moveTo(x, y);
    else view.lineTo(x, y);
  }
  view.closePath();
  view.fill();
}

function drawMiniMap() {
  const size = 16;
  mini.clearRect(0, 0, miniMap.width, miniMap.height);
  for (let y = 0; y < dungeon.length; y += 1) {
    for (let x = 0; x < dungeon[y].length; x += 1) {
      const seen = state.visited.includes(keyOf(x, y));
      mini.fillStyle = seen ? (isWall(x, y) ? "#32414d" : "#d0c7a6") : "#0b0f14";
      mini.fillRect(x * size, y * size, size - 1, size - 1);
      const event = fixedEvents[keyOf(x, y)];
      if (seen && event && !isEventResolved(keyOf(x, y), event)) {
        mini.fillStyle = event.type === "boss" ? "#ef6767" : "#edc766";
        mini.fillRect(x * size + 5, y * size + 5, 6, 6);
      }
    }
  }

  mini.save();
  mini.translate(state.x * size + 8, state.y * size + 8);
  mini.rotate((state.dir * Math.PI) / 2);
  mini.fillStyle = "#55cfc2";
  mini.beginPath();
  mini.moveTo(0, -6);
  mini.lineTo(5, 5);
  mini.lineTo(-5, 5);
  mini.closePath();
  mini.fill();
  mini.restore();
}

function revealAround() {
  revealCell(state.x, state.y);
  for (const sideDir of [(state.dir + 3) % 4, (state.dir + 1) % 4]) {
    const side = vectors[sideDir];
    revealCell(state.x + side.x, state.y + side.y);
  }
  for (let depth = 1; depth <= maxViewDepth; depth += 1) {
    const cell = cellInView(0, depth);
    revealCell(cell.x, cell.y);
    if (isWall(cell.x, cell.y)) break;
  }
}

function revealCell(x, y) {
  if (!dungeon[y]?.[x]) return;
  const key = keyOf(x, y);
  if (!state.visited.includes(key)) state.visited.push(key);
}

function frontCell() {
  const vector = vectors[state.dir];
  return { x: state.x + vector.x, y: state.y + vector.y };
}

function moveForward(amount) {
  const vector = vectors[state.dir];
  tryMove(vector.x * amount, vector.y * amount);
}

function strafe(amount) {
  const dir = (state.dir + amount + 4) % 4;
  const vector = vectors[dir];
  tryMove(vector.x, vector.y);
}

function turn(amount) {
  if (battle || state.ended) return;
  state.dir = (state.dir + amount + 4) % 4;
  setMessage(`${directions[state.dir]}を向いた。`, "壁の反響が変わりました。近くに通路があります。", "talking");
  updateUI();
}

function inspect() {
  if (battle) return;
  if (state.ended) {
    setMessage("夜明けの光が迷宮を満たしている。もう霧に怯える必要はない。", "探索は終わりました。灯は地上へ戻ります。", "calm");
    return;
  }

  const hereKey = keyOf(state.x, state.y);
  const hereEvent = fixedEvents[hereKey];
  if (hereEvent) {
    if (isEventResolved(hereKey, hereEvent)) describeResolvedEvent(hereEvent, "足元");
    else describeEvent(hereEvent, "足元");
    return;
  }

  const front = frontCell();
  const frontKey = keyOf(front.x, front.y);
  const frontEvent = fixedEvents[frontKey];
  if (isWall(front.x, front.y)) {
    setMessage("前方の石壁を調べた。古い傷はあるが、隠し扉ではなさそうだ。", "壁の向こうに空洞の反響はありません。", "talking");
    return;
  }
  if (frontEvent) {
    if (frontEvent.type === "boss" && state.keys >= 3 && !state.bossGateReady) {
      state.bossGateReady = true;
      setMessage("三つの星鍵が共鳴し、封印扉の霧が割れた。前進すれば霧王の間へ入る。", "扉は開きました。準備ができたら進みましょう。", "alert");
      save(false);
      return;
    }
    if (isEventResolved(frontKey, frontEvent)) describeResolvedEvent(frontEvent, "前方");
    else describeEvent(frontEvent, "前方");
    return;
  }

  setMessage(`${describeSurroundings()}。床に新しい足跡はない。`, "今のところ罠の気配はありません。進むなら前方です。", "talking");
}

function describeEvent(event, position) {
  const names = {
    treasure: "宝箱",
    key: "星鍵の反応",
    heal: "回復の泉",
    boss: "封印された扉",
  };
  const extra = event.type === "boss" && state.keys < 3 ? "星鍵が足りない。" : "近づけば反応しそうだ。";
  setMessage(`${position}に${names[event.type] || "何か"}がある。${extra}`, "調べました。準備してから踏み込みましょう。", "talking");
}

function describeResolvedEvent(event, position) {
  const text = {
    treasure: "開いた宝箱がある。中身はもう空だ。",
    key: "星鍵を抜き取った跡が淡く光っている。",
    heal: "泉は静かに澄んでいる。大きな癒しの力はもう残っていない。",
    boss: state.keys >= 3 ? "封印扉は開いている。前進すれば決戦だ。" : "封印扉は霧に閉ざされている。",
  }[event.type] || "調査済みの場所だ。";
  setMessage(`${position}に${text}`, "ここは確認済みです。次の反応を探しましょう。", "calm");
}

function isEventResolved(key, event = fixedEvents[key]) {
  if (!event) return false;
  if (event.type === "heal") return state.usedFountains?.includes(key);
  if (event.type === "boss") return state.ended;
  return state.opened.includes(key);
}

function tryMove(dx, dy) {
  if (battle || state.ended) return;
  const nx = state.x + dx;
  const ny = state.y + dy;
  if (isWall(nx, ny)) {
    setMessage("石壁に行く手を阻まれた。", "この壁は崩せません。別の通路を探しましょう。", "alert");
    ui.rangeBadge.textContent = "進行不可: 目の前に壁";
    bumpViewport();
    return;
  }
  const targetEvent = fixedEvents[keyOf(nx, ny)];
  if (targetEvent?.type === "boss" && state.keys < 3) {
    lastStepSafe = true;
    setMessage(targetEvent.text, "星鍵が足りません。この扉はまだ越えられません。", "alert");
    ui.rangeBadge.textContent = "封印扉: 星鍵が足りない";
    bumpViewport();
    return;
  }
  if (targetEvent?.type === "boss" && state.keys >= 3 && !state.bossGateReady) {
    lastStepSafe = true;
    state.bossGateReady = true;
    setMessage("三つの星鍵が共鳴し、封印扉の霧が割れた。もう一度前進すれば霧王の間へ入る。", "扉は開きました。決戦の前に薬草とHPを確認しましょう。", "alert");
    save(false);
    bumpViewport();
    return;
  }
  state.x = nx;
  state.y = ny;
  if (!state.visited.includes(keyOf(nx, ny))) state.visited.push(keyOf(nx, ny));
  resolveCell();
  updateUI();
  maybeRandomEncounter();
}

function bumpViewport() {
  viewport.classList.remove("bump");
  void viewport.offsetWidth;
  viewport.classList.add("bump");
}

function resolveCell() {
  const key = keyOf(state.x, state.y);
  const event = fixedEvents[key];
  if (!event) {
    setMessage("湿った石畳を踏みしめる。遠くで鎖が擦れる音がした。", "足音が少し響きます。広い部屋が近いかもしれません。", "talking");
    return;
  }

  if (event.type === "treasure" && !state.opened.includes(key)) {
    state.gold += event.gold;
    state.herbs += event.herbs;
    state.opened.push(key);
    lastStepSafe = true;
    setMessage(event.text, "宝箱です。罠はありません、たぶん。今は。", "talking");
    save(false);
    return;
  }
  if (event.type === "treasure") {
    lastStepSafe = true;
    setMessage("開いた宝箱がある。中身はもう空だが、進んできた証のように見える。", "ここは調査済みです。別の反応を探しましょう。", "calm");
    return;
  }

  if (event.type === "key" && !state.opened.includes(key)) {
    state.keys += 1;
    state.opened.push(key);
    lastStepSafe = true;
    setMessage(`${event.text} 星鍵 ${state.keys}/3。`, "灯が強くなりました。最奥の封印に近づいています。", "talking");
    save(false);
    return;
  }
  if (event.type === "key") {
    lastStepSafe = true;
    setMessage("星鍵を抜き取った跡が淡く光っている。迷宮の霧は少し薄い。", "ここは回収済みです。残りの星鍵を探しましょう。", "calm");
    return;
  }

  if (event.type === "heal") {
    if (state.usedFountains.includes(key)) {
      lastStepSafe = true;
      setMessage("泉は静かに澄んでいる。大きな癒しの力はもう残っていない。", "ここは使用済みです。薬草を確認して進みましょう。", "calm");
      return;
    }
    state.party.forEach((member) => {
      member.hp = member.maxHp;
      member.mp = member.maxMp;
    });
    state.usedFountains.push(key);
    lastStepSafe = true;
    setMessage(event.text, "ここは安全です。息を整えましょう。", "calm");
    save(false);
    return;
  }

  if (event.type === "boss") {
    if (state.keys < 3) {
      lastStepSafe = true;
      setMessage(event.text, "星鍵が足りません。まだ迷宮のどこかに反応があります。", "alert");
      return;
    }
    startBattle(clone(boss), true);
  }
}

function maybeRandomEncounter() {
  normalizeState();
  if (battle || lastStepSafe || state.ended) {
    lastStepSafe = false;
    state.encounterGrace = Math.max(state.encounterGrace, 2);
    state.stepsSinceEncounter = 0;
    return;
  }
  const event = fixedEvents[keyOf(state.x, state.y)];
  if (event?.type === "boss") return;
  if (state.encounterGrace > 0) {
    state.encounterGrace -= 1;
    return;
  }
  state.stepsSinceEncounter += 1;
  const chance = Math.min(0.24, 0.08 + state.stepsSinceEncounter * 0.015);
  if (Math.random() < chance) {
    state.stepsSinceEncounter = 0;
    state.encounterGrace = 4;
    const enemy = clone(enemies[Math.floor(Math.random() * enemies.length)]);
    startBattle(enemy, false);
  }
}

function startBattle(enemy, isBoss) {
  battle = {
    enemy: { ...enemy, maxHp: enemy.hp },
    isBoss,
    guarded: false,
  };
  selectedBattleAction = 0;
  drawEnemySprite(enemy.sprite);
  ui.battle.classList.remove("hidden");
  ui.encounterFlash.classList.remove("hidden");
  window.setTimeout(() => ui.encounterFlash.classList.add("hidden"), 360);
  setMessage(`${enemy.name}が現れた。`, "前方に敵影。指示をください。", "alert");
  renderBattle(`${enemy.name}が霧の中から現れた。`);
}

function renderBattle(text) {
  ui.battleTitle.textContent = battle.isBoss ? "決戦" : "戦闘";
  ui.battleText.textContent = text;
  const enemyPct = Math.max(0, (battle.enemy.hp / battle.enemy.maxHp) * 100);
  ui.battleStats.innerHTML = `
    <div class="enemy-hp">
      <span>${battle.enemy.name}</span>
      <div class="meter"><span style="width:${enemyPct}%"></span></div>
      <span>${battle.enemy.hp}/${battle.enemy.maxHp}</span>
    </div>
    ${state.party.map(renderBattleMember).join("")}
  `;
  ui.battleActions.innerHTML = "";
  battleActionButtons = [];
  addBattleAction("攻撃", partyAttack);
  addBattleAction("魔法", castSpell, !canCast());
  addBattleAction("防御", guard);
  addBattleAction(`薬草 ${state.herbs}`, useHerb, state.herbs <= 0);
  addBattleAction("逃走", flee, battle.isBoss);
  selectedBattleAction = Math.min(selectedBattleAction, battleActionButtons.length - 1);
  if (battleActionButtons[selectedBattleAction]?.disabled) selectNextEnabled(1);
  updateBattleSelection();
}

function renderBattleMember(member) {
  const pct = Math.max(0, (member.hp / member.maxHp) * 100);
  return `
    <div class="member-line">
      <span>${member.name}</span>
      <div class="meter"><span style="width:${pct}%"></span></div>
      <span>${member.hp}/${member.maxHp}</span>
    </div>
  `;
}

function addBattleAction(label, handler, disabled = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.disabled = disabled;
  button.addEventListener("click", handler);
  ui.battleActions.append(button);
  battleActionButtons.push(button);
}

function updateBattleSelection() {
  battleActionButtons.forEach((button, index) => {
    button.classList.toggle("selected", index === selectedBattleAction);
    if (index === selectedBattleAction && !button.disabled) button.focus({ preventScroll: true });
  });
}

function selectNextEnabled(step) {
  if (!battleActionButtons.length) return;
  for (let i = 0; i < battleActionButtons.length; i += 1) {
    selectedBattleAction = (selectedBattleAction + step + battleActionButtons.length) % battleActionButtons.length;
    if (!battleActionButtons[selectedBattleAction].disabled) break;
  }
  updateBattleSelection();
}

function activateSelectedBattleAction() {
  const button = battleActionButtons[selectedBattleAction];
  if (!button || button.disabled) return;
  button.click();
}

function partyAttack() {
  const logs = [];
  for (const member of livingParty()) {
    const damage = Math.max(1, Math.floor(member.atk + Math.random() * 7 - battle.enemy.def));
    battle.enemy.hp -= damage;
    logs.push(`${member.name}の攻撃 ${damage}`);
    if (battle.enemy.hp <= 0) return winBattle(logs.join(" / "));
  }
  enemyTurn(logs.join(" / "));
}

function canCast() {
  return state.party.some((member) => member.hp > 0 && member.mp >= 4);
}

function castSpell() {
  const caster = state.party.find((member) => member.hp > 0 && member.mp >= 4);
  if (!caster) return;
  caster.mp -= 4;
  const damage = caster.cls === "僧侶" ? 18 + caster.level * 3 : 14 + caster.level * 2;
  battle.enemy.hp -= damage;
  if (battle.enemy.hp <= 0) {
    winBattle(`${caster.name}の星炎が${battle.enemy.name}を焼き払った。`);
    return;
  }
  enemyTurn(`${caster.name}は星炎を放ち、${damage}のダメージ。`);
}

function guard() {
  battle.guarded = true;
  enemyTurn("前衛が盾を構え、後衛が身を低くした。");
}

function useHerb() {
  if (state.herbs <= 0) return;
  const target = state.party.filter((member) => member.hp > 0).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  if (!target) return;
  state.herbs -= 1;
  target.hp = Math.min(target.maxHp, target.hp + 30);
  enemyTurn(`${target.name}に薬草を使った。`);
}

function flee() {
  if (Math.random() < 0.58) {
    battle = null;
    closeBattleOverlay();
    setMessage("パーティは霧の隙間へ逃げ込んだ。", "逃げ切りました。隊列を整えましょう。", "talking");
    updateUI();
  } else {
    enemyTurn("逃走に失敗した。");
  }
}

function enemyTurn(prefix) {
  const alive = livingParty();
  if (!alive.length) return loseBattle(`${prefix} だが、立っている者はもういない。`);

  const target = alive[Math.floor(Math.random() * alive.length)];
  const guardRate = battle.guarded ? 0.55 : 1;
  battle.guarded = false;
  const damage = Math.max(1, Math.floor((battle.enemy.atk + Math.random() * 6 - target.def) * guardRate));
  target.hp = Math.max(0, target.hp - damage);
  const text = `${prefix} / ${battle.enemy.name}の反撃。${target.name}は${damage}のダメージ。`;
  if (!livingParty().length) {
    loseBattle(text);
    return;
  }
  renderBattle(text);
  updateUI();
}

function winBattle(prefix) {
  const defeated = battle.enemy;
  const isBoss = battle.isBoss;
  battle = null;
  closeBattleOverlay();

  if (isBoss) {
    state.ended = true;
    state.message = `霧王アステルは星の鍵束にほどかれ、地下迷宮の天井に夜明けが差した。持ち帰った金貨は${state.gold}枚。`;
    state.navigator = "終わりました。リリウムの灯は、もう誰かを迷わせる霧ではありません。";
    setMood("talking");
    save(false);
    updateUI();
    return;
  }

  state.gold += defeated.gold;
  for (const member of livingParty()) gainExp(member, defeated.exp);
  setMessage(`${prefix} / ${defeated.name}を倒した。金貨${defeated.gold}を得た。`, "勝利です。まだ奥に気配があります。", "talking");
  save(false);
  updateUI();
}

function drawEnemySprite(sprite) {
  const w = enemyCanvas.width;
  const h = enemyCanvas.height;
  enemyArt.clearRect(0, 0, w, h);
  const bg = enemyArt.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#26384a");
  bg.addColorStop(1, "#0b0f14");
  enemyArt.fillStyle = bg;
  enemyArt.fillRect(0, 0, w, h);

  const image = enemyImages[sprite];
  if (image?.complete && image.naturalWidth) {
    drawEnemyImage(image);
    return;
  }

  image?.addEventListener("load", () => drawEnemyImage(image), { once: true });

  enemyArt.save();
  enemyArt.translate(w / 2, h / 2);
  if (sprite === "armor") drawArmorEnemy();
  if (sprite === "monk") drawMonkEnemy();
  if (sprite === "eye") drawEyeEnemy();
  if (sprite === "wing") drawWingEnemy();
  if (sprite === "boss") drawBossEnemy();
  enemyArt.restore();
}

function drawEnemyImage(image) {
  const w = enemyCanvas.width;
  const h = enemyCanvas.height;
  enemyArt.clearRect(0, 0, w, h);
  const scale = Math.min(w / image.naturalWidth, h / image.naturalHeight) * 1.08;
  const dw = image.naturalWidth * scale;
  const dh = image.naturalHeight * scale;
  const dx = (w - dw) / 2;
  const dy = h - dh + 4;
  enemyArt.drawImage(image, dx, dy, dw, dh);
}

function drawArmorEnemy() {
  enemyArt.fillStyle = "#b7c0c9";
  enemyArt.beginPath();
  enemyArt.roundRect(-26, -44, 52, 42, 10);
  enemyArt.fill();
  enemyArt.fillStyle = "#6f7882";
  enemyArt.fillRect(-40, -6, 80, 62);
  enemyArt.fillStyle = "#d7dde3";
  enemyArt.fillRect(-30, 4, 60, 16);
  enemyArt.fillStyle = "#ef6767";
  enemyArt.fillRect(-24, -27, 48, 6);
  enemyArt.strokeStyle = "#1a222b";
  enemyArt.lineWidth = 6;
  enemyArt.strokeRect(-40, -6, 80, 62);
  enemyArt.strokeStyle = "#edc766";
  enemyArt.lineWidth = 5;
  eLine(-48, 18, -70, 58);
  eLine(48, 18, 70, 58);
}

function drawMonkEnemy() {
  enemyArt.fillStyle = "#282338";
  enemyArt.beginPath();
  enemyArt.moveTo(0, -58);
  enemyArt.quadraticCurveTo(48, -18, 34, 60);
  enemyArt.lineTo(-34, 60);
  enemyArt.quadraticCurveTo(-48, -18, 0, -58);
  enemyArt.fill();
  enemyArt.fillStyle = "#f1d8bf";
  enemyArt.beginPath();
  enemyArt.arc(0, -31, 22, 0, Math.PI * 2);
  enemyArt.fill();
  enemyArt.fillStyle = "#111821";
  enemyArt.fillRect(-14, -34, 8, 4);
  enemyArt.fillRect(6, -34, 8, 4);
  enemyArt.strokeStyle = "#55cfc2";
  enemyArt.lineWidth = 4;
  eLine(-42, 18, 42, 18);
}

function drawEyeEnemy() {
  enemyArt.fillStyle = "rgba(237, 199, 102, 0.18)";
  enemyArt.beginPath();
  enemyArt.arc(0, 0, 62, 0, Math.PI * 2);
  enemyArt.fill();
  enemyArt.fillStyle = "#e7d7a1";
  enemyArt.beginPath();
  enemyArt.ellipse(0, 0, 58, 38, 0, 0, Math.PI * 2);
  enemyArt.fill();
  enemyArt.fillStyle = "#55cfc2";
  enemyArt.beginPath();
  enemyArt.arc(0, 0, 22, 0, Math.PI * 2);
  enemyArt.fill();
  enemyArt.fillStyle = "#101821";
  enemyArt.beginPath();
  enemyArt.arc(0, 0, 10, 0, Math.PI * 2);
  enemyArt.fill();
  enemyArt.strokeStyle = "#ef6767";
  enemyArt.lineWidth = 5;
  eLine(-50, -36, -72, -54);
  eLine(50, -36, 72, -54);
  eLine(-52, 28, -74, 42);
  eLine(52, 28, 74, 42);
}

function drawWingEnemy() {
  enemyArt.fillStyle = "#55cfc2";
  enemyArt.beginPath();
  enemyArt.ellipse(-34, -4, 38, 24, -0.45, 0, Math.PI * 2);
  enemyArt.ellipse(34, -4, 38, 24, 0.45, 0, Math.PI * 2);
  enemyArt.fill();
  enemyArt.fillStyle = "#161c25";
  enemyArt.beginPath();
  enemyArt.arc(0, 8, 24, 0, Math.PI * 2);
  enemyArt.fill();
  enemyArt.fillStyle = "#edc766";
  enemyArt.beginPath();
  enemyArt.arc(-8, 2, 4, 0, Math.PI * 2);
  enemyArt.arc(8, 2, 4, 0, Math.PI * 2);
  enemyArt.fill();
  enemyArt.strokeStyle = "#2a8f87";
  enemyArt.lineWidth = 4;
  eLine(-66, -14, -18, 6);
  eLine(66, -14, 18, 6);
}

function drawBossEnemy() {
  enemyArt.fillStyle = "rgba(239, 103, 103, 0.18)";
  enemyArt.beginPath();
  enemyArt.arc(0, 4, 72, 0, Math.PI * 2);
  enemyArt.fill();
  enemyArt.fillStyle = "#30243d";
  enemyArt.beginPath();
  enemyArt.roundRect(-46, -40, 92, 92, 18);
  enemyArt.fill();
  enemyArt.fillStyle = "#edc766";
  eStar(0, -55, 7, 28, 10);
  enemyArt.fillStyle = "#ef6767";
  enemyArt.beginPath();
  enemyArt.arc(-18, -5, 7, 0, Math.PI * 2);
  enemyArt.arc(18, -5, 7, 0, Math.PI * 2);
  enemyArt.fill();
  enemyArt.strokeStyle = "#8d7deb";
  enemyArt.lineWidth = 8;
  eLine(-62, 52, -28, 25);
  eLine(62, 52, 28, 25);
}

function eLine(x1, y1, x2, y2) {
  enemyArt.beginPath();
  enemyArt.moveTo(x1, y1);
  enemyArt.lineTo(x2, y2);
  enemyArt.stroke();
}

function eStar(cx, cy, points, outer, inner) {
  enemyArt.beginPath();
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (i * Math.PI) / points;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) enemyArt.moveTo(x, y);
    else enemyArt.lineTo(x, y);
  }
  enemyArt.closePath();
  enemyArt.fill();
}

function gainExp(member, amount) {
  member.exp += amount;
  const need = member.level * 16;
  if (member.exp >= need) {
    member.exp -= need;
    member.level += 1;
    member.maxHp += member.cls === "戦士" ? 8 : 6;
    member.maxMp += member.maxMp ? 3 : 0;
    member.atk += member.cls === "僧侶" ? 1 : 2;
    member.def += member.cls === "戦士" ? 1 : 0;
    member.hp = member.maxHp;
    member.mp = member.maxMp;
  }
}

function loseBattle(text) {
  battle = null;
  state.x = 1;
  state.y = 1;
  state.dir = 1;
  state.gold = Math.max(0, Math.floor(state.gold * 0.7));
  state.party.forEach((member) => {
    member.hp = Math.ceil(member.maxHp / 2);
    member.mp = Math.ceil(member.maxMp / 2);
  });
  closeBattleOverlay();
  setMessage(`${text} 気づくと入口の石床に倒れていた。金貨の一部を失った。`, "まだ立てます。今度は薬草を惜しまないでください。", "alert");
  save(false);
  updateUI();
}

function save(show = true) {
  localStorage.setItem(saveKey, JSON.stringify(state));
  if (show) setMessage(`${state.message} 記録しました。`, "記録しました。続きから再開できます。", "talking");
}

function load() {
  try {
    const raw = localStorage.getItem(saveKey);
    return raw ? sanitizeLoadedState(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function sanitizeLoadedState(saved) {
  if (!saved || typeof saved !== "object") return null;
  const merged = { ...clone(baseState), ...saved };
  merged.party = sanitizeParty(saved.party);
  merged.visited = Array.isArray(saved.visited) ? saved.visited : clone(baseState.visited);
  merged.opened = Array.isArray(saved.opened) ? saved.opened : clone(baseState.opened);
  merged.usedFountains = Array.isArray(saved.usedFountains) ? saved.usedFountains : [];
  if (merged.opened.includes("5,9") && !merged.usedFountains.includes("5,9")) merged.usedFountains.push("5,9");
  merged.opened = merged.opened.filter((key) => fixedEvents[key]?.type !== "heal");
  merged.keys = Math.min(3, Math.max(baseState.keys, Number(merged.keys) || baseState.keys));
  merged.herbs = Math.max(0, Number(merged.herbs) || 0);
  merged.gold = Math.max(0, Number(merged.gold) || 0);
  const x = Number(merged.x);
  const y = Number(merged.y);
  if (Number.isFinite(x) && Number.isFinite(y) && !isWall(x, y)) {
    merged.x = x;
    merged.y = y;
  } else {
    merged.x = baseState.x;
    merged.y = baseState.y;
  }
  merged.dir = Number.isInteger(merged.dir) ? ((merged.dir % 4) + 4) % 4 : baseState.dir;
  return merged;
}

function sanitizeParty(savedParty) {
  if (!Array.isArray(savedParty)) return clone(baseState.party);
  return baseState.party.map((baseMember, index) => {
    const savedMember = savedParty[index] && typeof savedParty[index] === "object" ? savedParty[index] : {};
    const member = { ...baseMember, ...savedMember };
    member.name = String(member.name || baseMember.name);
    member.cls = String(member.cls || baseMember.cls);
    member.level = clampNumber(member.level, 1, 99, baseMember.level);
    member.exp = clampNumber(member.exp, 0, 9999, baseMember.exp);
    member.maxHp = clampNumber(member.maxHp, 1, 999, baseMember.maxHp);
    member.hp = clampNumber(member.hp, 0, member.maxHp, baseMember.hp);
    member.maxMp = clampNumber(member.maxMp, 0, 999, baseMember.maxMp);
    member.mp = clampNumber(member.mp, 0, member.maxMp, baseMember.mp);
    member.atk = clampNumber(member.atk, 1, 999, baseMember.atk);
    member.def = clampNumber(member.def, 0, 999, baseMember.def);
    return member;
  });
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(number)));
}

function resetGame() {
  localStorage.removeItem(saveKey);
  state = clone(baseState);
  battle = null;
  ui.battle.classList.add("hidden");
  setMood("calm");
  updateUI();
}

function closeBattleOverlay() {
  ui.battle.classList.add("hidden");
  ui.battleActions.innerHTML = "";
  battleActionButtons = [];
  document.activeElement?.blur?.();
}

function bindControls() {
  ui.moveButtons.forward.addEventListener("click", () => moveForward(1));
  ui.moveButtons.back.addEventListener("click", () => moveForward(-1));
  ui.moveButtons.turnLeft.addEventListener("click", () => turn(-1));
  ui.moveButtons.turnRight.addEventListener("click", () => turn(1));
  ui.moveButtons.strafeLeft.addEventListener("click", () => strafe(-1));
  ui.moveButtons.strafeRight.addEventListener("click", () => strafe(1));
  ui.moveButtons.inspect.addEventListener("click", inspect);
  ui.saveBtn.addEventListener("click", () => save(true));
  ui.resetBtn.addEventListener("click", resetGame);

  document.addEventListener("keydown", (event) => {
    if (battle) {
      const handled = handleBattleKey(event);
      if (handled) event.preventDefault();
      return;
    }
    const active = document.activeElement?.tagName === "BUTTON";
    if (active && (event.key === "Enter" || event.key === " ")) return;
    const handlers = {
      ArrowUp: () => moveForward(1),
      w: () => moveForward(1),
      W: () => moveForward(1),
      ArrowDown: () => moveForward(-1),
      s: () => moveForward(-1),
      S: () => moveForward(-1),
      ArrowLeft: () => turn(-1),
      a: () => turn(-1),
      A: () => turn(-1),
      ArrowRight: () => turn(1),
      d: () => turn(1),
      D: () => turn(1),
      q: () => strafe(-1),
      Q: () => strafe(-1),
      e: () => strafe(1),
      E: () => strafe(1),
      f: inspect,
      F: inspect,
      " ": inspect,
    };
    const handler = handlers[event.key];
    if (!handler) return;
    event.preventDefault();
    handler();
  });
}

function handleBattleKey(event) {
  const key = event.key;
  if (["ArrowLeft", "ArrowUp", "a", "A", "w", "W"].includes(key)) {
    selectNextEnabled(-1);
    return true;
  }
  if (["ArrowRight", "ArrowDown", "d", "D", "s", "S"].includes(key)) {
    selectNextEnabled(1);
    return true;
  }
  if (key === "Enter" || key === " ") {
    activateSelectedBattleAction();
    return true;
  }
  const number = Number(key);
  if (number >= 1 && number <= battleActionButtons.length && !battleActionButtons[number - 1].disabled) {
    selectedBattleAction = number - 1;
    updateBattleSelection();
    activateSelectedBattleAction();
    return true;
  }
  return false;
}

bindControls();
updateUI();
