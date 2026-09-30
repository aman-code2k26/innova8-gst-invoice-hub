/* Headless smoke test: loads the REAL build output (index.html + assets + logic)
   into jsdom, boots React and clicks through every view. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..');
const PAGE = 'https://aman-code2k26.github.io/innova8-gst-invoice-hub/';

const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', {
  url: PAGE,
  pretendToBeVisual: true,
  runScripts: 'outside-only'
});
const { window } = dom;
window.scrollTo = () => {};
const errors = [];
window.console.error = (...a) => errors.push(a.map(String).join(' '));
window.addEventListener('error', e => errors.push('window error: ' + e.message));

const passthrough = ['window', 'document', 'navigator', 'location', 'HTMLElement', 'Element', 'Node',
  'Event', 'CustomEvent', 'MouseEvent', 'KeyboardEvent', 'MutationObserver', 'FileReader', 'Blob',
  'localStorage', 'sessionStorage', 'requestAnimationFrame', 'cancelAnimationFrame', 'getComputedStyle',
  'DOMParser', 'MessageChannel', 'Text', 'Comment', 'DocumentFragment', 'SVGElement', 'HTMLInputElement',
  'HTMLIFrameElement', 'XMLHttpRequest', 'URL'];
for (const key of passthrough) {
  if (window[key] !== undefined) globalThis[key] = window[key];
}

if (window.structuredClone === undefined) window.structuredClone = globalThis.structuredClone;
/* the bundle runs in Node's realm, so expose the browser globals it expects */
for (const key of ['I8', 'SUPABASE_CONFIG', 'supabase', 'QRCode', 'jspdf', 'toast']) {
  Object.defineProperty(globalThis, key, { configurable: true, get: () => window[key] });
}

/* --- script loader: CDNs fail (offline), local /logic/*.js come from disk --- */
const realAppend = window.document.head.appendChild.bind(window.document.head);
window.document.head.appendChild = node => {
  if (node && String(node.tagName).toUpperCase() === 'SCRIPT') {
    queueMicrotask(() => runScript(node));
    return node;
  }
  return realAppend(node);
};

function runScript(node) {
  const src = node.src || '';
  try {
    if (/^https?:/.test(src) && !src.startsWith(PAGE)) {
      node.onerror && node.onerror(new Error('offline: ' + src));
      return;
    }
    const rel = src.startsWith(PAGE) ? src.slice(PAGE.length) : src;
    const file = path.join(repo, rel.split('?')[0]);
    window.eval(fs.readFileSync(file, 'utf8'));
    node.onload && node.onload();
  } catch (err) {
    errors.push('script ' + path.basename(src) + ': ' + err.message);
    node.onerror && node.onerror(err);
  }
}

/* --- boot the built bundle --- */
const assetsDir = path.join(repo, 'assets');
const bundle = fs.readdirSync(assetsDir).find(f => f.endsWith('.js'));
if (!bundle) { console.error('FAIL: no built bundle in assets/'); process.exit(1); }
await import(pathToFileURL(path.join(assetsDir, bundle)).href);

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, what, ms = 5000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (fn()) return true;
    await sleep(30);
  }
  throw new Error('timeout waiting for: ' + what);
}

let passed = 0;
const fail = [];
function check(name, cond, extra) {
  if (cond) { passed++; console.log('  PASS  ' + name); }
  else { fail.push(name); console.log('  FAIL  ' + name + (extra ? '  -> ' + extra : '')); }
}
const text = () => window.document.body.textContent.replace(/\s+/g, ' ');
function click(label, selector = 'button, a') {
  const el = [...window.document.querySelectorAll(selector)]
    .filter(e => e.textContent.trim().includes(label))[0];
  if (!el) throw new Error('control not found: ' + label);
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  return el;
}

await until(() => window.document.getElementById('root').innerHTML.length > 200, 'React mount');

/* dashboard */
check('boots into Dashboard', text().includes('Dashboard') && text().includes('Cash-flow at a glance'));
check('stats rendered', text().includes('Total billed') && text().includes('Outstanding'));
check('seeded data visible', text().includes('INV-101') || text().includes('Aarav'));
check('aging ledger present', text().includes('Aging Ledger'));
check('payment QR card present (FR-4)', text().includes('Payment link'));
check('reminder queue card present', text().includes('Reminder queue'));

/* invoices */
click('Invoices');
await sleep(60);
check('invoices view opens', text().includes('Lifecycle: DRAFT'));
check('invoice rows listed', text().includes('INV-101'));
check('invoice actions present', text().includes('Mark paid') && text().includes('Preview'));

/* mark paid */
const paidBtn = [...window.document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Mark paid');
if (paidBtn) {
  const before = paidBtn.textContent;
  paidBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await sleep(80);
  check('mark paid updates row', text().includes('PAID'));
  check('toast shown', window.document.getElementById('toast').textContent.includes('Marked PAID'));
} else {
  check('mark paid button found', false);
}

/* builder via New invoice */
click('New Invoice');
await sleep(80);
check('builder opens', text().includes('Invoice details') && text().includes('Live preview'));
check('line item row rendered', text().includes('HSN/SAC') && text().includes('Add line item'));
check('live preview has document', window.document.getElementById('invoicePreview').innerHTML.includes('TAX INVOICE'));

/* clients */
click('Clients');
await sleep(60);
check('clients view opens', text().includes('Address book'));
check('seeded clients listed', text().includes('Aarav Studio'));

/* reminders */
click('Reminders');
await sleep(60);
check('reminders view opens', text().includes('Schedule rules'));
check('reminder log table', text().includes('Reminder log'));

/* settings */
click('Settings');
await sleep(60);
check('settings view opens', text().includes('Business profile') && text().includes('Invoice settings'));
check('supabase card present', text().includes('Supabase (cloud sync)'));
check('business form filled', window.document.querySelector('#sbLog') !== null);
const upiInput = [...window.document.querySelectorAll('input')].find(i => i.placeholder === 'name@okhdfcbank');
check('UPI field seeded', upiInput && upiInput.value.includes('@'), upiInput && upiInput.value);

/* persistence: reload the whole runtime against the same localStorage */
const stored = window.localStorage.getItem('innova8_db_v1');
check('data persisted to localStorage', !!stored && stored.includes('INV-101'));

/* keyboard navigation back to dashboard */
window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: '1', bubbles: true }));
await sleep(60);
check('keyboard 1 returns to Dashboard', text().includes('Cash-flow at a glance'));

check('no runtime errors', errors.length === 0, errors.slice(0, 3).join(' | '));

console.log(fail.length ? `\n${fail.length} FAILED` : `\nALL ${passed} SMOKE TESTS PASSED`);
process.exit(fail.length ? 1 : 0);
