/* WWM Codes - trang danh sach gift code + overlay copy tung code
 *
 * Tien trinh (code da dung, danh sach dang mo) luu o localStorage nen tai lai
 * trang van khong mat. Khong gui gi len may chu, khong co backend.
 */

const $ = (id) => document.getElementById(id);
const DATA = window.WWM_CODES || { codes: [], updated: '', source: {} };

const KEY_USED = 'wwm.used.v1';
const KEY_OV = 'wwm.overlay.v1';

/* ---------- Luu tru ---------- */

function read(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v === null || v === undefined ? fallback : v;
  } catch (_) {
    return fallback; // che do rieng tu / chan cookie
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {
    /* khong luu duoc thi phien nay van chay binh thuong */
  }
}

/* code da dung, dung chung cho ca trang va overlay */
let used = new Set(read(KEY_USED, []));

function saveUsed() {
  write(KEY_USED, [...used]);
}

/* ---------- Trang chinh ---------- */

let filter = 'all';
let query = '';

function visible() {
  const q = query.trim().toUpperCase();
  return DATA.codes.filter((c) => {
    if (filter === 'used' && !used.has(c.code)) return false;
    if (filter === 'unused' && used.has(c.code)) return false;
    return !q || c.code.includes(q);
  });
}

function paintStats() {
  const u = DATA.codes.filter((c) => used.has(c.code)).length;
  $('stat-used').textContent = String(u);
  $('stat-left').textContent = String(DATA.codes.length - u);
  $('pick-n').textContent = String(DATA.codes.length);
}

function paintList() {
  const rows = visible();
  const list = $('list');
  list.innerHTML = '';
  $('empty').classList.toggle('hidden', rows.length > 0);

  for (const c of rows) {
    const isUsed = used.has(c.code);

    const el = document.createElement('div');
    el.className = 'item' + (isUsed ? ' used' : '');

    const code = document.createElement('span');
    code.className = 'code';
    code.textContent = c.code;

    const date = document.createElement('span');
    date.className = 'date';
    date.textContent = c.date;

    const copy = document.createElement('button');
    copy.textContent = 'Copy';
    copy.addEventListener('click', async () => {
      if (await toClipboard(c.code)) {
        markUsed(c.code, true);
        toast(`Đã copy ${c.code}`);
      }
    });

    const mark = document.createElement('button');
    mark.className = 'mark';
    mark.textContent = isUsed ? '↺' : '✓';
    mark.title = isUsed ? 'Bỏ đánh dấu đã dùng' : 'Đánh dấu đã dùng';
    mark.addEventListener('click', () => markUsed(c.code, !isUsed));

    el.append(code, date, copy, mark);
    list.appendChild(el);
  }
}

function markUsed(code, on) {
  if (on) used.add(code);
  else used.delete(code);
  saveUsed();
  paintStats();
  paintList();
  if (ov.open) ov.paint();
}

function repaint() {
  paintStats();
  paintList();
}

/* ---------- Clipboard ---------- */

async function toClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    // Safari cu / trang khong bao mat: quay ve cach cu
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      if (ok) return true;
    } catch (_) { /* bo qua */ }
    toast('Trình duyệt chặn copy — bấm giữ để chọn rồi copy tay');
    return false;
  }
}

let toastTimer = null;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1400);
}

/* ---------- Overlay ---------- */

