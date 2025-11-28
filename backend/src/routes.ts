import { Router } from 'express';
import { testerController, udidController, buildController } from './controllers';
import { requireAuth } from './middleware/auth';

const router = Router();

// ==========================================
// REGISTRAZIONE TESTER (pubblico)
// ==========================================

// POST /register - Registra un nuovo tester (solo email)
router.post('/register', testerController.register);

// GET /testers - Lista tutti i tester (ADMIN)
router.get('/testers', requireAuth, testerController.listTesters);

// GET /testers/:id - Dettaglio singolo tester (ADMIN)
router.get('/testers/:id', requireAuth, testerController.getTester);

// ==========================================
// UDID / MOBILECONFIG
// ==========================================

// GET /get-udid - Genera e scarica il .mobileconfig
router.get('/get-udid', udidController.getUdid);

// POST /udid/callback - Callback da iOS con UDID
router.post('/udid/callback', udidController.udidCallback);

// ==========================================
// BUILD
// ==========================================

// POST /build-completed - Callback dal CI quando la build è pronta
router.post('/build-completed', buildController.buildCompleted);

// GET /builds - Lista tutte le build (ADMIN)
router.get('/builds', requireAuth, buildController.listBuilds);

// GET /builds/:id - Dettaglio singola build (ADMIN)
router.get('/builds/:id', requireAuth, buildController.getBuild);

// ==========================================
// HEALTH CHECK
// ==========================================

router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ==========================================
// HOME PAGE
// ==========================================

router.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>errakui.dev - iOS Ad-Hoc Distribution</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .container {
      text-align: center;
      padding: 40px;
    }
    h1 {
      font-size: 3rem;
      margin-bottom: 10px;
      background: linear-gradient(90deg, #e94560, #ff6b6b);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      font-size: 1.2rem;
      color: #a0a0a0;
      margin-bottom: 40px;
    }
    .status {
      background: rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 30px;
    }
    .status-item {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .status-item:last-child { border: none; }
    .badge {
      background: #22c55e;
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.85rem;
    }
    .endpoints {
      text-align: left;
      background: rgba(0,0,0,0.3);
      border-radius: 12px;
      padding: 20px;
    }
    .endpoint {
      font-family: monospace;
      padding: 8px 0;
      color: #a0a0a0;
    }
    .method {
      display: inline-block;
      width: 60px;
      color: #e94560;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>errakui.dev</h1>
    <p class="subtitle">iOS Ad-Hoc Distribution System</p>
    
    <div class="status">
      <div class="status-item">
        <span>Status</span>
        <span class="badge">Online</span>
      </div>
      <div class="status-item">
        <span>Version</span>
        <span>1.0.0</span>
      </div>
    </div>
    
    <div class="endpoints">
      <div class="endpoint"><span class="method">POST</span> /register</div>
      <div class="endpoint"><span class="method">GET</span> /get-udid</div>
      <div class="endpoint"><span class="method">POST</span> /udid/callback</div>
      <div class="endpoint"><span class="method">GET</span> /health</div>
    </div>
  </div>
</body>
</html>
  `);
});

export default router;

