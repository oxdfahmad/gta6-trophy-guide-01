// Sunset Platinum: offline GTA VI trophy tracker.
// Loads app/data/trophies.json, keeps earned ticks in localStorage, and renders
// the checklist, the detail pane, the six-phase roadmap and the missables page.
// It makes no network request other than fetching its own data file.

const STORE_KEY = 'sunset-platinum-progress-v3';
const DATA_URL = 'data/trophies.json';

const listEl = document.getElementById('trophyList');
const detailEl = document.getElementById('detailPane');
const searchBox = document.getElementById('searchBox');
const kindFilter = document.getElementById('kindFilter');
const gradeFilter = document.getElementById('gradeFilter');
const statusFilter = document.getElementById('statusFilter');
const sortOrder = document.getElementById('sortOrder');
const spoilerToggle = document.getElementById('spoilerToggle');
const resultCount = document.getElementById('resultCount');
const saveNote = document.getElementById('saveNote');

const PHASES = [
  { title: 'Phase 1 — Play the story', ids: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], body: 'Finish the opening mission, all four chapters and the final mission, plus the named story missions along the way. Every trophy here unlocks automatically and none can be missed. Keep a manual save at the start of each chapter and meditate at Lucia\u2019s balcony spot in Chapter 1 before it ends.' },
  { title: 'Phase 2 — Stranger strands', ids: [22, 23, 24, 25, 26, 27, 29], body: 'Work through the mission strands for Andy, Kenton, Billy, Randy and Tyrone, plus Bret\u2019s hunt, until eight stranger strands are complete. Strands open mission by mission as the story advances, so revisit each character\u2019s map marker between chapters.' },
  { title: 'Phase 3 — Activities and races', ids: [15, 16, 17, 18, 19, 20, 21, 32, 46, 51], body: 'Sample every activity type, then chase the numbers: 250 stunts, gold in all 42 Shooting Range challenges, a drone-race win at every location, 20 different race wins, a win over Cal at fishing, one arcade game finished, 50 challenges, a bowling game and a melee drive-by.' },
  { title: 'Phase 4 — Robberies and money', ids: [33, 34, 39, 40, 41, 43, 52, 53, 54], body: 'Rob a jewelry store undetected, five bank vaults, an armored truck and one illegal operation per gang; rob three shops back-to-back with your partner; lose a four-star wanted level together. The cash feeds the money trophies: $250,000 laundered, $100,000 spent, every garage bought.' },
  { title: 'Phase 5 — Collectibles and exploration', ids: [28, 30, 31, 35, 42, 55], body: 'Meditate at all 18 spots (do this during the story, not after), finish three card sets, WAiNK at 100 locations, discover 100 vehicles, register 10 of them in the Scooter Bros app, and explore every corner of Leonida.' },
  { title: 'Phase 6 — Odd moments and the platinum', ids: [1, 14, 36, 37, 38, 44, 45, 47, 48, 49, 50], body: 'Sweep up the strange hidden moments — the airport departure, the Rhino, the showroom smash, the Ocean Beach cocktail and the rest — then finish whatever the 100% checklist still asks for. When A Long Road pops, Vice Got a Price! follows with it.' },
];

let catalogue = [];
let earned = new Set();
let selectedId = null;

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    earned = new Set(Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'string') : []);
  } catch {
    earned = new Set();
  }
}

function persist() {
  localStorage.setItem(STORE_KEY, JSON.stringify([...earned].sort()));
  saveNote.textContent = 'Saved in this browser';
  window.setTimeout(() => { saveNote.textContent = ''; }, 2500);
}

function spoilersOn() {
  return spoilerToggle.checked;
}

function isConcealed(trophy) {
  return trophy.hidden && spoilersOn() && !earned.has(trophy.name);
}

