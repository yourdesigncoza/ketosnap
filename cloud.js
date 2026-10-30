/* KetoSnap's link to Supabase: sign-in, the meals table, the photos bucket and the check-meal function.
   The URL and publishable key are public by design. Row level security keeps every row and photo to the
   signed-in user, and sign-ups are off, so there is one account. */
(() => {
'use strict';

const BASE = 'https://yzwrywrrcdfzcrahdcgl.supabase.co';
const KEY = 'sb_publishable_yi0tY5V8LkkX_IRyNNuwcQ_jDR4ERmB';
const SESSION_KEY = 'ketosnap.session';

// ---------- session ----------
let session = null;
try { session = JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { /* signed out */ }

function keep(s) {
  session = s;
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else localStorage.removeItem(SESSION_KEY);
}

async function call(path, opts = {}) {
  const res = await fetch(BASE + path, { ...opts, headers: { apikey: KEY, ...opts.headers } });
  if (!res.ok) {
    let msg = res.statusText;
    try { const b = await res.json(); msg = b.msg || b.message || b.error_description || b.error || msg; } catch (e) { /* keep statusText */ }
    throw Object.assign(new Error(msg), { status: res.status });
  }
  return res;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function grant(type, body) {
  const res = await call('/auth/v1/token?grant_type=' + type, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) });
  const s = await res.json();
  keep({ access: s.access_token, refresh: s.refresh_token, expires: s.expires_at, user: { id: s.user.id, email: s.user.email } });
}

// A valid access token, refreshed a minute before it runs out. One refresh at a time: a used refresh token is
// spent. A rejected refresh token signs out; a network failure keeps the session for next time.
let refreshing = null;
async function token() {
  if (!session) throw Object.assign(new Error('signed out'), { status: 401 });
  if (session.expires - 60 > Date.now() / 1000) return session.access;
  refreshing ??= grant('refresh_token', { refresh_token: session.refresh })
    .catch((e) => { if (e.status === 400 || e.status === 401) keep(null); throw e; })
    .finally(() => { refreshing = null; });
  await refreshing;
  return session.access;
}

const authed = async (path, opts = {}) => call(path, { ...opts, headers: { Authorization: 'Bearer ' + await token(), ...opts.headers } });

// ---------- the API the app uses ----------
self.KetoCloud = {
  user: () => session && session.user,
  signIn: (email, password) => grant('password', { email, password }),
  async signOut() {
    try { await authed('/auth/v1/logout', { method: 'POST' }); } catch (e) { /* signed out locally either way */ }
    keep(null);
  },

  // The model's JSON answer for one meal, or an error.
  checkMeal: async (messages) => (await authed('/functions/v1/check-meal', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ messages }) })).json(),

  // Rows changed after `since` (ms, phone clock), oldest first.
  meals: async (since) => (await authed(`/rest/v1/meals?select=*&updated=gt.${since}&order=updated`)).json(),
  saveMeal: (row) => authed('/rest/v1/meals', {
    method: 'POST',
    headers: { ...JSON_HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(row),
  }),
  // Deleted meals stay as a marked row, so other devices learn of the delete; the photo goes.
  async dropMeal(id, photo) {
    await authed(`/rest/v1/meals?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH', headers: { ...JSON_HEADERS, Prefer: 'return=minimal' }, body: JSON.stringify({ deleted: true, photo: null, updated: Date.now() }),
    });
    if (photo) await self.KetoCloud.dropPhoto(photo);
  },
  // A photo already gone counts as deleted.
  dropPhoto: (path) => authed('/storage/v1/object/photos/' + path, { method: 'DELETE' }).catch((e) => { if (e.status !== 404 && e.status !== 400) throw e; }),

  putPhoto: (path, blob) => authed('/storage/v1/object/photos/' + path, { method: 'POST', headers: { 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }, body: blob }),
  getPhoto: async (path) => (await authed('/storage/v1/object/authenticated/photos/' + path)).blob(),
};
})();
