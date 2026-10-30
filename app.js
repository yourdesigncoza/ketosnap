/* KetoSnap: one person's keto week. The plan for each day, meal photos checked against it, and the weekly shop.
   Meals and their photos live in IndexedDB and sync to Supabase once signed in (cloud.js); shopping ticks live in
   localStorage. */
(() => {
'use strict';

const PLAN = self.KETO_PLAN;
const cloud = self.KetoCloud;
const STORE_KEY = 'ketosnap.v1';
const SEEN_KEY = 'ketosnap.seen';
const DB_NAME = 'ketosnap';
const PHOTO_MAX_PX = 1024;
const EXTRA = 'extra';
const MAIN_SLOTS = [0, 1, 2];
const VERDICTS = { on_plan: 'On plan', close: 'Close', off_plan: 'Off plan' };

// ---------- shopping ticks and sync bookkeeping ----------
// gone: deleted meals still to be marked deleted on the server. pulled: the newest server change already merged.
let state = load();

function load() {
  const empty = { ticks: {}, gone: [], pulled: 0 };
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    if (s) return { ...empty, ...s };
  } catch (e) { /* fall through */ }
  return empty;
}

function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

// ---------- meals (IndexedDB, because photos are too big for localStorage) ----------
// entry: { id, date: 'YYYY-MM-DD', slot: 0|1|2|'extra', auto, created, updated, text, photo: Blob|null,
//          status: 'waiting'|'checking'|'done'|'failed', result, error, dirty, photoKey }
// auto: the app guessed the slot, so the model may move it (a coffee at lunchtime is an extra, not lunch).
// dirty: changed since the last sync. photoKey: the photo's path on the server once uploaded.
let entries = [];

const db = new Promise((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, 1);
  req.onupgradeneeded = () => req.result.createObjectStore('entries', { keyPath: 'id' });
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

async function idb(mode, fn) {
  const t = (await db).transaction('entries', mode);
  const req = fn(t.objectStore('entries'));
  return new Promise((resolve, reject) => {
    t.oncomplete = () => resolve(req.result);
    t.onerror = () => reject(t.error);
  });
}

// 'checking' only exists in memory; a meal interrupted mid-check is stored as waiting and retried.
const persist = (entry) => idb('readwrite', (s) => s.put({ ...entry, status: entry.status === 'checking' ? 'waiting' : entry.status }));
const forget = (id) => idb('readwrite', (s) => s.delete(id));

// Every change to a meal goes through store(), which marks it for the next sync.
async function store(entry) {
  entry.updated = Date.now();
  entry.dirty = true;
  await persist(entry);
  sync();
}

// ---------- dates (Monday is Day 1, Sunday is Day 7) ----------
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const today = () => iso(new Date());
const addDays = (s, n) => { const d = fromIso(s); d.setDate(d.getDate() + n); return iso(d); };
const dayIndex = (date) => (fromIso(date).getDay() + 6) % 7;
const planDay = (date) => PLAN.days[dayIndex(date)];
const dayMonth = (date) => fromIso(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' });

function dayTitle(date) {
  if (date === today()) return 'Today';
  if (date === addDays(today(), -1)) return 'Yesterday';
  return planDay(date).name;
}

// "Today, Friday 30 October" or "Wednesday 28 October"
function dateLabel(date) {
  const name = planDay(date).name;
  return `${dayTitle(date) === name ? '' : dayTitle(date) + ', '}${name} ${dayMonth(date)}`;
}

// ---------- meal helpers ----------
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const entriesOn = (date) => entries.filter((e) => e.date === date).sort((a, b) => a.created - b.created);
const inSlot = (date, slot) => entriesOn(date).filter((e) => e.slot === slot);
const slotName = (date, slot) => (slot === EXTRA ? 'Extra' : planDay(date).meals[slot][0]);
const isFree = (date, slot) => !inSlot(date, slot).length;
const SLOTS = [...MAIN_SLOTS, EXTRA];
const slotByName = (date, name) => SLOTS.find((s) => slotName(date, s).toLowerCase() === String(name).toLowerCase());
const hourSlot = () => { const h = new Date().getHours(); return h < 11 ? 0 : h < 16 ? 1 : 2; };

// The meal a new photo belongs to: by the clock today, else the first open meal. A second photo for a filled meal is an extra.
function autoSlot(date) {
  if (date === today()) return isFree(date, hourSlot()) ? hourSlot() : EXTRA;
  return MAIN_SLOTS.find((s) => isFree(date, s)) ?? EXTRA;
}

// The meal the Today card asks for: the one due now, or the next open one after it.
const nextSlot = (date) => MAIN_SLOTS.filter((s) => s >= hourSlot()).find((s) => isFree(date, s));

function dayTotals(date) {
  const done = entriesOn(date).filter((e) => e.result && e.result.food);
  const count = (v) => done.filter((e) => e.result.verdict === v).length;
  return {
    carbs: done.reduce((n, e) => n + e.result.net_carbs, 0),
    checked: done.length,
    on: count('on_plan'), close: count('close'), off: count('off_plan'),
  };
}

// ---------- the model (behind the check-meal function, which holds the key and picks the model) ----------
const askModel = (system, userContent) => cloud.checkMeal([{ role: 'system', content: system }, { role: 'user', content: userContent }]);

function planBrief(date) {
  const day = planDay(date);
  return [
    `Target: ${PLAN.carbs}.`,
    `It is ${day.name}, a ${day.kind.toLowerCase()}. On spin days he spins for 45 minutes in the morning and eats breakfast afterwards.`,
    `The plan for the day: ${day.meals.map(([w, m]) => `${w}: ${m}`).join(' | ')}.`,
    ...PLAN.guides.map((g) => `${g.title}: ${g.items.join('; ')}.`),
  ].join('\n');
}

async function analyze(entry) {
  const names = SLOTS.map((s) => `"${slotName(entry.date, s).toLowerCase()}"`).join(', ');
  const current = slotName(entry.date, entry.slot).toLowerCase();
  const planned = entry.auto
    ? `The app filed this as ${current} from the time of day. If it is clearly another of the day's meals, or a snack or drink ("extra"), choose that instead. Judge it against the meal you choose; judge an extra against the snack and drink rules.`
    : entry.slot === EXTRA
      ? 'This is an extra, not one of the planned meals. Judge it as a snack or drink against the snack and drink rules.'
      : `This is ${current}. The plan says: ${planDay(entry.date).meals[entry.slot][1]}.`;
  const earlier = entriesOn(entry.date).filter((e) => e !== entry && e.result && e.result.food)
    .map((e) => `${slotName(e.date, e.slot)}: ${e.result.title}`);
  // Keep personal health details out of this prompt: the code is public.
  const system = `You check one meal against a keto eating plan. The eater is a man in South Africa who wants steady weight loss
and is cutting back on salt. Portion size matters as much as the food itself.
${planBrief(entry.date)}
${planned}
Already eaten today: ${earlier.join('; ') || 'nothing logged yet'}.
Look at the photo or description and return ONLY this JSON:
{"food": true, "meal": "${current}", "title": "short name of the meal", "items": ["3 scrambled eggs", "½ avocado"], "verdict": "on_plan", "notes": [], "net_carbs": 6, "tip": ""}
- meal: one of ${names}.
- items: what you can see, each with an estimated amount in the plan's units (eggs, grams, cups, tsp).
- verdict: "on_plan" when it matches the planned meal, or is a fair swap within the rules, at about the planned portion.
  "close" when the foods fit but the portion is clearly bigger or smaller, or a small extra was added.
  "off_plan" when it has cut-out foods, sugar or starch, or is much bigger than planned.
- notes: up to 3 short points on how it differs from the plan. Empty when it is on plan.
- net_carbs: your estimate in whole grams for everything shown.
- tip: one short practical sentence, or "".
Write plainly, to "you". Never use em dashes. If there is no food or drink in the photo, return {"food": false}.`;
  const content = entry.photo
    ? [{ type: 'text', text: entry.text || 'Here is what I am eating.' }, { type: 'image_url', image_url: { url: await dataUrl(entry.photo) } }]
    : entry.text;
  return tidy(await askModel(system, content));
}

// The model's answer, trimmed to what the screen shows. Em dashes become commas: the user never wants them.
function tidy(r) {
  const plain = (s) => String(s || '').replace(/\s*—\s*/g, ', ').trim();
  const list = (a, max) => (Array.isArray(a) ? a.map(plain).filter(Boolean).slice(0, max) : []);
  if (!r || r.food === false) return { food: false, title: 'No food found', items: [], verdict: null, notes: [], net_carbs: 0, tip: '' };
  return {
    food: true,
    meal: plain(r.meal).toLowerCase(),
    title: plain(r.title) || 'Meal',
    items: list(r.items, 8),
    verdict: VERDICTS[r.verdict] ? r.verdict : 'close',
    notes: list(r.notes, 3),
    net_carbs: Math.max(0, Math.round(Number(r.net_carbs) || 0)),
    tip: plain(r.tip),
  };
}

async function check(entry) {
  if (!cloud.user()) { entry.status = 'waiting'; await store(entry); refresh(); return; }
  entry.status = 'checking';
  refresh();
  try {
    entry.result = await analyze(entry);
    entry.status = 'done';
    entry.error = '';
    if (entry.auto) {
      const s = slotByName(entry.date, entry.result.meal);
      if (s !== undefined && s !== entry.slot && (s === EXTRA || isFree(entry.date, s))) entry.slot = s;
      entry.auto = false;
    }
  } catch (e) {
    console.warn(e);
    // Offline, or signed out because the session ran out: it waits and is checked later.
    entry.status = navigator.onLine && e.status !== 401 ? 'failed' : 'waiting';
    entry.error = e.message;
  }
  await store(entry);
  refresh();
}

let retrying = false;
async function retryWaiting() {
  if (retrying || !cloud.user() || !navigator.onLine) return;
  retrying = true;
  for (const e of entries.filter((x) => x.status === 'waiting')) await check(e);
  retrying = false;
}

// ---------- logging a meal ----------
let pendingSlot = null; // the meal chosen before the camera opened; null means pick it by the clock

function snap(slot = null) {
  pendingSlot = slot;
  $('#photo-file').click();
}

async function addEntry(fields) {
  const date = viewDate();
  const entry = {
    id: uid(), date, slot: pendingSlot ?? autoSlot(date), auto: pendingSlot === null, created: Date.now(),
    text: '', photo: null, status: 'waiting', result: null, error: '', ...fields,
  };
  pendingSlot = null;
  entries.push(entry);
  await store(entry);
  navigator.storage?.persist?.();
  openEntry(entry);
  await check(entry);
  if (entry.status === 'waiting') toast(cloud.user() ? 'Saved. It gets checked when you are back online' : 'Saved. Sign in under Settings to check meals');
}

async function handlePhoto(file) {
  try { await addEntry({ photo: await shrink(file) }); }
  catch (e) { console.warn(e); toast('Photo failed: ' + e.message); }
}

function shrink(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, PHOTO_MAX_PX / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('could not shrink image'))), 'image/jpeg', 0.8);
    };
    img.onerror = () => reject(new Error('could not read image'));
    img.src = URL.createObjectURL(file);
  });
}

