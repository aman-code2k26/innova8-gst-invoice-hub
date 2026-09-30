import { createRoot } from 'react-dom/client';
import QRCode from 'qrcode';
import './styles.css';
import App from './App.jsx';
import { loadRuntime } from './runtime.js';

/* qrcode ships inside the bundle (the old CDN URL 404'd, so no QR could be drawn);
   the logic layer expects a global QRCode with .toDataURL() */
window.QRCode = QRCode;

function fatal(message) {
  const root = document.getElementById('root');
  root.innerHTML =
    '<div style="padding:40px;font-family:system-ui;max-width:640px;margin:0 auto">' +
    '<h1 style="font-size:20px">Innova8 could not start</h1>' +
    '<p style="color:#475467;line-height:1.6">' + message + '</p>' +
    '<p style="color:#475467">The domain scripts live in <code>app/public/logic/</code> — ' +
    'run <code>npm run build</code> inside <code>app/</code> again.</p></div>';
}

loadRuntime()
  .then(({ logicFailed }) => {
    if (logicFailed.length) {
      fatal('Missing runtime file(s): ' + logicFailed.map(e => e.message).join(', '));
      return;
    }
    createRoot(document.getElementById('root')).render(<App />);
  })
  .catch(err => { console.error('BOOT ERROR', err); fatal(err && err.message ? err.message : String(err)); });
