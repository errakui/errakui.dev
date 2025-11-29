import { Router, Request, Response } from 'express';
import { testerController, udidController, buildController } from './controllers';
import { requireAuth } from './middleware/auth';
import { TesterRepository } from './models/tester';
import { DeviceRepository } from './models/device';
import { BuildRepository } from './models/build';
import * as appStoreConnectService from './services/appStoreConnectService';
import * as ciService from './services/ciService';

const router = Router();

// ==========================================
// REGISTRAZIONE TESTER (pubblico)
// ==========================================

router.post('/register', testerController.register);
router.get('/testers', requireAuth, testerController.listTesters);
router.get('/testers/:id', requireAuth, testerController.getTester);

// ==========================================
// UDID / MOBILECONFIG
// ==========================================

router.get('/get-udid', udidController.getUdid);
router.post('/udid/callback', udidController.udidCallback);

// GET /registration-complete - Pagina di conferma dopo registrazione dispositivo
router.get('/registration-complete', (req: Request, res: Response) => {
  const testerId = req.query.testerId as string;
  
  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Registrazione Completata!</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      padding: 20px;
    }
    .card {
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 24px;
      padding: 50px 40px;
      max-width: 420px;
      width: 100%;
      text-align: center;
    }
    .icon { font-size: 80px; margin-bottom: 20px; }
    h1 { font-size: 1.8rem; margin-bottom: 15px; }
    p { font-size: 1.1rem; opacity: 0.9; line-height: 1.6; margin-bottom: 15px; }
    .note { font-size: 0.9rem; opacity: 0.7; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.2); }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h1>Dispositivo Registrato!</h1>
    <p>Il tuo dispositivo è stato registrato con successo.</p>
    <p>Riceverai un'email con il link per scaricare l'app non appena la build sarà pronta.</p>
    <p class="note">Puoi rimuovere il profilo "Registrazione OK" dalle Impostazioni → Generali → VPN e gestione dispositivi</p>
  </div>