const dataUrl = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(r.error);
  r.readAsDataURL(blob);
});

async function moveEntry(entry, slot) {
  if (entry.slot === slot) return;
  entry.slot = slot;
  entry.auto = false;
  await check(entry);
}

async function deleteEntry(entry) {
  entries = entries.filter((e) => e !== entry);
  await forget(entry.id);
  dropPhotoUrl(entry.id);
  state.gone.push({ id: entry.id, photo: entry.photoKey || null });
  save();
  sync();
  $('#entry').close();
  render();
  toast('Deleted');
}

// ---------- sync with Supabase (cloud.js) ----------
// The phone is the working copy, so everything works offline. push() sends deletes and changed meals;
// pull() brings in meals changed elsewhere (after a reinstall, or from a second phone). Newest `updated` wins.
const toRow = (e) => ({
  id: e.id, date: e.date, slot: String(e.slot), auto: e.auto, created: e.created, updated: e.updated, text: e.text,
  photo: e.photoKey || null, status: e.status === 'checking' ? 'waiting' : e.status, result: e.result, error: e.error || '', deleted: false,
});

async function push() {
  for (const g of [...state.gone]) {
    await cloud.dropMeal(g.id, g.photo);
    state.gone = state.gone.filter((x) => x.id !== g.id);
    save();
  }
  for (const e of entries.filter((x) => x.dirty)) {
    const stamp = e.updated;
    if (e.photo && !e.photoKey) {
      const key = `${cloud.user().id}/${e.id}.jpg`;
      await cloud.putPhoto(key, e.photo);
      e.photoKey = key;
    }
    await cloud.saveMeal(toRow(e));
    if (!entries.includes(e)) {
      // Deleted while it was being sent: make sure the delete takes the photo too.
      const g = state.gone.find((x) => x.id === e.id);
      if (g) { g.photo = e.photoKey || null; save(); }
      continue;
    }
    if (e.updated === stamp) e.dirty = false; // changed while sending: it goes again on the next round
    await persist(e);
  }
}

