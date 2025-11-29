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

// GET /manual-udid - Pagina per inserire UDID manualmente
router.get('/manual-udid', (req: Request, res: Response) => {
  const testerId = req.query.testerId as string;
  
  if (!testerId) {
    res.status(400).send('testerId mancante');
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inserisci UDID Manualmente</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      padding: 20px;
    }
    .card {
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 24px;
      padding: 40px;
      max-width: 500px;
      width: 100%;
    }
    h1 { font-size: 1.6rem; margin-bottom: 20px; text-align: center; }
    .steps {
      background: rgba(0,0,0,0.3);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 25px;
    }
    .steps h3 { font-size: 1rem; margin-bottom: 15px; color: #a78bfa; }
    .steps ol { padding-left: 20px; font-size: 0.9rem; line-height: 1.8; color: rgba(255,255,255,0.8); }
    .form-group { margin-bottom: 20px; }
    label { display: block; margin-bottom: 8px; font-size: 0.9rem; color: rgba(255,255,255,0.8); }
    input[type="text"] {
      width: 100%;
      padding: 14px 18px;
      border: 2px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      background: rgba(0,0,0,0.3);
      color: white;
      font-size: 1rem;
      font-family: monospace;
    }
    input[type="text"]:focus { outline: none; border-color: #667eea; }
    input::placeholder { color: rgba(255,255,255,0.3); }
    button {
      width: 100%;
      padding: 16px;
      border: none;
      border-radius: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover { transform: translateY(-2px); box-shadow: 0 10px 40px rgba(102, 126, 234, 0.4); }
    .result { margin-top: 20px; padding: 15px; border-radius: 12px; display: none; }
    .result.success { display: block; background: rgba(34, 197, 94, 0.2); border: 1px solid rgba(34, 197, 94, 0.3); }
    .result.error { display: block; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.3); }
  </style>
</head>
<body>
  <div class="card">
    <h1>📱 Inserisci UDID Manualmente</h1>
    <div class="steps">
      <h3>Come trovare l'UDID del tuo iPhone:</h3>
      <ol>
        <li>Collega l'iPhone al Mac con un cavo USB</li>
        <li>Apri <strong>Finder</strong> (macOS Catalina+) o <strong>iTunes</strong></li>
        <li>Seleziona il tuo iPhone dalla sidebar</li>
        <li>Clicca sul testo sotto il nome del dispositivo</li>
        <li>Apparirà l'<strong>UDID</strong> - clicca destro e "Copia"</li>
      </ol>
    </div>
    <form id="udidForm">
      <div class="form-group">
        <label for="udid">UDID del dispositivo</label>
        <input type="text" id="udid" name="udid" placeholder="00000000-000000000000000A" required>
      </div>
      <button type="submit">Registra Dispositivo →</button>
    </form>
    <div id="result" class="result"></div>
  </div>
  <script>
    document.getElementById('udidForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const udid = document.getElementById('udid').value.trim();
      const result = document.getElementById('result');
      if (!udid || udid.length < 20) {
        result.className = 'result error';
        result.innerHTML = '❌ UDID non valido. Deve essere almeno 20 caratteri.';
        return;
      }
      try {
        const response = await fetch('/submit-udid?testerId=${testerId}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ udid })
        });
        const data = await response.json();
        if (response.ok) {
          result.className = 'result success';
          result.innerHTML = '✅ Dispositivo registrato! Riceverai l\\'app via email.';
        } else {
          result.className = 'result error';
          result.innerHTML = '❌ ' + (data.error || 'Errore durante la registrazione');
        }
      } catch (err) {
        result.className = 'result error';
        result.innerHTML = '❌ Errore di connessione';
      }
    });
  </script>
</body>
</html>`;

  res.send(html);
});

// POST /submit-udid - Registra UDID inserito manualmente
router.post('/submit-udid', async (req: Request, res: Response) => {
  const testerId = req.query.testerId as string;
  const { udid } = req.body;

  if (!testerId) {
    res.status(400).json({ error: 'testerId mancante' });
    return;
  }

  if (!udid || udid.length < 20) {
    res.status(400).json({ error: 'UDID non valido' });
    return;
  }

  const tester = TesterRepository.findById(testerId);
  if (!tester) {
    res.status(404).json({ error: 'Tester non trovato' });
    return;
  }

  console.log(`📱 UDID manuale ricevuto: ${udid}`);
  console.log(`   Tester: ${tester.email}`);

  DeviceRepository.create({ udid, product: 'Manual Entry', iosVersion: 'Unknown' });
  TesterRepository.update(testerId, { udid, status: 'DEVICE_REGISTERED' });

  // Processa in background
  (async () => {
    try {
      try {
        await appStoreConnectService.registerDevice(udid);
      } catch (e) {
        console.error('⚠️ ASC registration failed:', e);
      }

      const build = BuildRepository.create({ testerId, devicesIncluded: [udid] });
      TesterRepository.update(testerId, { status: 'BUILD_PENDING' });

      try {
        await ciService.triggerBuild(build.id, testerId);
      } catch (e) {
        console.error('❌ CI trigger failed:', e);
        BuildRepository.update(build.id, { status: 'FAILED' });
      }
    } catch (e) {
      console.error('❌ Background process failed:', e);
    }
  })();

  res.json({ success: true, message: "Dispositivo registrato. Riceverai l'app via email." });
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
  <title>errakui.dev - Registra il tuo dispositivo iOS</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; color: white; padding: 20px; }
    .card { background: rgba(255,255,255,0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 50px 40px; max-width: 420px; width: 100%; text-align: center; }
    .logo { font-size: 48px; margin-bottom: 10px; }
    h1 { font-size: 1.8rem; margin-bottom: 8px; font-weight: 600; }
    .subtitle { color: rgba(255,255,255,0.6); margin-bottom: 35px; font-size: 0.95rem; }
    .form-group { margin-bottom: 20px; text-align: left; }
    label { display: block; margin-bottom: 8px; font-size: 0.9rem; color: rgba(255,255,255,0.8); }
    input[type="email"] { width: 100%; padding: 16px 20px; border: 2px solid rgba(255,255,255,0.1); border-radius: 12px; background: rgba(0,0,0,0.3); color: white; font-size: 1rem; }
    input[type="email"]:focus { outline: none; border-color: #667eea; background: rgba(0,0,0,0.5); }
    input[type="email"]::placeholder { color: rgba(255,255,255,0.3); }
    button { width: 100%; padding: 16px; border: none; border-radius: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 1.1rem; font-weight: 600; cursor: pointer; margin-top: 10px; }
    button:hover { transform: translateY(-2px); box-shadow: 0 10px 40px rgba(102, 126, 234, 0.4); }
    button:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
    .result { margin-top: 25px; padding: 20px; border-radius: 12px; display: none; }
    .result.success { display: block; background: rgba(34, 197, 94, 0.2); border: 1px solid rgba(34, 197, 94, 0.3); }
    .result.error { display: block; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.3); }
    .result a { color: #667eea; text-decoration: none; font-weight: 600; }
    .result a:hover { text-decoration: underline; }
    .download-btn { display: inline-block; margin-top: 15px; padding: 12px 30px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 10px; color: white; text-decoration: none; font-weight: 600; }
    .download-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(34, 197, 94, 0.4); text-decoration: none; }
    .steps { margin-top: 30px; padding-top: 25px; border-top: 1px solid rgba(255,255,255,0.1); text-align: left; font-size: 0.85rem; color: rgba(255,255,255,0.5); }
    .steps h3 { color: rgba(255,255,255,0.8); margin-bottom: 12px; font-size: 0.9rem; }
    .steps ol { padding-left: 20px; }
    .steps li { margin-bottom: 8px; }
    .warning { background: rgba(251, 191, 36, 0.2); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 10px; padding: 12px; margin-top: 15px; font-size: 0.85rem; color: #fbbf24; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">📱</div>
    <h1>Registra il tuo dispositivo</h1>
    <p class="subtitle">Inserisci la tua email per ricevere l'app</p>
    <form id="registerForm">
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" placeholder="la-tua@email.com" required>
      </div>
      <button type="submit" id="submitBtn">Continua →</button>
    </form>
    <div id="result" class="result"></div>
    <div class="steps">
      <h3>Come funziona:</h3>
      <ol>
        <li>Inserisci la tua email</li>
        <li>Clicca sul link per scaricare il profilo</li>
        <li>Installa il profilo su iPhone (Impostazioni)</li>
        <li>Riceverai l'app via email!</li>
      </ol>
    </div>
  </div>
  <script>
    const form = document.getElementById('registerForm');
    const result = document.getElementById('result');
    const submitBtn = document.getElementById('submitBtn');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Caricamento...';
      try {
        const response = await fetch('/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await response.json();
        if (response.ok) {
          result.className = 'result success';
          const manualUrl = data.nextUrl.replace('/get-udid?', '/manual-udid?');
          result.innerHTML = '<p>✅ Registrazione completata!</p>' +
            '<p style="margin-top:10px; font-size:0.9rem; color:rgba(255,255,255,0.7);">Clicca il pulsante qui sotto per scaricare il profilo.</p>' +
            '<a href="' + data.nextUrl + '" class="download-btn">📥 Scarica Profilo</a>' +
            '<div class="warning">⚠️ Apri questo link da <strong>Safari</strong> sul tuo iPhone!</div>' +
            '<div style="margin-top:20px; padding-top:15px; border-top:1px solid rgba(255,255,255,0.1);">' +
            '<p style="font-size:0.85rem; color:rgba(255,255,255,0.5);">Il profilo non si installa? <a href="' + manualUrl + '" style="color:#667eea;">Inserisci UDID manualmente →</a></p></div>';
        } else {
          result.className = 'result error';
          result.innerHTML = '<p>❌ ' + (data.error || 'Errore durante la registrazione') + '</p>';
        }
      } catch (err) {
        result.className = 'result error';
        result.innerHTML = '<p>❌ Errore di connessione</p>';
      }
      submitBtn.disabled = false;
      submitBtn.textContent = 'Continua →';
    });
  </script>
</body>
</html>`;

  res.send(html);
});

export default router;
