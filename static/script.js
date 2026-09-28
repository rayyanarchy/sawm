const $ = (id) => document.getElementById(id);
const THEME_KEY = 'sawm-theme', LOC_KEY = 'sawm-location', METHOD_KEY = 'sawm-method';
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
};

/* Theme */
function applyTheme(dark) {
  document.documentElement.classList.toggle('dark', dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#000000' : '#ffffff');
}
applyTheme(store.get(THEME_KEY) ? store.get(THEME_KEY) === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);
$('themeToggle').addEventListener('click', () => {
  const dark = !document.documentElement.classList.contains('dark');
  applyTheme(dark);
  store.set(THEME_KEY, dark ? 'dark' : 'light');
});

/* Countdown: works in the fasting location's timezone, not the viewer's */
const timer = document.querySelector('.timer');
const CIRC = 678.6;

function minutesNow(tz) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(new Date());
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return (+v.hour % 24) * 60 + +v.minute + +v.second / 60;
}
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
function fmt(mins) {
  const total = Math.max(0, Math.ceil(mins));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function tick() {
  const start = toMin(timer.dataset.suhoor), end = toMin(timer.dataset.iftar);
  let now;
  try { now = minutesNow(timer.dataset.tz); } catch { now = new Date().getHours() * 60 + new Date().getMinutes(); }

  let label, left, sub, progress;
  if (now >= start && now < end) {
    label = 'Time left to fast'; left = end - now;
    progress = 1 - (now - start) / (end - start);
    sub = `${Math.round((1 - progress) * 100)}% complete`;
  } else {
    const untilSuhoor = now < start ? start - now : 24 * 60 - now + start;
    label = now >= end ? 'Fast complete' : 'Fast begins in';
    left = untilSuhoor;
    progress = 0;
    sub = now >= end ? 'Next fast begins in' : 'Suhoor is ending soon';
    if (now >= end) sub = 'Well done today. Next fast in';
    else sub = 'Finish eating before then';
  }
  $('timerLabel').textContent = label;
  $('countdown').textContent = fmt(left);
  $('timerSub').textContent = sub;
  $('bar').style.strokeDashoffset = CIRC * (1 - progress);
}
tick();
setInterval(tick, 1000);

/* Settings */
const modal = $('settingsModal');
let lastFocus = null;
function openModal() {
  lastFocus = document.activeElement;
  try { const c = JSON.parse(store.get(LOC_KEY)); if (c) $('settingsLocation').value = `${c.city}, ${c.country}`; } catch {}
  $('settingsMethod').value = store.get(METHOD_KEY) || '2';
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
  setTimeout(() => $('settingsLocation').focus(), 50);
}
function closeModal() {
  modal.classList.remove('show');
  document.body.style.overflow = '';
  lastFocus?.focus();
}
function go(city, country) {
  store.set(LOC_KEY, JSON.stringify({ city, country }));
  store.set(METHOD_KEY, $('settingsMethod').value);
  location.href = `/?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${$('settingsMethod').value}`;
}
function save() {
  const [city, country] = $('settingsLocation').value.split(',').map((s) => s.trim());
  if (!city || !country) { $('settingsLocation').focus(); $('settingsLocation').placeholder = 'Try "Dubai, UAE"'; return; }
  go(city, country);
}

$('settingsBtn').addEventListener('click', openModal);
$('closeSettings').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('show')) closeModal(); });
$('updateLocationSettings').addEventListener('click', save);
$('settingsLocation').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } });

$('geolocateBtn').addEventListener('click', () => {
  if (!navigator.geolocation) return;
  const btn = $('geolocateBtn'); btn.disabled = true;
  navigator.geolocation.getCurrentPosition(async ({ coords }) => {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`);
      const { address } = await r.json();
      go(address.city || address.town || address.village || address.municipality, address.country);
    } catch { $('settingsLocation').placeholder = "Couldn't find you. Type a city."; btn.disabled = false; }
  }, () => { $('settingsLocation').placeholder = 'Location blocked. Type a city.'; btn.disabled = false; }, { timeout: 10000, maximumAge: 300000 });
});

$('year').textContent = new Date().getFullYear();