let syncing = false;
let again = false;
async function sync() {
  if (!cloud.user() || !navigator.onLine) return;
  if (syncing) { again = true; return; }
  syncing = true;
  try {
    do { again = false; await push(); } while (again);
  } catch (e) {
    console.warn('sync', e);
    if (!cloud.user()) render();
  } finally {
    syncing = false;
  }
}

async function pull() {
  if (!cloud.user() || !navigator.onLine) return;
  let changed = false;
  try {
    for (const r of await cloud.meals(state.pulled)) {
      const local = entries.find((e) => e.id === r.id);
      if (local && (local.dirty || local.updated >= r.updated)) { /* ours is as new or newer */ }
      else if (r.deleted) {
        if (local) { entries = entries.filter((e) => e !== local); await forget(local.id); dropPhotoUrl(local.id); changed = true; }
      } else if (!state.gone.some((g) => g.id === r.id)) {
        const entry = Object.assign(local || {}, {
          id: r.id, date: r.date, slot: r.slot === EXTRA ? EXTRA : Number(r.slot), auto: r.auto, created: r.created,
          updated: r.updated, text: r.text, status: r.status, result: r.result, error: r.error, dirty: false,
          photo: local?.photo ?? (r.photo ? await cloud.getPhoto(r.photo) : null), photoKey: r.photo,
        });
        if (!local) entries.push(entry);
        await persist(entry);
        changed = true;
      }
      state.pulled = Math.max(state.pulled, r.updated); // rows come oldest first, so a failure resumes here
    }
  } catch (e) {
    console.warn('pull', e);
  }
  save();
  if (changed) refresh();
}