function visibleTrophies() {
  const query = searchBox.value.trim().toLowerCase();
  const kind = kindFilter.value;
  const grade = gradeFilter.value;
  const status = statusFilter.value;
  let pool = catalogue.filter((t) => {
    if (kind !== 'all' && t.kind !== kind) return false;
    if (grade !== 'all' && t.grade !== grade) return false;
    if (status === 'earned' && !earned.has(t.name)) return false;
    if (status === 'todo' && earned.has(t.name)) return false;
    if (status === 'missable' && !t.missable) return false;
    if (query) {
      const hay = (t.name + ' ' + t.description + ' ' + t.guide).toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
  const byName = (a, b) => a.name.localeCompare(b.name);
  if (sortOrder.value === 'grade') {
    const rank = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
    pool = pool.slice().sort((a, b) => (rank[a.grade] - rank[b.grade]) || byName(a, b));
  } else if (sortOrder.value === 'name') {
    pool = pool.slice().sort(byName);
  } else if (sortOrder.value === 'kind') {
    pool = pool.slice().sort((a, b) => a.kind.localeCompare(b.kind) || byName(a, b));
  } else {
    pool = pool.slice().sort((a, b) => a.id - b.id);
  }
  return pool;
}

function gradeLabel(grade) {
  return grade.charAt(0).toUpperCase() + grade.slice(1);
}

function kindLabel(kind) {
  const labels = { story: 'Story', side: 'Side missions', activity: 'Activities', race: 'Races', collection: 'Collectibles', stunt: 'Stunts', robbery: 'Robberies', exploration: 'Exploration', combat: 'Combat', money: 'Money', completion: '100% completion', misc: 'Odd moments', platinum: 'Platinum' };
  return labels[kind] || kind;
}

function renderProgress() {
  const total = catalogue.length || 55;
  const done = catalogue.filter((t) => earned.has(t.name)).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('progressText').textContent = done + ' of ' + total + ' earned';
  document.getElementById('progressPct').textContent = pct + '%';
  document.getElementById('progressFill').style.width = pct + '%';
  const counts = ['platinum', 'gold', 'silver', 'bronze'].map((g) => {
    const have = catalogue.filter((t) => t.grade === g && earned.has(t.name)).length;
    const all = catalogue.filter((t) => t.grade === g).length;
    return gradeLabel(g) + ' ' + have + '/' + all;
  });
  document.getElementById('gradeCounts').textContent = counts.join(' · ');
}

function renderList() {
  const pool = visibleTrophies();
  listEl.replaceChildren();
  resultCount.textContent = pool.length + ' of ' + catalogue.length + ' trophies shown';
  for (const trophy of pool) {
    const item = document.createElement('li');
    item.className = 'trophy-card grade-' + trophy.grade + (earned.has(trophy.name) ? ' earned' : '') + (selectedId === trophy.id ? ' selected' : '');
    const concealed = isConcealed(trophy);
    const top = document.createElement('div');
    top.className = 'card-top';
    const heading = document.createElement('h3');
    heading.textContent = concealed ? 'Hidden trophy — spoiler' : trophy.name;
    const pill = document.createElement('span');
    pill.className = 'grade-pill';
    pill.textContent = gradeLabel(trophy.grade);
    top.append(heading, pill);
    item.append(top);
    if (concealed) {
      const box = document.createElement('p');
      box.className = 'spoiler-box';
      box.textContent = 'A story trophy. Its name and description stay hidden until you earn it — turn off “Hide story spoilers” above to reveal it, or earn it in the game.';
      item.append(box);
    } else {
      const desc = document.createElement('p');
      desc.className = 'card-desc';
      desc.textContent = trophy.description;
      item.append(desc);
    }
    const meta = document.createElement('div');
    meta.className = 'card-meta';
    const kind = document.createElement('span');
    kind.textContent = kindLabel(trophy.kind);
    meta.append(kind);
    if (trophy.missable) {
      const flag = document.createElement('span');
      flag.className = 'flag missable';
      flag.textContent = '⚠ Possibly missable';
      meta.append(flag);
    }
    if (trophy.hidden) {
      const flag = document.createElement('span');
      flag.className = 'flag hidden-flag';
      flag.textContent = 'Hidden on PSN';
      meta.append(flag);
    }
    if (earned.has(trophy.name)) {
      const check = document.createElement('span');
      check.className = 'earned-check';
      check.textContent = '✓ Earned';
      meta.append(check);
    }
    item.append(meta);
    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const tick = document.createElement('button');
    tick.type = 'button';
    tick.textContent = earned.has(trophy.name) ? 'Mark as not earned' : 'Mark as earned';
    tick.addEventListener('click', (event) => {
      event.stopPropagation();
      if (earned.has(trophy.name)) earned.delete(trophy.name);
      else earned.add(trophy.name);
      persist();
      renderProgress();
      renderList();
      renderDetail();
    });
    actions.append(tick);
    item.append(actions);
    item.addEventListener('click', () => {
      selectedId = trophy.id;
      renderList();
      renderDetail();
    });
    listEl.append(item);
  }
  if (pool.length === 0) {
    const empty = document.createElement('li');
    empty.textContent = 'No trophies match these filters. Clear the search or widen a filter.';
    listEl.append(empty);
  }
}

function renderDetail() {
  const trophy = catalogue.find((t) => t.id === selectedId);
  detailEl.replaceChildren();
  if (!trophy) {
    const hint = document.createElement('p');
    hint.className = 'detail-empty';
    hint.textContent = 'Pick a trophy from the list to read its full guide and sources.';
    detailEl.append(hint);
    return;
  }
  const concealed = isConcealed(trophy);
  const title = document.createElement('h2');
  title.textContent = concealed ? 'Hidden trophy' : trophy.name;
  const gradeLine = document.createElement('p');
  gradeLine.className = 'detail-grade';
  gradeLine.textContent = gradeLabel(trophy.grade) + ' · ' + kindLabel(trophy.kind) + (earned.has(trophy.name) ? ' · Earned' : '');
  detailEl.append(title, gradeLine);
  if (concealed) {
    const note = document.createElement('p');
    note.className = 'spoiler-box';
    note.textContent = 'This trophy is hidden on PlayStation until you earn it, and the spoiler setting is on. Turn the setting off, or earn the trophy, to read its guide.';
    detailEl.append(note);
    return;
  }
  const desc = document.createElement('p');
  desc.className = 'detail-desc';
  desc.textContent = '“' + trophy.description + '”';
  const guide = document.createElement('p');
  guide.className = 'detail-guide';
  guide.textContent = trophy.guide;
  detailEl.append(desc, guide);
  if (trophy.missable) {
    const warn = document.createElement('p');
    warn.className = 'detail-warning';
    warn.textContent = 'Possibly missable: meditate at every spot as you find it, and keep a manual save at the start of each chapter. Lucia\u2019s Chapter 1 balcony spot is reported to disappear after that chapter.';
    detailEl.append(warn);
  }
  const srcTitle = document.createElement('p');
  srcTitle.textContent = 'Sources for this trophy:';
  const srcList = document.createElement('ul');
  srcList.className = 'detail-sources';
  for (const src of trophy.sources || []) {
    const li = document.createElement('li');
    li.textContent = src;
    srcList.append(li);
  }
  detailEl.append(srcTitle, srcList);
}

function renderRoadmap() {
  const host = document.getElementById('roadmapList');
  host.replaceChildren();
  PHASES.forEach((phase, index) => {
    const li = document.createElement('li');
    const title = document.createElement('h3');
    title.textContent = phase.title;
    const body = document.createElement('p');
    body.textContent = phase.body;
    const count = document.createElement('p');
    const done = phase.ids.filter((id) => {
      const t = catalogue.find((x) => x.id === id);
      return t && earned.has(t.name);
    }).length;
    count.innerHTML = '';
    const span = document.createElement('span');
    span.className = 'phase-count';
    span.textContent = done + ' of ' + phase.ids.length + ' trophies in this phase earned';
    count.append(span);
    li.append(title, body, count);
    host.append(li);
  });
}

function renderMissables() {
  const host = document.getElementById('missableList');
  host.replaceChildren();
  const flagged = catalogue.filter((t) => t.missable);
  if (flagged.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'No trophy is flagged as missable.';
    host.append(p);
    return;
  }
  for (const trophy of flagged) {
    const card = document.createElement('article');
    card.className = 'missable-card';
    const title = document.createElement('h3');
    title.textContent = trophy.name + ' — ' + gradeLabel(trophy.grade);
    const desc = document.createElement('p');
    desc.textContent = trophy.description;
    const guide = document.createElement('p');
    guide.textContent = trophy.guide;
    card.append(title, desc, guide);
    host.append(card);
  }
  const safe = document.createElement('p');
  safe.textContent = 'All 54 other trophies can be earned after the story: the open world stays open, there are no online trophies, and no other trophy is reported as missable at launch.';
  host.append(safe);
}

function exportProgress() {
  const payload = { game: 'Grand Theft Auto VI', platform: 'PlayStation 5', exported: new Date().toISOString(), earned: [...earned].sort() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'gta6-trophy-progress.json';
  link.click();
  URL.revokeObjectURL(link.href);
}

async function importProgress(file) {
  try {
    const parsed = JSON.parse(await file.text());
    const names = Array.isArray(parsed) ? parsed : parsed.earned;
    if (!Array.isArray(names)) throw new Error('no earned list');
    const known = new Set(catalogue.map((t) => t.name));
    const kept = names.filter((n) => typeof n === 'string' && known.has(n));
    earned = new Set(kept);
    persist();
    renderProgress();
    renderList();
    renderDetail();
    renderRoadmap();
    renderMissables();
    saveNote.textContent = 'Imported ' + kept.length + ' earned trophies';
  } catch {
    saveNote.textContent = 'That file could not be imported — it is not a progress export from this guide.';
  }
}

function switchView(name) {
  document.querySelectorAll('.tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.view === name));
  document.querySelectorAll('.view').forEach((view) => view.classList.toggle('active', view.id === 'view-' + name));
  if (name === 'roadmap') renderRoadmap();
  if (name === 'missables') renderMissables();
}

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => switchView(tab.dataset.view));
});
[searchBox, kindFilter, gradeFilter, statusFilter, sortOrder].forEach((el) => {
  el.addEventListener('input', renderList);
  el.addEventListener('change', renderList);
});
spoilerToggle.addEventListener('change', () => { renderList(); renderDetail(); });
document.getElementById('exportBtn').addEventListener('click', exportProgress);
document.getElementById('importFile').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) importProgress(file);
  event.target.value = '';
});
document.getElementById('resetBtn').addEventListener('click', () => {
  if (window.confirm('Clear all earned ticks? This cannot be undone.')) {
    earned = new Set();
    selectedId = null;
    persist();
    renderProgress();
    renderList();
    renderDetail();
    renderRoadmap();
  }
});

loadSaved();
const data = await (await fetch(DATA_URL)).json();
catalogue = data.trophies || [];
renderProgress();
renderList();
renderDetail();
renderRoadmap();
renderMissables();
