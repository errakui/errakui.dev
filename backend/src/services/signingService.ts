import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { env } from '../config/env';

/**
 * Signing Service
 * Firma i mobileconfig usando OpenSSL S/MIME
 */

/**
 * Firma un mobileconfig XML usando il certificato SSL
 * 
 * @param xmlContent - Il contenuto XML del mobileconfig non firmato
 * @returns Buffer con il mobileconfig firmato (formato DER)
 */
export async function signMobileconfig(xmlContent: string): Promise<Buffer> {
  // Se non ci sono certificati configurati, restituisci il contenuto non firmato
  if (!env.SSL_CERT || !env.SSL_KEY) {
    console.warn('⚠️ SSL_CERT o SSL_KEY non configurati - mobileconfig non firmato');
    return Buffer.from(xmlContent, 'utf-8');
  }

  // Crea file temporanei per OpenSSL
  const tmpDir = os.tmpdir();
  const timestamp = Date.now();
  const certPath = path.join(tmpDir, `cert-${timestamp}.pem`);
  const keyPath = path.join(tmpDir, `key-${timestamp}.pem`);
  const inputPath = path.join(tmpDir, `input-${timestamp}.mobileconfig`);
  const outputPath = path.join(tmpDir, `output-${timestamp}.mobileconfig`);

  try {
    // Scrivi i file temporanei
    fs.writeFileSync(certPath, env.SSL_CERT);
    fs.writeFileSync(keyPath, env.SSL_KEY);
    fs.writeFileSync(inputPath, xmlContent);

    // Esegui OpenSSL per firmare
    const signedContent = await runOpenSSL(certPath, keyPath, inputPath, outputPath);
    
    console.log('✅ Mobileconfig firmato con successo');
    return signedContent;

  } finally {
    // Pulisci i file temporanei
    try {
      if (fs.existsSync(certPath)) fs.unlinkSync(certPath);
      if (fs.existsSync(keyPath)) fs.unlinkSync(keyPath);
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch (e) {
      console.warn('⚠️ Errore pulizia file temporanei:', e);
    }
  }
}

/**
 * Esegue OpenSSL smime per firmare il file
 */
function runOpenSSL(certPath: string, keyPath: string, inputPath: string, outputPath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // openssl smime -sign -signer cert.pem -inkey key.pem -in input.mobileconfig -out output.mobileconfig -outform der -nodetach
    const args = [
      'smime',
      '-sign',
      '-signer', certPath,
      '-inkey', keyPath,
      '-in', inputPath,
      '-out', outputPath,
      '-outform', 'der',
      '-nodetach'
    ];

    const openssl = spawn('openssl', args);
    let stderr = '';

    openssl.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    openssl.on('close', (code) => {
      if (code === 0) {
        try {
          const signedContent = fs.readFileSync(outputPath);
          resolve(signedContent);
        } catch (err) {
          reject(new Error(`Errore lettura file firmato: ${err}`));
        }
      } else {
        reject(new Error(`OpenSSL errore (code ${code}): ${stderr}`));
      }
    });

    openssl.on('error', (err) => {
      reject(new Error(`Impossibile eseguire OpenSSL: ${err.message}`));
    });
  });
}

/**
 * Verifica se la firma è disponibile
 */
export function isSigningAvailable(): boolean {
  return !!(env.SSL_CERT && env.SSL_KEY);
}

