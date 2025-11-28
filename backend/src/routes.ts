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

export default router;

