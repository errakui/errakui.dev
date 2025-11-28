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
  <title>errakui.dev - Registra il tuo dispositivo iOS</title>
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
      padding: 50px 40px;
      max-width: 420px;
      width: 100%;
      text-align: center;
    }
    .logo {
      font-size: 48px;
      margin-bottom: 10px;
    }
    h1 {
      font-size: 1.8rem;
      margin-bottom: 8px;
      font-weight: 600;
    }
    .subtitle {
      color: rgba(255,255,255,0.6);
      margin-bottom: 35px;
      font-size: 0.95rem;
    }
    .form-group {
      margin-bottom: 20px;
      text-align: left;
    }
    label {
      display: block;
      margin-bottom: 8px;
      font-size: 0.9rem;
      color: rgba(255,255,255,0.8);
    }
    input[type="email"] {
      width: 100%;
      padding: 16px 20px;
      border: 2px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      background: rgba(0,0,0,0.3);
      color: white;
      font-size: 1rem;
      transition: all 0.3s;
    }
    input[type="email"]:focus {
      outline: none;
      border-color: #667eea;
      background: rgba(0,0,0,0.5);
    }
    input[type="email"]::placeholder {
      color: rgba(255,255,255,0.3);
    }
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
      transition: all 0.3s;
      margin-top: 10px;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 40px rgba(102, 126, 234, 0.4);
    }
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
    .result {
      margin-top: 25px;
      padding: 20px;
      border-radius: 12px;
      display: none;
    }
    .result.success {
      display: block;
      background: rgba(34, 197, 94, 0.2);
      border: 1px solid rgba(34, 197, 94, 0.3);
    }
    .result.error {
      display: block;
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .result a {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
      word-break: break-all;
    }
    .result a:hover {
      text-decoration: underline;
    }
    .download-btn {
      display: inline-block;
      margin-top: 15px;
      padding: 12px 30px;
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      border-radius: 10px;
      color: white;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.3s;
    }
    .download-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(34, 197, 94, 0.4);
      text-decoration: none;
    }
    .steps {
      margin-top: 30px;
      padding-top: 25px;
      border-top: 1px solid rgba(255,255,255,0.1);
      text-align: left;
      font-size: 0.85rem;
      color: rgba(255,255,255,0.5);
    }
    .steps h3 {
      color: rgba(255,255,255,0.8);
      margin-bottom: 12px;
      font-size: 0.9rem;
    }
    .steps ol {
      padding-left: 20px;
    }
    .steps li {
      margin-bottom: 8px;
    }
    .warning {
      background: rgba(251, 191, 36, 0.2);
      border: 1px solid rgba(251, 191, 36, 0.3);
      border-radius: 10px;
      padding: 12px;
      margin-top: 15px;
      font-size: 0.85rem;
      color: #fbbf24;
    }
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
          result.innerHTML = \`
            <p>✅ Registrazione completata!</p>
            <p style="margin-top:10px; font-size:0.9rem; color:rgba(255,255,255,0.7);">
              Clicca il pulsante qui sotto per scaricare il profilo di configurazione.
            </p>
            <a href="\${data.nextUrl}" class="download-btn">📥 Scarica Profilo</a>
            <div class="warning">
              ⚠️ Apri questo link da <strong>Safari</strong> sul tuo iPhone!
            </div>
          \`;
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
</html>
  `);
});

export default router;

