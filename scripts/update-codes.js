#!/usr/bin/env node
/* Lay danh sach code con han tu codes.yar.gg/api/codes va ghi de js/codes-data.js.
 *   node scripts/update-codes.js          chi cap nhat file
 *   node scripts/update-codes.js --push   cap nhat + git commit + push (neu co thay doi)
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DATA_FILE = path.join(ROOT, 'js', 'codes-data.js');
const API = 'https://codes.yar.gg/api/codes';
const TZ = 'Asia/Ho_Chi_Minh';
const PUSH = process.argv.includes('--push');

const log = (...a) => console.log(`[${new Date().toISOString()}]`, ...a);

// Ngay dang M/DD theo gio VN, giong cach codes.yar.gg hien thi
function shortDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'numeric', day: '2-digit' }).formatToParts(d);
  const pick = (t) => p.find((x) => x.type === t).value;
  return `${pick('month')}/${pick('day')}`;
}

function isoDay(d) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d); // YYYY-MM-DD
}

function currentCodes() {
  try {
    const txt = fs.readFileSync(DATA_FILE, 'utf8');
    return new Set([...txt.matchAll(/code:\s*"([^"]+)"/g)].map((m) => m[1]));
  } catch {
    return new Set();
  }
}

function render(codes, today) {
  const rows = codes.map((c) => `    { code: ${JSON.stringify(c.code)}, date: ${JSON.stringify(c.date)} }`).join(',\n');
  return `/* Danh sach gift code Where Winds Meet - con han
 * Nguon: https://codes.yar.gg (danh sach do cong dong cap nhat)
 * Chup luc: ${today}
 */
window.WWM_CODES = {
  updated: '${today}',
  source: { name: 'codes.yar.gg', url: 'https://codes.yar.gg/' },
  codes: [
${rows}
  ]
};
`;
}

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

async function main() {
  const res = await fetch(API, { headers: { 'cache-control': 'no-cache' } });
  if (!res.ok) throw new Error(`API tra ve HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data.active) || data.active.length === 0) {
    throw new Error('API khong co code nao (active rong) - giu nguyen file cu');
  }

  const seen = new Set();
  const codes = data.active
    .filter((c) => c && typeof c.code === 'string' && !seen.has(c.code) && seen.add(c.code))
    .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
    .map((c) => ({ code: c.code, date: shortDate(c.addedAt) }));

  const before = currentCodes();
  const after = new Set(codes.map((c) => c.code));
  const added = [...after].filter((c) => !before.has(c));
  const removed = [...before].filter((c) => !after.has(c));

  log(`API: ${codes.length} code con han (nguon cap nhat ${data.updatedAt}). Moi: ${added.length}, het han/bo: ${removed.length}`);
  if (added.length) log('Code moi:', added.join(' '));

  if (!added.length && !removed.length) {
    log('Khong co thay doi, khong ghi file.');
    return;
  }

  const today = isoDay(new Date());
  fs.writeFileSync(DATA_FILE, render(codes, today));
  log(`Da ghi ${path.relative(ROOT, DATA_FILE)}`);

  if (!PUSH) return;
  git('add', 'js/codes-data.js');
  const msg = `Tu dong cap nhat code ${today}: +${added.length} moi, -${removed.length} het han`;
  git('commit', '-m', msg);
  git('push', 'origin', 'HEAD');
  log(`Da commit + push: ${msg}`);
}

main().catch((err) => {
  log('LOI:', err.message);
  process.exit(1);
});