// Signed in and online: bring meals in, send changes out, then check anything still waiting.
async function catchUp() {
  await pull();
  await sync();
  await retryWaiting();
}

// ---------- UI helpers ----------
const $ = (s) => document.querySelector(s);
const el = (tag, attrs = {}, ...children) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'on') for (const [e, f] of Object.entries(v)) n.addEventListener(e, f);
    else if (k in n && k !== 'style') n[k] = v;
    else n.setAttribute(k, v);
  }
  for (const c of children) if (c != null && c !== false) n.append(c);
  return n;
};
const svg = (markup) => { const t = el('template'); t.innerHTML = markup; return t.content.firstElementChild; };
const ICON_CAMERA = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
const ICON_TICK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';

const photoUrls = new Map();
function photoUrl(entry) {
  if (!photoUrls.has(entry.id)) photoUrls.set(entry.id, URL.createObjectURL(entry.photo));
  return photoUrls.get(entry.id);
}
function dropPhotoUrl(id) {
  if (photoUrls.has(id)) URL.revokeObjectURL(photoUrls.get(id));
  photoUrls.delete(id);
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 4000);
}

function verdictPill(entry) {
  if (entry.status === 'checking') return el('span', { className: 'pill checking' }, 'Checking');
  if (entry.status === 'waiting') return el('span', { className: 'pill' }, 'Not checked');
  if (entry.status === 'failed') return el('span', { className: 'pill off_plan' }, 'Check failed');
  if (!entry.result.food) return el('span', { className: 'pill' }, 'No food');
  return el('span', { className: 'pill ' + entry.result.verdict }, VERDICTS[entry.result.verdict]);
}

function thumb(entry) {
  if (entry && entry.photo) return el('img', { className: 'thumb', src: photoUrl(entry), alt: '' });
  return el('span', { className: 'thumb blank' }, svg(entry ? '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 7h14M5 12h14M5 17h9"/></svg>' : ICON_CAMERA));
}

// ---------- routing ----------
// #today (default), #week, #shop, #history, #day/YYYY-MM-DD
let route = { view: 'today', date: null };

function go(hash) { location.hash = hash; readRoute(); }

function readRoute() {
  const h = location.hash.slice(1);
  const m = h.match(/^day\/(\d{4}-\d{2}-\d{2})$/);
  if (m && m[1] !== today()) route = { view: 'day', date: m[1] };
  else route = { view: ['week', 'shop', 'history'].includes(h) ? h : 'today', date: null };
  render();
  window.scrollTo(0, 0);
}

const viewDate = () => route.date || today();

