import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import plist from 'plist';
import { TesterRepository } from '../models/tester';
import { DeviceRepository } from '../models/device';
import { BuildRepository } from '../models/build';
import { env } from '../config/env';
import { getRawBody } from '../config/bodyParsers';
import * as appStoreConnectService from '../services/appStoreConnectService';
import * as ciService from '../services/ciService';

/**
 * UDID Controller
 * Gestisce la generazione del .mobileconfig e il callback con UDID da iOS
 */

/**
 * GET /get-udid
 * 
 * Genera e restituisce il file .mobileconfig personalizzato per il tester.
 * Il mobileconfig contiene il testerId nel callback URL.
 * 
 * Query params:
 * - testerId: UUID del tester
 * 
 * Response:
 * - Content-Type: application/x-apple-aspen-config
 * - File .mobileconfig
 */
export async function getUdid(req: Request, res: Response): Promise<void> {
  try {
    const testerId = req.query.testerId as string;

    if (!testerId) {
      res.status(400).json({ 
        error: 'testerId obbligatorio',
        code: 'MISSING_TESTER_ID' 
      });
      return;
    }

    // Verifica che il tester esista
    const tester = TesterRepository.findById(testerId);
    if (!tester) {
      res.status(404).json({ 
        error: 'Tester non trovato',
        code: 'TESTER_NOT_FOUND' 
      });
      return;
    }

    // Verifica che PUBLIC_BASE_URL sia configurato
    if (!env.PUBLIC_BASE_URL || env.PUBLIC_BASE_URL === 'http://localhost:3000') {
      console.warn('⚠️  PUBLIC_BASE_URL non configurato correttamente!');
    }

    // Genera UUID unici per i payload
    const payloadUUID1 = uuidv4().toUpperCase();
    const payloadUUID2 = uuidv4().toUpperCase();

    // URL del callback con testerId
    const callbackUrl = `${env.PUBLIC_BASE_URL}/udid/callback?testerId=${testerId}`;

    // Genera il mobileconfig XML
    // Questo è un "Profile Service" che chiede a iOS di inviare info sul device
    const mobileconfig = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <dict>
    <key>URL</key>
    <string>${callbackUrl}</string>
    <key>DeviceAttributes</key>
    <array>
      <string>UDID</string>
      <string>IMEI</string>
      <string>ICCID</string>
      <string>VERSION</string>
      <string>PRODUCT</string>
      <string>SERIAL</string>
    </array>
  </dict>
  <key>PayloadDescription</key>
  <string>Questo profilo registra il tuo dispositivo per installare l'app.</string>
  <key>PayloadDisplayName</key>
  <string>Registrazione Dispositivo</string>
  <key>PayloadIdentifier</key>
  <string>dev.errakui.device-registration.${testerId}</string>
  <key>PayloadOrganization</key>
  <string>${env.ORG_NAME}</string>
  <key>PayloadRemovalDisallowed</key>
  <false/>
  <key>PayloadType</key>
  <string>Profile Service</string>
  <key>PayloadUUID</key>
  <string>${payloadUUID1}</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
</dict>
</plist>`;

    console.log(`📱 Generato mobileconfig per tester: ${testerId}`);
    console.log(`   Callback URL: ${callbackUrl}`);

    // Imposta headers e invia il file
    res.setHeader('Content-Type', 'application/x-apple-aspen-config');
    res.setHeader('Content-Disposition', `attachment; filename="register-device.mobileconfig"`);
    res.send(mobileconfig);

  } catch (error) {
    console.error('❌ Errore in getUdid:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
}

/**
 * POST /udid/callback
 * 
 * Callback chiamato da iOS dopo l'installazione del mobileconfig.
 * iOS invia un plist XML con le informazioni del device (incluso UDID).
 * 
 * Query params:
 * - testerId: UUID del tester
 * 
 * Body:
 * - Raw XML plist con info device
 * 
 * Response:
 * - Pagina HTML che conferma la registrazione
 */
export async function udidCallback(req: Request, res: Response): Promise<void> {
  try {
    const testerId = req.query.testerId as string;

    if (!testerId) {
      res.status(400).send(errorPage('Errore', 'testerId mancante'));
      return;
    }

    // Verifica che il tester esista
    const tester = TesterRepository.findById(testerId);
    if (!tester) {
      res.status(404).send(errorPage('Errore', 'Tester non trovato'));
      return;
    }

    // Ottieni il body raw (plist XML)
    const rawBody = getRawBody(req);
    if (!rawBody) {
      console.error('❌ Body raw non disponibile');
      res.status(400).send(errorPage('Errore', 'Dati del dispositivo non ricevuti'));
      return;
    }

    // Parse del plist
    // iOS invia un plist firmato (PKCS7) o non firmato
    // Dobbiamo estrarre il plist XML dal contenuto
    let deviceInfo: any;
    
    try {
      const bodyString = rawBody.toString('utf-8');
      
      // Se è un plist firmato (PKCS7), contiene dati binari
      // Per ora gestiamo solo plist non firmato (più comune in sviluppo)
      // In produzione potresti dover usare una libreria per verificare la firma
      
      // Cerca il plist XML nel body (potrebbe essere wrappato)
      const plistMatch = bodyString.match(/<\?xml[\s\S]*?<\/plist>/);
      
      if (plistMatch) {
        deviceInfo = plist.parse(plistMatch[0]);
      } else {
        // Prova a parsare direttamente
        deviceInfo = plist.parse(bodyString);
      }
    } catch (parseError) {
      console.error('❌ Errore parsing plist:', parseError);
      console.log('Raw body (primi 500 char):', rawBody.toString('utf-8').substring(0, 500));
      res.status(400).send(errorPage('Errore', 'Impossibile leggere i dati del dispositivo'));
      return;
    }

    // Estrai UDID e altre info
    // I campi possono variare in base alla versione iOS e al tipo di device
    const udid = deviceInfo.UDID || deviceInfo.udid;
    const product = deviceInfo.PRODUCT || deviceInfo.product;
    const version = deviceInfo.VERSION || deviceInfo.version;

    if (!udid) {
      console.error('❌ UDID non trovato nel plist:', deviceInfo);
      res.status(400).send(errorPage('Errore', 'UDID del dispositivo non trovato'));
      return;
    }

    console.log(`📱 UDID ricevuto: ${udid}`);
    console.log(`   Product: ${product || 'N/A'}`);
    console.log(`   Version: ${version || 'N/A'}`);
    console.log(`   Tester: ${tester.email}`);

    // Salva il device in memoria
    DeviceRepository.create({
      udid,
      product,
      iosVersion: version,
    });

    // Aggiorna il tester con l'UDID
    TesterRepository.update(testerId, {
      udid,
      status: 'DEVICE_REGISTERED',
    });

    // === OPERAZIONI ASINCRONE (non bloccano la response) ===
    processDeviceRegistration(testerId, udid);

    // iOS Profile Service richiede una risposta con un profilo vuoto
    // che dice "installazione completata" o un redirect
    const emptyProfile = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array/>
  <key>PayloadDescription</key>
  <string>Dispositivo registrato con successo. Puoi eliminare questo profilo.</string>
  <key>PayloadDisplayName</key>
  <string>Registrazione Completata</string>
  <key>PayloadIdentifier</key>
  <string>dev.errakui.registration-complete.${testerId}</string>
  <key>PayloadOrganization</key>
  <string>${env.ORG_NAME}</string>
  <key>PayloadRemovalDisallowed</key>
  <false/>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadUUID</key>
  <string>${uuidv4().toUpperCase()}</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
</dict>
</plist>`;

    res.setHeader('Content-Type', 'application/x-apple-aspen-config');
    res.status(200).send(emptyProfile);

  } catch (error) {
    console.error('❌ Errore in udidCallback:', error);
    res.status(500).send(errorPage('Errore', 'Si è verificato un errore interno'));
  }
}

