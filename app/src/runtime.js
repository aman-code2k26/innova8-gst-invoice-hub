/* Loads the classic (non-bundled) runtime pieces before React mounts:
   1. CDN libraries — optional, the app degrades gracefully without them
   2. window.I8 domain modules from /logic (core → storage → gst → invoice → reminders)
   Paths resolve against document.baseURI so the app works on a sub-path. */

const CDN = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcode/1.5.3/qrcode.min.js'
];

const LOGIC = ['supabase-config', 'core', 'storage', 'gst', 'invoice', 'reminders'];

function absolute(path) {
  const base = new URL(import.meta.env.BASE_URL || './', document.baseURI);
  return new URL(path, base).href;
}

function loadScript(url) {
  return new Promise(resolve => {
    const el = document.createElement('script');
    el.src = url;
    el.async = false;
    el.onload = () => resolve(null);
    el.onerror = () => resolve(new Error('Could not load ' + url));
    document.head.appendChild(el);
  });
}

export async function loadRuntime() {
  const cdn = await Promise.all(CDN.map(url => loadScript(url)));
  const failed = [];
  for (const name of LOGIC) {
    const err = await loadScript(absolute('logic/' + name + '.js'));
    if (err) failed.push(err);
  }
  return { cdnFailed: cdn.filter(Boolean).length, logicFailed: failed };
}