function render() {
  const view = $('#view');
  view.replaceChildren();
  $('#back-btn').hidden = route.view !== 'day';
  for (const b of document.querySelectorAll('.tabs [data-tab]')) {
    const on = b.dataset.tab === (route.view === 'day' ? 'history' : route.view);
    b.classList.toggle('on', on);
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  }
  ({ today: renderDay, day: renderDay, week: renderWeek, shop: renderShop, history: renderHistory })[route.view](view);
}

// Re-draw the screen and the open meal, if any, after a meal changes.
function refresh() {
  render();
  const open = entries.find((e) => e.id === openId);
  if (open && $('#entry').open) renderEntry(open);
}

// ---------- Today / a past day ----------
function renderDay(view) {
  const date = viewDate();
  const day = planDay(date);
  const isToday = date === today();
  view.append(
    el('h1', { className: 'display' }, dayTitle(date)),
    el('p', { className: 'subline' }, `${isToday ? day.name + ' ' : ''}${dayMonth(date)}, ${day.kind.toLowerCase()}`));

  if (isToday && !cloud.user()) view.append(signinCard());
  if (isToday && day.todo.length) view.append(todoCard(day.todo, 'To do today'));

  const next = isToday ? nextSlot(date) : undefined;
  if (next !== undefined) {
    const [when, what] = day.meals[next];
    view.append(el('section', { className: 'hero' },
      el('p', { className: 'hero-when' }, `Next up: ${when.toLowerCase()}`),
      el('p', { className: 'hero-what' }, what),
      el('button', { className: 'hero-btn', on: { click: () => snap(next) } }, svg(ICON_CAMERA), `Snap your ${when.toLowerCase()}`)));
  }

  const meals = el('ul', { className: 'meals' });
  for (const slot of MAIN_SLOTS) {
    const logged = inSlot(date, slot);
    if (!logged.length) {
      const [when, what] = day.meals[slot];
      meals.append(el('li', {}, el('button', { className: 'meal', on: { click: () => snap(slot) } },
        thumb(null),
        el('span', { className: 'meal-body' }, el('span', { className: 'meal-when' }, when), el('span', { className: 'meal-what muted' }, what)))));
    }
    for (const e of logged) meals.append(mealRow(e));
  }
  view.append(meals);

  const extras = inSlot(date, EXTRA);
  view.append(el('h2', { className: 'section' }, 'Extras'));
  if (extras.length) view.append(el('ul', { className: 'meals' }, ...extras.map(mealRow)));
  else view.append(el('p', { className: 'hint-line' }, 'Snacks and drinks go here. One snack a day at most.'));

  view.append(typeForm(), carbCard(date));
}

function mealRow(entry) {
  const r = entry.result;
  const what = r ? r.title : entry.text || 'Photo';
  return el('li', {}, el('button', { className: 'meal', on: { click: () => openEntry(entry) } },
    thumb(entry),
    el('span', { className: 'meal-body' },
      el('span', { className: 'meal-when' }, slotName(entry.date, entry.slot)),
      el('span', { className: 'meal-what' }, what)),
    verdictPill(entry)));
}

function todoCard(items, title) {
  return el('section', { className: 'todo' },
    el('h2', {}, title),
    el('ul', {}, ...items.map((t) => el('li', {}, t))));
}

function signinCard() {
  return el('section', { className: 'todo' },
    el('h2', {}, 'Sign in to check your meals'),
    el('p', {}, 'Snaps are saved either way. Signing in checks them against the plan and backs them up.'),
    el('button', { className: 'pill-btn', on: { click: () => menuAction('settings') } }, 'Sign in'));
}

function typeForm() {
  const input = el('input', { name: 'meal', placeholder: 'Type what you ate', enterKeyHint: 'done', autocomplete: 'off', 'aria-label': 'Type what you ate' });
  return el('form', { className: 'type-form', on: { submit: (e) => {
    e.preventDefault();
    const text = input.value.trim();
    input.value = '';
    if (text) addEntry({ text });
  } } },
  el('p', { className: 'hint-line' }, 'No photo? Type it instead.'),
  el('span', { className: 'type-row' }, input, el('button', { className: 'pill-btn', type: 'submit' }, 'Check')));
}

