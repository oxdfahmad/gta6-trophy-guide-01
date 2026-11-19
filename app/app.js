// Vice City Trophy Ledger — offline tracker for the 55 GTA VI PS5 trophies.
// Progress and notes live in localStorage only; the page makes no network requests.
const STORE_KEY = 'vice-trophy-ledger-v1';
const GRADE_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
const KIND_LABELS = {
  platinum: 'Platinum', story: 'Story', completion: '100% Completion', stunt: 'Stunt',
  activity: 'Activity', race: 'Race', side: 'Side strand', collection: 'Collection',
  partner: 'Partner', combat: 'Combat', misc: 'Free roam', robbery: 'Robbery',
  money: 'Money', exploration: 'Exploration',
};
const RISK_LABELS = {
  missable: 'Missable — can be lost',
  'time-sensitive': 'Time-sensitive',
  'save-first': 'Save first',
  unconfirmed: 'Method unconfirmed at launch',
};

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;

// ---- saved state -----------------------------------------------------------
function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null');
    if (raw && typeof raw === 'object') {
      return {
        earned: new Set((raw.earned ?? []).filter((n) => Number.isInteger(n))),
        notes: raw.notes ?? {},
        spoiler: raw.spoiler !== false,
      };
    }
  } catch { /* corrupted save: start fresh */ }
  return { earned: new Set(), notes: {}, spoiler: true };
}
const state = loadState();
function persist() {
  localStorage.setItem(STORE_KEY, JSON.stringify({
    earned: [...state.earned].sort((a, b) => a - b),
    notes: state.notes,
    spoiler: state.spoiler,
  }));
}
const isEarned = (t) => state.earned.has(t.id);
const byId = new Map(trophies.map((t) => [t.id, t]));

// ---- element handles -------------------------------------------------------
const $ = (id) => document.getElementById(id);
const listEl = $('trophyList');
const searchEl = $('search');
const kindEl = $('kindFilter');
const gradeEl = $('gradeFilter');
const statusEl = $('statusFilter');
const sortEl = $('sortFilter');
const spoilerEl = $('spoilerToggle');

// ---- filters ---------------------------------------------------------------
const kindCounts = new Map();
for (const t of trophies) kindCounts.set(t.kind, (kindCounts.get(t.kind) ?? 0) + 1);
kindEl.append(new Option('All kinds', 'all'));
for (const [kind, label] of Object.entries(KIND_LABELS)) {
  if (kindCounts.has(kind)) kindEl.append(new Option(`${label} (${kindCounts.get(kind)})`, kind));
}
spoilerEl.checked = state.spoiler;

function spoilerHides(t) {
  return state.spoiler && t.hidden && !isEarned(t);
}