</body>
</html>`;

  res.send(html);
});


// ==========================================
// BUILD
// ==========================================

router.post('/build-completed', buildController.buildCompleted);
router.get('/builds', requireAuth, buildController.listBuilds);
router.get('/builds/:id', requireAuth, buildController.getBuild);

// ==========================================
// HEALTH CHECK
// ==========================================

router.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ==========================================
// TEST APP STORE CONNECT (ADMIN)
// ==========================================

router.get('/admin/test-asc', requireAuth, async (req: Request, res: Response) => {
  try {
    const devices = await appStoreConnectService.listDevices();
    res.json({
      success: true,
      message: 'Connessione App Store Connect OK!',
      devicesCount: devices.data?.length || 0,
      devices: devices.data?.slice(0, 5).map((d: any) => ({
        name: d.attributes?.name,
        udid: d.attributes?.udid?.substring(0, 8) + '...',
        platform: d.attributes?.platform,
        status: d.attributes?.status,
      }))
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Errore connessione App Store Connect',
      error: error.message
    });
  }
});

// ==========================================
// ADMIN DASHBOARD (CRM)
// ==========================================

router.get('/admin', requireAuth, async (req: Request, res: Response) => {
  // Carica device da App Store Connect
  let ascDevices: any[] = [];
  try {
    const ascData = await appStoreConnectService.listDevices();
    ascDevices = ascData.data || [];
  } catch (e) {
    console.error('Errore caricamento ASC devices:', e);
  }

  const testers = TesterRepository.findAll();
  const devices = DeviceRepository.findAll();

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CRM - errakui.dev</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif; background: #000; color: #fff; min-height: 100vh; padding: 40px; }
    h1 { font-size: 28px; font-weight: 600; margin-bottom: 40px; }
    .section { margin-bottom: 50px; }
    .section-title { font-size: 14px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; }
    .card { background: #111; border-radius: 12px; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 16px 20px; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #222; }
    td { padding: 16px 20px; font-size: 14px; border-bottom: 1px solid #1a1a1a; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #0a0a0a; }
    .udid { font-family: 'SF Mono', Monaco, monospace; font-size: 13px; color: #0af; }
    .email { color: #fff; }
    .model { color: #888; }
    .status { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .status-ok { background: #0f2; color: #000; }
    .status-pending { background: #f90; color: #000; }
    .empty { padding: 40px; text-align: center; color: #444; }
    .refresh { position: fixed; top: 40px; right: 40px; background: #222; border: none; color: #fff; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; }
    .refresh:hover { background: #333; }
    .count { background: #222; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-left: 10px; }
  </style>
</head>
<body>
  <button class="refresh" onclick="location.reload()">Aggiorna</button>
  <h1>Device Management</h1>

  <div class="section">
    <div class="section-title">Dispositivi su App Store Connect <span class="count">${ascDevices.length}</span></div>
    <div class="card">
      ${ascDevices.length === 0 ? '<div class="empty">Nessun dispositivo</div>' : `
      <table>
        <thead><tr><th>Nome</th><th>UDID</th><th>Piattaforma</th><th>Status</th></tr></thead>
        <tbody>
          ${ascDevices.map((d: any) => `<tr>
            <td class="email">${d.attributes?.name || '-'}</td>
            <td class="udid">${d.attributes?.udid || '-'}</td>
            <td class="model">${d.attributes?.platform || '-'}</td>
            <td><span class="status ${d.attributes?.status === 'ENABLED' ? 'status-ok' : 'status-pending'}">${d.attributes?.status || '-'}</span></td>
          </tr>`).join('')}
        </tbody>
      </table>`}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Registrazioni Recenti <span class="count">${testers.length}</span></div>
    <div class="card">
      ${testers.length === 0 ? '<div class="empty">Nessuna registrazione</div>' : `
      <table>
        <thead><tr><th>Email</th><th>UDID</th><th>Modello</th><th>iOS</th><th>Status</th></tr></thead>
        <tbody>
          ${testers.map((t: any) => {
            const device = devices.find((d: any) => d.udid === t.udid);
            return `<tr>
              <td class="email">${t.email}</td>
              <td class="udid">${t.udid || '-'}</td>
              <td class="model">${device?.product || '-'}</td>
              <td class="model">${device?.iosVersion || '-'}</td>
              <td><span class="status ${t.udid ? 'status-ok' : 'status-pending'}">${t.udid ? 'Registrato' : 'In attesa'}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`}
    </div>
  </div>

</body>
</html>`;

  res.send(html);
});

// ==========================================
// HOME PAGE
// ==========================================

router.get('/', (req: Request, res: Response) => {
  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>errakui.dev</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #0a0a0f; min-height: 100vh; display: flex; align-items: center; justify-content: center; color: white; }
    .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 40px; max-width: 380px; width: 90%; text-align: center; }
    h1 { font-size: 1.5rem; margin-bottom: 30px; font-weight: 500; }
    input { width: 100%; padding: 14px 16px; border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; background: rgba(0,0,0,0.4); color: white; font-size: 1rem; margin-bottom: 15px; }
    input:focus { outline: none; border-color: #667eea; }
    input::placeholder { color: rgba(255,255,255,0.3); }
    button { width: 100%; padding: 14px; border: none; border-radius: 10px; background: #667eea; color: white; font-size: 1rem; font-weight: 600; cursor: pointer; }
    button:disabled { opacity: 0.5; }
    .result { margin-top: 20px; display: none; }
    .result.show { display: block; }
    .download-btn { display: block; padding: 14px; background: #22c55e; border-radius: 10px; color: white; text-decoration: none; font-weight: 600; margin-top: 15px; }
    .error { color: #ef4444; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Installa App</h1>
    <form id="f">
      <input type="email" id="email" placeholder="Email" required>
      <button type="submit" id="btn">Continua</button>
    </form>
    <div id="result" class="result"></div>
  </div>
  <script>
    document.getElementById('f').onsubmit = async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn');
      const result = document.getElementById('result');
      btn.disabled = true;
      try {
        const r = await fetch('/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: document.getElementById('email').value })
        });
        const d = await r.json();
        if (r.ok) {
          result.className = 'result show';
          result.innerHTML = '<a href="' + d.nextUrl + '" class="download-btn">Scarica Profilo</a>';
        } else {
          result.className = 'result show';
          result.innerHTML = '<p class="error">' + (d.error || 'Errore') + '</p>';
        }
      } catch (err) {
        result.className = 'result show';
        result.innerHTML = '<p class="error">Errore di connessione</p>';
      }
      btn.disabled = false;
    };
  </script>
</body>
</html>`;

  res.send(html);
});

export default router;