function carbCard(date) {
  const t = dayTotals(date);
  const max = Math.max(PLAN.carbHigh + 10, t.carbs + 5);
  const pct = (g) => `${(g / max) * 100}%`;
  const over = t.carbs > PLAN.carbHigh;
  const summary = t.checked
    ? `${t.on} on plan, ${t.close} close, ${t.off} off plan`
    : 'Nothing checked yet';
  return el('section', { className: 'carbs' + (over ? ' over' : '') },
    el('p', { className: 'carbs-line' }, el('b', {}, `About ${t.carbs} g`), ` net carbs. Target ${PLAN.carbLow} to ${PLAN.carbHigh} g.`),
    el('div', { className: 'bar', role: 'img', 'aria-label': `${t.carbs} of ${PLAN.carbHigh} grams` },
      el('span', { className: 'band', style: `left:${pct(PLAN.carbLow)};width:${pct(PLAN.carbHigh - PLAN.carbLow)}` }),
      el('span', { className: 'fill', style: `width:${pct(t.carbs)}` })),
    el('p', { className: 'carbs-sub' }, summary));
}

// ---------- one meal ----------
let openId = null;

function openEntry(entry) {
  openId = entry.id;
  renderEntry(entry);
  if (!$('#entry').open) $('#entry').showModal();
}

function renderEntry(entry) {
  const box = $('#entry-body');
  const r = entry.result;
  box.replaceChildren();
  if (entry.photo) box.append(el('img', { className: 'entry-photo', src: photoUrl(entry), alt: 'Your meal' }));
  box.append(el('p', { className: 'entry-meta' }, `${slotName(entry.date, entry.slot)}, ${dateLabel(entry.date)}`));

  if (entry.status === 'checking') {
    box.append(el('p', { className: 'status' }, el('span', { className: 'dot' }), 'Checking against your plan'));
  } else if (entry.status === 'waiting') {
    box.append(el('p', { className: 'status' }, cloud.user() ? 'Saved. It gets checked when you are back online.' : 'Saved. Sign in under Settings and it gets checked.'));
  } else if (entry.status === 'failed') {
    box.append(el('p', { className: 'status' }, `Couldn't check this meal (${entry.error}). Try again.`));
  } else if (!r.food) {
    box.append(el('h2', { className: 'entry-title' }, 'No food in this photo'),
      el('p', { className: 'muted' }, 'Take it again with the plate filling the picture, or delete it.'));
  } else {
    box.append(...[
      el('h2', { className: 'entry-title' }, r.title),
      el('p', { className: 'entry-verdict' }, verdictPill(entry), el('span', {}, `About ${r.net_carbs} g net carbs`)),
      r.items.length && el('ul', { className: 'entry-items' }, ...r.items.map((i) => el('li', {}, i))),
      r.notes.length && el('div', { className: 'entry-notes' }, el('h3', {}, 'Compared with the plan'), el('ul', {}, ...r.notes.map((n) => el('li', {}, n)))),
      r.tip && el('p', { className: 'entry-tip' }, r.tip),
    ].filter(Boolean));
  }
  if (entry.text && entry.photo) box.append(el('p', { className: 'muted' }, `You wrote: ${entry.text}`));
  if (entry.slot !== EXTRA) box.append(el('p', { className: 'entry-plan' }, `The plan: ${planDay(entry.date).meals[entry.slot][1]}`));

  box.append(
    el('h3', { className: 'entry-move' }, 'This was'),
    el('div', { className: 'slot-chips' }, ...SLOTS.map((s) => el('button', {
      className: 'slot-chip' + (s === entry.slot ? ' on' : ''),
      disabled: entry.status === 'checking',
      on: { click: () => moveEntry(entry, s) },
    }, slotName(entry.date, s)))),
    el('div', { className: 'row' },
      el('button', { className: 'link-btn danger', on: { click: () => { if (confirm('Delete this meal?')) deleteEntry(entry); } } }, 'Delete'),
      el('span', { className: 'spacer' }),
      entry.status === 'checking' ? null : el('button', { className: 'link-btn', on: { click: () => check(entry) } }, 'Check again'),
      el('button', { className: 'pill-btn', on: { click: () => $('#entry').close() } }, 'Done')));
}

