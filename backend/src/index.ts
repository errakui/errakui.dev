import express from 'express';
import { env, validateEnv } from './config/env';
import { rawBodyParser } from './config/bodyParsers';
import routes from './routes';

// Valida le variabili d'ambiente all'avvio
validateEnv();

const app = express();

// ==========================================
// MIDDLEWARE
// ==========================================

// Raw body parser per il callback iOS (deve essere PRIMA di express.json())
// Intercetta le richieste con Content-Type plist/xml
app.use(rawBodyParser);

// JSON parser per le altre richieste
app.use(express.json());

// URL encoded parser
app.use(express.urlencoded({ extended: true }));

// CORS semplice (per sviluppo)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

// Logging delle richieste
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} | ${req.method} ${req.path}`);
  next();
});

// ==========================================
// ROUTES
// ==========================================

app.use('/', routes);

// ==========================================
// ERROR HANDLING
// ==========================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint non trovato',
    path: req.path,
  });
});

// Error handler globale
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Errore non gestito:', err);
  res.status(500).json({ 
    error: 'Errore interno del server',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ==========================================
// START SERVER
// ==========================================

app.listen(env.PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🚀 iOS Ad-Hoc Distribution Backend                         ║
║                                                              ║
║   Server running on: http://localhost:${env.PORT}                 ║
║   Public URL: ${env.PUBLIC_BASE_URL.padEnd(40)}   ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║   Endpoints:                                                 ║
║   - POST /register         → Registra tester (email)         ║
║   - GET  /get-udid         → Scarica .mobileconfig           ║
║   - POST /udid/callback    → Callback iOS con UDID           ║
║   - POST /build-completed  → Callback CI build completata    ║
║   - GET  /builds           → Lista build                     ║
║   - GET  /health           → Health check                    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