function visibleTrophies() {
  const q = searchEl.value.trim().toLowerCase();
  let out = trophies.filter((t) => {
    if (kindEl.value !== 'all' && t.kind !== kindEl.value) return false;
    if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
    if (statusEl.value === 'earned' && !isEarned(t)) return false;
    if (statusEl.value === 'remaining' && isEarned(t)) return false;
    if (statusEl.value === 'missable' && !t.missable && !t.risk) return false;
    if (q) {
      const hay = `${t.name} ${t.description} ${t.guide} ${KIND_LABELS[t.kind] ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  if (sortEl.value === 'grade') out.sort((a, b) => GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade] || a.id - b.id);
  else if (sortEl.value === 'name') out.sort((a, b) => a.name.localeCompare(b.name));
  else out.sort((a, b) => a.id - b.id);
  return out;
}

// ---- tracker rendering -----------------------------------------------------
function medal(grade) {
  return { platinum: '◆', gold: '●', silver: '●', bronze: '●' }[grade] ?? '●';
}

function renderHeader() {
  const total = trophies.length;
  const earned = state.earned.size;
  $('earnedCount').textContent = earned;
  $('progressFill').style.width = `${(earned / total) * 100}%`;
  $('platinumLine').textContent = earned === total
    ? 'Platinum earned — Vice Got a Price!'
    : `${Math.round((earned / total) * 100)}% to the platinum — ${total - earned} to go`;
  const counts = ['platinum', 'gold', 'silver', 'bronze'].map((g) => {
    const got = trophies.filter((t) => t.grade === g && isEarned(t)).length;
    const all = trophies.filter((t) => t.grade === g).length;
    return `${g} ${got}/${all}`;
  });
  $('gradeCounts').textContent = counts.join(' · ');
  $('footCount').textContent = `${earned} of ${total} earned in this browser.`;
}

function renderList() {
  const shown = visibleTrophies();
  $('matchLine').textContent = `Showing ${shown.length} of ${trophies.length} trophies · ${state.earned.size} earned`;
  $('emptyNote').hidden = shown.length > 0;
  listEl.replaceChildren();
  for (const t of shown) {
    const li = document.createElement('li');
    li.className = 'trophy';
    li.id = `trophy-${t.id}`;
    if (isEarned(t)) li.classList.add('earned');
    if (t.missable) li.classList.add('missable-flag');
    const masked = spoilerHides(t);

    const head = document.createElement('div');
    head.className = 'trophy-head';

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.className = 'trophy-check';
    box.checked = isEarned(t);
    box.setAttribute('aria-label', `Mark ${masked ? 'hidden trophy' : t.name} as earned`);
    box.addEventListener('change', () => {
      if (box.checked) state.earned.add(t.id);
      else state.earned.delete(t.id);
      persist();
      renderHeader();
      renderList();
      renderRoadmap();
    });
    head.append(box);

    const main = document.createElement('div');
    main.className = 'trophy-main';
    const name = document.createElement('p');
    name.className = 'trophy-name';
    if (masked) {
      li.classList.add('hidden-trophy');
      name.textContent = 'Hidden trophy — earn it to reveal';
    } else {
      const med = document.createElement('span');
      med.className = 'medal';
      med.textContent = medal(t.grade);
      name.append(med, t.name);
    }
    main.append(name);
    const desc = document.createElement('p');
    desc.className = 'trophy-desc';
    desc.textContent = masked ? 'This trophy is hidden on PSN until you unlock it. Turn off “Hide story trophies until earned” to see it.' : t.description;
    main.append(desc);

    if (!masked) {
      const tags = document.createElement('div');
      tags.className = 'trophy-tags';
      const gradeTag = document.createElement('span');
      gradeTag.className = `tag grade-${t.grade}`;
      gradeTag.textContent = t.grade;
      tags.append(gradeTag);
      const kindTag = document.createElement('span');
      kindTag.className = 'tag';
      kindTag.textContent = KIND_LABELS[t.kind] ?? t.kind;
      tags.append(kindTag);
      if (t.target) {
        const targetTag = document.createElement('span');
        targetTag.className = 'tag target';
        targetTag.textContent = `Target: ${t.target.toLocaleString('en-US')}`;
        tags.append(targetTag);
      }
      if (t.missable) {
        const missTag = document.createElement('span');
        missTag.className = 'tag missable';
        missTag.textContent = 'Missable';
        tags.append(missTag);
      } else if (t.risk) {
        const riskTag = document.createElement('span');
        riskTag.className = 'tag risk';
        riskTag.textContent = RISK_LABELS[t.risk] ?? t.risk;
        tags.append(riskTag);
      }
      main.append(tags);
    }
    head.append(main);

    if (!masked) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'guide-toggle';
      toggle.textContent = 'Guide';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.addEventListener('click', () => {
        const open = li.querySelector('.trophy-guide');
        if (open) {
          open.remove();
          toggle.textContent = 'Guide';
          toggle.setAttribute('aria-expanded', 'false');
        } else {
          li.append(buildGuide(t));
          toggle.textContent = 'Hide guide';
          toggle.setAttribute('aria-expanded', 'true');
        }
      });
      head.append(toggle);
    }
    li.append(head);
    listEl.append(li);
  }
}

function buildGuide(t) {
  const wrap = document.createElement('div');
  wrap.className = 'trophy-guide';
  const label = document.createElement('p');
  label.className = 'guide-label';
  label.textContent = 'How to get it';
  const body = document.createElement('p');
  body.textContent = t.guide;
  const src = document.createElement('p');
  src.className = 'sources';
  src.textContent = `Sources: ${t.sources.join(' · ')} — names, descriptions and grades are the official PSN list.`;
  wrap.append(label, body, src);
  const noteBox = document.createElement('div');
  noteBox.className = 'note-box';
  const noteLabel = document.createElement('label');
  noteLabel.textContent = 'Your note';
  noteLabel.htmlFor = `note-${t.id}`;
  const note = document.createElement('textarea');
  note.id = `note-${t.id}`;
  note.placeholder = 'e.g. “2 of 8 vaults done, next one in Vice City”';
  note.value = state.notes[t.id] ?? '';
  note.addEventListener('input', () => {
    if (note.value.trim()) state.notes[t.id] = note.value;
    else delete state.notes[t.id];
    persist();
  });
  noteBox.append(noteLabel, note);
  wrap.append(noteBox);
  return wrap;
}

// ---- roadmap ---------------------------------------------------------------
const PHASES = [
  { title: 'Play the story', text: 'Chapters 1–4 and the finale. Do the Chapter 1 balcony meditation the moment it appears, and keep a manual save at the start of every chapter — there is no mission replay.', ids: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] },
  { title: 'Side strands', text: 'The five named finales plus the stranger strands. Side finales stay open after the credits, and the Yago race in Chapter 3 is the only time-sensitive one.', ids: [22, 23, 24, 25, 26, 27, 29] },
  { title: 'Partners and robberies', text: 'Switching opens after Breakfast Run in Chapter 2. Vaults need a partner and give a 4-star wanted level, which is also how the partner escape trophy pops.', ids: [33, 34, 36, 37, 38, 39, 40, 41, 43] },
  { title: 'Activities and skill', text: 'Shooting range golds, races, drone races, fishing, the arcade and the 50 Challenges. Most of these feed the 100% checklist, so do them before the final cleanup.', ids: [15, 16, 17, 18, 19, 20, 21, 32] },
  { title: 'Collections and the map', text: 'Meditation spots, cards, WAiNK tags, vehicles and the whole state. Fold these into your road trips instead of making a separate sweep for each counter.', ids: [28, 30, 31, 35, 42, 46, 47, 48] },
  { title: 'Money and the loose ends', text: 'Garages first — they are parking for the Scooter Bros registrations — then launder Marked Bills and spend. Finish with the unconfirmed trophies once the community verifies them, then the 100% checklist for the platinum.', ids: [52, 53, 54, 55, 44, 45, 49, 50, 51, 14, 1] },
];

function renderRoadmap() {
  const root = $('roadmapList');
  root.replaceChildren();
  for (const phase of PHASES) {
    const li = document.createElement('li');
    li.className = 'phase';
    const h = document.createElement('h3');
    h.textContent = phase.title;
    const p = document.createElement('p');
    p.textContent = phase.text;
    const chips = document.createElement('div');
    chips.className = 'chips';
    for (const id of phase.ids) {
      const t = byId.get(id);
      if (!t) continue;
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip' + (isEarned(t) ? ' done' : '');
      chip.textContent = `${isEarned(t) ? '✓ ' : ''}${t.name}`;
      chip.addEventListener('click', () => {
        searchEl.value = t.name;
        kindEl.value = 'all';
        gradeEl.value = 'all';
        statusEl.value = 'all';
        switchView('tracker');
        renderList();
        document.getElementById(`trophy-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      chips.append(chip);
    }
    li.append(h, p, chips);
    root.append(li);
  }
}

// ---- missables -------------------------------------------------------------
function renderMissables() {
  const root = $('missableList');
  root.replaceChildren();
  const risky = trophies.filter((t) => t.missable || t.risk);
  for (const t of risky) {
    const card = document.createElement('div');
    card.className = 'risk-card ' + (t.missable ? 'danger' : 'warn');
    const kind = document.createElement('p');
    kind.className = 'risk-kind';
    kind.textContent = t.missable ? 'Missable' : (RISK_LABELS[t.risk] ?? t.risk);
    const h = document.createElement('h3');
    h.textContent = t.name;
    const d = document.createElement('p');
    d.textContent = t.description;
    const g = document.createElement('p');
    g.textContent = t.guide;
    card.append(kind, h, d, g);
    root.append(card);
  }
}

// ---- sources ---------------------------------------------------------------
function renderSources() {
  const root = $('sourceList');
  root.replaceChildren();
  for (const s of doc.sources ?? []) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = s.url;
    a.textContent = s.url;
    a.target = '_blank';
    a.rel = 'noopener';
    const label = document.createElement('div');
    label.className = 'src-label';
    label.textContent = s.label;
    li.append(label, a);
    root.append(li);
  }
  $('buildNote').textContent = doc.notes ?? '';
}