// ---------- Week ----------
function renderWeek(view) {
  const todayIdx = dayIndex(today());
  view.append(
    el('h1', { className: 'display' }, 'Your week'),
    el('p', { className: 'subline' }, `${PLAN.carbs}. Five spin days, then two rest days.`));
  PLAN.days.forEach((day, i) => {
    const isToday = i === todayIdx;
    view.append(el('section', { className: 'day-card' + (isToday ? ' today' : ''), id: day.name.toLowerCase() },
      el('div', { className: 'day-head' },
        el('h2', {}, day.name),
        el('span', { className: 'pill' + (isToday ? ' on_plan' : '') }, isToday ? 'Today' : day.kind)),
      el('dl', { className: 'plan-meals' }, ...day.meals.flatMap(([w, m]) => [el('dt', {}, w), el('dd', {}, m)])),
      day.todo.length ? el('ul', { className: 'plan-todo' }, ...day.todo.map((t) => el('li', {}, t))) : null));
  });
  for (const g of PLAN.guides) {
    view.append(el('section', { className: 'guide' }, el('h2', { className: 'section' }, g.title), el('ul', {}, ...g.items.map((t) => el('li', {}, t)))));
  }
  requestAnimationFrame(() => document.getElementById(PLAN.days[todayIdx].name.toLowerCase())?.scrollIntoView({ block: 'start' }));
}

// ---------- Shopping ----------
function renderShop(view) {
  const all = PLAN.shop.flatMap((g) => g.items);
  const got = all.filter(([name]) => state.ticks[name]);
  view.append(
    el('h1', { className: 'display' }, 'Shopping'),
    el('p', { className: 'subline' }, got.length === all.length ? 'Everything is in the trolley' : `${all.length - got.length} to get, ${got.length} in the trolley`),
    el('p', { className: 'shop-note' }, PLAN.shopNote));

  const tick = (name, on) => { if (on) state.ticks[name] = true; else delete state.ticks[name]; save(); render(); };
  for (const g of PLAN.shop) {
    const left = g.items.filter(([name]) => !state.ticks[name]);
    if (!left.length) continue;
    view.append(el('h2', { className: 'section' }, g.title), el('ul', { className: 'items' }, ...left.map(([name, qty]) => {
      const li = el('li', { className: 'item' });
      li.append(
        el('button', { className: 'check', 'aria-label': `Tick ${name}`, on: { click: () => { li.classList.add('ticking'); setTimeout(() => tick(name, true), 220); } } }, svg(ICON_TICK)),
        el('span', { className: 'name' }, name, qty ? el('small', {}, qty) : null));
      return li;
    })));
  }
  if (got.length) {
    view.append(
      el('h2', { className: 'section' }, 'In the trolley'),
      el('div', { className: 'chips' }, ...got.map(([name]) =>
        el('button', { className: 'chip', 'aria-label': `Put back ${name}`, on: { click: () => tick(name, false) } }, el('span', {}, name)))),
      el('button', { className: 'link-btn wide', on: { click: () => { if (confirm('Clear all ticks for next week\'s shop?')) { state.ticks = {}; save(); render(); } } } }, 'Start next week\'s list'));
  }
}

// ---------- History ----------
function renderHistory(view) {
  const dates = [...new Set(entries.map((e) => e.date))].sort().reverse();
  view.append(el('h1', { className: 'display' }, 'History'));
  if (!dates.length) {
    view.append(el('p', { className: 'empty' }, 'Nothing logged yet. Snap your next meal from Today.'));
    return;
  }
  view.append(el('p', { className: 'subline' }, plural(dates.length, 'day') + ' logged'));
  const ul = el('ul', { className: 'days' });
  for (const date of dates) {
    const t = dayTotals(date);
    const shots = entriesOn(date);
    ul.append(el('li', {}, el('button', { className: 'day-row', on: { click: () => go(date === today() ? 'today' : 'day/' + date) } },
      el('span', { className: 'day-row-head' },
        el('b', {}, dateLabel(date)),
        el('span', { className: 'muted' }, `About ${t.carbs} g net carbs`)),
      el('span', { className: 'strip' }, ...shots.slice(0, 5).map(thumb)),
      el('span', { className: 'muted' }, t.checked ? `${t.on} on plan, ${t.close} close, ${t.off} off plan` : 'Not checked yet'))));
  }
  view.append(ul);
}

