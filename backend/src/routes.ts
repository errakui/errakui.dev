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

router.get('/admin', requireAuth, (req: Request, res: Response) => {
  const testers = TesterRepository.findAll();
  const builds = BuildRepository.findAll();
  const devices = DeviceRepository.findAll();

  const statusColors: Record<string, string> = {
    'EMAIL_COLLECTED': '#f59e0b',
    'DEVICE_REGISTERED': '#3b82f6',
    'BUILD_PENDING': '#8b5cf6',
    'BUILD_COMPLETED': '#22c55e',
    'EMAIL_SENT': '#10b981',
    'PENDING': '#f59e0b',
    'IN_PROGRESS': '#3b82f6',
    'COMPLETED': '#22c55e',
    'FAILED': '#ef4444',
  };

  const testersRows = testers.map((t: any) => {
    const color = statusColors[t.status] || '#666';
    const udidDisplay = t.udid ? t.udid.substring(0, 12) + '...' : '-';
    const dateDisplay = new Date(t.createdAt).toLocaleDateString('it-IT');
    return `<tr>
      <td>${t.email}</td>
      <td class="mono">${udidDisplay}</td>
      <td><span class="status" style="background: ${color}20; color: ${color}">${t.status}</span></td>
      <td class="mono">${dateDisplay}</td>
    </tr>`;
  }).join('');

  const buildsRows = builds.map((b: any) => {
    const color = statusColors[b.status] || '#666';
    const idDisplay = b.id.substring(0, 8) + '...';
    const testerDisplay = b.testerId ? b.testerId.substring(0, 8) + '...' : '-';
    const dateDisplay = new Date(b.createdAt).toLocaleDateString('it-IT');
    return `<tr>
      <td class="mono">${idDisplay}</td>
      <td class="mono">${testerDisplay}</td>
      <td>${b.devicesIncluded?.length || 0}</td>
      <td><span class="status" style="background: ${color}20; color: ${color}">${b.status}</span></td>
      <td class="mono">${dateDisplay}</td>
    </tr>`;
  }).join('');

  const devicesRows = devices.map((d: any) => {
    const udidDisplay = d.udid.substring(0, 16) + '...';
    const ascStatus = d.registeredOnASC ? '✅' : '❌';
    return `<tr>
      <td class="mono">${udidDisplay}</td>
      <td>${d.product || '-'}</td>
      <td>${d.iosVersion || '-'}</td>
      <td>${ascStatus}</td>
    </tr>`;
  }).join('');

  const completedBuilds = builds.filter((b: any) => b.status === 'COMPLETED').length;

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Dashboard - errakui.dev</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, sans-serif; background: #0a0a0f; color: #e4e4e7; min-height: 100vh; }
    .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 20px 40px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; }
    .header h1 { font-size: 1.5rem; font-weight: 600; }
    .header .logo { display: flex; align-items: center; gap: 12px; }
    .header .logo span { font-size: 28px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 30px 40px; }
    .stat-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 24px; }
    .stat-card .number { font-size: 2.5rem; font-weight: 700; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .stat-card .label { color: #71717a; margin-top: 8px; font-size: 0.9rem; }
    .section { padding: 20px 40px; }
    .section h2 { font-size: 1.3rem; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
    .table-container { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th { background: rgba(255,255,255,0.05); padding: 14px 20px; text-align: left; font-weight: 600; font-size: 0.85rem; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 16px 20px; border-top: 1px solid rgba(255,255,255,0.05); font-size: 0.9rem; }
    tr:hover td { background: rgba(255,255,255,0.02); }
    .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
    .mono { font-family: 'SF Mono', 'Monaco', monospace; font-size: 0.8rem; color: #a1a1aa; }
    .empty { text-align: center; padding: 40px; color: #71717a; }
    .refresh-btn { background: rgba(102, 126, 234, 0.2); border: 1px solid rgba(102, 126, 234, 0.3); color: #667eea; padding: 10px 20px; border-radius: 10px; cursor: pointer; font-size: 0.9rem; }
    .refresh-btn:hover { background: rgba(102, 126, 234, 0.3); }
    .tabs { display: flex; gap: 10px; padding: 0 40px; margin-top: 20px; }
    .tab { padding: 12px 24px; background: transparent; border: none; color: #71717a; cursor: pointer; border-radius: 10px; }
    .tab:hover { background: rgba(255,255,255,0.05); color: white; }
    .tab.active { background: rgba(102, 126, 234, 0.2); color: #667eea; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo"><span>🚀</span><h1>Admin Dashboard</h1></div>
    <button class="refresh-btn" onclick="location.reload()">🔄 Aggiorna</button>
  </div>
  <div class="stats">
    <div class="stat-card"><div class="number">${testers.length}</div><div class="label">Tester Registrati</div></div>
    <div class="stat-card"><div class="number">${devices.length}</div><div class="label">Dispositivi</div></div>
    <div class="stat-card"><div class="number">${builds.length}</div><div class="label">Build Totali</div></div>
    <div class="stat-card"><div class="number">${completedBuilds}</div><div class="label">Build Completate</div></div>
  </div>
  <div class="tabs">
    <button class="tab active" onclick="showTab('testers')">👥 Tester</button>
    <button class="tab" onclick="showTab('builds')">📦 Build</button>
    <button class="tab" onclick="showTab('devices')">📱 Dispositivi</button>
  </div>
  <div id="testers" class="tab-content active section">
    <h2>👥 Tester Registrati</h2>
    <div class="table-container">
      ${testers.length === 0 ? '<div class="empty">Nessun tester registrato</div>' : `
      <table><thead><tr><th>Email</th><th>UDID</th><th>Status</th><th>Registrato</th></tr></thead>
      <tbody>${testersRows}</tbody></table>`}
    </div>
  </div>
  <div id="builds" class="tab-content section">
    <h2>📦 Build</h2>
    <div class="table-container">
      ${builds.length === 0 ? '<div class="empty">Nessuna build</div>' : `
      <table><thead><tr><th>ID</th><th>Tester</th><th>Devices</th><th>Status</th><th>Creata</th></tr></thead>
      <tbody>${buildsRows}</tbody></table>`}
    </div>
  </div>
  <div id="devices" class="tab-content section">
    <h2>📱 Dispositivi</h2>
    <div class="table-container">
      ${devices.length === 0 ? '<div class="empty">Nessun dispositivo</div>' : `
      <table><thead><tr><th>UDID</th><th>Modello</th><th>iOS</th><th>Registrato ASC</th></tr></thead>
      <tbody>${devicesRows}</tbody></table>`}
    </div>
  </div>
  <script>
    function showTab(tabId) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      event.target.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    }
  </script>
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
