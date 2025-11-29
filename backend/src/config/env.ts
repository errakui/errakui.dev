import dotenv from 'dotenv';

// Carica le variabili d'ambiente da .env
dotenv.config();

/**
 * Configurazione ambiente
 * Tutte le variabili d'ambiente centralizzate
 */
export const env = {
  // Server
  PORT: parseInt(process.env.PORT || '3000', 10),
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || 'http://localhost:3000',

  // Mobileconfig
  ORG_NAME: process.env.ORG_NAME || 'errakui.dev',

  // App Store Connect API
  ASC_ISSUER_ID: process.env.ASC_ISSUER_ID || '',
  ASC_KEY_ID: process.env.ASC_KEY_ID || '',
  ASC_PRIVATE_KEY: process.env.ASC_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
  ASC_API_BASE: process.env.ASC_API_BASE || 'https://api.appstoreconnect.apple.com',

  // GitHub API
  GITHUB_OWNER: process.env.GITHUB_OWNER || '',
  GITHUB_REPO: process.env.GITHUB_REPO || '',
  GITHUB_WORKFLOW_ID: process.env.GITHUB_WORKFLOW_ID || 'build-adhoc.yml',
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',

  // Email SMTP
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'no-reply@example.com',

  // SSL Certificate for signing mobileconfig
  SSL_CERT: process.env.SSL_CERT || '',
  SSL_KEY: process.env.SSL_KEY || '',
};

/**
 * Valida che le variabili d'ambiente critiche siano presenti
 */
export function validateEnv(): void {
  const required = [
    'PUBLIC_BASE_URL',
    'ASC_ISSUER_ID',
    'ASC_KEY_ID',
    'ASC_PRIVATE_KEY',
    'GITHUB_OWNER',
    'GITHUB_REPO',
    'GITHUB_TOKEN',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.warn('⚠️  Variabili d\'ambiente mancanti:', missing.join(', '));
    console.warn('   Il sistema potrebbe non funzionare correttamente.');
    console.warn('   Copia env.example.txt in .env e compila i valori.');
  }
}