// ---------- backup ----------
async function exportBackup() {
  const out = await Promise.all(entries.map(async (e) => ({ ...e, status: e.status === 'checking' ? 'waiting' : e.status, photo: e.photo ? await dataUrl(e.photo) : null })));
  const name = `ketosnap-${today()}.json`;
  const file = new File([JSON.stringify({ app: 'ketosnap', version: VERSION, ticks: state.ticks, entries: out })], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = el('a', { href: URL.createObjectURL(file), download: name });
  document.body.append(a); a.click(); a.remove();
}

// Merge by meal id, so importing the same backup twice changes nothing.
async function importBackup(file) {
  try {
    const data = JSON.parse(await file.text());
    if (!data || data.app !== 'ketosnap' || !Array.isArray(data.entries)) throw new Error('not a KetoSnap backup');
    let added = 0;
    for (const e of data.entries) {
      if (entries.some((x) => x.id === e.id)) continue;
      const entry = { ...e, photoKey: null, photo: e.photo ? await (await fetch(e.photo)).blob() : null };
      entries.push(entry);
      await store(entry);
      added++;
    }
    render();
    toast(`Imported ${plural(added, 'meal')}`);
  } catch (e) {
    toast('Import failed: ' + e.message);
  }
}

function menuAction(action) {
  switch (action) {
    case 'settings': renderAccount(); $('#settings').showModal(); break;
    case 'install': if (installPrompt) { installPrompt.prompt(); installPrompt = null; $('#install-item').hidden = true; } break;
    case 'export': exportBackup(); break;
    case 'import': $('#import-file').click(); break;
  }
}

// ---------- wiring ----------
let installPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; $('#install-item').hidden = false; });
window.addEventListener('appinstalled', () => { installPrompt = null; $('#install-item').hidden = true; toast('Installed'); });
// Tapping the dark backdrop closes any dialog (phones have no Esc key).
document.addEventListener('click', (e) => { if (e.target instanceof HTMLDialogElement && e.target.open) e.target.close(); });
$('#entry').addEventListener('close', () => { openId = null; });
$('#back-btn').addEventListener('click', () => go('history'));
$('#menu-btn').addEventListener('click', () => $('#menu').showModal());
$('#menu').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  $('#menu').close();
  menuAction(btn.dataset.action);
});
function renderAccount() {
  const user = cloud.user();
  $('#signin-form').hidden = !!user;
  $('#account').hidden = !user;
  if (user) $('#set-user').textContent = user.email;
}
$('#signin-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.submitter;
  btn.disabled = true;
  try {
    await cloud.signIn($('#set-email').value.trim(), $('#set-password').value);
    $('#set-password').value = '';
    state.pulled = 0;
    $('#settings').close();
    render();
    toast('Signed in');
    catchUp();
  } catch (err) {
    toast(err.status === 400 ? 'Wrong email or password' : 'Sign in failed: ' + err.message);
  } finally {
    btn.disabled = false;
  }
});
$('#signout-btn').addEventListener('click', async () => {
  await cloud.signOut();
  renderAccount();
  render();
  toast('Signed out. Your meals stay on this phone');
});
$('#settings-close').addEventListener('click', () => $('#settings').close());
$('#import-file').addEventListener('change', (e) => { if (e.target.files[0]) importBackup(e.target.files[0]); e.target.value = ''; });
$('#photo-file').addEventListener('change', (e) => { if (e.target.files[0]) handlePhoto(e.target.files[0]); e.target.value = ''; });
$('#snap-btn').addEventListener('click', () => snap());
for (const b of document.querySelectorAll('.tabs [data-tab]')) b.addEventListener('click', () => go(b.dataset.tab));
window.addEventListener('hashchange', readRoute);
window.addEventListener('online', catchUp);
// Coming back to the app on a new day should show the new day.
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

// ---------- updates ----------
// version.js is the single source of truth; sw.js imports the same file for its cache name.
const VERSION = self.KS_VERSION || 'dev';
$('#set-version').textContent = VERSION;
if (localStorage.getItem(SEEN_KEY) !== VERSION) {
  if (localStorage.getItem(SEEN_KEY)) toast(`Updated to ${VERSION}`);
  localStorage.setItem(SEEN_KEY, VERSION);
}
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
  // The new worker calls skipWaiting + clients.claim; a reload here puts the new files on screen.
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
}
$('#update-btn').addEventListener('click', async () => {
  const reg = await navigator.serviceWorker?.getRegistration();
  if (!reg) { toast('Not installed as an app'); return; }
  toast('Checking…');
  await reg.update();
  if (!reg.installing && !reg.waiting) toast(`Up to date (${VERSION})`);
});

// exposed for console testing
window.KetoSnap = { state, entries: () => entries, addEntry, handlePhoto, analyze, tidy, planDay, autoSlot, push, pull, sync };

readRoute();
idb('readonly', (s) => s.getAll()).then((all) => {
  // Meals saved before sync existed have no `updated`: send them up once.
  for (const e of all) if (!e.updated) Object.assign(e, { updated: e.created, dirty: true });
  entries = all;
  render();
  catchUp();
}).catch((e) => toast('Could not open storage: ' + e.message));
})();
