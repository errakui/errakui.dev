import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import { env } from '../config/env';

/**
 * App Store Connect API Service
 * Gestisce l'autenticazione JWT e le chiamate API
 */

/**
 * Crea un JWT token per l'autenticazione con App Store Connect API
 * 
 * @see https://developer.apple.com/documentation/appstoreconnectapi/generating_tokens_for_api_requests
 */
export function createJwtToken(): string {
  const now = Math.floor(Date.now() / 1000);
  
  const payload = {
    iss: env.ASC_ISSUER_ID,  // Issuer ID
    iat: now,                 // Issued at
    exp: now + 20 * 60,       // Expiration (max 20 minuti)
    aud: 'appstoreconnect-v1',
  };

  const header = {
    alg: 'ES256' as const,
    kid: env.ASC_KEY_ID,      // Key ID
    typ: 'JWT',
  };

  // La private key deve essere nel formato PEM
  // Se viene da .env con \n escaped, viene già convertita in env.ts
  const token = jwt.sign(payload, env.ASC_PRIVATE_KEY, {
    algorithm: 'ES256',
    header,
  });

  return token;
}

/**
 * Registra un device su App Store Connect
 * 
 * @param udid - UDID del dispositivo
 * @param name - Nome opzionale del device (default: Tester-<ultime4UDID>)
 * @returns Response dell'API o null se il device esiste già
 * 
 * @see https://developer.apple.com/documentation/appstoreconnectapi/register_a_new_device
 */
export async function registerDevice(
  udid: string, 
  name?: string
): Promise<any> {
  const token = createJwtToken();
  
  // Nome del device: usa le ultime 4 cifre dell'UDID se non specificato
  const deviceName = name || `Tester-${udid.slice(-4)}`;

  const requestBody = {
    data: {
      type: 'devices',
      attributes: {
        name: deviceName,
        udid: udid,
        platform: 'IOS',
      },
    },
  };

  console.log(`📱 Registrazione device su App Store Connect: ${udid}`);

  try {
    const response = await fetch(`${env.ASC_API_BASE}/v1/devices`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`✅ Device registrato con successo: ${udid}`);
      return data;
    }

    // Gestione errore: device già registrato
    // L'API restituisce errore 409 se il device esiste già
    if (response.status === 409) {
      console.log(`ℹ️  Device già registrato: ${udid}`);
      return { alreadyExists: true, udid };
    }

    // Altro errore specifico: UDID già presente
    const errors = (data as any)?.errors || [];
    const alreadyExists = errors.some((err: any) => 
      err.code === 'ENTITY_ERROR.ATTRIBUTE.INVALID.DUPLICATE' ||
      err.detail?.toLowerCase().includes('already exists') ||
      err.detail?.toLowerCase().includes('has already been taken')
    );

    if (alreadyExists) {
      console.log(`ℹ️  Device già registrato: ${udid}`);
      return { alreadyExists: true, udid };
    }

    // Errore non gestito
    console.error(`❌ Errore registrazione device:`, data);
    throw new Error(`Errore App Store Connect: ${JSON.stringify(data)}`);

  } catch (error) {
    console.error(`❌ Errore nella chiamata API:`, error);
    throw error;
  }
}

/**
 * Lista tutti i device registrati su App Store Connect
 * 
 * @returns Lista dei device
 */
export async function listDevices(): Promise<any> {
  const token = createJwtToken();

  const response = await fetch(`${env.ASC_API_BASE}/v1/devices`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Errore App Store Connect: ${JSON.stringify(data)}`);
  }

  return data;
}