const ov = {
  open: false,
  items: [],     // danh sach code dang chay
  stack: [],     // thu tu da copy, phan tu cuoi = vua copy
  done: new Set(),
  linked: false, // true = lay tu danh sach chinh -> dong bo trang thai "da dung"

  start(items, linked) {
    this.items = items.slice();
    this.linked = !!linked;
    this.done = new Set();
    this.stack = [];

    if (linked) {
      // code da dung tu truoc thi coi nhu da xong
      this.items.forEach((c, i) => { if (used.has(c)) this.done.add(i); });
    }

    this.open = true;
    $('overlay').classList.remove('hidden', 'mini');
    this.paint();
    this.save();
  },

  next() {
    for (let i = 0; i < this.items.length; i++) if (!this.done.has(i)) return i;
    return -1;
  },

  async copy(i) {
    if (i < 0 || i >= this.items.length) return;
    if (!(await toClipboard(this.items[i]))) return;

    this.done.add(i);
    this.stack = this.stack.filter((x) => x !== i);
    this.stack.push(i);

    if (this.linked) { used.add(this.items[i]); saveUsed(); repaint(); }

    const cur = $('ov-current');
    cur.classList.remove('flash');
    void cur.offsetWidth;
    cur.classList.add('flash');

    this.paint();
    this.save();
    toast(`Đã copy ${this.items[i]}`);
  },

  undo() {
    const i = this.stack.pop();
    if (i === undefined) return;
    this.done.delete(i);
    if (this.linked) { used.delete(this.items[i]); saveUsed(); repaint(); }
    this.paint();
    this.save();
  },

  restart() {
    this.done = new Set();
    this.stack = [];
    this.paint();
    this.save();
  },

  close() {
    this.open = false;
    $('overlay').classList.add('hidden');
    write(KEY_OV, null);
  },

  save() {
    write(KEY_OV, this.open
      ? { items: this.items, done: [...this.done], stack: this.stack, linked: this.linked }
      : null);
  },

  restore() {
    const s = read(KEY_OV, null);
    if (!s || !Array.isArray(s.items) || !s.items.length) return;
    this.items = s.items;
    this.done = new Set(Array.isArray(s.done) ? s.done : []);
    this.stack = Array.isArray(s.stack) ? s.stack : [];
    this.linked = !!s.linked;
    this.open = true;
    $('overlay').classList.remove('hidden');
    this.paint();
  },

  paint() {
    const n = this.next();
    const total = this.items.length;
    const done = this.done.size;
    const allDone = total > 0 && done === total;

    $('ov-progress').textContent = `${done} / ${total}`;
    $('ov-fill').style.width = total ? `${(done / total) * 100}%` : '0';
    $('ov-code').textContent = n >= 0 ? this.items[n] : '—';
    $('ov-current').classList.toggle('hidden', allDone);
    $('ov-done').classList.toggle('hidden', !allDone);
    $('ov-undo').disabled = this.stack.length === 0;

    const last = this.stack.length ? this.stack[this.stack.length - 1] : -1;
    const box = $('ov-list');
    box.innerHTML = '';

    this.items.forEach((code, i) => {
      const row = document.createElement('div');
      row.className = 'ov-row';
      row.dataset.s = this.done.has(i) ? (i === last ? 'recent' : 'old') : (i === n ? 'next' : 'pending');

      const num = document.createElement('span');
      num.className = 'n';
      num.textContent = String(i + 1);

      const txt = document.createElement('span');
      txt.className = 't';
      txt.textContent = code;

      row.append(num, txt);
      row.addEventListener('click', () => this.copy(i));
      box.appendChild(row);
    });

    const cur = box.children[n >= 0 ? n : 0];
    if (cur) cur.scrollIntoView({ block: 'nearest' });
  }
};

/* ---------- Su kien ---------- */

function closeModals() {
  $('picker').classList.add('hidden');
  $('manual').classList.add('hidden');
}

$('btn-start').addEventListener('click', () => {
  $('picker').classList.remove('hidden');
});

$('pick-all').addEventListener('click', () => {
  closeModals();
  ov.start(DATA.codes.map((c) => c.code), true);
});

$('pick-manual').addEventListener('click', () => {
  $('picker').classList.add('hidden');
  $('manual').classList.remove('hidden');
  $('manual-input').focus();
});

function parseManual(raw) {
  return raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

$('manual-input').addEventListener('input', (e) => {
  const n = parseManual(e.target.value).length;
  $('manual-count').textContent = `${n} code`;
  $('manual-go').disabled = n === 0;
});

$('manual-go').addEventListener('click', () => {
  const items = parseManual($('manual-input').value);
  if (!items.length) return;
  closeModals();
  ov.start(items, false);
});

for (const el of document.querySelectorAll('[data-close]')) {
  el.addEventListener('click', closeModals);
}
for (const m of [$('picker'), $('manual')]) {
  m.addEventListener('mousedown', (e) => { if (e.target === m) closeModals(); });
}

$('ov-current').addEventListener('click', () => ov.copy(ov.next()));
$('ov-undo').addEventListener('click', () => ov.undo());
$('ov-restart').addEventListener('click', () => ov.restart());
$('ov-close').addEventListener('click', () => ov.close());
$('ov-min').addEventListener('click', () => $('overlay').classList.toggle('mini'));

$('search').addEventListener('input', (e) => { query = e.target.value; paintList(); });

$('tabs').addEventListener('click', (e) => {
  const b = e.target.closest('.tab');
  if (!b) return;
  filter = b.dataset.f;
  for (const t of document.querySelectorAll('.tab')) t.classList.toggle('on', t === b);
  paintList();
});

$('btn-reset').addEventListener('click', () => {
  used = new Set();
  saveUsed();
  if (ov.open && ov.linked) ov.restart();
  repaint();
  toast('Đã xoá tiến trình');
});

document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea')) return;
  if (!$('picker').classList.contains('hidden') || !$('manual').classList.contains('hidden')) {
    if (e.key === 'Escape') closeModals();
    return;
  }
  if (!ov.open) return;

  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ov.copy(ov.next()); }
  else if (e.key === 'Escape') { e.preventDefault(); ov.close(); }
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); ov.undo(); }
});

/* ---------- Phim tat ---------- */

// macOS dung Cmd, con lai dung Ctrl
const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
$('k-undo').textContent = IS_MAC ? '\u2318Z' : 'Ctrl+Z';

/* ---------- Duong dan tai app ---------- */

const REPO = 'https://github.com/huytran19/overlay-copy';
const REL = `${REPO}/releases/latest/download`;

// ten file khong co so phien ban -> link nay dung cho moi ban phat hanh sau nay
$('dl-portable').href = `${REL}/OverlayCopy-portable.exe`;
$('dl-setup').href = `${REL}/OverlayCopy-setup.exe`;
$('dl-repo').href = REPO;

/* ---------- Khoi dong ---------- */

$('updated').textContent = DATA.updated || '—';
repaint();
ov.restore();