// ---- tabs ------------------------------------------------------------------
function switchView(name) {
  for (const btn of document.querySelectorAll('.tab')) {
    const on = btn.dataset.view === name;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-selected', String(on));
  }
  for (const view of document.querySelectorAll('.view')) {
    view.classList.toggle('active', view.id === `view-${name}`);
  }
}
for (const btn of document.querySelectorAll('.tab')) {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
}

// ---- export / import / reset ----------------------------------------------
function download(filename, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
$('exportBtn').addEventListener('click', () => {
  download('gta6-trophy-progress.json', JSON.stringify({
    game: doc.game, platform: doc.platform, exported: new Date().toISOString(),
    earned: [...state.earned].sort((a, b) => a - b),
    notes: state.notes,
  }, null, 2));
});
$('importFile').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const raw = JSON.parse(await file.text());
    const ids = Array.isArray(raw) ? raw : raw.earned;
    if (!Array.isArray(ids)) throw new Error('no earned list');
    const valid = ids.filter((n) => Number.isInteger(n) && byId.has(n));
    state.earned = new Set(valid);
    if (raw && typeof raw === 'object' && !Array.isArray(raw) && raw.notes && typeof raw.notes === 'object') {
      state.notes = Object.fromEntries(Object.entries(raw.notes).filter(([k]) => byId.has(Number(k))));
    }
    persist();
    renderHeader();
    renderList();
    renderRoadmap();
  } catch {
    alert('That file is not a valid trophy progress export.');
  }
  event.target.value = '';
});
$('resetBtn').addEventListener('click', () => {
  if (!confirm('Clear every earned tick and every note? This cannot be undone.')) return;
  state.earned.clear();
  state.notes = {};
  persist();
  renderHeader();
  renderList();
  renderRoadmap();
});

// ---- toolbar wiring --------------------------------------------------------
for (const el of [searchEl, kindEl, gradeEl, statusEl, sortEl]) {
  el.addEventListener('input', renderList);
  el.addEventListener('change', renderList);
}
spoilerEl.addEventListener('change', () => {
  state.spoiler = spoilerEl.checked;
  persist();
  renderList();
});

renderHeader();
renderList();
renderRoadmap();
renderMissables();
renderSources();
