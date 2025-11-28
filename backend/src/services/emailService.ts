import nodemailer from 'nodemailer';
import { env } from '../config/env';

/**
 * Email Service
 * Gestisce l'invio delle email ai tester
 */

// Crea il transporter SMTP
// Il transporter viene creato una sola volta e riutilizzato
let transporter: nodemailer.Transporter | null = null;

/**
 * Inizializza il transporter SMTP
 */
function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465, // true per 465, false per altri
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

/**
 * Invia l'email con il link per scaricare l'IPA
 * 
 * @param to - Email del destinatario
 * @param appName - Nome dell'app (o appId)
 * @param downloadUrl - URL per scaricare l'IPA
 */
export async function sendDownloadLinkEmail(
  to: string,
  appName: string,
  downloadUrl: string
): Promise<void> {
  const transport = getTransporter();

  const subject = `🎉 Il tuo link per installare ${appName}`;
  
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Installa ${appName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">🎉 La tua app è pronta!</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="font-size: 16px;">Ciao!</p>
    
    <p style="font-size: 16px;">
      La build di <strong>${appName}</strong> è stata completata con successo. 
      Ora puoi installarla sul tuo dispositivo iOS.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${downloadUrl}" 
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-size: 18px; font-weight: bold;">
        📲 Installa App
      </a>
    </div>
    
    <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px;">
        <strong>⚠️ Importante:</strong> Apri questo link direttamente da Safari sul tuo iPhone/iPad. 
        Non funzionerà da altre app come Gmail o Chrome.
      </p>
    </div>
    
    <p style="font-size: 14px; color: #666;">
      Se il pulsante non funziona, copia e incolla questo link in Safari:<br>
      <a href="${downloadUrl}" style="color: #667eea; word-break: break-all;">${downloadUrl}</a>
    </p>
    
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #999; text-align: center;">
      Questa email è stata generata automaticamente. Non rispondere a questo indirizzo.
    </p>
  </div>
</body>
</html>
  `.trim();

  const textBody = `
🎉 La tua app è pronta!

Ciao!

La build di ${appName} è stata completata con successo.
Ora puoi installarla sul tuo dispositivo iOS.

📲 Clicca qui per installare:
${downloadUrl}

⚠️ IMPORTANTE: Apri questo link direttamente da Safari sul tuo iPhone/iPad.
Non funzionerà da altre app come Gmail o Chrome.

---
Questa email è stata generata automaticamente. Non rispondere a questo indirizzo.
  `.trim();

  console.log(`📧 Invio email a ${to}...`);

  try {
    const info = await transport.sendMail({
      from: env.EMAIL_FROM,
      to: to,
      subject: subject,
      text: textBody,
      html: htmlBody,
    });

    console.log(`✅ Email inviata con successo! Message ID: ${info.messageId}`);
  } catch (error) {
    console.error(`❌ Errore invio email:`, error);
    throw error;
  }
}

/**
 * Verifica la connessione SMTP (utile per debug)
 */
export async function verifySmtpConnection(): Promise<boolean> {
  try {
    const transport = getTransporter();
    await transport.verify();
    console.log('✅ Connessione SMTP verificata');
    return true;
  } catch (error) {
    console.error('❌ Errore connessione SMTP:', error);
    return false;
  }
}