/**
 * Processa la registrazione del device in modo asincrono
 * - Registra su App Store Connect
 * - Crea una build
 * - Triggera il CI
 */
async function processDeviceRegistration(testerId: string, udid: string): Promise<void> {
  try {
    console.log(`\n🔄 Avvio processo asincrono per tester ${testerId}...`);

    // 1. Registra il device su App Store Connect
    console.log('📱 Registrazione device su App Store Connect...');
    try {
      await appStoreConnectService.registerDevice(udid);
    } catch (ascError) {
      console.error('⚠️  Errore registrazione ASC (continuo comunque):', ascError);
      // Non blocchiamo il flusso se la registrazione fallisce
      // (potrebbe essere già registrato o ci sono altri problemi)
    }

    // 2. Crea una nuova build
    const build = BuildRepository.create({
      testerId,
      devicesIncluded: [udid],
    });
    console.log(`📦 Build creata: ${build.id}`);

    // 3. Aggiorna lo status del tester
    TesterRepository.update(testerId, { status: 'BUILD_PENDING' });

    // 4. Triggera il workflow CI
    console.log('🚀 Triggering CI workflow...');
    try {
      await ciService.triggerBuild(build.id, testerId);
      console.log('✅ Workflow triggerato con successo!');
    } catch (ciError) {
      console.error('❌ Errore triggering CI:', ciError);
      BuildRepository.update(build.id, { status: 'FAILED' });
    }

  } catch (error) {
    console.error('❌ Errore nel processo asincrono:', error);
  }
}

/**
 * Genera pagina HTML di successo
 */
function successPage(email: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dispositivo Registrato</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 20px;
      padding: 40px;
      max-width: 400px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .icon {
      font-size: 60px;
      margin-bottom: 20px;
    }
    h1 {
      color: #333;
      margin-bottom: 15px;
      font-size: 24px;
    }
    p {
      color: #666;
      line-height: 1.6;
      margin-bottom: 10px;
    }
    .email {
      background: #f0f0f0;
      padding: 10px 15px;
      border-radius: 8px;
      font-weight: bold;
      color: #333;
      margin: 15px 0;
    }
    .note {
      font-size: 14px;
      color: #999;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h1>Dispositivo Registrato!</h1>
    <p>Il tuo dispositivo è stato registrato con successo.</p>
    <div class="email">${email}</div>
    <p>Riceverai un'email con il link per installare l'app entro pochi minuti.</p>
    <p class="note">Puoi chiudere questa pagina.</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Genera pagina HTML di errore
 */
function errorPage(title: string, message: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #ff6b6b 0%, #c92a2a 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 20px;
      padding: 40px;
      max-width: 400px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .icon {
      font-size: 60px;
      margin-bottom: 20px;
    }
    h1 {
      color: #c92a2a;
      margin-bottom: 15px;
      font-size: 24px;
    }
    p {
      color: #666;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">❌</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>
  `.trim();
}

